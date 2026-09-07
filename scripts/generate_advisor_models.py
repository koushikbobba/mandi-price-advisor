import os

def write_file(filepath, content):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f"Wrote {filepath}")

# 1. apps.py
write_file('backend/advisor/apps.py', """
from django.apps import AppConfig

class AdvisorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'advisor'
    verbose_name = 'Mandi Price Advisor'
""")

# 2. metrics.py
write_file('backend/advisor/metrics.py', """
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
""")

# 3. models.py
write_file('backend/advisor/models.py', """
from django.db import models
from django.conf import settings
import json

# Conditional pgvector support
try:
    from pgvector.django import VectorField
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

class MandiPrice(models.Model):
    state = models.CharField(max_length=100, db_index=True)
    district = models.CharField(max_length=100, db_index=True)
    market = models.CharField(max_length=150, db_index=True)
    commodity = models.CharField(max_length=100, db_index=True)
    variety = models.CharField(max_length=100, default='Other')
    grade = models.CharField(max_length=50, default='FAQ')
    arrival_date = models.DateField(db_index=True)
    min_price = models.DecimalField(max_digits=10, decimal_places=2, help_text='Price in Rs/Quintal')
    max_price = models.DecimalField(max_digits=10, decimal_places=2, help_text='Price in Rs/Quintal')
    modal_price = models.DecimalField(max_digits=10, decimal_places=2, help_text='Modal/Average Price in Rs/Quintal')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mandi_prices'
        indexes = [
            models.Index(fields=['commodity', 'state', 'arrival_date']),
            models.Index(fields=['commodity', 'market', 'arrival_date']),
            models.Index(fields=['arrival_date']),
        ]
        unique_together = ('commodity', 'state', 'market', 'variety', 'arrival_date')

    def __str__(self):
        return f"{self.commodity} ({self.market}, {self.state}) - {self.arrival_date}: Rs.{self.modal_price}/Q"


class AdvisoryDocument(models.Model):
    CATEGORY_CHOICES = [
        ('storage', 'Post-Harvest & Storage Management'),
        ('harvesting', 'Harvesting & Best Time to Sell'),
        ('price_cycle', 'Price Trends & Seasonal Cycles'),
        ('disease_pest', 'Quality, Spoilage & Disease Management'),
        ('export_msp', 'Govt Policy, MSP & Export Dynamics'),
        ('general', 'General Agronomic Advisory'),
    ]

    title = models.CharField(max_length=255)
    source = models.CharField(max_length=150, help_text='e.g., ICAR-DOGR, KAU, Ministry of Agriculture')
    crop = models.CharField(max_length=100, db_index=True, help_text='Target Crop (e.g. Onion, Wheat, Tomato, General)')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='general', db_index=True)
    publication_date = models.DateField(null=True, blank=True)
    document_text = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'advisory_documents'

    def __str__(self):
        return f"{self.title} [{self.source}] - {self.crop}"


class AdvisoryChunk(models.Model):
    document = models.ForeignKey(AdvisoryDocument, on_delete=models.CASCADE, related_name='chunks')
    crop = models.CharField(max_length=100, db_index=True)
    topic = models.CharField(max_length=150, blank=True)
    chunk_index = models.IntegerField(default=0)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    
    if HAS_PGVECTOR and settings.DB_ENGINE != 'sqlite':
        embedding = VectorField(dimensions=1536, null=True, blank=True)
    else:
        embedding_json = models.TextField(null=True, blank=True, help_text='JSON string array for sqlite/mock fallback')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'advisory_chunks'
        indexes = [
            models.Index(fields=['crop', 'topic']),
        ]

    def set_embedding(self, vec):
        if hasattr(self, 'embedding') and HAS_PGVECTOR and settings.DB_ENGINE != 'sqlite':
            self.embedding = vec
        else:
            self.embedding_json = json.dumps(vec)

    def get_embedding(self):
        if hasattr(self, 'embedding') and self.embedding is not None:
            return list(self.embedding)
        if hasattr(self, 'embedding_json') and self.embedding_json:
            return json.loads(self.embedding_json)
        return []

    def __str__(self):
        return f"Chunk {self.chunk_index} of {self.document.title} ({self.crop})"


class QueryAuditLog(models.Model):
    CATEGORY_CHOICES = [
        ('STRUCTURED', 'Purely Structured (SQL)'),
        ('UNSTRUCTURED', 'Purely Unstructured (RAG)'),
        ('HYBRID', 'Hybrid (SQL + RAG)'),
    ]
    CONFIDENCE_CHOICES = [
        ('HIGH', 'High Confidence'),
        ('MEDIUM', 'Medium Confidence'),
        ('LOW', 'Low / Uncertain'),
    ]

    query_text = models.TextField()
    detected_language = models.CharField(max_length=20, default='en')
    routed_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    extracted_entities = models.JSONField(default=dict, blank=True)
    sql_query = models.TextField(null=True, blank=True)
    sql_results_count = models.IntegerField(default=0)
    chunks_retrieved_count = models.IntegerField(default=0)
    response_text = models.TextField()
    decision_action = models.CharField(max_length=50, blank=True)  # HOLD, SELL_NOW, STAGGER, MONITOR
    confidence_score = models.CharField(max_length=20, choices=CONFIDENCE_CHOICES, default='HIGH')
    uncertainty_reason = models.TextField(blank=True)
    sources_cited = models.JSONField(default=list, blank=True)
    execution_time_ms = models.FloatField(default=0.0)
    tokens_used = models.IntegerField(default=0)
    is_cached = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'query_audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.routed_category}] {self.query_text[:50]}... ({self.confidence_score})"
""")

print("Advisor models and metrics generated.")
