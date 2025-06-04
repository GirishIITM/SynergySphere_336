# syntax=docker/dockerfile:1.9

FROM python:3.13-slim-bookworm

# Install curl and ca-certificates for uv install
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates git

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy dependency file(s) and source code
COPY requirements.txt ./
COPY . .

# Build arguments for version information
ARG APP_VERSION=1.0.0
ARG BUILD_DATE
ARG GIT_COMMIT
ARG DOCKER_TAG

# Set build date if not provided
RUN if [ -z "$BUILD_DATE" ]; then BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ); fi

# Create version.json file with build information
RUN echo "{ \
  \"version\": \"$APP_VERSION\", \
  \"build_date\": \"${BUILD_DATE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}\", \
  \"git_commit\": \"$GIT_COMMIT\", \
  \"docker_tag\": \"$DOCKER_TAG\", \
  \"environment\": \"production\" \
}" > version.json

# Create virtual environment and install dependencies
RUN uv venv .venv && \
    . .venv/bin/activate && \
    uv pip install -r requirements.txt

# Set environment variables for runtime
ENV APP_VERSION=$APP_VERSION
ENV BUILD_DATE=$BUILD_DATE
ENV GIT_COMMIT=$GIT_COMMIT
ENV DOCKER_TAG=$DOCKER_TAG

# Expose Flask default port
EXPOSE 5000

# Run the app (activate venv first)
CMD ["/bin/bash", "-c", ". .venv/bin/activate && gunicorn -b 0.0.0.0:5000 app:app"]