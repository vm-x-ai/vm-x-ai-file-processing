"""add evaluation categories

Revision ID: add_evaluation_categories
Revises: cb9778f1f07e
Create Date: 2025-05-26 14:38:00.000000

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_evaluation_categories"
down_revision: Union[str, None] = "cb9778f1f07e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create evaluation_categories table
    op.create_table(
        "evaluation_categories",
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create default categories for existing projects
    # First, get all existing projects
    connection = op.get_bind()
    projects_result = connection.execute(sa.text("SELECT id FROM projects"))
    projects = projects_result.fetchall()

    # Insert default category for each project
    for project in projects:
        project_id = project[0]
        connection.execute(
            sa.text("""
                INSERT INTO evaluation_categories (id, name, description, project_id, created_at, updated_at)
                VALUES (gen_random_uuid(), 'default', 'Default evaluation category', :project_id, now(), now())
            """),
            {"project_id": project_id},
        )

    # Add category_id column to evaluations table (nullable first)
    op.add_column("evaluations", sa.Column("category_id", sa.Uuid(), nullable=True))

    # Update existing evaluations to use the default category
    connection.execute(
        sa.text("""
        UPDATE evaluations 
        SET category_id = (
            SELECT ec.id 
            FROM evaluation_categories ec 
            WHERE ec.project_id = evaluations.project_id 
            AND ec.name = 'default'
        )
    """)
    )

    # Make category_id non-nullable and add foreign key constraint
    op.alter_column("evaluations", "category_id", nullable=False)
    op.create_foreign_key(
        "fk_evaluations_category_id",
        "evaluations",
        "evaluation_categories",
        ["category_id"],
        ["id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove foreign key constraint and category_id column from evaluations
    op.drop_constraint("fk_evaluations_category_id", "evaluations", type_="foreignkey")
    op.drop_column("evaluations", "category_id")

    # Drop evaluation_categories table
    op.drop_table("evaluation_categories")
