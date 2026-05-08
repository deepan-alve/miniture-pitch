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

## How migrations / metadata land in cloud (the workflow)

We don't use `nhost up cloud` (it's a local-stack-against-cloud-Postgres
hybrid that needs Docker). Instead:

1. **Schema (DDL)**: SQL files in `nhost/migrations/default/<ts>_<name>/up.sql`.
   We POST their contents to `/v2/query` with `run_sql`. See
   `scripts/apply-migrations.sh` (TODO — in this build we ran it inline).

2. **Metadata (table tracking, relationships, permissions)**: bulk POST
   to `/v1/metadata` using the `pg_track_table` /
   `pg_create_object_relationship` actions.

3. **Config (Hasura settings, auth providers, etc.)**:
   `nhost config apply --subdomain ntytiuebfzzodrotraun --yes` — pushes
   `nhost/nhost.toml` to the cloud project.

This bypasses the GitHub-integrated deployment path. When we're ready to
productionize, we'd switch to `nhost deployments new <git_ref>` with a
GitHub-connected repo.
