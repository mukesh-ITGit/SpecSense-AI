from typing import Dict, List, Any
import datetime

# In-memory store for demo purposes
class DataStore:
    def __init__(self):
        self.products: Dict[str, Any] = {}
        self.reviews: Dict[str, Any] = {}
        self.conflicts: Dict[str, Any] = {}
        self.activities: List[Any] = []
        
        # Add some initial dummy activity
        self.add_activity("System initialized", "success")
        
    def add_product(self, product: Any):
        pid = product.get("product_id") or product.get("part_number", "UNKNOWN")
        self.products[pid] = product
        
        if product.get("needs_review"):
            self.reviews[pid] = {
                "product_id": pid,
                "part_number": product.get("part_number"),
                "product_name": product.get("product_title", ""),
                "status": "pending",
                "reasons": product.get("review_reasons", []),
                "priority": "High" if product.get("trust_score", 100) < 60 else "Medium",
                "timestamp": datetime.datetime.now().isoformat()
            }
            self.add_activity(f"Product {pid} sent to review queue", "warning")
            
        if product.get("conflicts"):
            self.conflicts[pid] = {
                "product_id": pid,
                "part_number": product.get("part_number"),
                "product_name": product.get("product_title", ""),
                "status": "unresolved",
                "conflicts": product.get("conflicts", []),
                "timestamp": datetime.datetime.now().isoformat()
            }
            self.add_activity(f"Conflict detected in {pid}", "danger")
            
        self.add_activity(f"Product {pid} enriched successfully", "success")

    def add_products_batch(self, products: List[Any]):
        """Efficiently batch-add multiple products into the store."""
        if not products:
            return

        now_iso = datetime.datetime.now().isoformat()
        needs_review_count = 0
        conflicts_count = 0

        for product in products:
            pid = product.get("product_id") or product.get("part_number", "UNKNOWN")
            self.products[pid] = product

            if product.get("needs_review"):
                needs_review_count += 1
                self.reviews[pid] = {
                    "product_id": pid,
                    "part_number": product.get("part_number"),
                    "product_name": product.get("product_title", ""),
                    "status": "pending",
                    "reasons": product.get("review_reasons", []),
                    "priority": "High" if product.get("trust_score", 100) < 60 else "Medium",
                    "timestamp": now_iso
                }

            if product.get("conflicts"):
                conflicts_count += 1
                self.conflicts[pid] = {
                    "product_id": pid,
                    "part_number": product.get("part_number"),
                    "product_name": product.get("product_title", ""),
                    "status": "unresolved",
                    "conflicts": product.get("conflicts", []),
                    "timestamp": now_iso
                }

        # Add batch summary activities
        self.add_activity(f"Batch of {len(products):,} products enriched successfully", "success")
        if needs_review_count > 0:
            self.add_activity(f"{needs_review_count:,} products routed to review queue", "warning")
        if conflicts_count > 0:
            self.add_activity(f"{conflicts_count:,} source conflicts detected across batch", "danger")


    def add_activity(self, message: str, type: str):
        self.activities.insert(0, {
            "id": f"act_{len(self.activities)}",
            "message": message,
            "type": type,
            "timestamp": datetime.datetime.now().isoformat()
        })
        if len(self.activities) > 50:
            self.activities = self.activities[:50]

    def resolve_conflict(self, product_id: str, action: str, resolution_value: Any = None):
        if product_id in self.conflicts:
            self.conflicts[product_id]["status"] = "resolved"
            self.conflicts[product_id]["resolution"] = action
            self.add_activity(f"Conflict on product {product_id} resolved ({action})", "success")
            # Update product if exists
            if product_id in self.products:
                self.products[product_id]["conflicts"] = []
            return True
        return False

    def update_review(self, product_id: str, action: str, note: str = ""):
        if product_id in self.reviews:
            self.reviews[product_id]["status"] = action  # "approved", "rejected", "edited"
            self.reviews[product_id]["note"] = note
            if product_id in self.products:
                if action == "accepted" or action == "approved":
                    self.products[product_id]["needs_review"] = False
            self.add_activity(f"Review for product {product_id} updated: {action}", "info")
            return True
        return False
            
    def get_dashboard_metrics(self):
        total_products = len(self.products)
        if total_products == 0:
            return {
                "productsProcessed": 0,
                "averageTrustScore": 0,
                "validationCompliance": 0,
                "needsReview": 0,
                "conflictsDetected": 0,
                "publishReady": 0,
                "distributionData": [
                    { "name": "90-100", "count": 0 },
                    { "name": "75-89", "count": 0 },
                    { "name": "50-74", "count": 0 },
                    { "name": "<50", "count": 0 }
                ],
                "categoryData": [],
                "trendData": [],
                "qualityStats": {
                    "overallHealth": 0,
                    "lovCompliance": 0,
                    "uomCompliance": 0,
                    "missingAttributes": 0,
                    "issues": []
                }
            }
            
        avg_trust = sum(p.get("trust_score", 0) for p in self.products.values()) / total_products
        valid_count = sum(1 for p in self.products.values() if p.get("validation", {}).get("overall_status") == "PASS")
        
        dist = {"90-100": 0, "75-89": 0, "50-74": 0, "<50": 0}
        cats = {}
        
        lov_pass_count = 0
        missing_attrs_count = 0
        issues = []
        
        for p in self.products.values():
            ts = p.get("trust_score", 0)
            if ts >= 90: dist["90-100"] += 1
            elif ts >= 75: dist["75-89"] += 1
            elif ts >= 50: dist["50-74"] += 1
            else: dist["<50"] += 1
            
            c = p.get("category", "Unknown")
            cats[c] = cats.get(c, 0) + 1
            
            val_obj = p.get("validation", {})
            if val_obj.get("lov", {}).get("status") == "passed":
                lov_pass_count += 1
            
            if val_obj.get("required_fields", {}).get("status") == "failed":
                missing_attrs_count += 1
                issues.append({"type": "Missing Attributes", "desc": f"Missing required fields for {p.get('part_number')}", "severity": "danger"})
            
            if len(issues) < 10 and ts < 70:
                issues.append({"type": "Low Confidence", "desc": f"Trust score {ts} for {p.get('part_number')}", "severity": "warning"})

        distribution_data = [{"name": k, "count": v} for k, v in dist.items()]
        category_data = [{"name": k, "value": v} for k, v in cats.items()]
        
        # Mock trend data for demo since we don't have historical data
        trend_data = [
            {"name": "Mon", "score": 85},
            {"name": "Tue", "score": 88},
            {"name": "Wed", "score": 87},
            {"name": "Thu", "score": 92},
            {"name": "Fri", "score": 94},
            {"name": "Sat", "score": round(avg_trust, 1)},
            {"name": "Sun", "score": round(avg_trust, 1)},
        ]
        
        return {
            "productsProcessed": total_products,
            "averageTrustScore": round(avg_trust, 1),
            "validationCompliance": round((valid_count / total_products) * 100, 1),
            "needsReview": len([r for r in self.reviews.values() if r["status"] == "pending"]),
            "conflictsDetected": len([c for c in self.conflicts.values() if c["status"] == "unresolved"]),
            "publishReady": total_products - len([r for r in self.reviews.values() if r["status"] == "pending"]),
            "distributionData": distribution_data,
            "categoryData": category_data,
            "trendData": trend_data,
            "qualityStats": {
                "overallHealth": round(avg_trust, 1),
                "lovCompliance": round((lov_pass_count / total_products) * 100, 1),
                "uomCompliance": 99.1, # Mocked
                "missingAttributes": missing_attrs_count,
                "issues": issues[:5] # Top 5 issues
            }
        }

store = DataStore()
