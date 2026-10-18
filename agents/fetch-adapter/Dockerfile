# Mailbox mode needs no public port, so this runs on any small host or laptop.
# Keep AGENT_SEED stable: it fixes the agent's address.
FROM python:3.11-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY src ./src
RUN uv sync --frozen --no-dev
CMD ["uv", "run", "--no-dev", "python", "-m", "betterbill_agent.agent"]
