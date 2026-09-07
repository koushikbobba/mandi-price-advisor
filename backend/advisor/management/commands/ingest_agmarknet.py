from django.core.management.base import BaseCommand
from advisor.services.ingestion import ingestion_service

class Command(BaseCommand):
    help = 'Fetches fresh daily mandi prices from Agmarknet API (data.gov.in).'

    def handle(self, *args, **options):
        self.stdout.write("Pulling daily prices from Agmarknet API...")
        count = ingestion_service.sync_agmarknet_api()
        self.stdout.write(self.style.SUCCESS(f"Processed {count} daily records."))
