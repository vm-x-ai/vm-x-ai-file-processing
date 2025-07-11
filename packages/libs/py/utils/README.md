# utils

This library provides a collection of general-purpose utility functions and helpers for Python projects within the vm-x-ai monorepo. It is designed to promote code reuse, consistency, and maintainability across different services and applications.

## Purpose

- Centralize common utility functions (e.g., string manipulation, file operations, data transformations)
- Reduce code duplication across Python projects
- Serve as a foundational library for other Python modules in the monorepo

## Usage

Import the required utility functions in your Python project:

```python
from internal_utils import some_utility_function
```

## Installation

To add this package to another Python project in the monorepo, use:

```bash
pnpm nx run <target_project>:add py-utils --local
```

Replace `<target_project>` with the name of your target project.
