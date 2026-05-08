// Cloud project endpoints — see docs/cloud-config.md.
// Hard-coded for the demo; in production these'd come from Expo config / .env.

export const NHOST_SUBDOMAIN = 'ntytiuebfzzodrotraun';
export const NHOST_REGION = 'ap-south-1';

export const HASURA_GRAPHQL_HTTP = `https://${NHOST_SUBDOMAIN}.hasura.${NHOST_REGION}.nhost.run/v1/graphql`;
export const HASURA_GRAPHQL_WS = `wss://${NHOST_SUBDOMAIN}.hasura.${NHOST_REGION}.nhost.run/v1/graphql`;
export const FUNCTIONS_BASE = `https://${NHOST_SUBDOMAIN}.functions.${NHOST_REGION}.nhost.run/v1`;
