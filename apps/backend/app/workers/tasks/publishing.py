from celery import shared_task
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from datetime import datetime

from app.core.config import settings
from app.models.publication import Publication, PublishStatus
from app.models.project import Project


async_engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
AsyncSessionLocal = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_scheduled_publications(self):
    """Process all scheduled publications that are due."""
    return asyncio.run(_process_scheduled_publications_async())


async def _process_scheduled_publications_async():
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        result = await db.execute(
            select(Publication).where(
                Publication.status == PublishStatus.SCHEDULED,
                Publication.scheduled_at <= now,
            )
        )
        publications = result.scalars().all()

        results = []
        for pub in publications:
            try:
                # TODO: Implement actual platform publishing
                # This would call YouTube API, TikTok API, Instagram API, etc.

                pub.status = PublishStatus.PUBLISHING
                await db.commit()

                # Simulate publishing
                await asyncio.sleep(1)

                pub.status = PublishStatus.PUBLISHED
                pub.published_at = datetime.utcnow()
                pub.platform_post_id = f"post_{pub.id}"
                pub.platform_url = f"https://{pub.platform.value.lower()}.com/post/{pub.platform_post_id}"
                await db.commit()

                results.append({
                    "publication_id": str(pub.id),
                    "status": "published",
                    "platform": pub.platform.value,
                })
            except Exception as e:
                pub.status = PublishStatus.FAILED
                pub.error_message = str(e)
                await db.commit()
                results.append({
                    "publication_id": str(pub.id),
                    "status": "failed",
                    "error": str(e),
                })

        return {"processed": len(publications), "results": results}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def publish_to_platform(self, publication_id: str):
    """Publish a specific publication to its platform."""
    return asyncio.run(_publish_to_platform_async(publication_id))


async def _publish_to_platform_async(publication_id: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Publication).where(Publication.id == publication_id)
        )
        pub = result.scalar_one_or_none()
        if not pub:
            return {"status": "error", "message": "Publication not found"}

        try:
            pub.status = PublishStatus.PUBLISHING
            await db.commit()

            # TODO: Implement actual platform publishing
            # YouTube: youtube.videos().insert()
            # TikTok: tiktok.video.upload()
            # Instagram: instagram.media.create()

            await asyncio.sleep(1)

            pub.status = PublishStatus.PUBLISHED
            pub.published_at = datetime.utcnow()
            pub.platform_post_id = f"post_{pub.id}"
            pub.platform_url = f"https://{pub.platform.value.lower()}.com/post/{pub.platform_post_id}"
            await db.commit()

            return {"status": "published", "platform": pub.platform.value}
        except Exception as e:
            pub.status = PublishStatus.FAILED
            pub.error_message = str(e)
            await db.commit()
            return {"status": "failed", "error": str(e)}