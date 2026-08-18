from typing import Dict, Any, List

class ConfidenceService:
    def evaluate_confidence(self, product: Dict[str, Any], validation_result: Dict[str, Any], conflicts: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        tags = {}
        
        # Check brand
        brand = product.get("brand")
        if brand:
            # Check if it was in the unknown brand list based on validation errors
            is_valid_brand = not any("Unknown brand" in err for err in validation_result.get("errors", []))
            if is_valid_brand:
                tags["brand"] = {
                    "value": brand,
                    "tag": "VERIFIED",
                    "why": ["Matches approved brand information"]
                }
            else:
                tags["brand"] = {
                    "value": brand,
                    "tag": "MISSING_INVALID",
                    "why": ["Brand not in approved brand list"]
                }
        else:
            tags["brand"] = {
                "value": None,
                "tag": "MISSING_INVALID",
                "why": ["No reliable brand information available"]
            }
            
        # Check attributes
        attrs = product.get("attributes", {})
        for k, v in attrs.items():
            # Was there a conflict for this attribute?
            conflict = next((c for c in conflicts if c["field"] == k), None)
            
            # Was this attribute auto-corrected?
            correction = next((c for c in validation_result.get("auto_corrections", []) if c["field"] == k), None)

            if conflict:
                tags[k] = {
                    "value": v,
                    "tag": "AI_RECOMMENDED",
                    "why": [f"Selected {v} based on source authority due to conflict"]
                }
            elif correction:
                tags[k] = {
                    "value": v,
                    "tag": "INFERRED",
                    "why": [f"Value was normalized/inferred from '{correction['original_value']}' to '{v}'"]
                }
            elif v:
                tags[k] = {
                    "value": v,
                    "tag": "VERIFIED",
                    "why": ["Directly extracted and normalized"]
                }
            else:
                tags[k] = {
                    "value": None,
                    "tag": "MISSING_INVALID",
                    "why": [f"No reliable {k} information available"]
                }
                
        return tags

confidence_service = ConfidenceService()
