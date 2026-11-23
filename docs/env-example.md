# File: `.env.example`

**What it is:** A template listing every setting the platform understands:
which adapters to use (mock / live / file), where Allure results live,
Jira URL/email/token/project, Zephyr token and field names, Playwright MCP
settings, and LLM settings.

**Why it exists:** So nobody has to guess which environment variables exist.
You copy it to `.env`, fill in real values, and the server picks them up.

**Important:** it contains *names only*, never real passwords or tokens.
Real secrets go through secure storage, never into git.
