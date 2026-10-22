"""listing image, featured flag and announcement source

Revision ID: a7c3e91d2b40
Revises: 6f4af00f075c
Create Date: 2026-10-22 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7c3e91d2b40'
down_revision: Union[str, Sequence[str], None] = '6f4af00f075c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('opportunities', sa.Column('image_url', sa.String(length=500), nullable=True))
    op.add_column(
        'opportunities',
        sa.Column('is_featured', sa.Boolean(), server_default='false', nullable=False),
    )
    op.add_column('opportunities', sa.Column('source_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('opportunities', 'source_url')
    op.drop_column('opportunities', 'is_featured')
    op.drop_column('opportunities', 'image_url')
