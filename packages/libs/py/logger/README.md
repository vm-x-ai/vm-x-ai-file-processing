# py-logger

This library provides standardized logging utilities for Python projects within the vm-x-ai monorepo. It aims to ensure consistent logging practices, simplify log management, and support debugging and monitoring across all Python services.

## Purpose

- Offer a unified logging interface for all Python modules
- Support structured and configurable logging output
- Facilitate integration with external log management systems

## Usage

Import and set up the logger in your Python project:

```python
from internal_logger import setup_logger
import logging

setup_logger()  # Optionally pass log_level or module_log_level
logger = logging.getLogger(__name__)
logger.info('This is an info message')
```

## Installation

To add this package to another Python project in the monorepo, use:

```bash
pnpm nx run <target_project>:add py-logger --local
```

Replace `<target_project>` with the name of your target project.
