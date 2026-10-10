ARG BUILD_FROM
FROM ${BUILD_FROM}

# Only the Python standard library is used: no pip install needed.
WORKDIR /app
COPY battbrain_core /app/battbrain_core
COPY battbrain_app /app/battbrain_app
COPY web /app/web

ENV PYTHONUNBUFFERED=1
CMD ["python3", "-m", "battbrain_app"]
