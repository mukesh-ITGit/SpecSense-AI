import json
import os
import uuid
from typing import Dict, Any, List

from app.services.extraction.rule_engine import rule_engine
from app.services.extraction.llm_fallback import llm_fallback

class EnrichmentService:
    def __init__(self):
        data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
        with open(os.path.join(data_dir, "approved_brands.json"), "r") as f:
            self.approved_brands = json.load(f)

    def _match_brand(self, raw_text: str) -> tuple[str, float]:
        text_upper = raw_text.upper()
        for brand in self.approved_brands:
            if brand in text_upper:
                return brand, 1.0
        return None, 0.0

    def enrich(self, raw_text: str) -> Dict[str, Any]:
        """
        Executes Person 1 hybrid extraction.
        """
        # 1. Deterministic Rule Extraction
        rule_data = rule_engine.parse(raw_text)
        
        # Add Brand Matching
        b_match, b_conf = self._match_brand(raw_text)
        if b_match:
            rule_data["brand"] = b_match
            # Often Manufacturer is the Brand for these tools unless specified
            rule_data["manufacturer"] = b_match
            rule_data["sources"].append({"source": "rule_engine", "field": "brand", "value": b_match, "confidence": b_conf})
            rule_data["sources"].append({"source": "rule_engine", "field": "manufacturer", "value": b_match, "confidence": b_conf})

        # 2. Check if we have high confidence for core fields
        core_fields_present = all([
            rule_data.get("part_number"),
            rule_data.get("brand"),
            rule_data.get("category"),
            rule_data.get("product_type")
        ])
        
        # 3. LLM Fallback (only if missing core fields and LLM is enabled)
        llm_data = {}
        if not core_fields_present:
            llm_data = llm_fallback.extract(raw_text)
            
        # 4. Merge results (Rule Engine takes precedence)
        final_data = {
            "product_id": f"PROD-{str(uuid.uuid4())[:8].upper()}",
            "part_number": rule_data.get("part_number") or llm_data.get("part_number") or "",
            "brand": rule_data.get("brand") or llm_data.get("brand") or "",
            "manufacturer": rule_data.get("manufacturer") or llm_data.get("manufacturer") or "",
            "category": rule_data.get("category") or llm_data.get("category") or "",
            "attributes": {},
            "raw_sources": rule_data.get("sources", []) + llm_data.get("sources", [])
        }
        
        # Handle Product Type mapping to attributes since Person 2 expects it there
        pt = rule_data.get("product_type") or llm_data.get("product_type")
        if pt:
            final_data["attributes"]["product_type"] = pt
            
        # Merge attributes
        llm_attrs = llm_data.get("attributes", {})
        rule_attrs = rule_data.get("attributes", {})
        
        for k, v in llm_attrs.items():
            final_data["attributes"][k] = v
        for k, v in rule_attrs.items():
            final_data["attributes"][k] = v # Overwrite LLM with rules
            
        return final_data

enrichment_service = EnrichmentService()
