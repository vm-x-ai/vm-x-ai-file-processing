FROM python:3.11.9-slim-bullseye

WORKDIR /app

COPY dist /app

RUN python -m venv venv

RUN . venv/bin/activate && TAR_FILE=$(ls *.tar.gz) && pip install "$TAR_FILE[temporal]"

EXPOSE 8000

CMD ["/app/venv/bin/python", "-m", "api"]
