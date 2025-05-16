import mimetypes

import aioboto3
from aiobotocore.config import AioConfig


def parse_s3_path(s3_path: str) -> tuple[str, str]:
    if not s3_path.startswith("s3://"):
        raise ValueError("Invalid S3 path")

    bucket_name = s3_path.split("/")[2]
    key = "/".join(s3_path.split("/")[3:])

    return bucket_name, key


async def generate_download_url(s3_path: str, session: aioboto3.Session) -> str:
    bucket_name, key = parse_s3_path(s3_path)
    config = AioConfig(signature_version="s3v4")
    async with session.client("s3", config=config) as s3:
        url = await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": key},
            ExpiresIn=3600,
            HttpMethod="GET",
        )
        return url


async def generate_upload_url(
    s3_path: str,
    file_size: int,
    session: aioboto3.Session,
) -> str:
    mime_type = mimetypes.guess_type(s3_path)[0]

    bucket_name, key = parse_s3_path(s3_path)
    config = AioConfig(signature_version="s3v4")
    async with session.client("s3", config=config) as s3:
        url = await s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket_name,
                "Key": key,
                "ContentType": mime_type or "application/octet-stream",
                "ContentLength": file_size,
            },
            ExpiresIn=3600,
        )
        return url
