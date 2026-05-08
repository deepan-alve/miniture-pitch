# Cloud project — endpoints and quick-reference

The app talks directly to the Nhost cloud project. The local Nhost stack
(`nhost up`) isn't required for normal dev — only useful if we want a
sandboxed copy for destructive testing.

## Identity

| key | value |
|---|---|
| Subdomain | `ntytiuebfzzodrotraun` |
| Region | `ap-south-1` |
| Project | `Miniture` (Workspace: `Deepanalve`) |

## Endpoints

| service | URL |
|---|---|
| GraphQL | `https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/graphql` |
| GraphQL WebSocket | `wss://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/graphql` |
| Auth | `https://ntytiuebfzzodrotraun.auth.ap-south-1.nhost.run/v1` |
| Storage | `https://ntytiuebfzzodrotraun.storage.ap-south-1.nhost.run/v1` |
| Functions | `https://ntytiuebfzzodrotraun.functions.ap-south-1.nhost.run/v1` |
| Hasura admin (metadata API) | `https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/metadata` |

## Admin secret

Lives in `.cloud-admin-secret` (gitignored, mode 600). Source it before any
admin-side script:

```bash
set -a; source .cloud-admin-secret; set +a
echo "$GENERATED_SECRET" | head -c 6  # sanity check, prints first 6 chars
```

This secret was set by us via `nhost secrets update`. If you need to
rotate it:

```bash
NEW=$(openssl rand -base64 24 | tr -d '=+/' | head -c 32)
nhost secrets update HASURA_GRAPHQL_ADMIN_SECRET "$NEW" --subdomain ntytiuebfzzodrotraun
nhost config apply --subdomain ntytiuebfzzodrotraun --yes   # cloud Hasura picks up the new value
echo "GENERATED_SECRET=$NEW" > .cloud-admin-secret
```

## Quick test the cloud is alive

```bash
set -a; source .cloud-admin-secret; set +a
curl -sS https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $GENERATED_SECRET" \
  -d '{"query":"{ accounts_aggregate { aggregate { count } } }"}'
```

Should return `{"data":{"accounts_aggregate":{"aggregate":{"count":N}}}}`.

## How migrations / metadata / Functions land in cloud (the workflow)

The cloud project is connected to GitHub at **`deepan-alve/miniture-pitch`** (branch `main`). Every deploy fetches that ref, applies migrations, syncs metadata, and rolls out Functions.

### Trigger a deploy from the CLI

```bash
HEAD=$(git -C ~/Documents/Padaipu/Miniture rev-parse HEAD)

HTTPS_PROXY=socks5://127.0.0.1:1080 ALL_PROXY=socks5://127.0.0.1:1080 \
  nhost deployments new \
  --subdomain ntytiuebfzzodrotraun \
  --ref "$HEAD" \
  --user deepan-alve \
  --message "your message" \
  --follow
```

(`--follow` streams logs; can drop it and poll `nhost deployments list` instead.) The proxy env vars are only needed on this dev machine — Fortinet middlebox at the network edge breaks direct HTTPS to Nhost.

### What the deploy does

1. **`nhost.toml` config** → applied to the cloud project's settings (Hasura version, auth providers, `[auth.user.roles]`, etc.). 
2. **Migrations** in `nhost/migrations/default/*/up.sql` → applied via Hasura CLI. Migrations are idempotent (CREATE TYPE wrapped in DO/EXCEPTION, IF NOT EXISTS on tables/indexes, DROP TRIGGER IF EXISTS before CREATE TRIGGER) so they're safe to re-run.
3. **Metadata** in `nhost/metadata/` → applied via Hasura CLI. Defines tracked tables, relationships, and the parent/ops/admin/public permission matrix. Source of truth = whatever's in `nhost/metadata/databases/default/tables/*.yaml` at the deployed ref.
4. **Functions** in `functions/*.ts` → bundled with esbuild and deployed as serverless endpoints at `https://ntytiuebfzzodrotraun.functions.ap-south-1.nhost.run/v1/<filename>`.

### Bootstrap-time admin operations

The first-time bootstrap that's not in the deploy pipeline:

- **Admin secret rotation**: `nhost secrets update HASURA_GRAPHQL_ADMIN_SECRET <new> --subdomain ntytiuebfzzodrotraun` then `nhost config apply ...` then write the new value to `.cloud-admin-secret`.
- **Seed data**: `nhost/seeds/default/0001_demo_data.sql` is applied manually via `run_sql` against `/v2/query` (see `scripts/reset-demo.sh` for the cleanup-then-reseed pattern).
