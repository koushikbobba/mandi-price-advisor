from django.core.management.base import BaseCommand
from advisor.services.ingestion import ingestion_service

class Command(BaseCommand):
    help = 'Seeds database with authentic ICAR and State Agri Department advisories.'

    def handle(self, *args, **options):
        self.stdout.write("Ingesting ICAR Agronomic Advisory documents and generating pgvector embeddings...")
        count = ingestion_service.load_seed_advisories()
        self.stdout.write(self.style.SUCCESS(f"Successfully ingested and embedded {count} advisory documents!"))
