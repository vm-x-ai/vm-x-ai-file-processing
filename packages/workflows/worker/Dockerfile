FROM python:3.13.5-slim-bullseye

WORKDIR /app

# Install poppler-utils for PDF processing
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

COPY dist /app

RUN python -m venv venv

RUN . venv/bin/activate && TAR_FILE=$(ls *.tar.gz) && pip install $TAR_FILE

EXPOSE 8000

CMD ["/app/venv/bin/python", "-m", "workflow_worker"]
