"""productions keep their video file (uploaded finished cut or local render)

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-26 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('productions', sa.Column('media', postgresql.JSONB(astext_type=sa.Text()),
                                           server_default=sa.text("'{}'::jsonb"), nullable=False))


def downgrade() -> None:
    op.drop_column('productions', 'media')
