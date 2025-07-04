# py-schemas

This library defines and manages data schemas for Python projects within the vm-x-ai monorepo. It provides reusable schema definitions for data validation, serialization, and inter-service communication, ensuring data consistency and integrity across the platform.

## Purpose

- Centralize schema definitions for shared data models
- Enable robust data validation and serialization
- Facilitate consistent data exchange between services

## Usage

Import and use schemas in your Python project:

```python
from vmxfp_schemas import SomeSchema

validated = SomeSchema.model_validate(data)
```

## Installation

To add this package to another Python project in the monorepo, use:

```bash
pnpm nx run <target_project>:add vmxfp-py-schemas --local
```

Replace `<target_project>` with the name of your target project.
