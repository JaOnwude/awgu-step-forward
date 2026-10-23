"""password sign-in

Revision ID: c4e8f2a6b913
Revises: a7c3e91d2b40
Create Date: 2026-10-23 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e8f2a6b913'
down_revision: Union[str, Sequence[str], None] = 'a7c3e91d2b40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('password_hash', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('password_failed_attempts', sa.Integer(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('password_locked_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('user_sessions', sa.Column('auth_method', sa.String(length=16), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('user_sessions', 'auth_method')
    op.drop_column('users', 'password_locked_until')
    op.drop_column('users', 'password_failed_attempts')
    op.drop_column('users', 'password_hash')
