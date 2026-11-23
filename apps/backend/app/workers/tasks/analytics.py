from celery import shared_task
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from datetime import datetime, timedelta

from app.core.config import settings
from app.models.analytics import Analytics
from app.models.publication import Publication, PublishStatus
from app.models.project import Project


async_engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
AsyncSessionLocal = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_platform_analytics(self):
    """Sync analytics from all platforms for published content."""
    return asyncio.run(_sync_platform_analytics_async())


async def _sync_platform_analytics_async():
    async with AsyncSessionLocal() as db:
        # Get all published publications from the last 30 days
        cutoff = datetime.utcnow() - timedelta(days=30)
        result = await db.execute(
            select(Publication).where(
                Publication.status == PublishStatus.PUBLISHED,
                Publication.published_at >= cutoff,
            )
        )
        publications = result.scalars().all()

        results = []
        for pub in publications:
            try:
                # TODO: Implement actual platform analytics fetching
                # YouTube: youtube.videos().list(part="statistics", id=pub.platform_post_id)
                # TikTok: tiktok.video.analytics()
                # Instagram: instagram.media.insights()

                # Simulate analytics data
                views = 0  # Fetch from API
                watch_time = 0
                retention = {}
                completion_rate = 0.0
                likes = 0
                comments = 0
                shares = 0
                saves = 0
                follower_growth = 0
                engagement_rate = 0.0

                # Check if analytics already exist
                result = await db.execute(
                    select(Analytics).where(Analytics.publication_id == pub.id)
                )
                analytics = result.scalar_one_or_none()

                if analytics:
                    # Update existing
                    analytics.views = views
                    analytics.watch_time = watch_time
                    analytics.retention = retention
                    analytics.completion_rate = completion_rate
                    analytics.likes = likes
                    analytics.comments = comments
                    analytics.shares = shares
                    analytics.saves = saves
                    analytics.follower_growth = follower_growth
                    analytics.engagement_rate = engagement_rate
                    analytics.updated_at = datetime.utcnow()
                else:
                    # Create new
                    analytics = Analytics(
                        project_id=pub.project_id,
                        publication_id=pub.id,
                        platform=pub.platform,
                        views=views,
                        watch_time=watch_time,
                        retention=retention,
                        completion_rate=completion_rate,
                        likes=likes,
                        comments=comments,
                        shares=shares,
                        saves=saves,
                        follower_growth=follower_growth,
                        engagement_rate=engagement_rate,
                    )
                    db.add(analytics)

                await db.commit()

                results.append({
                    "publication_id": str(pub.id),
                    "platform": pub.platform.value,
                    "status": "synced",
                })
            except Exception as e:
                results.append({
                    "publication_id": str(pub.id),
                    "status": "error",
                    "error": str(e),
                })

        return {"synced": len(publications), "results": results}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_performance_report(self, project_id: str):
    """Generate performance report for a project."""
    return asyncio.run(_generate_performance_report_async(project_id))


async def _generate_performance_report_async(project_id: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            return {"status": "error", "message": "Project not found"}

        # Get all analytics for this project
        result = await db.execute(
            select(Analytics).where(Analytics.project_id == project_id)
        )
        analytics = result.scalars().all()

        if not analytics:
            return {"status": "no_data", "message": "No analytics data available"}

        # Aggregate metrics
        total_views = sum(a.views for a in analytics)
        total_watch_time = sum(a.watch_time for a in analytics)
        avg_completion = sum(a.completion_rate for a in analytics) / len(analytics)
        avg_engagement = sum(a.engagement_rate for a in analytics) / len(analytics)
        total_likes = sum(a.likes for a in analytics)
        total_comments = sum(a.comments for a in analytics)
        total_shares = sum(a.shares for a in analytics)

        # Platform breakdown
        platform_stats = {}
        for a in analytics:
            p = a.platform.value
            if p not in platform_stats:
                platform_stats[p] = {"views": 0, "count": 0, "engagement": 0}
            platform_stats[p]["views"] += a.views
            platform_stats[p]["count"] += 1
            platform_stats[p]["engagement"] += a.engagement_rate

        for p in platform_stats:
            platform_stats[p]["avg_engagement"] = platform_stats[p]["engagement"] / platform_stats[p]["count"]

        return {
            "project_id": project_id,
            "total_views": total_views,
            "total_watch_time": total_watch_time,
            "avg_completion_rate": round(avg_completion, 4),
            "avg_engagement_rate": round(avg_engagement, 4),
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
            "platforms": platform_stats,
            "generated_at": datetime.utcnow().isoformat(),
        }