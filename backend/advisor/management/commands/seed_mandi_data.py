from django.core.management.base import BaseCommand
from advisor.services.ingestion import ingestion_service

class Command(BaseCommand):
    help = 'Seeds database with realistic multi-month daily mandi prices for major crops.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=180, help='Number of historical days to generate')

    def handle(self, *args, **options):
        days = options['days']
        self.stdout.write(f"Generating {days} days of historical Mandi prices...")
        count = ingestion_service.generate_seed_mandi_prices(days=days)
        self.stdout.write(self.style.SUCCESS(f"Successfully populated {count} Mandi price records!"))
