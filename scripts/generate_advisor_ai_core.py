import os

def write_file(filepath, content):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f"Wrote {filepath}")

# 1. text_to_sql.py
write_file('backend/advisor/services/text_to_sql.py', """
import re
import time
import logging
import sqlparse
from sqlparse.sql import IdentifierList, Identifier, Where
from sqlparse.tokens import Keyword, DML, DDL
from django.db import connection
from advisor.services.llm_client import llm_client
from advisor.metrics import MANDI_SQL_LATENCY

logger = logging.getLogger(__name__)

ALLOWED_TABLES = {'mandi_prices'}
DISALLOWED_KEYWORDS = {
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE',
    'EXEC', 'EXECUTE', 'GRANT', 'REVOKE', 'REPLACE', 'UPSERT', 'INTO',
    'INFORMATION_SCHEMA', 'PG_', 'SQLITE_MASTER', 'SLEEP', 'BENCHMARK',
    'PG_SLEEP', 'ADMIN', 'AUTH_USER', 'QUERY_AUDIT_LOGS', 'ADVISORY_DOCUMENTS'
}

SCHEMA_DESCRIPTION = \"\"\"
PostgreSQL Table: mandi_prices
Columns:
- id: integer (Primary Key)
- state: varchar(100) (e.g. 'Karnataka', 'Maharashtra', 'Madhya Pradesh', 'Punjab', 'Uttar Pradesh')
- district: varchar(100) (e.g. 'Bengaluru', 'Nashik', 'Indore', 'Ludhiana')
- market: varchar(150) (e.g. 'Bangalore', 'Lasalgaon', 'Azadpur', 'Khanna')
- commodity: varchar(100) (e.g. 'Wheat', 'Onion', 'Tomato', 'Potato', 'Cotton', 'Paddy(Dhan)', 'Soyabean', 'Mustard')
- variety: varchar(100) (e.g. 'Desi', 'Red', 'Hybrid', 'Local', 'FAQ')
- grade: varchar(50) (e.g. 'FAQ', 'Medium', 'Large')
- arrival_date: date (Format: YYYY-MM-DD)
- min_price: numeric (Price in Rs/Quintal)
- max_price: numeric (Price in Rs/Quintal)
- modal_price: numeric (Modal / Average Price in Rs/Quintal)

Guidelines for SQL Generation:
1. Always write standard PostgreSQL compatible SELECT queries only.
2. Use LOWER(column) = 'value' or ILIKE for state, commodity, and market matching.
3. Order by arrival_date DESC to show latest prices first.
4. Limit results to a maximum of 30 rows unless aggregating with AVG/MIN/MAX/COUNT.
5. Example: SELECT arrival_date, commodity, state, market, modal_price FROM mandi_prices WHERE LOWER(commodity) = 'wheat' AND LOWER(state) = 'karnataka' ORDER BY arrival_date DESC LIMIT 15;
\"\"\"

class SQLSanitizer:
    @staticmethod
    def validate_and_sanitize(query_str: str) -> str:
        \"\"\"Strictly validates SQL against AST rules to ensure sandboxed, read-only analytical execution.\"\"\"
        cleaned = query_str.strip().strip(';').strip('')
        if cleaned.lower().startswith('sql'):
            cleaned = cleaned[3:].strip()
            
        # Parse statements
        parsed_statements = sqlparse.parse(cleaned)
        if not parsed_statements:
            raise ValueError("Empty or unparseable SQL statement.")
            
        if len(parsed_statements) > 1:
            raise ValueError("Multiple SQL statements are strictly forbidden.")
            
        statement = parsed_statements[0]
        
        # 1. Must be SELECT statement
        if statement.get_type() != 'SELECT':
            raise ValueError(f"Disallowed query type: {statement.get_type()}. Only SELECT queries are permitted.")
            
        # 2. Check for disallowed tokens / comments
        raw_upper = cleaned.upper()
        for kw in DISALLOWED_KEYWORDS:
            # Word boundary matching
            if re.search(rf'\\b{kw}\\b', raw_upper):
                raise ValueError(f"Disallowed SQL keyword detected: '{kw}'. Query execution rejected.")
                
        if '--' in cleaned or '/*' in cleaned or '*/' in cleaned:
            raise ValueError("SQL comments ('--', '/*') are disallowed for security.")

        # 3. Verify only ALLOWED_TABLES are referenced
        # Check from tokens
        tokens = [t.value.lower() for t in statement.flatten() if not t.is_whitespace]
        if 'from' in tokens:
            from_idx = tokens.index('from')
            if from_idx + 1 < len(tokens):
                target_table = tokens[from_idx + 1].strip('(),;"\'')
                # Handle possible joins or aliases
                if target_table not in ALLOWED_TABLES:
                    raise ValueError(f"Access to table '{target_table}' is disallowed. Only 'mandi_prices' is accessible.")
        else:
            raise ValueError("Query must contain a FROM clause targeting 'mandi_prices'.")

        # 4. Enforce LIMIT clause
        if 'limit' not in tokens and 'count(' not in cleaned.lower() and 'avg(' not in cleaned.lower():
            cleaned += " LIMIT 30"
            
        return cleaned


class TextToSQLEngine:
    def __init__(self):
        self.sanitizer = SQLSanitizer()

    def generate_sql(self, user_query: str, extracted_entities: dict = None) -> str:
        \"\"\"Generates SQL query from natural language query using schema-aware prompt.\"\"\"
        system_prompt = f\"\"\"You are an expert PostgreSQL database analyst for India's Agmarknet Mandi Price system.
{SCHEMA_DESCRIPTION}

Your task:
Convert the user's natural language question into a single safe PostgreSQL SELECT query against the mandi_prices table.
Output ONLY the raw SQL code wrapped in `sql ... ` code block. Do not explain or add markdown text.
\"\"\"
        user_prompt = f"User Question: {user_query}\nExtracted Entities: {extracted_entities or {}}"
        
        raw_resp = llm_client.generate_completion(system_prompt, user_prompt, temperature=0.1)
        
        # Extract SQL from markdown codeblock if present
        match = re.search(r'`(?:sql)?\s*([\s\S]*?)\s*`', raw_resp, re.IGNORECASE)
        sql = match.group(1).strip() if match else raw_resp.strip()
        return sql

    def execute_query(self, sql_query: str) -> dict:
        \"\"\"Validates, executes SQL against database, and returns formatted tabular records + summary.\"\"\"
        start_time = time.time()
        try:
            safe_sql = self.sanitizer.validate_and_sanitize(sql_query)
            
            with connection.cursor() as cursor:
                cursor.execute(safe_sql)
                columns = [col[0] for col in cursor.description] if cursor.description else []
                rows = cursor.fetchall()
                
            elapsed = time.time() - start_time
            MANDI_SQL_LATENCY.observe(elapsed)
            
            records = [dict(zip(columns, row)) for row in rows]
            
            # Format numeric dates/decimals for JSON serialization
            formatted_records = []
            for r in records:
                formatted = {}
                for k, v in r.items():
                    if hasattr(v, 'isoformat'):
                        formatted[k] = v.isoformat()
                    elif hasattr(v, '__float__'):
                        formatted[k] = float(v)
                    else:
                        formatted[k] = v
                formatted_records.append(formatted)
                
            return {
                "success": True,
                "sql": safe_sql,
                "columns": columns,
                "records": formatted_records,
                "count": len(formatted_records),
                "execution_time_sec": round(elapsed, 4),
                "error": None
            }
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"SQL execution failed: {e} for query: {sql_query}")
            return {
                "success": False,
                "sql": sql_query,
                "columns": [],
                "records": [],
                "count": 0,
                "execution_time_sec": round(elapsed, 4),
                "error": str(e)
            }

text_to_sql_engine = TextToSQLEngine()
""")

# 2. rag_engine.py
write_file('backend/advisor/services/rag_engine.py', """
import time
import logging
import numpy as np
from django.conf import settings
from django.db import connection
from advisor.models import AdvisoryChunk, AdvisoryDocument
from advisor.services.llm_client import llm_client
from advisor.metrics import MANDI_RAG_LATENCY

logger = logging.getLogger(__name__)

class RAGEngine:
    def __init__(self):
        self.similarity_threshold = 0.40

    def retrieve(self, query: str, crop: str = None, top_k: int = 4) -> dict:
        \"\"\"Embeds query and searches top-k advisory chunks using pgvector cosine distance or numpy fallback.\"\"\"
        start_time = time.time()
        query_vector = llm_client.generate_embedding(query)
        
        chunks_data = []
        is_pgvector = hasattr(AdvisoryChunk, 'embedding') and settings.DB_ENGINE != 'sqlite'
        
        try:
            if is_pgvector:
                # Use PostgreSQL pgvector cosine distance <=>
                crop_filter_sql = "AND LOWER(c.crop) = LOWER(%s)" if crop and crop.lower() != 'general' else ""
                sql = f\"\"\"
                    SELECT c.id, c.crop, c.topic, c.chunk_index, c.content, c.metadata,
                           d.title, d.source, d.category, d.publication_date,
                           1 - (c.embedding <=> %s::vector) AS similarity
                    FROM advisory_chunks c
                    JOIN advisory_documents d ON c.document_id = d.id
                    WHERE c.embedding IS NOT NULL {crop_filter_sql}
                    ORDER BY c.embedding <=> %s::vector ASC
                    LIMIT %s;
                \"\"\"
                params = [query_vector]
                if crop and crop.lower() != 'general':
                    params.append(crop)
                params.extend([query_vector, top_k])
                
                with connection.cursor() as cursor:
                    cursor.execute(sql, params)
                    rows = cursor.fetchall()
                    
                for row in rows:
                    sim = float(row[10]) if row[10] is not None else 0.0
                    chunks_data.append({
                        "id": row[0],
                        "crop": row[1],
                        "topic": row[2],
                        "chunk_index": row[3],
                        "content": row[4],
                        "metadata": row[5] or {},
                        "doc_title": row[6],
                        "doc_source": row[7],
                        "doc_category": row[8],
                        "publication_date": row[9].isoformat() if row[9] else None,
                        "similarity_score": round(sim, 4)
                    })
            else:
                # Numpy cosine similarity fallback for SQLite / local testing
                qs = AdvisoryChunk.objects.select_related('document').all()
                if crop and crop.lower() != 'general':
                    crop_qs = qs.filter(crop__iexact=crop)
                    if crop_qs.exists():
                        qs = crop_qs
                        
                q_vec = np.array(query_vector, dtype=float)
                q_norm = np.linalg.norm(q_vec)
                
                scored_chunks = []
                for chunk in qs:
                    c_vec = np.array(chunk.get_embedding(), dtype=float)
                    if len(c_vec) == 0:
                        continue
                    c_norm = np.linalg.norm(c_vec)
                    if q_norm > 0 and c_norm > 0:
                        score = float(np.dot(q_vec, c_vec) / (q_norm * c_norm))
                    else:
                        score = 0.0
                        
                    # Also boost score if keyword matches content
                    crop_lower = crop.lower() if crop else ""
                    if crop_lower and crop_lower in chunk.content.lower():
                        score += 0.25
                        
                    scored_chunks.append((score, chunk))
                    
                scored_chunks.sort(key=lambda x: x[0], reverse=True)
                top_chunks = scored_chunks[:top_k]
                
                for sim, chunk in top_chunks:
                    chunks_data.append({
                        "id": chunk.id,
                        "crop": chunk.crop,
                        "topic": chunk.topic,
                        "chunk_index": chunk.chunk_index,
                        "content": chunk.content,
                        "metadata": chunk.metadata,
                        "doc_title": chunk.document.title,
                        "doc_source": chunk.document.source,
                        "doc_category": chunk.document.category,
                        "publication_date": chunk.document.publication_date.isoformat() if chunk.document.publication_date else None,
                        "similarity_score": round(sim, 4)
                    })
                    
        except Exception as e:
            logger.error(f"RAG retrieval failed: {e}")
            
        elapsed = time.time() - start_time
        MANDI_RAG_LATENCY.observe(elapsed)
        
        # Build citations list
        citations = []
        for c in chunks_data:
            citations.append({
                "title": c["doc_title"],
                "source": c["doc_source"],
                "category": c["doc_category"],
                "crop": c["crop"],
                "topic": c["topic"],
                "relevance_score": c["similarity_score"]
            })
            
        return {
            "query": query,
            "crop": crop,
            "chunks": chunks_data,
            "citations": citations,
            "count": len(chunks_data),
            "retrieval_time_sec": round(elapsed, 4)
        }

rag_engine = RAGEngine()
""")

# 3. router.py
write_file('backend/advisor/services/router.py', """
import json
import logging
from advisor.services.llm_client import llm_client

logger = logging.getLogger(__name__)

ROUTER_SYSTEM_PROMPT = \"\"\"
You are an intelligent Agricultural Query Classifier for the 'Mandi Price Advisor' system.
Classify each incoming user question into one of three routing categories:

1. STRUCTURED:
   - Needs only SQL tabular data from the mandi_prices database.
   - Examples: "What was the price of wheat in Karnataka last week?", "Give me highest price of onion in Lasalgaon yesterday", "Modal price trend for potato in UP".

2. UNSTRUCTURED:
   - Needs only agronomic advisory, scientific literature, storage, pest control, or post-harvest guides.
   - Examples: "Why does onion price crash after monsoon?", "How to store potatoes to avoid sprouting?", "What causes tomato fruit rot in transit?".

3. HYBRID:
   - Requires BOTH structured price trend analytics AND agronomic guidance/spoilage context to make an informed recommendation or decision.
   - Examples: "Should I sell my wheat now or wait 3 weeks?", "Is it profitable to store onions in Maharashtra right now?", "Tomato prices are falling in Bengaluru, should I harvest immediately?".

Output a valid JSON object ONLY with the following schema:
{
  "category": "STRUCTURED" | "UNSTRUCTURED" | "HYBRID",
  "crop": "<Identified Crop Name or 'General'>",
  "state": "<State name if mentioned or null>",
  "market": "<Market/Mandi name if mentioned or null>",
  "detected_language": "en" | "hi" | "kn" | "<iso_code>",
  "confidence": 0.0 - 1.0,
  "reasoning": "<Short rationale for classification>"
}
\"\"\"

class QueryRouter:
    def classify(self, user_query: str) -> dict:
        \"\"\"Routes query into STRUCTURED, UNSTRUCTURED, or HYBRID with entity recognition.\"\"\"
        try:
            resp_str = llm_client.generate_completion(
                ROUTER_SYSTEM_PROMPT,
                f"User Question: {user_query}",
                temperature=0.0,
                response_format='json'
            )
            # Parse JSON
            data = json.loads(resp_str)
            
            # Validate category
            category = data.get('category', 'HYBRID').upper()
            if category not in ['STRUCTURED', 'UNSTRUCTURED', 'HYBRID']:
                category = 'HYBRID'
                
            return {
                "category": category,
                "crop": data.get('crop', 'General'),
                "state": data.get('state'),
                "market": data.get('market'),
                "detected_language": data.get('detected_language', 'en'),
                "confidence": data.get('confidence', 0.9),
                "reasoning": data.get('reasoning', '')
            }
        except Exception as e:
            logger.warning(f"Router classification error: {e}. Defaulting to HYBRID.")
            # Fallback heuristic
            q_lower = user_query.lower()
            has_price = any(w in q_lower for w in ['price', 'rate', 'bhav', 'modal', 'cost', 'rs', 'rupee'])
            has_storage = any(w in q_lower for w in ['store', 'storage', 'wait', 'hold', 'sell', 'rot', 'spoil', 'why'])
            
            if has_price and not has_storage:
                cat = 'STRUCTURED'
            elif has_storage and not has_price:
                cat = 'UNSTRUCTURED'
            else:
                cat = 'HYBRID'
                
            return {
                "category": cat,
                "crop": "General",
                "state": None,
                "market": None,
                "detected_language": "en",
                "confidence": 0.8,
                "reasoning": "Heuristic rule fallback"
            }

query_router = QueryRouter()
""")

# 4. synthesizer.py
write_file('backend/advisor/services/synthesizer.py', """
import json
import logging
from advisor.services.llm_client import llm_client
from advisor.metrics import MANDI_CONFIDENCE_COUNT

logger = logging.getLogger(__name__)

SYNTHESIZER_SYSTEM_PROMPT = \"\"\"
You are 'Mandi Price Advisor', an expert agricultural economist and agronomic advisor assisting Indian farmers and traders.
Your goal is to provide transparent, accurate, and highly actionable decision guidance based strictly on the provided Mandi Price Data and Agronomic Advisory Context.

Decision Rules:
1. Ground every numeric statement in the provided SQL data (e.g., mention modal price, % price trend over time, market arrival dates).
2. Ground every agronomic / storage recommendation in the provided Advisory Context (cite ICAR guidelines, shelf-life, storage ventilation, spoilage risks).
3. If the user asks whether to Sell or Hold:
   - Provide a clear recommendation: 'SELL_NOW', 'HOLD', 'STAGGER_SELL' (sell 40-50% now, hold remainder), or 'MONITOR'.
   - Weigh price upside vs storage loss/cost risks (e.g., onion post-harvest weight loss of 3-5%/month vs expected price appreciation).
4. Confidence & Uncertainty:
   - Assign a confidence rating: 'HIGH', 'MEDIUM', or 'LOW'.
   - If data is sparse, prices are volatile, or advisories lack specific guidance for that crop, explicitly state the uncertainty reason.
5. Language: If the user asked in Hindi (hi) or Kannada (kn), respond in that language with agricultural terminology farmers understand.

Return your response strictly as a JSON object matching this schema:
{
  "answer": "<Comprehensive markdown formatted answer with clear decision summary>",
  "decision_action": "HOLD" | "SELL_NOW" | "STAGGER_SELL" | "MONITOR" | "INFORMATIONAL",
  "reasoning": [
    "<Bullet point 1 on price trend analysis>",
    "<Bullet point 2 on agronomic/storage factors>",
    "<Bullet point 3 on market dynamics / risks>"
  ],
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "uncertainty_reason": "<Explanation if confidence is MEDIUM or LOW, otherwise empty string>",
  "price_trend_summary": "<1-sentence summary of price trajectory if SQL data present>"
}
\"\"\"

class AnswerSynthesizer:
    def synthesize(self, user_query: str, routing_info: dict, sql_results: dict = None, rag_results: dict = None) -> dict:
        \"\"\"Synthesizes SQL records and RAG context into a grounded decision response.\"\"\"
        category = routing_info.get('category', 'HYBRID')
        lang = routing_info.get('detected_language', 'en')
        
        # Build context payload
        context_parts = []
        
        if sql_results and sql_results.get('success') and sql_results.get('records'):
            records_sample = sql_results['records'][:15]
            context_parts.append(f"### STRUCTURED MANDI PRICE DATA (Total {sql_results['count']} records found):\\n{json.dumps(records_sample, indent=2)}")
        elif category in ['STRUCTURED', 'HYBRID']:
            context_parts.append("### STRUCTURED MANDI PRICE DATA:\\nNo direct price records matched the exact filters.")
            
        if rag_results and rag_results.get('chunks'):
            advisory_texts = []
            for i, c in enumerate(rag_results['chunks'], 1):
                advisory_texts.append(f"[{i}] Title: {c['doc_title']} (Source: {c['doc_source']}, Crop: {c['crop']})\\nContent: {c['content']}")
            context_parts.append("### AGRONOMIC ADVISORY DOCUMENTS:\\n" + "\\n\\n".join(advisory_texts))
        elif category in ['UNSTRUCTURED', 'HYBRID']:
            context_parts.append("### AGRONOMIC ADVISORY DOCUMENTS:\\nNo specific scientific advisory document matched.")
            
        user_prompt = f\"\"\"
User Question: {user_query}
Query Category: {category}
Detected Language: {lang}
Target Crop: {routing_info.get('crop')}

EVIDENCE CONTEXT:
{"\\n\\n".join(context_parts)}
\"\"\"
        try:
            resp_str = llm_client.generate_completion(
                SYNTHESIZER_SYSTEM_PROMPT,
                user_prompt,
                temperature=0.2,
                response_format='json'
            )
            data = json.loads(resp_str)
            confidence = data.get('confidence', 'HIGH').upper()
            if confidence not in ['HIGH', 'MEDIUM', 'LOW']:
                confidence = 'HIGH'
                
            MANDI_CONFIDENCE_COUNT.labels(level=confidence).inc()
            
            return {
                "answer": data.get('answer', ''),
                "decision_action": data.get('decision_action', 'INFORMATIONAL'),
                "reasoning": data.get('reasoning', []),
                "confidence": confidence,
                "uncertainty_reason": data.get('uncertainty_reason', ''),
                "price_trend_summary": data.get('price_trend_summary', '')
            }
        except Exception as e:
            logger.error(f"Synthesis failed: {e}. Producing structured fallback answer.")
            MANDI_CONFIDENCE_COUNT.labels(level='MEDIUM').inc()
            
            # Formulate fallback answer
            ans = f"Based on analyzed market data for {routing_info.get('crop', 'crop')}:\\n\\n"
            if sql_results and sql_results.get('records'):
                latest = sql_results['records'][0]
                ans += f"- **Latest Modal Price**: Rs. {latest.get('modal_price')}/Quintal in {latest.get('market')} ({latest.get('state')}) on {latest.get('arrival_date')}.\\n"
            if rag_results and rag_results.get('citations'):
                ans += f"- **Key Advisory**: Refer to '{rag_results['citations'][0]['title']}' by {rag_results['citations'][0]['source']}.\\n"
                
            return {
                "answer": ans,
                "decision_action": "MONITOR",
                "reasoning": ["Price and advisory data processed successfully.", "Refer to cited sources for detailed protocols."],
                "confidence": "MEDIUM",
                "uncertainty_reason": "Generated via deterministic fallback synthesizer.",
                "price_trend_summary": "Prices reviewed across target mandis."
            }

answer_synthesizer = AnswerSynthesizer()
""")

print("Advisor AI core services written.")
