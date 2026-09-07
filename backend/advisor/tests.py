import json
import datetime
from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status

from advisor.models import MandiPrice, AdvisoryDocument, AdvisoryChunk, QueryAuditLog
from advisor.services.router import query_router
from advisor.services.text_to_sql import text_to_sql_engine, SQLSanitizer
from advisor.services.rag_engine import rag_engine
from advisor.services.synthesizer import answer_synthesizer
from advisor.services.ingestion import ingestion_service


class MandiAdvisorTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        
        # Populate test Mandi prices
        today = datetime.date.today()
        self.price1 = MandiPrice.objects.create(
            commodity='Wheat',
            state='Karnataka',
            district='Bengaluru',
            market='Bangalore',
            variety='Kalyan Sona',
            grade='FAQ',
            arrival_date=today - datetime.timedelta(days=1),
            min_price=2400.00,
            max_price=2600.00,
            modal_price=2500.00
        )
        self.price2 = MandiPrice.objects.create(
            commodity='Wheat',
            state='Karnataka',
            district='Bengaluru',
            market='Bangalore',
            variety='Kalyan Sona',
            grade='FAQ',
            arrival_date=today,
            min_price=2450.00,
            max_price=2650.00,
            modal_price=2550.00
        )
        self.price3 = MandiPrice.objects.create(
            commodity='Onion',
            state='Maharashtra',
            district='Nashik',
            market='Lasalgaon',
            variety='Red',
            grade='FAQ',
            arrival_date=today,
            min_price=1900.00,
            max_price=2300.00,
            modal_price=2100.00
        )

        # Ingest test advisory document
        self.doc = ingestion_service.ingest_advisory_document(
            title="Post-Harvest Storage Management in Rabi Onion",
            source="ICAR-DOGR",
            crop="Onion",
            category="storage",
            text="Onion storage in improved ventilated godowns maintains spoilage below 5%. Excess moisture causes rotting and sprouting."
        )

    def test_query_router_classification(self):
        """Test router properly classifies structured, unstructured, and hybrid questions."""
        # Structured
        res_struct = query_router.classify("What was the modal price of wheat in Karnataka yesterday?")
        self.assertIn(res_struct['category'], ['STRUCTURED', 'HYBRID'])
        self.assertEqual(res_struct['crop'], 'Wheat')
        
        # Unstructured
        res_unstruct = query_router.classify("How does excess humidity cause onion rotting in storage?")
        self.assertEqual(res_unstruct['category'], 'UNSTRUCTURED')
        self.assertEqual(res_unstruct['crop'], 'Onion')
        
        # Hybrid
        res_hybrid = query_router.classify("Should I sell my wheat now or wait for 2 weeks in Karnataka?")
        self.assertEqual(res_hybrid['category'], 'HYBRID')
        
        # Hindi language query
        res_hi = query_router.classify("क्या मुझे अभी प्याज बेचना चाहिए?")
        self.assertEqual(res_hi['detected_language'], 'hi')
        self.assertEqual(res_hi['crop'], 'Onion')

    def test_sql_sanitizer_security(self):
        """Test AST sanitizer permits safe SELECTs and blocks dangerous mutations/injections."""
        # Valid queries
        valid_sql = "SELECT arrival_date, modal_price FROM mandi_prices WHERE LOWER(commodity) = 'wheat';"
        sanitized = SQLSanitizer.validate_and_sanitize(valid_sql)
        self.assertIn("SELECT", sanitized)
        self.assertIn("LIMIT", sanitized)

        # Disallowed Mutations
        with self.assertRaises(ValueError):
            SQLSanitizer.validate_and_sanitize("DROP TABLE mandi_prices;")

        with self.assertRaises(ValueError):
            SQLSanitizer.validate_and_sanitize("DELETE FROM mandi_prices WHERE id = 1;")

        with self.assertRaises(ValueError):
            SQLSanitizer.validate_and_sanitize("UPDATE mandi_prices SET modal_price = 100;")

        with self.assertRaises(ValueError):
            SQLSanitizer.validate_and_sanitize("INSERT INTO mandi_prices (commodity) VALUES ('Test');")

        # Disallowed Multiple Statements / Comments
        with self.assertRaises(ValueError):
            SQLSanitizer.validate_and_sanitize("SELECT * FROM mandi_prices; DROP TABLE mandi_prices;")

        with self.assertRaises(ValueError):
            SQLSanitizer.validate_and_sanitize("SELECT * FROM mandi_prices -- malicious comment")

        # Disallowed Non-whitelisted Table
        with self.assertRaises(ValueError):
            SQLSanitizer.validate_and_sanitize("SELECT * FROM auth_user;")

    def test_text_to_sql_execution(self):
        """Test SQL generation and execution on real test database."""
        sql = "SELECT arrival_date, commodity, state, market, modal_price FROM mandi_prices WHERE LOWER(commodity) = 'wheat' ORDER BY arrival_date DESC LIMIT 5;"
        result = text_to_sql_engine.execute_query(sql)
        self.assertTrue(result['success'])
        self.assertEqual(result['count'], 2)
        self.assertEqual(result['records'][0]['commodity'], 'Wheat')

    def test_rag_retrieval(self):
        """Test RAG retrieval returns relevant chunks and formatted citations."""
        rag_res = rag_engine.retrieve("How to avoid onion rotting in storage?", crop="Onion", top_k=2)
        self.assertGreaterEqual(rag_res['count'], 1)
        self.assertEqual(rag_res['chunks'][0]['crop'], 'Onion')
        self.assertEqual(len(rag_res['citations']), 1)
        self.assertEqual(rag_res['citations'][0]['source'], 'ICAR-DOGR')

    def test_synthesizer(self):
        """Test grounded answer synthesis with confidence and decision recommendation."""
        routing_info = {"category": "HYBRID", "crop": "Wheat", "detected_language": "en"}
        sql_results = {
            "success": True,
            "records": [{"commodity": "Wheat", "modal_price": 2550.0, "market": "Bangalore", "arrival_date": "2026-09-06"}],
            "count": 1
        }
        rag_results = {
            "chunks": [{"doc_title": "Wheat Storage", "doc_source": "ICAR", "crop": "Wheat", "content": "Wheat prices rise in festival season."}],
            "citations": [{"title": "Wheat Storage", "source": "ICAR", "crop": "Wheat", "category": "storage", "relevance_score": 0.85}]
        }
        res = answer_synthesizer.synthesize("Should I sell wheat now?", routing_info, sql_results, rag_results)
        self.assertIn('answer', res)
        self.assertIn(res['confidence'], ['HIGH', 'MEDIUM', 'LOW'])
        self.assertIn(res['decision_action'], ['HOLD', 'SELL_NOW', 'STAGGER_SELL', 'MONITOR', 'INFORMATIONAL'])

    def test_query_api_endpoint(self):
        """Test /api/query/ end-to-end API execution and Redis caching."""
        url = reverse('query-advisor')
        payload = {"query": "What is the price of wheat in Karnataka?"}
        
        # 1. Fresh Query
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['query'], payload['query'])
        self.assertIn('answer', data)
        self.assertIn('decision_action', data)
        self.assertIn('confidence', data)
        self.assertFalse(data['is_cached'])
        
        # Verify QueryAuditLog recorded
        self.assertTrue(QueryAuditLog.objects.filter(query_text=payload['query']).exists())

        # 2. Repeated Query (Cache Hit)
        response_cached = self.client.post(url, payload, format='json')
        self.assertEqual(response_cached.status_code, status.HTTP_200_OK)
        self.assertTrue(response_cached.data['is_cached'])

    def test_price_trends_api_endpoint(self):
        """Test /api/prices/trends/ endpoint."""
        url = reverse('price-trends')
        response = self.client.get(url, {'commodity': 'Wheat', 'days': 10})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['commodity'], 'Wheat')
        self.assertIn('stats', data)
        self.assertEqual(data['stats']['total_records'], 2)
        self.assertEqual(len(data['records']), 2)

    def test_stats_api_endpoint(self):
        """Test /api/stats/ endpoint."""
        url = reverse('stats-overview')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn('total_mandi_price_records', data)
        self.assertIn('total_advisories', data)
