# SpecSense AI

SpecSense AI is an enterprise-grade AI Catalog Intelligence SaaS platform. It ingests messy, raw industrial product data (from single inputs or bulk CSV/Excel uploads) and transforms it into clean, commerce-ready data through a multi-stage AI pipeline.

## Features

- **AI Enrichment**: Automatically normalizes attributes, extracts missing fields, and detects categories.
- **Conflict Resolution**: Highlights discrepancies between multiple data sources (e.g., ERP vs. Supplier) side-by-side.
- **Trust Scoring Engine**: Every product is scored on completeness, source reliability, and extraction confidence.
- **Explainable AI**: "Why?" panels provide clear audit trails for every automated decision and inferred attribute.
- **Batch Processing**: Animated, chunked processing of large CSV/Excel files with live status polling.

## Architecture

```text
Frontend (React/Vite) <---> REST API (FastAPI) <---> AI Pipeline
      |                                                  |
  Framer Motion                                   1. Normalization
  Tailwind / CSS Vars                             2. Conflict Detection
  Lucide Icons                                    3. Validation (Rules/LOV)
  Recharts                                        4. Content Generation
                                                  5. Confidence Scoring
                                                  6. Trust Scoring
                                                  7. Review Routing
                                                  8. Explainability
```

## Setup & Running

### Backend
1. Ensure Python 3.10+ is installed.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and add your OpenAI API Key.
4. Run the API:
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   The backend will start at `http://127.0.0.1:8000`.

### Frontend
1. Ensure Node.js is installed.
2. Navigate to `frontend/` and install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## How the AI Trust Scoring Works

The core value of SpecSense AI relies on an automated **Trust Score**. This isn't a black box; it's calculated using the following breakdown (Total 100 points):

- **Completeness (25 pts)**: Deductions for missing required or recommended attributes.
- **Validation (25 pts)**: Based on adherence to strict LOVs (Lists of Values), character limits, and predefined schemas.
- **Source Reliability (25 pts)**: Trusted ERP sources weight higher than unknown external scrape data.
- **Extraction Confidence (25 pts)**: The LLM/Rule engine assigns a confidence level to the values it extracts.

If a Trust Score falls below the **85 threshold**, or if critical conflicts exist, the record is flagged for the **Human Review Queue**.
