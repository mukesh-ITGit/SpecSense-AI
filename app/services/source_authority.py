import json
import os

class SourceAuthorityService:
    def __init__(self):
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        with open(os.path.join(data_dir, "source_authority.json"), "r") as f:
            self.authorities = json.load(f)
            
    def get_source_authority(self, source: str) -> int:
        return self.authorities.get(source, 0)

source_authority_service = SourceAuthorityService()
