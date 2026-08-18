import json
import os
from typing import Dict, Any, List

class ValidationService:
    def __init__(self):
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        with open(os.path.join(data_dir, "validation_rules.json"), "r") as f:
            self.rules = json.load(f)
        with open(os.path.join(data_dir, "lov_values.json"), "r") as f:
            self.lovs = json.load(f)
        with open(os.path.join(data_dir, "approved_brands.json"), "r") as f:
            self.brands = json.load(f)

    def validate_required(self, product: Dict[str, Any]) -> tuple[bool, List[str]]:
        missing = []
        attrs = product.get("attributes", {})
        for field in self.rules["required_fields"]:
            if not product.get(field) and not attrs.get(field):
                missing.append(field)
        return len(missing) == 0, missing

    def validate_lov(self, product: Dict[str, Any]) -> tuple[bool, List[str]]:
        errors = []
        cat = product.get("category")
        if cat in self.lovs["categories"]:
            pt = product.get("attributes", {}).get("product_type")
            if pt and pt not in self.lovs["categories"][cat]["product_types"]:
                errors.append(f"Invalid product_type '{pt}' for category '{cat}'")
        return len(errors) == 0, errors

    def validate_brand(self, product: Dict[str, Any]) -> tuple[bool, List[str]]:
        brand = product.get("brand")
        if brand and brand not in self.brands:
            return False, [f"Unknown brand '{brand}'"]
        return True, []

    def validate_limits(self, product_output: Dict[str, Any]) -> tuple[bool, List[str]]:
        errors = []
        for field, limit in self.rules["character_limits"].items():
            val = product_output.get(field, "")
            if len(val) > limit:
                errors.append(f"Field '{field}' exceeds character limit {limit}")
        return len(errors) == 0, errors

validation_service = ValidationService()
