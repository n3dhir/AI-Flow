"""make user_id non-nullable

Revision ID: a1b2c3d4e5f6
Revises: c15abc78f84f
Create Date: 2026-08-30 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'c15abc78f84f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('conversations', 'user_id', existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.alter_column('conversations', 'user_id', existing_type=sa.Integer(), nullable=True)
