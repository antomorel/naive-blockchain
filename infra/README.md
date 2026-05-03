# Matrix Infrastructure for Naive Blockchain P2P Network

This directory contains the infrastructure configuration for running a local Matrix homeserver (Synapse) that enables peer-to-peer communication between blockchain nodes.

> **Note:** The `docker-compose.yml` is located at the project root.

## Overview

The blockchain uses Matrix as a transport layer for:
- **Block propagation** - Nodes announce newly mined blocks
- **Transaction broadcasting** - Wallet transactions are shared across the network
- **Chain synchronization** - New nodes can sync by replaying room history

## Prerequisites

- Docker and Docker Compose
- `curl` and `jq` (for the setup script)

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq
```

## Quick Start

All commands should be run from the **project root** directory.

### 1. Generate Synapse keys (first time only)

```bash
docker run --rm \
  -v "$(pwd)/infra/data:/data" \
  -e SYNAPSE_SERVER_NAME=localhost \
  -e SYNAPSE_REPORT_STATS=no \
  -e UID=$(id -u) \
  -e GID=$(id -g) \
  matrixdotorg/synapse:latest generate
```

### 2. Start Synapse

```bash
docker compose up -d
```

### 3. Create accounts and blockchain room

```bash
./infra/scripts/setup-accounts.sh
```

This creates:
- 3 node accounts: `@node1:localhost`, `@node2:localhost`, `@node3:localhost`
- Public room: `#blockchain:localhost`

### 4. Verify setup

```bash
# Check Synapse health
curl http://localhost:8008/health

# Check Matrix API
curl http://localhost:8008/_matrix/client/versions
```

## Running Blockchain Nodes

Once the infrastructure is running, start blockchain nodes in separate terminals:

**Terminal 1 - Mining Node:**
```bash
MATRIX_USER_ID="@node1:localhost" \
MATRIX_PASSWORD="node1pass" \
LEDGER_SHOULD_MINE=true \
pnpm --filter ledger dev
```

**Terminal 2 - Sync Node:**
```bash
MATRIX_USER_ID="@node2:localhost" \
MATRIX_PASSWORD="node2pass" \
LEDGER_SHOULD_MINE=false \
pnpm --filter ledger dev
```

## Directory Structure

```
project-root/
├── docker-compose.yml          # Synapse service definition
└── infra/
    ├── README.md               # This file
    ├── .env.example            # Environment variable template
    ├── data/                   # Synapse runtime data (gitignored)
    │   ├── homeserver.db       # SQLite database
    │   ├── localhost.signing.key # Server signing key
    │   └── media_store/        # Uploaded media
    ├── synapse/
    │   ├── homeserver.yaml     # Synapse configuration
    │   └── localhost.log.config # Logging configuration
    └── scripts/
        └── setup-accounts.sh   # Account/room creation script
```

## Configuration

### Synapse Configuration (`synapse/homeserver.yaml`)

Key settings:
- `server_name: localhost` - Local-only server
- `federation_domain_whitelist: []` - Federation disabled
- `enable_registration: false` - Accounts created via admin API only
- SQLite database for simplicity

### Test Accounts

| User | Password |
|------|----------|
| `@node1:localhost` | `node1pass` |
| `@node2:localhost` | `node2pass` |
| `@node3:localhost` | `node3pass` |

### Environment Variables

See `.env.example` for all available options:

| Variable | Description | Default |
|----------|-------------|---------|
| `MATRIX_HOMESERVER_URL` | Synapse URL | `http://localhost:8008` |
| `MATRIX_USER_ID` | Node's Matrix user ID | - |
| `MATRIX_PASSWORD` | Node's Matrix password | - |
| `MATRIX_ROOM_ALIAS` | Blockchain room alias | `#blockchain:localhost` |
| `NODE_ID` | Unique node identifier | - |

## Troubleshooting

### Container keeps restarting

Check logs:
```bash
docker compose logs -f synapse
```

Common issues:
- Missing signing key: Run the generate command first
- Permission errors: Ensure `infra/data/` is writable

### Reset everything

```bash
# Stop and remove containers
docker compose down

# Remove data directory
rm -rf infra/data/

# Regenerate keys
docker run --rm -v "$(pwd)/infra/data:/data" \
  -e SYNAPSE_SERVER_NAME=localhost \
  -e SYNAPSE_REPORT_STATS=no \
  -e UID=$(id -u) -e GID=$(id -g) \
  matrixdotorg/synapse:latest generate

# Start fresh
docker compose up -d
./infra/scripts/setup-accounts.sh
```

### Can't connect to Synapse

1. Check if container is running: `docker compose ps`
2. Check if port 8008 is available: `lsof -i :8008`
3. Check health: `curl http://localhost:8008/health`

## Custom Matrix Event Types

The blockchain uses custom Matrix events for P2P communication:

| Event Type | Purpose |
|------------|---------|
| `org.naive.block` | Block announcements |
| `org.naive.transaction` | Transaction broadcasts |
| `org.naive.sync-request` | Chain sync requests |

These are defined in `packages/ledger/src/infrastructure/network/NetworkEventTypes.ts` (Phase 1).
