from typing import Dict, Any, List

class ReviewService:
    def evaluate_review(self, validation: Dict[str, Any], conflicts: List[Dict[str, Any]], trust_score: int) -> tuple[bool, List[str]]:
        needs_review = False
        reasons = []
        
        if validation["required_fields"]["status"] != "passed":
            needs_review = True
            reasons.append("Required field missing or invalid")
            
        if validation["lov"]["status"] != "passed":
            needs_review = True
            reasons.append("LOV validation failed")
            
        if conflicts:
            needs_review = True
            reasons.append(f"Major source conflict detected ({len(conflicts)})")
            
        if trust_score < 85:  # Configured 85 threshold per documentation
            needs_review = True
            reasons.append(f"Trust score below configured threshold of 85 (Score: {trust_score})")
            
        return needs_review, reasons

review_service = ReviewService()
