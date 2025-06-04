"""seed_evaluation_data

Revision ID: 383bff3555c9
Revises: add_evaluation_categories
Create Date: 2025-05-26 21:40:43.192302

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "383bff3555c9"
down_revision: Union[str, None] = "add_evaluation_categories"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    connection = op.get_bind()

    op.execute(
        sa.text("""
        insert into projects (name, description, id)
        VALUES ('default', 'default', '00000000-0000-0000-0000-000000000000');
        """),
    )

    # First, get all existing projects to seed data for each
    projects_result = connection.execute(sa.text("SELECT id FROM projects"))
    projects = projects_result.fetchall()

    for project in projects:
        project_id = project[0]

        # Insert evaluation categories (skip if they already exist)
        connection.execute(
            sa.text("""
            INSERT INTO evaluation_categories 
                (id, name, description, project_id, created_at, updated_at)
            SELECT 
                gen_random_uuid(),
                'Diligence Questions',
                'Category: My new category',
                :project_id,
                now(),
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM evaluation_categories 
                WHERE name = 'Diligence Questions' AND project_id = :project_id
            )
        """),
            {"project_id": project_id},
        )

        connection.execute(
            sa.text("""
            INSERT INTO evaluation_categories
                (id, name, description, project_id, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                'Legal Documents',
                'Category for legal document evaluations',
                :project_id,
                now(),
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM evaluation_categories 
                WHERE name = 'Legal Documents' AND project_id = :project_id
            )
        """),
            {"project_id": project_id},
        )

        # Get category IDs for this project
        diligence_cat_result = connection.execute(
            sa.text("""
            SELECT id FROM evaluation_categories 
            WHERE name = 'Diligence Questions' AND project_id = :project_id
        """),
            {"project_id": project_id},
        )
        diligence_cat_id = diligence_cat_result.fetchone()[0]

        legal_cat_result = connection.execute(
            sa.text("""
            SELECT id FROM evaluation_categories 
            WHERE name = 'Legal Documents' AND project_id = :project_id
        """),
            {"project_id": project_id},
        )
        legal_cat_id = legal_cat_result.fetchone()[0]

        # Insert evaluations (skip if they already exist)
        evaluations = [
            {
                "title": "CEO mentions",
                "description": "CEO of the company is mentioned",
                "evaluation_type": "BOOLEAN",
                "evaluation_options": "[]",
                "prompt": "Evaluate this document snippet please.",
                "system_prompt": (
                    "You are an evaluator of company documents. "
                    "Your job is to determine if the content you're evaluating "
                    "contains a mention of the CEO of the company for this doc."
                ),
                "category_id": diligence_cat_id,
            },
            {
                "title": "CFO mention",
                "description": "If CFO was mentioned",
                "evaluation_type": "BOOLEAN",
                "evaluation_options": None,
                "prompt": "Please evlauate this doc snippet",
                "system_prompt": (
                    "You check if the CFO is mentioned. "
                    "Evaluate if they were mentioned in the doc"
                ),
                "category_id": diligence_cat_id,
            },
            {
                "title": "Financial Projections",
                "description": "Contains financial projections",
                "evaluation_type": "BOOLEAN",
                "evaluation_options": None,
                "prompt": "Evaluate this document (snippet/page).",
                "system_prompt": (
                    "You are a document analyzier. You check if the "
                    "document page or snippet that you've bene presented "
                    "with contains financial projections or not."
                ),
                "category_id": diligence_cat_id,
            },
            {
                "title": "Forward looking statements",
                "description": "If any forward looking statements were mentioned",
                "evaluation_type": "BOOLEAN",
                "evaluation_options": None,
                "prompt": "Evaluate this doc snippet/page.",
                "system_prompt": (
                    "You're a document evaluator. You determine if any "
                    "forward looking statements were mentioned in this "
                    "document. You get 1 page or 1 snippet at a time, and "
                    "determine if it has such a statement"
                ),
                "category_id": diligence_cat_id,
            },
            {
                "title": "HR contracts",
                "description": "If HR contracts are mentioned",
                "evaluation_type": "BOOLEAN",
                "evaluation_options": None,
                "prompt": "Evaluate this doc snippet.",
                "system_prompt": (
                    "You check if there's any mention of an HR contracts "
                    "in a document. You get a document snippet and evaluate it."
                ),
                "category_id": diligence_cat_id,
            },
            {
                "title": "Procurement contracts",
                "description": "If any Procurement Contracts are mentioned",
                "evaluation_type": "BOOLEAN",
                "evaluation_options": None,
                "prompt": "Evaluate this snippet",
                "system_prompt": (
                    "You evaluate documents. You get one snippet at a time. "
                    "The question you're evaluating is if any Procurement "
                    "contracts are mentioned."
                ),
                "category_id": legal_cat_id,
            },
        ]

        for eval_data in evaluations:
            connection.execute(
                sa.text("""
                INSERT INTO evaluations (
                    id, title, description, evaluation_type, evaluation_options, 
                    prompt, system_prompt, project_id, category_id, 
                    parent_evaluation_id, parent_evaluation_option,
                    created_at, updated_at
                )
                SELECT 
                    gen_random_uuid(),
                    :title,
                    :description,
                    :evaluation_type, :evaluation_options,
                    :prompt, :system_prompt,
                    :project_id, :category_id,
                    NULL, NULL, now(), now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM evaluations 
                    WHERE title = :title AND project_id = :project_id
                )
            """),
                {**eval_data, "project_id": project_id},
            )


def downgrade() -> None:
    """Downgrade schema."""
    connection = op.get_bind()

    # Remove the seeded evaluations
    evaluation_titles = [
        "CEO mentions",
        "CFO mention",
        "Financial Projections",
        "Forward looking statements",
        "HR contracts",
        "Procurement contracts",
    ]

    for title in evaluation_titles:
        connection.execute(
            sa.text("""
            DELETE FROM evaluations WHERE title = :title
        """),
            {"title": title},
        )

    # Remove the seeded categories (but keep default)
    category_names = ["Diligence Questions", "Legal Documents"]

    for name in category_names:
        connection.execute(
            sa.text("""
            DELETE FROM evaluation_categories WHERE name = :name
        """),
            {"name": name},
        )
