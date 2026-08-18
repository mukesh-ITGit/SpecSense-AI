import re
from typing import Dict, Any, List, Tuple

class NormalizationService:
    def __init__(self):
        # Could load from config, but hardcoding for demo per prompt
        self.uom_map = {
            "\"": "in",
            "inch": "in",
            "inches": "in",
            "IN": "in",
            "pc": "",
            "pcs": ""
        }
        
    def normalize(self, product: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:
        corrections = []
        normalized_product = product.copy()
        
        # Normalize Brand
        if "brand" in normalized_product and isinstance(normalized_product["brand"], str):
            orig = normalized_product["brand"]
            norm = orig.strip().upper()
            if orig != norm:
                normalized_product["brand"] = norm
                corrections.append({
                    "field": "brand",
                    "original_value": orig,
                    "normalized_value": norm,
                    "reason": "Brand casing normalization"
                })
                
        # Normalize Manufacturer
        if "manufacturer" in normalized_product and isinstance(normalized_product["manufacturer"], str):
            orig = normalized_product["manufacturer"]
            norm = orig.strip().upper()
            if orig != norm:
                normalized_product["manufacturer"] = norm
                corrections.append({
                    "field": "manufacturer",
                    "original_value": orig,
                    "normalized_value": norm,
                    "reason": "Manufacturer casing normalization"
                })
                
        # Normalize attributes
        if "attributes" in normalized_product and isinstance(normalized_product["attributes"], dict):
            new_attrs = {}
            for k, v in normalized_product["attributes"].items():
                if isinstance(v, str):
                    orig = v
                    norm = orig.strip()
                    # UOM normalization (e.g. 1/2" -> 1/2 in)
                    # We match a number followed by an optional space, followed by UOM
                    for old_uom, new_uom in self.uom_map.items():
                        if old_uom == '"':
                            # Special case for quotes
                            if norm.endswith('"'):
                                norm = norm[:-1] + " in"
                        elif norm.lower().endswith(old_uom):
                            # Replace suffix
                            pattern = re.compile(rf'\s*{old_uom}$', re.IGNORECASE)
                            norm = pattern.sub(f' {new_uom}', norm).strip()
                    
                    if orig != norm:
                        corrections.append({
                            "field": k,
                            "original_value": orig,
                            "normalized_value": norm,
                            "reason": "Attribute UOM/whitespace normalization"
                        })
                    new_attrs[k] = norm
                else:
                    new_attrs[k] = v
            normalized_product["attributes"] = new_attrs
            
        return normalized_product, corrections

normalization_service = NormalizationService()
