"""add timezone to timestamps

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-30 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('users', 'created_at', type_=sa.DateTime(timezone=True), existing_type=sa.DateTime())
    op.alter_column('conversations', 'created_at', type_=sa.DateTime(timezone=True), existing_type=sa.DateTime())
    op.alter_column('conversations', 'updated_at', type_=sa.DateTime(timezone=True), existing_type=sa.DateTime())
    op.alter_column('chat_messages', 'created_at', type_=sa.DateTime(timezone=True), existing_type=sa.DateTime())
    op.alter_column('long_term_memory', 'created_at', type_=sa.DateTime(timezone=True), existing_type=sa.DateTime())


def downgrade() -> None:
    op.alter_column('long_term_memory', 'created_at', type_=sa.DateTime(), existing_type=sa.DateTime(timezone=True))
    op.alter_column('chat_messages', 'created_at', type_=sa.DateTime(), existing_type=sa.DateTime(timezone=True))
    op.alter_column('conversations', 'updated_at', type_=sa.DateTime(), existing_type=sa.DateTime(timezone=True))
    op.alter_column('conversations', 'created_at', type_=sa.DateTime(), existing_type=sa.DateTime(timezone=True))
    op.alter_column('users', 'created_at', type_=sa.DateTime(), existing_type=sa.DateTime(timezone=True))
