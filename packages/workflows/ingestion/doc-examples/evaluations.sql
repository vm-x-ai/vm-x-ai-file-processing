truncate table projects cascade;

insert into projects (name, description, id)
VALUES ('default', 'default', '00000000-0000-0000-0000-000000000000');

insert into evaluations (id, project_id, title, description, system_prompt, prompt, evaluation_type, evaluation_options)
VALUES
(
    '0d162055-f950-4929-bd2e-36f85136a918',
    '00000000-0000-0000-0000-000000000000',
    'fruit_type',
    'Fruit Type',
    '',
    'Which fruit type is this document about?',
    'ENUM_CHOICE',
    '["red", "green", "yellow", "orange"]'
);

insert into evaluations (id, project_id, title, description, system_prompt, prompt, evaluation_type, evaluation_options, parent_evaluation_id, parent_evaluation_option)
VALUES
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'cancer_prevention',
    'Cancer Prevention',
    '',
    'Does this document mention cancer prevention?',
    'BOOLEAN',
    null,
    '0d162055-f950-4929-bd2e-36f85136a918',
    'red'
);

insert into evaluations (id, project_id, title, description, system_prompt, prompt, evaluation_type, evaluation_options, parent_evaluation_id, parent_evaluation_option)
VALUES
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'strawberries',
    'Strawberries',
    '',
    'Does this document mention strawberries?',
    'BOOLEAN',
    null,
    '0d162055-f950-4929-bd2e-36f85136a918',
    'red'
);
