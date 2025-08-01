import json

import aioboto3
from dependency_injector import resources

from internal_services.settings import OpenAISettings


class OpenAIKeyResource(resources.AsyncResource):
    async def init(
        self, aioboto3_session: aioboto3.Session, openai_settings: OpenAISettings
    ):
        if openai_settings.api_key:
            self._key = openai_settings.api_key
        else:
            async with aioboto3_session.client("secretsmanager") as client:
                secret_value = await client.get_secret_value(
                    SecretId=openai_settings.secret_name
                )
                self._key = json.loads(secret_value["SecretString"])["api_key"]

        return self._key

    async def shutdown(self): ...

    @property
    def key(self) -> str:
        return self._key
