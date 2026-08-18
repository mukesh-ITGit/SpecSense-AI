import os
import json
import traceback
from typing import Dict, Any

class LLMFallback:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        
    def extract(self, raw_text: str) -> Dict[str, Any]:
        """
        Uses OpenAI to parse raw text into structured JSON.
        Fails gracefully and returns empty dictionary if it fails.
        """
        if not self.api_key:
            return {}
            
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_key)
            
            prompt = f"""
            Extract industrial product information from the following text:
            "{raw_text}"
            
            Return JSON with:
            - part_number (string or null)
            - brand (string or null)
            - manufacturer (string or null)
            - category (string or null)
            - product_type (string or null)
            - attributes (dict of relevant attributes like width, length, grit, pack_quantity, etc.)
            
            Do NOT invent information that is not present in the text.
            Reply with raw JSON only.
            """
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo", # Default fallback model
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0
            )
            
            content = response.choices[0].message.content
            # Strip markdown if present
            content = content.replace('```json', '').replace('```', '').strip()
            
            data = json.loads(content)
            
            # Tag the source
            data["sources"] = []
            for field, val in data.items():
                if field not in ["attributes", "sources"] and val:
                    data["sources"].append({
                        "source": "llm_fallback",
                        "field": field,
                        "value": val,
                        "confidence": 0.8 # Lower confidence than rule engine
                    })
            
            if "attributes" in data:
                for attr_key, attr_val in data["attributes"].items():
                    data["sources"].append({
                        "source": "llm_fallback",
                        "field": attr_key,
                        "value": attr_val,
                        "confidence": 0.8
                    })
                    
            return data
            
        except Exception as e:
            print(f"LLM Fallback failed: {e}")
            traceback.print_exc()
            return {}

llm_fallback = LLMFallback()
