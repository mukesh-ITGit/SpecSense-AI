import pandas as pd
import uuid
import io
from typing import Dict, Any, List
from app.services.pipeline import pipeline

class BatchProcessingService:
    def process_csv(self, file_content: bytes) -> Dict[str, Any]:
        df = pd.read_csv(io.BytesIO(file_content))
        return self._process_dataframe(df)

    def process_excel(self, file_content: bytes) -> Dict[str, Any]:
        df = pd.read_excel(io.BytesIO(file_content))
        return self._process_dataframe(df)
        
    def _process_dataframe(self, df: pd.DataFrame) -> Dict[str, Any]:
        # Handle NA values
        df = df.fillna("")
        
        results = []
        successful = 0
        failed = 0
        needs_review_count = 0
        
        for index, row in df.iterrows():
            # Try to build a raw_text from columns or use a specific column
            row_dict = row.to_dict()
            
            # Heuristic to find the best column for raw text
            raw_text = ""
            for col in ["Product Name", "product_name", "description", "raw_product", "title", "Title"]:
                if col in row_dict and row_dict[col]:
                    raw_text = str(row_dict[col])
                    break
                    
            if not raw_text:
                # Fallback: join all string columns
                raw_text = " ".join([str(v) for v in row_dict.values() if v])
                
            try:
                result = pipeline.process_raw(raw_text)
                
                # Check if other columns contain useful structured data like SKU/Brand
                if not result.get("part_number"):
                    for col in ["sku", "SKU", "part_number", "Part Number"]:
                        if col in row_dict and row_dict[col]:
                            result["part_number"] = str(row_dict[col])
                            break
                            
                results.append({"status": "success", "result": result, "original_row": row_dict})
                successful += 1
                if result.get("needs_review"):
                    needs_review_count += 1
            except Exception as e:
                results.append({"status": "failed", "error": str(e), "original_row": row_dict})
                failed += 1
                
        return {
            "job_id": f"JOB-{str(uuid.uuid4())[:8].upper()}",
            "total": len(df),
            "processed": len(df),
            "successful": successful,
            "failed": failed,
            "needs_review": needs_review_count,
            "status": "COMPLETED",
            "results": results
        }

batch_processing_service = BatchProcessingService()
