from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "content_intelligence",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.tasks.discovery",
        "app.workers.tasks.media_processing",
        "app.workers.tasks.publishing",
        "app.workers.tasks.analytics",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=100,
    beat_schedule={
        "daily-opportunity-discovery": {
            "task": "app.workers.tasks.discovery.run_scheduled_discovery",
            "schedule": 86400.0,
        },
        "hourly-analytics-sync": {
            "task": "app.workers.tasks.analytics.sync_platform_analytics",
            "schedule": 3600.0,
        },
        "daily-publishing-queue": {
            "task": "app.workers.tasks.publishing.process_scheduled_publications",
            "schedule": 3600.0,
        },
    },
)

if __name__ == "__main__":
    celery_app.start()