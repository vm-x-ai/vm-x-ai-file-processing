import json
import logging
from datetime import datetime, timezone

import aioboto3
from temporalio import activity

logger = logging.getLogger(__name__)


class SendEventActivity:
    def __init__(
        self,
        aioboto3_session: aioboto3.Session,
        event_bus_name: str,
    ):
        self._aioboto3_session = aioboto3_session
        self._event_bus_name = event_bus_name

    @activity.defn(name="SendEventActivity")
    async def run(self, source: str, event_type: str, data: dict):
        async with self._aioboto3_session.client("events") as client:
            logger.info(f"Sending event {event_type} to {self._event_bus_name}")
            await client.put_events(
                Entries=[
                    {
                        "Source": f"temporal-workflow.{source}",
                        "Detail": json.dumps(data),
                        "Time": datetime.now(timezone.utc).isoformat(),
                        "EventBusName": self._event_bus_name,
                        "DetailType": event_type,
                    }
                ]
            )
