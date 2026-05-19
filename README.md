# DMS WebUI

A simple web interface for managing email accounts in [Docker Mailserver](https://github.com/docker-mailserver/docker-mailserver).

![screenshot](https://img.shields.io/badge/node-20-green) ![license](https://img.shields.io/badge/license-MIT-blue)

## Features

- List all email accounts
- Create new accounts
- Change passwords
- Delete accounts
- Protected by HTTP Basic Auth

## Requirements

- Docker & Docker Compose
- Docker Mailserver running on the same host
- Access to `/var/run/docker.sock`

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/apulanto-ai/dms-webui.git
cd dms-webui
```

### 2. Configure `docker-compose.yml`

```yaml
environment:
  DMS_CONTAINER: Docker-Mailserver   # exact name of your DMS container
  ADMIN_USER: admin                  # web UI login username
  ADMIN_PASSWORD: changeme           # web UI login password
```

> The container name is **case-sensitive**. Check yours with `docker ps`.

### 3. Start

```bash
docker compose up -d --build
```

The web interface is available at `http://<your-host>:8181`.

## Unraid

1. Copy the project folder to `/mnt/user/appdata/dms-webui/`
2. Edit `docker-compose.yml` and set `DMS_CONTAINER`, `ADMIN_USER`, `ADMIN_PASSWORD`
3. Install the **Compose Manager** plugin (via Community Applications) and deploy, **or** run manually via Unraid terminal:
   ```bash
   cd /mnt/user/appdata/dms-webui
   docker compose up -d --build
   ```
4. Open `http://<unraid-ip>:8181` in your browser

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DMS_CONTAINER` | `docker-mailserver` | Name of the DMS container |
| `ADMIN_USER` | `admin` | Web UI username |
| `ADMIN_PASSWORD` | `changeme` | Web UI password |
| `PORT` | `8080` | Internal container port |

## Security

- The Docker socket is mounted **read-only** — the container can only exec into DMS, not control other containers.
- All API inputs are validated before being passed to DMS.
- Commands are passed as argument arrays (no shell interpolation), preventing command injection.
- It is recommended to run this on a private network only and not expose it to the internet.

## License

MIT
