from prometheus_client import Counter, Histogram, Gauge

# Query routing and count metrics
MANDI_QUERIES_TOTAL = Counter(
    'mandi_queries_total',
    'Total number of queries processed by Mandi Price Advisor',
    ['category', 'language', 'cached']
)

# Latency histograms
MANDI_QUERY_LATENCY = Histogram(
    'mandi_query_latency_seconds',
    'End-to-end query processing latency in seconds',
    ['category'],
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

MANDI_SQL_LATENCY = Histogram(
    'mandi_sql_latency_seconds',
    'Text-to-SQL generation and execution latency in seconds',
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0]
)

MANDI_RAG_LATENCY = Histogram(
    'mandi_rag_latency_seconds',
    'pgvector RAG embedding and retrieval latency in seconds',
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0]
)

# Token usage metrics
MANDI_TOKENS_TOTAL = Counter(
    'mandi_tokens_total',
    'Total LLM tokens consumed',
    ['model', 'token_type']  # prompt or completion
)

# Confidence distribution
MANDI_CONFIDENCE_COUNT = Counter(
    'mandi_confidence_total',
    'Distribution of decision confidence ratings',
    ['level']  # HIGH, MEDIUM, LOW
)

# Mandi Ingestion Gauge
MANDI_RECORDS_GAUGE = Gauge(
    'mandi_total_price_records',
    'Total active price records in database'
)
