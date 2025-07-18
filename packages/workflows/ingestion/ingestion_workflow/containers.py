import aioboto3
from dependency_injector import providers
from internal_aws_sqs_consumer.settings import SQSConsumerSettings
from internal_temporal_utils.containers import TemporalContainer


class Container(TemporalContainer):
    sqs_consumer_settings = providers.Singleton(SQSConsumerSettings)

    aioboto3_session = providers.Singleton(
        aioboto3.Session,
    )
