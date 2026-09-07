from django.urls import path, include
from rest_framework.routers import DefaultRouter
from advisor.views import (
    QueryAPIView, PriceTrendsAPIView, AdvisoryDocumentViewSet,
    IngestionTriggerAPIView, StatsAPIView
)

router = DefaultRouter()
router.register(r'advisories', AdvisoryDocumentViewSet, basename='advisory')

urlpatterns = [
    path('query/', QueryAPIView.as_view(), name='query-advisor'),
    path('prices/trends/', PriceTrendsAPIView.as_view(), name='price-trends'),
    path('ingest/trigger/', IngestionTriggerAPIView.as_view(), name='ingest-trigger'),
    path('stats/', StatsAPIView.as_view(), name='stats-overview'),
    path('', include(router.urls)),
]
