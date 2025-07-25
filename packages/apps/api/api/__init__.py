from internal_utils import (
    AWSSecretsEnvMap,
    AWSSSMParameterEnvMapStr,
    parse_secrets_to_env,
)

parse_secrets_to_env(
    AWSSecretsEnvMap(
        secrets_map={
            "DB_SECRET_NAME": {
                "host": "DB_HOST",
                "port": "DB_PORT",
                "dbname": "DB_NAME",
                "username": "DB_USER",
                "password": "DB_PASSWORD",
            },
            "OPENAI_API_KEY_SECRET_NAME": {
                "api_key": "OPENAI_API_KEY",
            },
        },
        ssm_map={
            "DB_RO_HOST_SSM_NAME": AWSSSMParameterEnvMapStr(
                decrypt=True,
                type="str",
                map="DB_RO_HOST",
            ),
        },
    )
)

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from internal_logger import setup_logger

from api.containers import Container
from api.routes import (
    evaluation,
    evaluation_template,
    file,
    health,
    ingest_callback,
    project,
    similarity_search,
    upload,
)

setup_logger()


async def lifespan(app: FastAPI):
    container = Container()
    container.init_resources()

    container.wire(
        modules=[
            __name__,
            ingest_callback.__name__,
            project.__name__,
            upload.__name__,
            file.__name__,
            evaluation.__name__,
            similarity_search.__name__,
            evaluation_template.__name__,
            health.__name__,
        ]
    )
    app.container = container  # type: ignore
    yield


app = FastAPI(
    title="VM-X AI File Processing API",
    version="0.1.0",
    lifespan=lifespan,
    root_path="/api",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)

app.include_router(ingest_callback.router)
app.include_router(project.router)
app.include_router(upload.router)
app.include_router(file.router)
app.include_router(evaluation.router)
app.include_router(similarity_search.router)
app.include_router(evaluation_template.router)
app.include_router(health.router)
