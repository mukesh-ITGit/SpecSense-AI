import json
import os
from typing import Dict, Any, List

class TrustScoreService:
    def __init__(self):
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        with open(os.path.join(data_dir, "validation_rules.json"), "r") as f:
            rules = json.load(f)
            self.weights = rules["trust_score_weights"]
            
    def calculate_score(self, product: Dict[str, Any], validation: Dict[str, Any], conflicts: List[Dict[str, Any]], tags: Dict[str, Any]) -> Dict[str, Any]:
        breakdown = {
            "completeness": 0,
            "validation": 0,
            "source_reliability": 0,
            "extraction_confidence": 0,
            "conflict_penalty": 0
        }
        
        # Completeness (missing required fields reduces score)
        req_passed = validation["required_fields"]["status"] == "passed"
        breakdown["completeness"] = self.weights["completeness"] if req_passed else int(self.weights["completeness"] * 0.5)
        
        # Validation Compliance
        val_passed = validation["overall_status"] == "valid"
        breakdown["validation"] = self.weights["validation"] if val_passed else int(self.weights["validation"] * 0.5)
        
        # Source Reliability (basic assumption if verified/inferred tags exist)
        reliable_count = sum(1 for tag in tags.values() if tag["tag"] in ["VERIFIED", "INFERRED", "AI_RECOMMENDED"])
        total_tags = len(tags) if tags else 1
        source_ratio = reliable_count / total_tags
        breakdown["source_reliability"] = int(self.weights["source_reliability"] * source_ratio)
        
        # Extraction Confidence
        missing_invalid = sum(1 for tag in tags.values() if tag["tag"] == "MISSING_INVALID")
        conf_ratio = (total_tags - missing_invalid) / total_tags
        breakdown["extraction_confidence"] = int(self.weights["extraction_confidence"] * conf_ratio)
        
        # Conflict Penalty
        if conflicts:
            breakdown["conflict_penalty"] = self.weights.get("conflict_penalty_weight", 10)
            
        total_score = sum([
            breakdown["completeness"],
            breakdown["validation"],
            breakdown["source_reliability"],
            breakdown["extraction_confidence"]
        ]) - breakdown["conflict_penalty"]
        
        total_score = max(0, min(100, total_score))
        
        return {
            "trust_score": total_score,
            "breakdown": breakdown
        }

trust_score_service = TrustScoreService()
