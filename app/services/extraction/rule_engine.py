import re
from typing import Dict, Any, List

class RuleEngine:
    def __init__(self):
        self.abrasives_keywords = [
            "sanding belt", "sanding disc", "cut-off wheel", "cutoff wheel", 
            "grinding wheel", "abrasive disc", "cutting disc", "cutting wheel"
        ]
        
    def _extract_category_and_type(self, raw_text: str) -> tuple[str, str, float]:
        text_lower = raw_text.lower()
        
        # Mappings for synonyms
        if any(kw in text_lower for kw in ["cutting wheel", "cut-off disc", "cutoff wheel", "cut-off wheel"]):
            return "Abrasives", "Cut-Off Wheel", 0.99
        elif "sanding belt" in text_lower or "abrasive belt" in text_lower or "belt sander abrasive" in text_lower:
            return "Abrasives", "Sanding Belt", 0.99
        elif "grinding wheel" in text_lower:
            return "Abrasives", "Grinding Wheel", 0.99
        elif "sanding disc" in text_lower:
            return "Abrasives", "Sanding Disc", 0.99
        elif "abrasive disc" in text_lower:
            return "Abrasives", "Abrasive Disc", 0.99
            
        return "", "", 0.0

    def _extract_pack_quantity(self, raw_text: str) -> tuple[int, float]:
        # match 6pc, 6 pcs, 6 pack, pack of 6, qty 6, quantity: 6, quantity 6
        patterns = [
            r'(\d+)\s*pc', r'(\d+)\s*pcs', r'(\d+)\s*pack', r'pack of\s*(\d+)',
            r'qty\s*(\d+)', r'quantity:?\s*(\d+)'
        ]
        for p in patterns:
            match = re.search(p, raw_text, re.IGNORECASE)
            if match:
                return int(match.group(1)), 0.95
        return None, 0.0

    def _extract_grit(self, raw_text: str) -> tuple[str, float]:
        # match 80 grit, 120G, P80, P120
        patterns = [
            r'(\d+)\s*grit', r'[pP](\d{2,4})\b', r'(\d{2,4})[gG]\b'
        ]
        for p in patterns:
            match = re.search(p, raw_text, re.IGNORECASE)
            if match:
                return match.group(1), 0.90
        return None, 0.0

    def _extract_size(self, raw_text: str, product_type: str) -> tuple[Dict[str, str], float]:
        attrs = {}
        confidence = 0.0
        
        # Match dimensions like 1/2"x18", 1/2 in x 18 in, 4-1/2"x7/8"
        dim_pattern = r'(\d+(?:-\d+)?(?:/\d+|\.\d+)?)\s*(?:\"|inch|in\.?|mm|cm)\s*[xX]\s*(\d+(?:-\d+)?(?:/\d+|\.\d+)?)\s*(?:\"|inch|in\.?|mm|cm)'
        dim_match = re.search(dim_pattern, raw_text, re.IGNORECASE)
        
        # Extract individual sizes
        single_dim_pattern = r'(\d+(?:-\d+)?(?:/\d+|\.\d+)?)\s*(\"|inch|in\.?|mm|cm)'
        single_matches = re.findall(single_dim_pattern, raw_text, re.IGNORECASE)

        if dim_match and product_type == "Sanding Belt":
            w = dim_match.group(1)
            l = dim_match.group(2)
            uom = re.findall(r'(\"|inch|in\.?|mm|cm)', dim_match.group(0), re.IGNORECASE)
            u_w = uom[0] if uom else '"'
            u_l = uom[1] if len(uom) > 1 else u_w
            
            # Rough heuristic: width is usually smaller than length for belts
            w_val = eval(w) if '/' in w else float(w)
            l_val = eval(l) if '/' in l else float(l)
            if w_val > l_val:
                w, l = l, w
            
            attrs["width"] = f"{w} {u_w}".replace('"', 'in')
            attrs["length"] = f"{l} {u_l}".replace('"', 'in')
            confidence = 0.98
        elif single_matches:
            # Maybe it's a diameter for a disc or wheel
            if product_type in ["Sanding Disc", "Cut-Off Wheel", "Grinding Wheel", "Abrasive Disc"]:
                attrs["diameter"] = f"{single_matches[0][0]} {single_matches[0][1]}".replace('"', 'in')
                confidence = 0.95
                
        return attrs, confidence

    def _extract_part_number(self, raw_text: str) -> tuple[str, float]:
        # Heuristic: Alphanumeric string often > 4 chars, might have hyphens
        # e.g., DCB518ASTS06G, ABC-123
        words = raw_text.split()
        for w in words:
            # Exclude sizes and common words
            if re.search(r'\d', w) and re.search(r'[A-Za-z]', w) and len(w) > 4:
                # Exclude if it looks like a size (e.g., 1/2"x18")
                if "x" not in w.lower() and '"' not in w:
                    return w, 0.85
        return None, 0.0

    def parse(self, raw_text: str) -> Dict[str, Any]:
        result = {
            "part_number": None,
            "brand": None,
            "manufacturer": None,
            "category": None,
            "product_type": None,
            "attributes": {},
            "sources": []
        }
        
        # Basic parsing
        pn, pn_conf = self._extract_part_number(raw_text)
        if pn:
            result["part_number"] = pn
            result["sources"].append({"source": "rule_engine", "field": "part_number", "value": pn, "confidence": pn_conf})
            
        cat, pt, cat_conf = self._extract_category_and_type(raw_text)
        if cat:
            result["category"] = cat
            result["product_type"] = pt
            result["sources"].append({"source": "rule_engine", "field": "category", "value": cat, "confidence": cat_conf})
            result["sources"].append({"source": "rule_engine", "field": "product_type", "value": pt, "confidence": cat_conf})
            
        pack, pack_conf = self._extract_pack_quantity(raw_text)
        if pack:
            result["attributes"]["pack_quantity"] = pack
            result["sources"].append({"source": "rule_engine", "field": "pack_quantity", "value": pack, "confidence": pack_conf})
            
        grit, grit_conf = self._extract_grit(raw_text)
        if grit:
            result["attributes"]["grit"] = grit
            result["sources"].append({"source": "rule_engine", "field": "grit", "value": grit, "confidence": grit_conf})
            
        if pt:
            sizes, size_conf = self._extract_size(raw_text, pt)
            if sizes:
                for k, v in sizes.items():
                    result["attributes"][k] = v
                    result["sources"].append({"source": "rule_engine", "field": k, "value": v, "confidence": size_conf})
                    
        return result

rule_engine = RuleEngine()
