import asyncio
import logging

from dependency_injector import containers
from internal_utils import parse_args
from pydantic import BaseModel

logger = logging.getLogger(__name__)


async def proxy_activity(
    container: containers.DeclarativeContainer,
    activity_name: str,
    args: dict,
):
    logger.info(f"Resolving activity class from {activity_name}")
    activity_provider = getattr(container, activity_name, None)
    if not activity_provider:
        raise ValueError(f"Activity {activity_name} not found")

    logger.info(
        f"Fetching activity: {activity_name} from dependency injection container"
    )
    activity_maybe_future = activity_provider()
    if asyncio.isfuture(activity_maybe_future):
        activity = await activity_maybe_future
    else:
        activity = activity_maybe_future

    logger.info(f"Activity: {activity} resolved")
    logger.info(f"Resolving args for activity: {activity_name}")
    args = parse_args(activity.run, args)
    logger.info(f"Args: {args} resolved")
    logger.info(f"Running activity: {activity_name}")
    result = await activity.run(**args)
    logger.info(f"Result: {result} resolved")
    if result and isinstance(result, BaseModel):
        return result.model_dump(mode="json")

    return result
