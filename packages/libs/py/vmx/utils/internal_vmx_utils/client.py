import json

import aioboto3
from dependency_injector import resources
from vmxai import VMXClient

from internal_vmx_utils.settings import VMXSettings


class VMXClientResource(resources.AsyncResource):
    client: VMXClient
    resource_id: str

    async def init(self, aioboto3_session: aioboto3.Session, vmx_settings: VMXSettings):
        if (
            vmx_settings.domain
            and vmx_settings.api_key
            and vmx_settings.workspace_id
            and vmx_settings.environment_id
            and vmx_settings.resource_id
        ):
            self.client = VMXClient(
                domain=vmx_settings.domain,
                api_key=vmx_settings.api_key,
                workspace_id=vmx_settings.workspace_id,
                environment_id=vmx_settings.environment_id,
            )
            self.resource_id = vmx_settings.resource_id
        else:
            async with aioboto3_session.client("secretsmanager") as client:
                secret_value = await client.get_secret_value(
                    SecretId=vmx_settings.secret_name
                )
                creds = json.loads(secret_value["SecretString"])

            self.client = VMXClient(
                domain=creds["domain"],
                api_key=creds["api_key"],
                workspace_id=creds["workspace_id"],
                environment_id=creds["environment_id"],
            )
            self.resource_id = creds["resource_id"]

        return self

    async def shutdown(self, resource: "VMXClientResource"): ...
