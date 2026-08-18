from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.product_intelligence import router as product_router

app = FastAPI(
    title="SpecSense AI - Product Intelligence",
    description="Person 2 + Person 3 Integrated Backend Module",
    version="1.0.0"
)

# CORS middleware for Person 4's frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(product_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to SpecSense AI Product Intelligence API"}
