# Add-on: Home Assistant passes BUILD_FROM (see build.yaml).
# Standalone (docker compose): the plain Python image below is used.
ARG BUILD_FROM=python:3.12-alpine
FROM ${BUILD_FROM}

# Only the Python standard library is used: no pip install needed.
WORKDIR /app
COPY battbrain_core /app/battbrain_core
COPY battbrain_app /app/battbrain_app
COPY web /app/web

ENV PYTHONUNBUFFERED=1
EXPOSE 8099
CMD ["python3", "-m", "battbrain_app"]
