import logging

import uvicorn
from dm_logger import setup_logger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.containers import Container
from api.routes import (
    evaluation,
    evaluation_template,
    file,
    ingest_callback,
    project,
    similarity_search,
    upload,
    workflow_trigger,
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
            workflow_trigger.__name__,
        ]
    )
    app.container = container  # type: ignore
    yield


app = FastAPI(title="Ingestion Workflow", version="0.1.0", lifespan=lifespan)

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
app.include_router(workflow_trigger.router)

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True, workers=2)
