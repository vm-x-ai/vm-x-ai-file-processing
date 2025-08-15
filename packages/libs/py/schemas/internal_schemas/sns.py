from typing import Literal

from pydantic import BaseModel, Field, RootModel


class BaseSnsMessage(BaseModel):
    message_id: str = Field(alias="MessageId")
    topic_arn: str = Field(alias="TopicArn")
    message: str = Field(alias="Message")
    timestamp: str = Field(alias="Timestamp")
    signature_version: str = Field(alias="SignatureVersion")
    signature: str = Field(alias="Signature")
    signing_cert_url: str = Field(alias="SigningCertURL")


class SubscriptionSnsMessage(BaseSnsMessage):
    type: Literal["SubscriptionConfirmation"] = Field(alias="Type")
    subscribe_url: str = Field(alias="SubscribeURL")
    token: str = Field(alias="Token")


class NotificationSnsMessage(BaseSnsMessage):
    type: Literal["Notification"] = Field(alias="Type")
    unsubscribe_url: str = Field(alias="UnsubscribeURL")


class SnsMessage(RootModel[SubscriptionSnsMessage | NotificationSnsMessage]): ...
