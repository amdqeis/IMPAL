FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    BACKEND_APP_MODULE=main:app \
    BACKEND_WORKERS=2

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install gunicorn uvicorn

COPY backend/ ./

EXPOSE 8000

CMD ["sh", "-c", "gunicorn ${BACKEND_APP_MODULE:-main:app} -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --workers ${BACKEND_WORKERS:-2} --access-logfile - --error-logfile -"]
