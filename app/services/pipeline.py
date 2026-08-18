from typing import Dict, Any, List
from app.services.normalization_service import normalization_service
from app.services.validation_service import validation_service
from app.services.content_generator import content_generator
from app.services.conflict_service import conflict_service
from app.services.confidence_service import confidence_service
from app.services.trust_score_service import trust_score_service
from app.services.review_service import review_service
from app.services.explainability_service import explainability_service
from app.services.extraction.enrichment_service import enrichment_service

class Pipeline:
    def process_raw(self, raw_text: str) -> Dict[str, Any]:
        enriched_product = enrichment_service.enrich(raw_text)
        return self.process(enriched_product)

    def process(self, product_input: Dict[str, Any]) -> Dict[str, Any]:
        # 1. Normalization
        normalized_product, corrections = normalization_service.normalize(product_input)
        
        # 2. Conflict Detection (Mocked via raw_sources)
        conflicts, resolved_product = conflict_service.detect_conflicts(normalized_product)
        
        # 3. Validation
        req_pass, req_missing = validation_service.validate_required(resolved_product)
        lov_pass, lov_errors = validation_service.validate_lov(resolved_product)
        brand_pass, brand_errors = validation_service.validate_brand(resolved_product)
        
        # 4. Content Generation
        content = content_generator.generate(resolved_product)
        
        # Additional limit validation on generated content
        merged_for_limits = {**resolved_product, **content}
        lim_pass, lim_errors = validation_service.validate_limits(merged_for_limits)
        
        errors = lov_errors + brand_errors + lim_errors
        warnings = []
        if req_missing:
            errors.append(f"Missing required fields: {', '.join(req_missing)}")
            
        overall_status = "valid" if req_pass and lov_pass and brand_pass and lim_pass else "invalid"
        
        validation_obj = {
            "overall_status": overall_status,
            "required_fields": {"status": "passed" if req_pass else "failed"},
            "lov": {"status": "passed" if lov_pass else "failed"},
            "uom": {"status": "passed"}, # Simplified UOM as it was handled in normalization
            "character_limits": {"status": "passed" if lim_pass else "failed"},
            "auto_corrections": corrections,
            "errors": errors,
            "warnings": warnings
        }
        
        # 5. Confidence Tags
        tags = confidence_service.evaluate_confidence(resolved_product, validation_obj, conflicts)
        
        # 6. Trust Score
        trust_data = trust_score_service.calculate_score(resolved_product, validation_obj, conflicts, tags)
        
        # 7. Review Engine
        needs_review, review_reasons = review_service.evaluate_review(validation_obj, conflicts, trust_data["trust_score"])
        
        # 8. Explainability
        why = explainability_service.generate_overall_explanation(validation_obj, conflicts, tags)
        
        # Final Output Assembly
        output = {
            "product_id": resolved_product.get("product_id", ""),
            "part_number": resolved_product.get("part_number", ""),
            "brand": resolved_product.get("brand", ""),
            "manufacturer": resolved_product.get("manufacturer", ""),
            "category": resolved_product.get("category", ""),
            "attributes": resolved_product.get("attributes", {}),
            **content,
            "validation": validation_obj,
            "trust_score": trust_data["trust_score"],
            "trust_breakdown": trust_data["breakdown"],
            "confidence_tags": tags,
            "conflicts": conflicts,
            "needs_review": needs_review,
            "review_reasons": review_reasons,
            "why": why
        }
        
        return output

pipeline = Pipeline()
