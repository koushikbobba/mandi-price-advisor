import time
import hashlib
import json
import logging
import datetime
from django.core.cache import cache
from django.db.models import Avg, Min, Max, Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.decorators import action

from advisor.models import MandiPrice, AdvisoryDocument, AdvisoryChunk, QueryAuditLog
from advisor.serializers import (
    MandiPriceSerializer, AdvisoryDocumentSerializer, QueryRequestSerializer,
    QueryResponseSerializer, QueryAuditLogSerializer
)
from advisor.services.router import query_router
from advisor.services.text_to_sql import text_to_sql_engine
from advisor.services.rag_engine import rag_engine
from advisor.services.synthesizer import answer_synthesizer
from advisor.services.ingestion import ingestion_service
from advisor.tasks import sync_agmarknet_daily_prices
from advisor.metrics import MANDI_QUERIES_TOTAL, MANDI_QUERY_LATENCY

logger = logging.getLogger(__name__)

class QueryAPIView(APIView):
    """Unified endpoint for agricultural query routing, Text-to-SQL, RAG, and Grounded Synthesis."""
    
    def post(self, request):
        serializer = QueryRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        user_query = serializer.validated_data['query'].strip()
        force_category = serializer.validated_data.get('force_category')
        bypass_cache = serializer.validated_data.get('bypass_cache', False)
        
        start_time = time.time()
        
        # 1. Redis Caching Check
        cache_key = f"mandi_query_{hashlib.md5(user_query.lower().encode('utf-8')).hexdigest()}"
        if not bypass_cache:
            try:
                cached_data = cache.get(cache_key)
                if cached_data:
                    MANDI_QUERIES_TOTAL.labels(
                        category=cached_data.get('routed_category', 'HYBRID'),
                        language=cached_data.get('detected_language', 'en'),
                        cached='true'
                    ).inc()
                    cached_data['is_cached'] = True
                    return Response(cached_data, status=status.HTTP_200_OK)
            except Exception as e:
                logger.warning(f"Cache get error: {e}")
                
        # 2. Query Routing & Entity Recognition
        routing_info = query_router.classify(user_query)
        if force_category:
            routing_info['category'] = force_category
            
        category = routing_info['category']
        lang = routing_info['detected_language']
        crop = routing_info['crop']
        
        sql_results = None
        rag_results = None
        sql_query_used = None
        
        # 3. Text-to-SQL Path (for STRUCTURED or HYBRID)
        if category in ['STRUCTURED', 'HYBRID']:
            generated_sql = text_to_sql_engine.generate_sql(user_query, routing_info)
            sql_results = text_to_sql_engine.execute_query(generated_sql)
            sql_query_used = sql_results.get('sql')
            
        # 4. RAG Path (for UNSTRUCTURED or HYBRID)
        if category in ['UNSTRUCTURED', 'HYBRID']:
            rag_results = rag_engine.retrieve(user_query, crop=crop, top_k=4)
            
        # 5. Grounded Answer Synthesis
        synthesized = answer_synthesizer.synthesize(
            user_query=user_query,
            routing_info=routing_info,
            sql_results=sql_results,
            rag_results=rag_results
        )
        
        elapsed_sec = time.time() - start_time
        elapsed_ms = round(elapsed_sec * 1000, 2)
        
        # Update metrics
        MANDI_QUERIES_TOTAL.labels(category=category, language=lang, cached='false').inc()
        MANDI_QUERY_LATENCY.labels(category=category).observe(elapsed_sec)
        
        citations = rag_results.get('citations', []) if rag_results else []
        sql_records = sql_results.get('records', []) if sql_results else []
        
        payload = {
            "query": user_query,
            "detected_language": lang,
            "routed_category": category,
            "routing_reason": routing_info.get('reasoning', ''),
            "answer": synthesized.get('answer', ''),
            "decision_action": synthesized.get('decision_action', 'INFORMATIONAL'),
            "reasoning": synthesized.get('reasoning', []),
            "confidence": synthesized.get('confidence', 'HIGH'),
            "uncertainty_reason": synthesized.get('uncertainty_reason', ''),
            "sql_executed": sql_query_used,
            "sql_records_count": len(sql_records),
            "sql_records": sql_records[:25],
            "sources_cited": citations,
            "execution_time_ms": elapsed_ms,
            "is_cached": False
        }
        
        # Cache response in Redis for 1 hour
        try:
            cache.set(cache_key, payload, timeout=3600)
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            
        # Log to QueryAuditLog in DB
        try:
            QueryAuditLog.objects.create(
                query_text=user_query,
                detected_language=lang,
                routed_category=category,
                extracted_entities=routing_info,
                sql_query=sql_query_used,
                sql_results_count=len(sql_records),
                chunks_retrieved_count=len(rag_results.get('chunks', [])) if rag_results else 0,
                response_text=synthesized.get('answer', ''),
                decision_action=synthesized.get('decision_action', 'INFORMATIONAL'),
                confidence_score=synthesized.get('confidence', 'HIGH'),
                uncertainty_reason=synthesized.get('uncertainty_reason', ''),
                sources_cited=citations,
                execution_time_ms=elapsed_ms,
                is_cached=False
            )
        except Exception as e:
            logger.warning(f"Audit log write failed: {e}")
            
        return Response(payload, status=status.HTTP_200_OK)


class PriceTrendsAPIView(APIView):
    """Provides historical mandi price series, daily date ranges, monthly seasonal comparisons, and multi-year YoY trends."""
    
    def get(self, request):
        commodity = request.query_params.get('commodity', 'Wheat')
        state = request.query_params.get('state')
        market = request.query_params.get('market')
        selected_year = request.query_params.get('year') # e.g. "2025", "2026", or "all"
        selected_month = request.query_params.get('month') # e.g. "2026-08" or "all"
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        days = int(request.query_params.get('days', 90))
        
        base_qs = MandiPrice.objects.filter(commodity__iexact=commodity)
        
        # State and Market filters
        qs = base_qs
        if state:
            qs = qs.filter(state__iexact=state)
        if market:
            qs = qs.filter(market__iexact=market)
            
        # Optional Year filter
        if selected_year and selected_year != 'all':
            try:
                qs = qs.filter(arrival_date__year=int(selected_year))
            except Exception as ex:
                logger.warning(f"Error parsing year filter '{selected_year}': {ex}")

        # Optional Month filter
        if selected_month and selected_month != 'all':
            try:
                parts = selected_month.split('-')
                if len(parts) == 2:
                    qs = qs.filter(arrival_date__year=int(parts[0]), arrival_date__month=int(parts[1]))
            except Exception as ex:
                logger.warning(f"Error parsing month filter '{selected_month}': {ex}")

        # Optional Start/End Date filter
        if start_date:
            qs = qs.filter(arrival_date__gte=start_date)
        if end_date:
            qs = qs.filter(arrival_date__lte=end_date)

        records_limit = days if (not selected_year or selected_year == 'all') and (not selected_month or selected_month == 'all') and not start_date else 1500
        records = qs.order_by('-arrival_date')[:records_limit]
        records_data = MandiPriceSerializer(records, many=True).data
        
        stats = qs.aggregate(
            avg_modal=Avg('modal_price'),
            min_modal=Min('modal_price'),
            max_modal=Max('modal_price'),
            total_records=Count('id')
        )
        
        # 1. Calculate Multi-Year & Monthly Groupings across the base commodity query
        month_qs = base_qs
        if state:
            month_qs = month_qs.filter(state__iexact=state)
            
        all_for_commodity = month_qs.values('arrival_date', 'modal_price', 'min_price', 'max_price', 'market', 'state')
        
        month_groups = {}
        year_groups = {}
        yoy_matrix = {m_idx: {"month_num": m_idx, "month": datetime.date(2000, m_idx, 1).strftime('%b'), "years": {}} for m_idx in range(1, 13)}
        market_groups = {}
        
        for r in all_for_commodity:
            ad = r['arrival_date']
            p = float(r['modal_price'])
            y = ad.year if hasattr(ad, 'year') else int(str(ad)[:4])
            m = ad.month if hasattr(ad, 'month') else int(str(ad)[5:7])
            
            # Monthly grouping
            month_key = f"{y:04d}-{m:02d}"
            month_name = ad.strftime('%b %Y') if hasattr(ad, 'strftime') else f"{month_key}"
            
            if month_key not in month_groups:
                month_groups[month_key] = {
                    "month_key": month_key,
                    "month_name": month_name,
                    "year": y,
                    "month": m,
                    "prices": [],
                    "min_prices": [],
                    "max_prices": []
                }
            month_groups[month_key]["prices"].append(p)
            month_groups[month_key]["min_prices"].append(float(r['min_price']))
            month_groups[month_key]["max_prices"].append(float(r['max_price']))
            
            # Yearly grouping
            if y not in year_groups:
                year_groups[y] = {
                    "year": y,
                    "prices": [],
                    "min_prices": [],
                    "max_prices": []
                }
            year_groups[y]["prices"].append(p)
            year_groups[y]["min_prices"].append(float(r['min_price']))
            year_groups[y]["max_prices"].append(float(r['max_price']))
            
            # YoY Month-by-Year Matrix
            if y not in yoy_matrix[m]["years"]:
                yoy_matrix[m]["years"][y] = []
            yoy_matrix[m]["years"][y].append(p)
            
            # Market aggregation
            m_name = r['market']
            if m_name not in market_groups:
                market_groups[m_name] = {
                    "market": m_name,
                    "state": r['state'],
                    "prices": []
                }
            market_groups[m_name]["prices"].append(p)
            
        # Format monthly comparisons
        monthly_comparisons = []
        for mk in sorted(month_groups.keys()):
            group = month_groups[mk]
            prices = group["prices"]
            monthly_comparisons.append({
                "month_key": mk,
                "month_name": group["month_name"],
                "year": group["year"],
                "month": group["month"],
                "avg_modal": round(sum(prices) / len(prices), 2) if prices else 0.0,
                "min_modal": round(min(group["min_prices"]), 2) if group["min_prices"] else 0.0,
                "max_modal": round(max(group["max_prices"]), 2) if group["max_prices"] else 0.0,
                "record_count": len(prices)
            })
            
        # Format yearly comparisons
        yearly_comparisons = []
        for y in sorted(year_groups.keys()):
            y_group = year_groups[y]
            p_list = y_group["prices"]
            yearly_comparisons.append({
                "year": y,
                "avg_modal": round(sum(p_list) / len(p_list), 2) if p_list else 0.0,
                "min_modal": round(min(y_group["min_prices"]), 2) if y_group["min_prices"] else 0.0,
                "max_modal": round(max(y_group["max_prices"]), 2) if y_group["max_prices"] else 0.0,
                "record_count": len(p_list)
            })
            
        # Format Year-over-Year Monthly matrix (Jan - Dec multi-year lines)
        all_years = sorted(year_groups.keys())
        yoy_monthly_series = []
        for m_idx in range(1, 13):
            entry = {
                "month_num": m_idx,
                "month": datetime.date(2000, m_idx, 1).strftime('%b')
            }
            has_any = False
            for y in all_years:
                p_arr = yoy_matrix[m_idx]["years"].get(y, [])
                if p_arr:
                    entry[str(y)] = round(sum(p_arr) / len(p_arr), 2)
                    has_any = True
                else:
                    entry[str(y)] = None
            if has_any:
                yoy_monthly_series.append(entry)

        # Format market comparisons
        market_comparisons = []
        for m_name, m_data in market_groups.items():
            p_list = m_data["prices"]
            market_comparisons.append({
                "market": m_name,
                "state": m_data["state"],
                "avg_price": round(sum(p_list) / len(p_list), 2) if p_list else 0.0,
                "record_count": len(p_list)
            })
        market_comparisons.sort(key=lambda x: x["avg_price"], reverse=True)

        distinct_commodities = list(MandiPrice.objects.values_list('commodity', flat=True).distinct().order_by('commodity'))
        distinct_states = list(base_qs.values_list('state', flat=True).distinct().order_by('state')) or list(MandiPrice.objects.values_list('state', flat=True).distinct().order_by('state'))
        distinct_markets = list(qs.values_list('market', flat=True).distinct().order_by('market')) or list(base_qs.values_list('market', flat=True).distinct().order_by('market'))
        
        return Response({
            "commodity": commodity,
            "state": state,
            "market": market,
            "selected_year": selected_year or "all",
            "selected_month": selected_month or "all",
            "stats": {
                "avg_modal": round(float(stats['avg_modal']), 2) if stats['avg_modal'] else 0.0,
                "min_modal": round(float(stats['min_modal']), 2) if stats['min_modal'] else 0.0,
                "max_modal": round(float(stats['max_modal']), 2) if stats['max_modal'] else 0.0,
                "total_records": stats['total_records']
            },
            "records": records_data[::-1],  # Chronological order for charting
            "monthly_comparisons": monthly_comparisons,
            "yearly_comparisons": yearly_comparisons,
            "yoy_monthly_series": yoy_monthly_series,
            "market_comparisons": market_comparisons,
            "available_years": all_years,
            "available_months": [m["month_key"] for m in monthly_comparisons],
            "filters": {
                "commodities": distinct_commodities,
                "states": distinct_states,
                "markets": distinct_markets
            }
        }, status=status.HTTP_200_OK)


class AdvisoryDocumentViewSet(viewsets.ModelViewSet):
    """CRUD for Advisory Documents & PDF Text Ingestion."""
    queryset = AdvisoryDocument.objects.all().order_by('-created_at')
    serializer_class = AdvisoryDocumentSerializer

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_document(self, request):
        title = request.data.get('title')
        source = request.data.get('source', 'State Agri Advisory')
        crop = request.data.get('crop', 'General')
        category = request.data.get('category', 'general')
        text = request.data.get('document_text', '')
        
        if not title or not text:
            return Response({"error": "title and document_text are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        doc = ingestion_service.ingest_advisory_document(
            title=title, source=source, crop=crop, category=category, text=text
        )
        return Response(AdvisoryDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class IngestionTriggerAPIView(APIView):
    """Triggers Agmarknet sync or full seed data generation."""
    
    def post(self, request):
        action_type = request.data.get('action', 'seed_all')
        
        if action_type == 'sync_agmarknet':
            try:
                sync_agmarknet_daily_prices.delay()
                return Response({"message": "Agmarknet daily sync initiated in background task."}, status=status.HTTP_202_ACCEPTED)
            except Exception:
                count = ingestion_service.sync_agmarknet_api()
                return Response({"message": f"Agmarknet sync completed synchronously. {count} records upserted."}, status=status.HTTP_200_OK)
        elif action_type == 'seed_all':
            prices_count = ingestion_service.generate_seed_mandi_prices(days=180)
            adv_count = ingestion_service.load_seed_advisories()
            return Response({
                "message": "Database successfully seeded with historical mandi prices and ICAR advisories.",
                "prices_count": prices_count,
                "advisories_count": adv_count
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid action. Choose 'sync_agmarknet' or 'seed_all'."}, status=status.HTTP_400_BAD_REQUEST)


class StatsAPIView(APIView):
    """System audit stats, routing counts, and query metrics overview."""
    
    def get(self, request):
        total_queries = QueryAuditLog.objects.count()
        category_counts = dict(QueryAuditLog.objects.values_list('routed_category').annotate(count=Count('id')))
        confidence_counts = dict(QueryAuditLog.objects.values_list('confidence_score').annotate(count=Count('id')))
        recent_logs = QueryAuditLogSerializer(QueryAuditLog.objects.all()[:15], many=True).data
        
        return Response({
            "total_queries_logged": total_queries,
            "total_mandi_price_records": MandiPrice.objects.count(),
            "total_advisories": AdvisoryDocument.objects.count(),
            "total_vector_chunks": AdvisoryChunk.objects.count(),
            "category_distribution": category_counts,
            "confidence_distribution": confidence_counts,
            "recent_audit_logs": recent_logs
        }, status=status.HTTP_200_OK)
