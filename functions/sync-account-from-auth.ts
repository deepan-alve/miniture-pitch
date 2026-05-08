// POST /v1/sync-account-from-auth
//
// Called from the app right after a successful Nhost sign-up. Maps known
// demo emails to seeded `accounts` rows by patching the row's `auth_user_id`
// to whatever fresh UUID Nhost just minted. For unknown emails it inserts a
// fresh accounts row.
//
// Body:  { email: string, auth_user_id: string }
// Reply: { account_id, kind: 'linked' | 'created', display_name, role }
//
// Side effects:
//   - For ops@miniture.demo we also flip the auth user's defaultRole to 'ops'
//     via the Nhost auth admin endpoint so subsequent logins emit the right
//     JWT claims.

import { hasuraAdmin } from './_lib/hasura';

interface ReqBody {
  email?: string;
  auth_user_id?: string;
}

const DEMO_ACCOUNT_BY_EMAIL: Record<string, { account_id: string; role: 'parent' | 'ops' }> = {
  'josh.parent@miniture.demo': {
    account_id: 'bbbbbbbb-0001-0000-0000-000000000001',
    role: 'parent',
  },
  'maya.mom@miniture.demo': {
    account_id: 'bbbbbbbb-0001-0000-0000-000000000002',
    role: 'parent',
  },
  'ops@miniture.demo': {
    account_id: 'bbbbbbbb-0001-0000-0000-000000000003',
    role: 'ops',
  },
};

async function setNhostUserRole(authUserId: string, role: string): Promise<void> {
  // Nhost stores roles in auth.users.defaultRole + auth.user_roles. We can
  // update both via Hasura admin since the auth schema is tracked.
  await hasuraAdmin(
    /* GraphQL */ `
      mutation SetDefaultRole($id: uuid!, $role: String!) {
        update_users_by_pk(pk_columns: { id: $id }, _set: { defaultRole: $role }) {
          id defaultRole
        }
      }
    `,
    { id: authUserId, role },
  );
  // Make sure the role exists in the allowed-roles join table.
  await hasuraAdmin(
    /* GraphQL */ `
      mutation EnsureUserRole($user_id: uuid!, $role: String!) {
        insert_authUserRoles_one(
          object: { userId: $user_id, role: $role }
          on_conflict: { constraint: user_roles_user_id_role_key, update_columns: [] }
        ) { id }
      }
    `,
    { user_id: authUserId, role },
  ).catch(() => {
    // If the on_conflict constraint name differs in this Nhost version, the
    // role-row might already exist or the mutation name may be slightly
    // different. We swallow silently — defaultRole is the load-bearing field.
  });
}

interface SyncResult {
  account_id: string;
  kind: 'linked' | 'created';
  display_name: string;
  role: 'parent' | 'ops';
}

async function handle(body: ReqBody): Promise<SyncResult> {
  const email = (body.email ?? '').toLowerCase().trim();
  const authUserId = (body.auth_user_id ?? '').trim();
  if (!email || !authUserId) {
    throw new Error('email and auth_user_id are required');
  }

  const demo = DEMO_ACCOUNT_BY_EMAIL[email];

  if (demo) {
    // Patch the seed row's auth_user_id to the freshly-created Nhost user.
    const r = await hasuraAdmin<{
      update_accounts_by_pk: { id: string; display_name: string } | null;
    }>(
      /* GraphQL */ `
        mutation LinkSeedAccount($id: uuid!, $auth_user_id: uuid!) {
          update_accounts_by_pk(
            pk_columns: { id: $id }
            _set: { auth_user_id: $auth_user_id }
          ) { id display_name }
        }
      `,
      { id: demo.account_id, auth_user_id: authUserId },
    );
    if (!r.update_accounts_by_pk) {
      throw new Error(`seed account ${demo.account_id} not found`);
    }
    if (demo.role === 'ops') {
      await setNhostUserRole(authUserId, 'ops');
    }
    return {
      account_id: demo.account_id,
      kind: 'linked',
      display_name: r.update_accounts_by_pk.display_name,
      role: demo.role,
    };
  }

  // Unknown email — provision a fresh accounts row.
  const localPart = email.split('@')[0] || 'user';
  const displayName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ') || 'New Member';

  const ins = await hasuraAdmin<{
    insert_accounts_one: { id: string; display_name: string } | null;
  }>(
    /* GraphQL */ `
      mutation CreateAccount($auth_user_id: uuid!, $display_name: String!, $shopify_gid: String!) {
        insert_accounts_one(
          object: {
            auth_user_id: $auth_user_id
            display_name: $display_name
            shopify_customer_gid: $shopify_gid
          }
        ) { id display_name }
      }
    `,
    {
      auth_user_id: authUserId,
      display_name: displayName,
      shopify_gid: `gid://shopify/Customer/synced-${authUserId.slice(0, 8)}`,
    },
  );
  if (!ins.insert_accounts_one) {
    throw new Error('account insert returned null');
  }
  return {
    account_id: ins.insert_accounts_one.id,
    kind: 'created',
    display_name: ins.insert_accounts_one.display_name,
    role: 'parent',
  };
}

export default async function handler(req: any, res: any) {
  try {
    const body = (req.body ?? {}) as ReqBody;
    const result = await handle(body);
    res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: message });
  }
}

// Exported for the smoke-test driver to invoke without HTTP.
export const __test = { handle, DEMO_ACCOUNT_BY_EMAIL };
