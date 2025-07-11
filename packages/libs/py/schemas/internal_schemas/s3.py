from pydantic import BaseModel, Field


class S3RecordBucket(BaseModel):
    name: str
    arn: str


class S3RecordObject(BaseModel):
    key: str
    sequencer: str
    version_id: str = Field(alias="versionId")
    e_tag: str = Field(alias="eTag")
    size: int


class S3Record(BaseModel):
    bucket: S3RecordBucket
    object: S3RecordObject


class S3EventRecord(BaseModel):
    s3: S3Record


class S3Event(BaseModel):
    records: list[S3EventRecord] = Field(alias="Records")
