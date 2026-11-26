"""users store their own AI provider keys (encrypted)

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-26 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('api_keys', 'key_hash', existing_type=sa.String(length=255), nullable=True)
    op.add_column('api_keys', sa.Column('encrypted_key', sa.Text(), nullable=True))
    op.add_column('api_keys', sa.Column('key_hint', sa.String(length=16), nullable=True))
    op.add_column('api_keys', sa.Column('model', sa.String(length=200), nullable=True))
    op.add_column('api_keys', sa.Column('priority', sa.Integer(), server_default='0', nullable=False))
    op.add_column('api_keys', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.create_index(op.f('ix_api_keys_user_id'), 'api_keys', ['user_id'], unique=False)
    op.create_unique_constraint('uq_api_keys_user_provider', 'api_keys', ['user_id', 'provider'])


def downgrade() -> None:
    op.drop_constraint('uq_api_keys_user_provider', 'api_keys', type_='unique')
    op.drop_index(op.f('ix_api_keys_user_id'), table_name='api_keys')
    op.drop_column('api_keys', 'updated_at')
    op.drop_column('api_keys', 'priority')
    op.drop_column('api_keys', 'model')
    op.drop_column('api_keys', 'key_hint')
    op.drop_column('api_keys', 'encrypted_key')
    # Rows written after the upgrade have no hash; drop them so the NOT NULL can return
    op.execute("DELETE FROM api_keys WHERE key_hash IS NULL")
    op.alter_column('api_keys', 'key_hash', existing_type=sa.String(length=255), nullable=False)
