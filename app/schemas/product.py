from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

class RawProductInput(BaseModel):
    raw_text: str

class ProductInput(BaseModel):
    product_id: str
    part_number: str
    brand: str
    manufacturer: str
    category: str
    attributes: Dict[str, Any]
    raw_sources: Optional[List[Dict[str, Any]]] = []

class RequiredFieldsValidation(BaseModel):
    status: str

class LOVValidation(BaseModel):
    status: str

class UOMValidation(BaseModel):
    status: str

class CharacterLimitsValidation(BaseModel):
    status: str

class AutoCorrection(BaseModel):
    field: str
    original_value: str
    normalized_value: str
    reason: str

class ValidationObject(BaseModel):
    overall_status: str
    required_fields: RequiredFieldsValidation
    lov: LOVValidation
    uom: UOMValidation
    character_limits: CharacterLimitsValidation
    auto_corrections: List[AutoCorrection]
    errors: List[str]
    warnings: List[str]

class ConfidenceTag(BaseModel):
    value: Optional[Any]
    tag: str
    why: List[str]

class ConflictValue(BaseModel):
    source: str
    value: Any

class Conflict(BaseModel):
    field: str
    conflict: bool
    values: List[ConflictValue]
    recommended_value: Any
    reason: str

class TrustBreakdown(BaseModel):
    completeness: int
    validation: int
    source_reliability: int
    extraction_confidence: int
    conflict_penalty: int

class ProductOutput(BaseModel):
    product_id: str
    part_number: str
    brand: str
    manufacturer: str
    category: str
    attributes: Dict[str, Any]
    invoice_description: str
    mobile_description: str
    product_title: str
    long_description: str
    validation: ValidationObject
    trust_score: int
    trust_breakdown: Optional[TrustBreakdown] = None
    confidence_tags: Dict[str, ConfidenceTag]
    conflicts: List[Conflict]
    needs_review: bool
    review_reasons: Optional[List[str]] = []
    why: Optional[List[str]] = []
