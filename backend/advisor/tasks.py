import logging
from celery import shared_task
from advisor.services.ingestion import ingestion_service

logger = logging.getLogger(__name__)

@shared_task(name='advisor.tasks.sync_agmarknet_daily_prices')
def sync_agmarknet_daily_prices():
    """Celery task to periodically pull latest mandi prices from Agmarknet."""
    logger.info("Starting periodic Agmarknet mandi price ingestion task...")
    try:
        count = ingestion_service.sync_agmarknet_api()
        logger.info(f"Successfully completed Agmarknet sync. Processed {count} records.")
        return {"status": "success", "records_processed": count}
    except Exception as e:
        logger.error(f"Error in sync_agmarknet_daily_prices task: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name='advisor.tasks.ingest_advisory_document_task')
def ingest_advisory_document_task(title: str, source: str, crop: str, category: str, text: str):
    """Celery task to asynchronously chunk, embed, and store advisory document."""
    logger.info(f"Starting async advisory ingestion: {title} ({crop})")
    try:
        doc = ingestion_service.ingest_advisory_document(
            title=title, source=source, crop=crop, category=category, text=text
        )
        return {"status": "success", "document_id": doc.id, "chunks_count": doc.chunks.count()}
    except Exception as e:
        logger.error(f"Error in ingest_advisory_document_task: {e}")
        return {"status": "error", "message": str(e)}

@shared_task(name='advisor.tasks.trigger_full_seed_task')
def trigger_full_seed_task():
    """Celery task to seed all mandi historical prices and ICAR advisory docs."""
    logger.info("Executing full database seed task...")
    prices_count = ingestion_service.generate_seed_mandi_prices(days=180)
    adv_count = ingestion_service.load_seed_advisories()
    return {"status": "success", "prices_count": prices_count, "advisories_count": adv_count}
