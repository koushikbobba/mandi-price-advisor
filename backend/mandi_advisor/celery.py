import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mandi_advisor.settings')

app = Celery('mandi_advisor')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Periodic task schedule (daily mandi price sync at 06:00 AM)
app.conf.beat_schedule = {
    'sync-agmarknet-daily-mandi-prices': {
        'task': 'advisor.tasks.sync_agmarknet_daily_prices',
        'schedule': crontab(hour=6, minute=0),
        'args': (),
    },
}
