import re
import time
import logging
import sqlparse
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

SCHEMA_DESCRIPTION = """
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
"""

class SQLSanitizer:
    @staticmethod
    def validate_and_sanitize(query_str: str) -> str:
        """Strictly validates SQL against AST rules to ensure sandboxed, read-only analytical execution."""
        cleaned = query_str.strip().strip(';').strip('`')
        if cleaned.lower().startswith('sql'):
            cleaned = cleaned[3:].strip()
            
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
            if re.search(rf'\b{kw}\b', raw_upper):
                raise ValueError(f"Disallowed SQL keyword detected: '{kw}'. Query execution rejected.")
                
        if '--' in cleaned or '/*' in cleaned or '*/' in cleaned:
            raise ValueError("SQL comments ('--', '/*') are disallowed for security.")

        # 3. Verify only ALLOWED_TABLES are referenced
        tokens = [t.value.lower() for t in statement.flatten() if not t.is_whitespace]
        if 'from' in tokens:
            from_idx = tokens.index('from')
            if from_idx + 1 < len(tokens):
                target_table = tokens[from_idx + 1].strip('(),;"`\'')
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
        """Generates SQL query from natural language query using schema-aware prompt."""
        system_prompt = f"""You are an expert PostgreSQL database analyst for India's Agmarknet Mandi Price system.
{SCHEMA_DESCRIPTION}

Your task:
Convert the user's natural language question into a single safe PostgreSQL SELECT query against the `mandi_prices` table.
Output ONLY the raw SQL code wrapped in ```sql ... ``` code block. Do not explain or add markdown text.
"""
        user_prompt = f"User Question: {user_query}\nExtracted Entities: {extracted_entities or {}}"
        
        raw_resp = llm_client.generate_completion(system_prompt, user_prompt, temperature=0.1)
        
        match = re.search(r'```(?:sql)?\s*([\s\S]*?)\s*```', raw_resp, re.IGNORECASE)
        sql = match.group(1).strip() if match else raw_resp.strip()
        return sql

    def execute_query(self, sql_query: str) -> dict:
        """Validates, executes SQL against database, and returns formatted tabular records + summary."""
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
