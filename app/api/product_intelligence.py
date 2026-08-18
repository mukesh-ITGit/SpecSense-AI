from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Dict, Any
from app.schemas.product import ProductInput, ProductOutput, RawProductInput
from app.services.pipeline import pipeline
from app.services.batch_processing_service import batch_processing_service

router = APIRouter()

# Mock in-memory job storage for demo purposes
jobs_db = {}

@router.post("/products/enrich", response_model=ProductOutput)
def enrich_raw_product(input_data: RawProductInput):
    try:
        result = pipeline.process_raw(input_data.raw_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/products/upload")
async def upload_batch(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if file.filename.endswith(".csv"):
            result = batch_processing_service.process_csv(content)
        elif file.filename.endswith(".xlsx") or file.filename.endswith(".xls"):
            result = batch_processing_service.process_excel(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
            
        jobs_db[result["job_id"]] = result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs_db[job_id]


@router.post("/products/enrich-validate", response_model=ProductOutput)
def enrich_and_validate(product: ProductInput):
    try:
        result = pipeline.process(product.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/products/enrich-validate/batch", response_model=List[ProductOutput])
def enrich_and_validate_batch(products: List[ProductInput]):
    try:
        results = [pipeline.process(p.model_dump()) for p in products]
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products/{product_id}/explanation")
def debug_explanation(product_id: str):
    # This debug endpoint would typically pull from a database.
    # Since we don't have persistence yet, we just return a placeholder.
    return {
        "message": f"Explanation endpoint for {product_id} is active.",
        "note": "Requires database persistence to fetch previous pipeline results."
    }
