SELECT
    files.name,
    files.type,
    files.size,
    files.url,
    files.status,
    files.error,
    files.project_id,
    files.thumbnail_url,
    files.id,
    files.created_at,
    files.updated_at,
    file_evaluations.file_id,
    file_evaluations.evaluation_id,
    file_evaluations.content_id,
    file_evaluations.response,
    file_evaluations.status AS status_1,
    file_evaluations.error AS error_1,
    file_evaluations.id AS id_1,
    file_evaluations.created_at AS created_at_1,
    file_evaluations.updated_at AS updated_at_1,
    evaluations.title,
    evaluations.description,
    evaluations.system_prompt,
    evaluations.prompt,
    evaluations.project_id AS project_id_1,
    evaluations.evaluation_type,
    evaluations.evaluation_options,
    evaluations.parent_evaluation_id,
    evaluations.parent_evaluation_option,
    evaluations.id AS id_2,
    evaluations.created_at AS created_at_2,
    evaluations.updated_at AS updated_at_2,
    file_contents.file_id AS file_id_1,
    file_contents.content_number,
    file_contents.content_metadata,
    file_contents.content,
    file_contents.id AS id_3,
    file_contents.created_at AS created_at_3,
    file_contents.updated_at AS updated_at_3
FROM
    files
    JOIN file_evaluations ON files.id = file_evaluations.file_id
    JOIN evaluations ON file_evaluations.evaluation_id = evaluations.id
    JOIN file_contents ON file_evaluations.content_id = file_contents.id
WHERE
    files.project_id = '00000000000000000000000000000000'
    AND (
        (
            (
                EXISTS (
                    SELECT
                        1 AS anon_1
                    FROM
                        file_evaluations
                    WHERE
                        file_evaluations.file_id = files.id
                        AND file_evaluations.evaluation_id = '0d162055f9504929bd2e36f85136a918'
                        AND file_evaluations.response = 'red'
                )
            )
            AND (
                EXISTS (
                    SELECT
                        1 AS anon_2
                    FROM
                        file_evaluations
                    WHERE
                        file_evaluations.file_id = files.id
                        AND file_evaluations.evaluation_id = '602e0799a9a8466291e334fa010d7d29'
                        AND file_evaluations.response = 'true'
                )
            )
        )
        OR (
            EXISTS (
                SELECT
                    1 AS anon_3
                FROM
                    file_evaluations
                WHERE
                    file_evaluations.file_id = files.id
                    AND file_evaluations.evaluation_id = '0d162055f9504929bd2e36f85136a918'
                    AND file_evaluations.response = 'yellow'
            )
        )
        OR (
            EXISTS (
                SELECT
                    1 AS anon_4
                FROM
                    file_evaluations
                WHERE
                    file_evaluations.file_id = files.id
                    AND file_evaluations.evaluation_id = '0d162055f9504929bd2e36f85136a918'
                    AND file_evaluations.response = 'green'
            )
        )
        OR (
            (
                EXISTS (
                    SELECT
                        1 AS anon_5
                    FROM
                        file_evaluations
                    WHERE
                        file_evaluations.file_id = files.id
                        AND file_evaluations.evaluation_id = '0d162055f9504929bd2e36f85136a918'
                        AND file_evaluations.response = 'red'
                )
            )
            AND (
                EXISTS (
                    SELECT
                        1 AS anon_6
                    FROM
                        file_evaluations
                    WHERE
                        file_evaluations.file_id = files.id
                        AND file_evaluations.evaluation_id = 'a731947d18af4fc0b21f0f56159463cf'
                        AND file_evaluations.response = 'true'
                )
            )
        )
    )
    AND (
        (
            file_evaluations.evaluation_id = '0d162055f9504929bd2e36f85136a918'
            AND file_evaluations.response = 'red'
        )
        OR (
            file_evaluations.evaluation_id = '602e0799a9a8466291e334fa010d7d29'
            AND file_evaluations.response = 'true'
        )
        OR (
            file_evaluations.evaluation_id = '0d162055f9504929bd2e36f85136a918'
            AND file_evaluations.response = 'yellow'
        )
        OR (
            file_evaluations.evaluation_id = '0d162055f9504929bd2e36f85136a918'
            AND file_evaluations.response = 'green'
        )
        OR (
            file_evaluations.evaluation_id = '0d162055f9504929bd2e36f85136a918'
            AND file_evaluations.response = 'red'
        )
        OR (
            file_evaluations.evaluation_id = 'a731947d18af4fc0b21f0f56159463cf'
            AND file_evaluations.response = 'true'
        )
    )
ORDER BY
    files.created_at DESC