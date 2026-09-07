from rest_framework import serializers
from advisor.models import MandiPrice, AdvisoryDocument, AdvisoryChunk, QueryAuditLog

class MandiPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MandiPrice
        fields = '__all__'

class AdvisoryChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdvisoryChunk
        fields = ['id', 'crop', 'topic', 'chunk_index', 'content', 'metadata']

class AdvisoryDocumentSerializer(serializers.ModelSerializer):
    chunks_count = serializers.IntegerField(source='chunks.count', read_only=True)

    class Meta:
        model = AdvisoryDocument
        fields = ['id', 'title', 'source', 'crop', 'category', 'publication_date', 'document_text', 'chunks_count', 'created_at']

class QueryRequestSerializer(serializers.Serializer):
    query = serializers.CharField(required=True, max_length=1000, help_text="Farmer or Trader natural language question")
    force_category = serializers.ChoiceField(choices=['STRUCTURED', 'UNSTRUCTURED', 'HYBRID'], required=False, allow_null=True)
    bypass_cache = serializers.BooleanField(default=False)

class CitationSerializer(serializers.Serializer):
    title = serializers.CharField()
    source = serializers.CharField()
    crop = serializers.CharField()
    category = serializers.CharField()
    relevance_score = serializers.FloatField()

class QueryResponseSerializer(serializers.Serializer):
    query = serializers.CharField()
    detected_language = serializers.CharField()
    routed_category = serializers.CharField()
    routing_reason = serializers.CharField(allow_blank=True)
    answer = serializers.CharField()
    decision_action = serializers.CharField()
    reasoning = serializers.ListField(child=serializers.CharField())
    confidence = serializers.CharField()
    uncertainty_reason = serializers.CharField(allow_blank=True)
    sql_executed = serializers.CharField(allow_null=True)
    sql_records_count = serializers.IntegerField()
    sql_records = serializers.ListField(child=serializers.DictField(), default=list)
    sources_cited = CitationSerializer(many=True, default=list)
    execution_time_ms = serializers.FloatField()
    is_cached = serializers.BooleanField()

class QueryAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryAuditLog
        fields = '__all__'
