// Tiny Hasura admin GraphQL helper used by every Function.
//
// Functions run inside Nhost's serverless runtime which auto-injects:
//   - NHOST_HASURA_URL      → the GraphQL endpoint (and NHOST_GRAPHQL_URL)
//   - NHOST_ADMIN_SECRET    → the admin secret  (Nhost's own var name —
//                              not NHOST_HASURA_ADMIN_SECRET, which is
//                              what one might guess but doesn't exist)
//
// We deliberately use the admin secret (not the caller's JWT) for writes
// because each Function does multiple coordinated INSERTs/UPDATEs that need
// to bypass row-level rules. Permission checks happen explicitly inside the
// Function (e.g. "does this owned_unit belong to the caller?").

export type GraphQLResult<T> = { data: T };

export interface HasuraGraphQLError {
  message: string;
  extensions?: Record<string, unknown>;
}

// Build the GraphQL endpoint deterministically from subdomain + region.
// Nhost injects `NHOST_HASURA_URL` pointing at `/console` (not /v1/graphql) —
// using it directly 404s. `NHOST_GRAPHQL_URL` exists in newer projects but
// the path varies. The subdomain.region pattern is stable across both eras.
const RESOLVED_HASURA_URL = (() => {
  const sub = process.env.NHOST_SUBDOMAIN;
  const region = process.env.NHOST_REGION;
  if (sub && region) {
    return `https://${sub}.hasura.${region}.nhost.run/v1/graphql`;
  }
  // Local dev / smoke test fall-throughs.
  return (
    process.env.HASURA_GRAPHQL_URL ??
    'https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/graphql'
  );
})();

const RESOLVED_ADMIN_SECRET =
  process.env.NHOST_ADMIN_SECRET ?? // Nhost's actual injected name in deployed Functions
  process.env.NHOST_HASURA_ADMIN_SECRET ?? // also try, just in case
  process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? // local-dev convention
  '';

export async function hasuraAdmin<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (!RESOLVED_ADMIN_SECRET) {
    throw new Error(
      'Hasura admin secret not in env (NHOST_ADMIN_SECRET / NHOST_HASURA_ADMIN_SECRET / HASURA_GRAPHQL_ADMIN_SECRET).',
    );
  }
  const res = await fetch(RESOLVED_HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': RESOLVED_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hasura HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as { data?: T; errors?: HasuraGraphQLError[] };
  if (json.errors && json.errors.length) {
    throw new Error(`Hasura GraphQL: ${json.errors.map((e) => e.message).join(' | ')}`);
  }
  return json.data as T;
}

/**
 * Pull the JWT-claims from the standard Nhost-injected request header. Nhost
 * forwards `x-hasura-user-id` and friends after verifying the JWT. If the
 * function was hit unauthenticated those headers are absent.
 */
export interface HasuraSession {
  userId: string | null;
  role: string;
  allowedRoles: string[];
}

export function readSession(req: { headers: Record<string, string | string[] | undefined> }): HasuraSession {
  const get = (k: string): string | null => {
    const v = req.headers[k] ?? req.headers[k.toLowerCase()];
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  };
  const role = get('x-hasura-role') ?? get('x-hasura-default-role') ?? 'public';
  const userId = get('x-hasura-user-id');
  const allowedRaw = get('x-hasura-allowed-roles');
  const allowedRoles = allowedRaw
    ? allowedRaw
        .replace(/^\{|\}$/g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return { userId, role, allowedRoles };
}
