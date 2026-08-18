from typing import Dict, Any, List

class ExplainabilityService:
    def generate_overall_explanation(self, validation: Dict[str, Any], conflicts: List[Dict[str, Any]], tags: Dict[str, Any]) -> List[str]:
        why = []
        
        # Validation reasons
        if validation["required_fields"]["status"] == "passed":
            why.append("✓ Required fields are complete")
        else:
            why.append("⚠ Missing required fields")
            
        if validation["lov"]["status"] == "passed":
            why.append("✓ Product type matches configured LOV")
        else:
            why.append("⚠ Product type invalid against LOV")
            
        # Conflict reasons
        if not conflicts:
            why.append("✓ No conflicting source information")
        else:
            for conflict in conflicts:
                why.append(f"⚠ {conflict['field']} conflict detected. Selected {conflict['recommended_value']} because {conflict['reason']}")
                
        # Confidence reasons for key fields
        brand_tag = tags.get("brand")
        if brand_tag and brand_tag["tag"] == "VERIFIED":
            why.append("✓ Brand verified against approved brand data")
            
        return why

explainability_service = ExplainabilityService()
