"""seed_evaluation_data

Revision ID: 383bff3555c9
Revises: add_evaluation_categories
Create Date: 2025-05-26 21:40:43.192302

"""

from collections.abc import Sequence
import json
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

        # Insert only the 'Example' evaluation category (skip if it already exists)
        connection.execute(
            sa.text("""
            INSERT INTO evaluation_categories 
                (id, name, description, project_id, created_at, updated_at)
            SELECT 
                gen_random_uuid(),
                'Example',
                'Category: Example category',
                :project_id,
                now(),
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM evaluation_categories 
                WHERE name = 'Example' AND project_id = :project_id
            )
        """),
            {"project_id": project_id},
        )

        # Get category ID for this project
        example_cat_result = connection.execute(
            sa.text("""
            SELECT id FROM evaluation_categories 
            WHERE name = 'Example' AND project_id = :project_id
        """),
            {"project_id": project_id},
        )
        example_cat_id = example_cat_result.fetchone()[0]

        # Insert 2 fun demo evaluations
        evaluations = [
            {
                "title": "Pizza Mention Detector",
                "description": "Check if the document mentions pizza.",
                "evaluation_type": "TEXT",
                "evaluation_options": None,
                "prompt": "Does this document mention pizza in any context? If yes, return the flavor of the pizza, otherwise return none.",
                "system_prompt": (
                    "You are a fun evaluator. Your job is to determine if the provided document snippet contains any mention of pizza, regardless of context."
                ),
                "category_id": example_cat_id,
            },
            {
                "title": "Joke Finder",
                "description": "Determine if the document contains a joke or something funny.",
                "evaluation_type": "ENUM_CHOICE",
                "evaluation_options": json.dumps(["good", "bad", "none"]),
                "prompt": "Does this document contain a joke or something intended to be funny? If yes, return the joke, otherwise return none.",
                "system_prompt": (
                    "You are a whimsical evaluator. Your job is to check if the provided document snippet contains a joke, pun, or anything meant to make someone laugh."
                ),
                "category_id": example_cat_id,
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
                    :evaluation_type,
                    :evaluation_options,
                    :prompt, :system_prompt,
                    :project_id,
                    :category_id,
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

    # Remove the seeded fun demo evaluations
    evaluation_titles = [
        "Pizza Mention Detector",
        "Joke Finder",
    ]

    for title in evaluation_titles:
        connection.execute(
            sa.text("""
            DELETE FROM evaluations WHERE title = :title
        """),
            {"title": title},
        )

    # Remove the seeded category (but keep default)
    category_names = ["Example"]

    for name in category_names:
        connection.execute(
            sa.text("""
            DELETE FROM evaluation_categories WHERE name = :name
        """),
            {"name": name},
        )
