import logging


def setup_logger(
    log_level: int = logging.INFO,
    module_log_level: dict[str, int] | None = None,
) -> None:
    default_module_log_level = {
        "sqlalchemy": logging.ERROR,
    }
    if module_log_level is None:
        module_log_level = {**default_module_log_level}

    # Only configure the root logger if it's not already configured
    if logging.getLogger().hasHandlers():
        logging.getLogger().setLevel(log_level)
    else:
        logging.basicConfig(level=log_level)

    for module, level in module_log_level.items():
        logging.getLogger(module).setLevel(level)
