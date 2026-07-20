FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies (unzip required for AWS CLI)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    openssh-client \
    build-essential \
    vim \
    git \
    curl \
    unzip \
    gawk \
    dirmngr \
    gpg \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean

ENV ANTHROPIC_BASE_URL=http://host.docker.internal:1234
ENV ANTHROPIC_AUTH_TOKEN=lmstudio
ENV PNPM_HOME=/root/.local/share/pnpm
ENV CHOKIDAR_USEPOLLING=true
ENV CHOKIDAR_INTERVAL=100

RUN groupadd --gid 1000 devuser \
    && useradd --uid 1000 --gid 1000 -m devuser -s /bin/bash \
    && apt-get update \
    && apt-get install -y sudo \
    && apt-get clean \
    && echo "devuser ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/devuser \
    && chmod 0440 /etc/sudoers.d/devuser


# Install Playwright — Node.js version (global, root level for npx install)
RUN npm install -g playwright && npx playwright install --with-deps chromium firefox webkit

# Install Playwright — Python version (pip + browser binaries)
RUN pip install --no-cache-dir playwright \
    && python3 -m playwright install --with-deps chromium firefox webkit

# Install AWS CLI v2 (command line installer)
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip" \
    && cd /tmp \
    && unzip -qo awscliv2.zip \
    && sudo ./aws/install --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli \
    && rm -rf /tmp/awscliv2.zip /tmp/aws

USER devuser

ENV HOME=/home/devuser
ENV PATH="$HOME/.local/bin:$PNPM_HOME:$PNPM_HOME/bin:$PATH"

# Install Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash

# Install Poetry
ENV POETRY_HOME="$HOME/.local/share/poetry"
ENV POETRY_VIRTUALENVS_CREATE=false
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s "$POETRY_HOME/bin/poetry" "$HOME/.local/bin/poetry"