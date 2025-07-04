import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from vmxfp_logger import setup_logger

from api.containers import Container
from api.routes import (
    evaluation,
    evaluation_template,
    file,
    ingest_callback,
    project,
    similarity_search,
    upload,
)

setup_logger()


async def lifespan(app: FastAPI):
    container = Container()
    await container.init_resources()
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
