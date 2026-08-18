from typing import Dict, Any

class ContentGenerator:
    def generate(self, product: Dict[str, Any]) -> Dict[str, str]:
        brand = product.get("brand", "")
        category = product.get("category", "")
        attrs = product.get("attributes", {})
        
        product_type = attrs.get("product_type", category)
        width = attrs.get("width", "")
        length = attrs.get("length", "")
        pack = attrs.get("pack_quantity", "")
        
        # Build dimensions string
        dims = ""
        if width and length:
            dims = f"{width} x {length}"
        elif width:
            dims = width
            
        # Build pack string
        pack_str = f"{pack} Pack" if pack else ""
        pack_short = f"{pack}PK" if pack else ""
        
        parts = [brand, product_type, dims, f"- {pack_str}" if pack_str else ""]
        product_title = " ".join([p for p in parts if p]).replace("  ", " ").strip()
        
        inv_parts = [brand, product_type, dims, pack_short]
        invoice_description = " ".join([p for p in inv_parts if p]).replace("  ", " ").strip()
        
        mob_parts = [brand, product_type]
        if dims:
            mob_parts.append(dims)
        if pack_str:
            mob_parts.append(pack_str)
        mobile_description = ", ".join([p for p in mob_parts if p])
        
        # Long Description
        long_desc = f"{brand} {product_type.lower()}"
        if dims:
            long_desc += f" measuring {dims}"
        if pack:
            long_desc += f", supplied in a {pack}-pack."
        else:
            long_desc += "."
            
        return {
            "product_title": product_title,
            "invoice_description": invoice_description,
            "mobile_description": mobile_description,
            "long_description": long_desc
        }

content_generator = ContentGenerator()
