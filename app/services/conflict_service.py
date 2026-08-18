from typing import Dict, Any, List, Tuple
from app.services.source_authority import source_authority_service

class ConflictService:
    def detect_conflicts(self, product: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        # Returns list of conflicts, and a dictionary of recommended resolved attributes
        conflicts = []
        resolved_product = product.copy()
        resolved_attributes = product.get("attributes", {}).copy()
        
        raw_sources = product.get("raw_sources", [])
        if not raw_sources:
            resolved_product["attributes"] = resolved_attributes
            return conflicts, resolved_product
            
        # Group raw sources by field
        field_sources = {}
        for src_entry in raw_sources:
            field = src_entry.get("field")
            if field:
                if field not in field_sources:
                    field_sources[field] = []
                field_sources[field].append(src_entry)
                
        for field, entries in field_sources.items():
            first_val = str(entries[0].get("value", "")).lower().strip()
            if len(entries) > 1:
                # Check if values actually conflict
                has_conflict = any(str(e.get("value", "")).lower().strip() != first_val for e in entries)
                
                if has_conflict:
                    # Resolve conflict by authority
                    sorted_entries = sorted(
                        entries,
                        key=lambda x: source_authority_service.get_source_authority(x.get("source", "")),
                        reverse=True
                    )
                    best_entry = sorted_entries[0]
                    recommended_value = best_entry.get("value")
                    best_source = best_entry.get("source")
                    
                    conflict_obj = {
                        "field": field,
                        "conflict": True,
                        "values": [{"source": e.get("source"), "value": e.get("value")} for e in entries],
                        "recommended_value": recommended_value,
                        "reason": f"{best_source} source has higher authority"
                    }
                    conflicts.append(conflict_obj)
                    
                    # Update the resolved attributes with the recommended value
                    resolved_attributes[field] = recommended_value
                else:
                    # Values are same, no conflict, just add to resolved attributes
                    resolved_attributes[field] = entries[0].get("value")
            else:
                # Only one entry, no conflict
                resolved_attributes[field] = entries[0].get("value")
                    
        resolved_product["attributes"] = resolved_attributes
        return conflicts, resolved_product

conflict_service = ConflictService()
