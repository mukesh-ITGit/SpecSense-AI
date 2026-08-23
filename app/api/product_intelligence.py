from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
from app.schemas.product import ProductInput, ProductOutput, RawProductInput
from app.services.pipeline import pipeline
from app.services.batch_processing_service import batch_processing_service
from app.api.store import store

router = APIRouter()
import uuid

# Mock in-memory job storage for demo purposes
jobs_db = {}

def error_response(code: int, error: str, detail: str):
    return JSONResponse(status_code=code, content={"error": error, "detail": detail, "code": code})

@router.post("/products/enrich", response_model=ProductOutput)
def enrich_raw_product(input_data: RawProductInput):
    if not input_data.raw_text or not input_data.raw_text.strip():
        raise HTTPException(status_code=400, detail="raw_text cannot be empty")
    try:
        result = pipeline.process_raw(input_data.raw_text)
        store.add_product(result)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enrichment Failed: {str(e)}")

@router.post("/products/upload")
async def upload_batch(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        if not file.filename:
            return error_response(400, "Invalid File", "No filename provided")
            
        content = await file.read()
        if not content:
            return error_response(400, "Empty File", "The uploaded file is empty")
            
        if len(content) > 50 * 1024 * 1024:
            return error_response(413, "File Too Large", "File exceeds 50MB limit")
            
        job_id = f"JOB-{str(uuid.uuid4())[:8].upper()}"
        
        jobs_db[job_id] = {
            "job_id": job_id,
            "status": "QUEUED",
            "total": 0,
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "needs_review": 0,
            "results": []
        }

        filename = file.filename.lower()
        if filename.endswith(".csv"):
            background_tasks.add_task(batch_processing_service.process_csv_background, content, job_id, jobs_db)
        elif filename.endswith(".xlsx"):
            background_tasks.add_task(batch_processing_service.process_excel_background, content, job_id, jobs_db)
        else:
            return error_response(400, "Unsupported Format", "Only CSV and Excel files are supported")
            
        return {"job_id": job_id, "status": "QUEUED"}
    except Exception as e:
        return error_response(500, "Upload Failed", str(e))

@router.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    if job_id not in jobs_db:
        return error_response(404, "Job Not Found", f"No job exists with ID {job_id}")
    return jobs_db[job_id]


@router.post("/products/enrich-validate", response_model=ProductOutput)
def enrich_and_validate(product: ProductInput):
    try:
        result = pipeline.process(product.model_dump())
        return result
    except Exception as e:
        return error_response(500, "Validation Failed", str(e))

@router.post("/products/enrich-validate/batch", response_model=List[ProductOutput])
def enrich_and_validate_batch(products: List[ProductInput]):
    try:
        results = [pipeline.process(p.model_dump()) for p in products]
        return results
    except Exception as e:
        return error_response(500, "Batch Validation Failed", str(e))

@router.get("/products/{product_id}/explanation")
def get_product_explanation(product_id: str):
    # Lookup in store.products by product_id or part_number
    prod = store.products.get(product_id)
    if not prod:
        for p in store.products.values():
            if p.get("part_number") == product_id or p.get("product_id") == product_id:
                prod = p
                break
                
    if prod:
        return {
            "product_id": prod.get("product_id"),
            "part_number": prod.get("part_number"),
            "trust_score": prod.get("trust_score"),
            "trust_breakdown": prod.get("trust_breakdown"),
            "confidence_tags": prod.get("confidence_tags"),
            "validation": prod.get("validation"),
            "conflicts": prod.get("conflicts"),
            "needs_review": prod.get("needs_review"),
            "review_reasons": prod.get("review_reasons"),
            "why": prod.get("why", [])
        }
    return {
        "product_id": product_id,
        "message": f"Explanation endpoint for {product_id} is active.",
        "note": "Product not found in active in-memory store. Process a product to view live audit traces."
    }

@router.post("/reviews/{product_id}/action")
def handle_review_action(product_id: str, payload: Dict[str, Any]):
    action = payload.get("action", "approved")
    note = payload.get("note", "")
    success = store.update_review(product_id, action, note)
    if not success:
        # If not in reviews directly, also check part_number
        for pid, rev in store.reviews.items():
            if rev.get("part_number") == product_id:
                store.update_review(pid, action, note)
                return {"status": "success", "action": action, "product_id": pid}
        return error_response(404, "Review Not Found", f"No pending review for product {product_id}")
    return {"status": "success", "action": action, "product_id": product_id}

@router.post("/conflicts/{product_id}/resolve")
def resolve_conflict_action(product_id: str, payload: Dict[str, Any]):
    action = payload.get("action", "accept")
    resolution_val = payload.get("value")
    success = store.resolve_conflict(product_id, action, resolution_val)
    if not success:
        for pid, conf in store.conflicts.items():
            if conf.get("part_number") == product_id:
                store.resolve_conflict(pid, action, resolution_val)
                return {"status": "success", "action": action, "product_id": pid}
        return error_response(404, "Conflict Not Found", f"No active conflict for product {product_id}")
    return {"status": "success", "action": action, "product_id": product_id}

@router.get("/metrics/dashboard", response_model=Dict[str, Any])
def get_dashboard_metrics():
    return store.get_dashboard_metrics()

@router.get("/activities", response_model=List[Dict[str, Any]])
def get_activities():
    return store.activities

@router.get("/products", response_model=List[Dict[str, Any]])
def get_products():
    return list(store.products.values())

@router.get("/reviews", response_model=List[Dict[str, Any]])
def get_reviews():
    return list(store.reviews.values())

@router.get("/conflicts", response_model=List[Dict[str, Any]])
def get_conflicts():
    return list(store.conflicts.values())
