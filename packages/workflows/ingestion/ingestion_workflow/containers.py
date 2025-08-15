from dependency_injector import providers
from internal_aws_shared.containers import AWSContainer
from internal_aws_sqs_consumer.settings import SQSConsumerSettings
from internal_temporal_utils.containers import TemporalContainer


class Container(TemporalContainer, AWSContainer):
    sqs_consumer_settings = providers.Singleton(SQSConsumerSettings)
