# Mandi Price Advisor 🌾

An enterprise-grade, dual-source agricultural AI decision backend & dashboard designed to answer farmer and trader questions regarding crop selling, holding, and storage decisions. The system combines:
1. **Structured Daily Mandi Price Data** from Agmarknet APMC markets (`mandi_prices` PostgreSQL table).
2. **Unstructured Agronomic Advisory Documents** from ICAR (Indian Council of Agricultural Research) and State Agriculture Departments (`advisory_chunks` pgvector table).

---

## 🌟 Key Capabilities

1. **Dual-Route LLM Query Router**:
   - Classifies queries into `STRUCTURED` (SQL-only), `UNSTRUCTURED` (RAG-only), or `HYBRID` (dual retrieval).
   - Multilingual support: understands **English**, **हिंदी (Hindi)**, and **ಕನ್ನಡ (Kannada)**.
2. **AST-Sandboxed Text-to-SQL Engine**:
   - Translates natural language questions into safe, parameterized PostgreSQL `SELECT` queries against `mandi_prices`.
   - AST sanitizer blocks mutations (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`), comments, multi-statement injection, and unauthorized tables.
3. **pgvector Semantic RAG Retrieval**:
   - Chunks and embeds agronomic literature (1536 dimensions) with cosine distance search (`<=>` operator) and crop/category filtering.
4. **Grounded Answer Synthesis**:
   - Produces reasoned decision recommendations (`HOLD`, `SELL_NOW`, `STAGGER_SELL`, `MONITOR`).
   - Weighs price trends against spoilage/storage loss risks and provides a transparency report with executed SQL and cited ICAR papers.
   - Includes **Confidence & Uncertainty estimation** (`HIGH`, `MEDIUM`, `LOW`).
5. **Async Ingestion Pipeline (Celery + Redis)**:
   - Periodic Celery task syncs with Agmarknet API daily.
   - Background document chunker and vector embedding worker.
6. **Redis Response Caching**:
   - Short TTL caching on repeated queries.
7. **Prometheus & Grafana Observability**:
   - Exposes `/metrics` tracking query classification distribution, latency percentiles (SQL, RAG, synthesis), token usage, and confidence breakdown.
8. **Interactive React Dashboard**:
   - AI Advisor chat with transparency drawer.
   - Interactive historical Mandi price charts (Min, Max, Modal prices).
   - ICAR knowledge base browser & advisory document uploader.
   - Real-time system metrics & query audit logs.

---

## 🚀 Quick Start with Docker Compose

To spin up all 7 services (PostgreSQL with pgvector, Redis, Django Backend, Celery Worker, Celery Beat, Prometheus, Grafana, React Frontend):

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start all containers in detached mode
docker compose up --build -d
```

### Services Access
| Service | URL | Default Credentials |
| :--- | :--- | :--- |
| **Frontend Web App** | `http://localhost:5173` | - |
| **Django REST API** | `http://localhost:8000/api/` | - |
| **Prometheus Metrics** | `http://localhost:9090` | - |
| **Grafana Dashboards** | `http://localhost:3000` | `admin` / `admin` |
| **PostgreSQL (pgvector)** | `localhost:5432` | `postgres` / `postgres` |

---

## 🛠️ Local Development Setup (Without Docker)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed database with realistic Mandi prices and ICAR advisories
python manage.py seed_mandi_data --days 180
python manage.py seed_advisories

# Run unit and integration tests
python manage.py test advisor

# Start Django development server
python manage.py runserver 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📡 API Reference

### 1. Execute Advisor Query
- **Endpoint**: `POST /api/query/`
- **Request Body**:
```json
{
  "query": "Should I sell my wheat now in Karnataka or wait for 2 weeks?"
}
```
- **Response**:
```json
{
  "query": "Should I sell my wheat now in Karnataka or wait for 2 weeks?",
  "detected_language": "en",
  "routed_category": "HYBRID",
  "routing_reason": "Query classified as HYBRID based on agricultural intent analysis.",
  "answer": "Based on current Agmarknet mandi price trends and ICAR post-harvest advisories, holding or staggered selling is recommended...",
  "decision_action": "HOLD",
  "reasoning": [
    "Modal prices have appreciated 6.4% over the preceding 14 days in regional markets.",
    "ICAR storage guidelines indicate controlled humidity storage limits spoilage below 3% per month.",
    "Market arrivals are projected to tighten in the next 2-3 weeks before peak Kharif harvest."
  ],
  "confidence": "HIGH",
  "uncertainty_reason": "",
  "sql_executed": "SELECT arrival_date, commodity, state, market, modal_price, min_price, max_price FROM mandi_prices WHERE LOWER(commodity) = 'wheat' AND LOWER(state) = 'karnataka' ORDER BY arrival_date DESC LIMIT 15;",
  "sql_records_count": 15,
  "sources_cited": [
    {
      "title": "Wheat Rabi Marketing Strategy, Storage Economics, and MSP Dynamics",
      "source": "ICAR - Indian Agricultural Research Institute (IARI) & Dept of Agriculture",
      "crop": "Wheat",
      "category": "harvesting",
      "relevance_score": 0.88
    }
  ],
  "execution_time_ms": 48.2,
  "is_cached": false
}
```

### 2. Price Trends & Analytics
- **Endpoint**: `GET /api/prices/trends/?commodity=Wheat&state=Karnataka&days=30`

### 3. Ingest Advisory Document
- **Endpoint**: `POST /api/advisories/upload/`
- **Request Body**:
```json
{
  "title": "Onion Storage Moisture Control",
  "source": "ICAR-DOGR",
  "crop": "Onion",
  "category": "storage",
  "document_text": "Detailed post-harvest text..."
}
```

### 4. Trigger Ingestion / Seeding
- **Endpoint**: `POST /api/ingest/trigger/`
- **Payload**: `{"action": "seed_all"}` or `{"action": "sync_agmarknet"}`

---

## 🧪 Running Automated Tests
```bash
python backend/manage.py test advisor
```
Test suite validates:
- AST SQL Sanitizer (blocks mutations, comments, and non-whitelisted tables)
- Vector embedding generation and cosine similarity search
- Intent classification for Structured, Unstructured, Hybrid, and Regional queries (Hindi/Kannada)
- End-to-end API response contract & Redis caching
- Price trends aggregations
