from dependency_injector import providers
from internal_aws_shared.containers import AWSContainer

from .client import VMXClientResource
from .settings import VMXSettings


class VMXContainer(AWSContainer):
    vmx_settings = providers.Singleton(VMXSettings)

    vmx_client = providers.Resource(
        VMXClientResource,
        aioboto3_session=AWSContainer.aioboto3_session,
        vmx_settings=vmx_settings,
    )
