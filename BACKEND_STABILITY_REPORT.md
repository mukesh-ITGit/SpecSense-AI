# Backend Stability & Audit Report

This report documents the backend audit, stability fixes, trust-scoring mathematical verification, and new authentication features implemented for **SpecSense AI**.

---

### Issue 1: Pydantic Settings Deprecation Warning
**Status**: FIXED

**Observed**:
Running pytest produced deprecation warnings:
`PydanticDeprecatedSince20: Support for class-based config is deprecated, use ConfigDict instead.`

**Root Cause**:
`app/config.py` used the legacy Pydantic v1 nested `class Config:` instead of Pydantic v2's `model_config = SettingsConfigDict(env_file=".env", extra="ignore")`.

**Fix**:
Refactored `Settings` in `app/config.py` to use `pydantic_settings.SettingsConfigDict` and added configuration fields for JWT secret key and expiration parameters.

---

### Issue 2: Human Review Trust Score Threshold Drift
**Status**: FIXED

**Observed**:
In `app/services/review_service.py`, products were only flagged for review if their trust score fell below 75 (`if trust_score < 75:`), whereas the specification in `README.md` and requirements define the threshold as **85**.

**Root Cause**:
Configuration mismatch between service logic and product architecture specifications.

**Fix**:
Updated `app/services/review_service.py` to enforce the threshold of `85`:
```python
if trust_score < 85:
    needs_review = True
    reasons.append(f"Trust score below configured threshold of 85 (Score: {trust_score})")
```

---

### Issue 3: Unsafe `eval()` in Dimension Size Parsing
**Status**: FIXED

**Observed**:
`app/services/extraction/rule_engine.py` parsed fractional dimensions using `w_val = eval(w) if '/' in w else float(w)`.

**Root Cause**:
Using Python `eval()` on raw user input texts introduces potential code injection vulnerabilities and can crash with unhandled `SyntaxError` or `ZeroDivisionError` on malformed inputs (e.g., `1/0"`).

**Fix**:
Replaced `eval()` with a deterministic, safe numeric and fractional parser `_parse_dim_numeric` that splits string fractions (`4-1/2`, `1/2`) safely without code execution risk.

---

### Issue 4: Non-Persistent / Missing Live Product Explanations
**Status**: FIXED

**Observed**:
`GET /api/v1/products/{product_id}/explanation` always returned a placeholder response without inspecting stored product entities.

**Root Cause**:
The endpoint was not connected to the in-memory `DataStore`.

**Fix**:
Updated `get_product_explanation` in `app/api/product_intelligence.py` to query `store.products` by both `product_id` and `part_number`, returning real pipeline explanation trails, `confidence_tags`, `validation` audits, `trust_breakdown`, and `conflicts`.

---

### Issue 5: Missing Review & Conflict Resolution Actions
**Status**: FIXED

**Observed**:
Frontend review actions (Accept AI, Edit, Reject) and conflict resolution triggers had no corresponding backend endpoints to mutate store state.

**Fix**:
Added `store.resolve_conflict(...)` and `store.update_review(...)` methods in `app/api/store.py`, and exposed `POST /api/v1/reviews/{product_id}/action` and `POST /api/v1/conflicts/{product_id}/resolve` endpoints in `app/api/product_intelligence.py`.

---

### Feature Addition: Authentication & Authorization Engine
**Status**: IMPLEMENTED & TESTED

**Overview**:
1. **Password Hashing**: Implemented direct `bcrypt` hashing with salt generation in `app/services/auth_service.py`.
2. **JWT Generation & Verification**: PyJWT tokens generated with 24-hour expiration and HS256 algorithm.
3. **Endpoints**:
   - `POST /api/v1/auth/login`: Validates credentials, returns JWT bearer token and user metadata.
   - `POST /api/v1/auth/register`: Creates new user account and returns JWT bearer token.
   - `GET /api/v1/auth/me`: Validates bearer token and returns current user profile.
   - `POST /api/v1/auth/logout`: Confirms session termination.
4. **Pre-configured Enterprise Demo Accounts**:
   - `sarah.jenkins@specsense.ai` / `password123` (Catalog Intelligence Lead)
   - `admin@specsense.ai` / `Admin123!` (Chief Data Officer)
5. **Testing**:
   Added `tests/test_auth.py` covering login, unauthorized access, profile retrieval, and user registration. All 28 tests pass.
