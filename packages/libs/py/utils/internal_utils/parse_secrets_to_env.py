import json
import logging
import os
import time
from typing import TYPE_CHECKING, Literal

import boto3
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


if TYPE_CHECKING:
    from types_boto3_secretsmanager import SecretsManagerClient
    from types_boto3_ssm import SSMClient


def get_ssm_parameters(
    ssm_client: "SSMClient", ssm_names: list[str], decrypt: bool = False
) -> dict[str, str]:
    if not ssm_names:
        return {}

    logger.info(f"Getting SSM parameters: {ssm_names}")
    ssm_values = ssm_client.get_parameters(
        Names=ssm_names,
        WithDecryption=decrypt,
    )

    logger.info(f"SSM parameters: {ssm_names} successfully fetched")

    return {
        ssm_value["Name"]: ssm_value["Value"] for ssm_value in ssm_values["Parameters"]
    }


def get_secrets(
    secrets_client: "SecretsManagerClient", secret_names: list[str]
) -> dict[str, dict[str, str]]:
    if not secret_names:
        return {}

    logger.info(f"Getting secrets: {secret_names}")
    secrets = secrets_client.batch_get_secret_value(SecretIdList=secret_names)
    logger.info(f"Secrets: {secret_names} successfully fetched")

    return {
        secret["Name"]: json.loads(secret["SecretString"])
        for secret in secrets["SecretValues"]
    }


class AWSSSMParameterEnvMapStr(BaseModel):
    decrypt: bool = Field(default=False)
    type: Literal["str"] = Field(default="str")
    map: str


class AWSSSMParameterEnvMapObject(BaseModel):
    decrypt: bool = Field(default=False)
    type: Literal["object"] = Field(default="object")
    map: dict[str, str]


class AWSSecretsEnvMap(BaseModel):
    secrets_map: dict[str, dict[str, str]] = Field(default_factory=dict)
    ssm_map: dict[str, AWSSSMParameterEnvMapStr | AWSSSMParameterEnvMapObject] = Field(
        default_factory=dict
    )


def parse_secrets_to_env(map_settings: AWSSecretsEnvMap) -> None:
    secrets_client = boto3.client("secretsmanager")
    ssm_client = boto3.client("ssm")

    logger.info("Parsing secrets to env")
    secret_names = []
    ssm_encrypted_names = []
    ssm_plain_names = []

    for secret_name in map_settings.secrets_map:
        if secret_name in os.environ:
            secret_names.append(os.environ[secret_name])

    for ssm_name, ssm_config in map_settings.ssm_map.items():
        if ssm_name in os.environ:
            if ssm_config.get("decrypt", False):
                ssm_encrypted_names.append(os.environ[ssm_name])
            else:
                ssm_plain_names.append(os.environ[ssm_name])

    start_time = time.time()
    secrets = get_secrets(secrets_client, secret_names)
    ssm_encrypted = get_ssm_parameters(ssm_client, ssm_encrypted_names, decrypt=True)
    ssm_plain = get_ssm_parameters(ssm_client, ssm_plain_names, decrypt=False)
    end_time = time.time()
    logger.info(
        f"Time taken to get secrets and ssm parameters: {end_time - start_time} seconds"
    )

    for secret_name, secret_map in map_settings.secrets_map.items():
        if secret_name in secrets:
            for key, value in secret_map.items():
                logger.info(f"Setting env: {value} with secret {secret_name}:{key}")
                os.environ[value] = secrets[secret_name][key]

    for ssm_name, ssm_config in map_settings.ssm_map.items():
        ssm_values = {
            **ssm_encrypted,
            **ssm_plain,
        }
        if ssm_name in ssm_values:
            if ssm_config.get("type", "str") == "str":
                env_key = ssm_config.get("map", None)
                if env_key:
                    logger.info(f"Setting env: {env_key} with ssm {ssm_name}")
                    os.environ[env_key] = ssm_values[ssm_name]
                else:
                    logger.warning(f"SSM parameter {ssm_name} has no map")
            elif ssm_config.get("type", "str") == "dict":
                ssm_value_obj = json.loads(ssm_values[ssm_name])
                for key, value in ssm_config.get("map", {}).items():
                    logger.info(f"Setting env: {value} with ssm {ssm_name}:{key}")
                    os.environ[value] = ssm_value_obj[key]
