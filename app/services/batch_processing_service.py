import pandas as pd
import uuid
import io
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List
from app.services.pipeline import pipeline
from app.api.store import store

def _extract_and_process_row(row_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to process a single row dict deterministically through the pipeline."""
    raw_text = ""
    for col in ("Product Name", "product_name", "description", "raw_product", "title", "Title"):
        if col in row_dict and row_dict[col]:
            raw_text = str(row_dict[col])
            break
            
    if not raw_text:
        raw_text = " ".join(str(v) for v in row_dict.values() if v)
        
    try:
        result = pipeline.process_raw(raw_text)
        if not result.get("part_number"):
            for col in ("sku", "SKU", "part_number", "Part Number"):
                if col in row_dict and row_dict[col]:
                    result["part_number"] = str(row_dict[col])
                    break
        return {"status": "success", "result": result, "original_row": row_dict}
    except Exception as e:
        return {"status": "failed", "error": str(e), "original_row": row_dict}

class BatchProcessingService:
    def __init__(self):
        self.max_workers = min(8, max(2, (os.cpu_count() or 4)))

    def process_csv(self, file_content: bytes) -> Dict[str, Any]:
        df = pd.read_csv(io.BytesIO(file_content))
        return self._process_dataframe(df)

    def process_excel(self, file_content: bytes) -> Dict[str, Any]:
        df = pd.read_excel(io.BytesIO(file_content))
        return self._process_dataframe(df)
        
    def _process_dataframe(self, df: pd.DataFrame) -> Dict[str, Any]:
        df = df.fillna("")
        records = df.to_dict(orient="records")
        total = len(records)
        
        results: List[Dict[str, Any]] = [None] * total  # type: ignore
        successful = 0
        failed = 0
        needs_review_count = 0
        
        # Parallel execution preserving exact index order
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_idx = {executor.submit(_extract_and_process_row, rec): i for i, rec in enumerate(records)}
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                res = future.result()
                results[idx] = res
                if res["status"] == "success":
                    successful += 1
                    if res["result"].get("needs_review"):
                        needs_review_count += 1
                else:
                    failed += 1
                
        return {
            "job_id": f"JOB-{str(uuid.uuid4())[:8].upper()}",
            "total": total,
            "processed": total,
            "successful": successful,
            "failed": failed,
            "needs_review": needs_review_count,
            "status": "COMPLETED",
            "results": results
        }

    def process_csv_background(self, file_content: bytes, job_id: str, jobs_db: Dict[str, Any]):
        try:
            df = pd.read_csv(io.BytesIO(file_content))
            self._process_dataframe_background(df, job_id, jobs_db)
        except Exception as e:
            jobs_db[job_id]["status"] = "FAILED"
            jobs_db[job_id]["error"] = str(e)

    def process_excel_background(self, file_content: bytes, job_id: str, jobs_db: Dict[str, Any]):
        try:
            df = pd.read_excel(io.BytesIO(file_content))
            self._process_dataframe_background(df, job_id, jobs_db)
        except Exception as e:
            jobs_db[job_id]["status"] = "FAILED"
            jobs_db[job_id]["error"] = str(e)

    def _process_dataframe_background(self, df: pd.DataFrame, job_id: str, jobs_db: Dict[str, Any]):
        df = df.fillna("")
        records = df.to_dict(orient="records")
        total = len(records)
        
        jobs_db[job_id]["status"] = "PROCESSING"
        jobs_db[job_id]["total"] = total
        jobs_db[job_id]["processed"] = 0
        jobs_db[job_id]["successful"] = 0
        jobs_db[job_id]["failed"] = 0
        jobs_db[job_id]["needs_review"] = 0
        
        results: List[Dict[str, Any]] = [None] * total  # type: ignore
        successful_products = []
        successful = 0
        failed = 0
        needs_review_count = 0
        processed_count = 0
        
        # Parallel execution with responsive progress tracking
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_idx = {executor.submit(_extract_and_process_row, rec): i for i, rec in enumerate(records)}
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                res = future.result()
                results[idx] = res
                processed_count += 1
                
                if res["status"] == "success":
                    successful += 1
                    prod = res["result"]
                    successful_products.append(prod)
                    if prod.get("needs_review"):
                        needs_review_count += 1
                else:
                    failed += 1
                
                # Update status in responsive increments or on finish
                if processed_count % 10 == 0 or processed_count == total:
                    jobs_db[job_id]["processed"] = processed_count
                    jobs_db[job_id]["successful"] = successful
                    jobs_db[job_id]["failed"] = failed
                    jobs_db[job_id]["needs_review"] = needs_review_count

        # Bulk register products into central store
        if successful_products:
            store.add_products_batch(successful_products)

        jobs_db[job_id]["status"] = "COMPLETED"
        jobs_db[job_id]["results"] = results


batch_processing_service = BatchProcessingService()
