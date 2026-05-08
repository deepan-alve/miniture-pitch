// POST /v1/submit-return-request   (parent JWT required)
//
// Body:
//   {
//     owned_unit_id: uuid,
//     path: 'refurb' | 'trade_in' | 'donate',
//     self_declared_grade: 'good' | 'fair' | 'worn',
//     pickup_address: jsonb,
//     pickup_scheduled_for: ISO timestamp
//   }
// Reply:
//   { return_request_id, qr_code, status: 'submitted' }
//
// Steps:
//   1. Resolve the caller's accounts.id from x-hasura-user-id.
//   2. Verify the owned_unit belongs to that account and is in 'owned' state.
//   3. INSERT return_requests (status='submitted'), generate qr code.
//   4. INSERT return_request_events (event_type='submitted').
//   5. UPDATE owned_units.status='return_pending'.

import { hasuraAdmin, readSession } from './_lib/hasura';

interface ReqBody {
  owned_unit_id?: string;
  path?: 'refurb' | 'trade_in' | 'donate';
  self_declared_grade?: 'good' | 'fair' | 'worn';
  pickup_address?: Record<string, unknown>;
  pickup_scheduled_for?: string;
}

interface AccountAndUnit {
  account: { id: string };
  unit: { id: string; account_id: string; status: string };
}

async function loadAccountAndUnit(
  authUserId: string,
  ownedUnitId: string,
): Promise<AccountAndUnit> {
  const data = await hasuraAdmin<{
    accounts: { id: string }[];
    owned_units_by_pk: { id: string; account_id: string; status: string } | null;
  }>(
    /* GraphQL */ `
      query Resolve($auth_user_id: uuid!, $unit_id: uuid!) {
        accounts(where: { auth_user_id: { _eq: $auth_user_id } }, limit: 1) { id }
        owned_units_by_pk(id: $unit_id) { id account_id status }
      }
    `,
    { auth_user_id: authUserId, unit_id: ownedUnitId },
  );
  if (!data.accounts.length) throw new Error('no account for caller');
  if (!data.owned_units_by_pk) throw new Error('owned_unit not found');
  return { account: data.accounts[0], unit: data.owned_units_by_pk };
}

export interface SubmitResult {
  return_request_id: string;
  qr_code: string;
  status: 'submitted';
}

export async function submit(authUserId: string, body: ReqBody): Promise<SubmitResult> {
  if (!body.owned_unit_id || !body.path || !body.self_declared_grade) {
    throw new Error('owned_unit_id, path, self_declared_grade are required');
  }
  const { account, unit } = await loadAccountAndUnit(authUserId, body.owned_unit_id);
  if (unit.account_id !== account.id) {
    throw new Error('owned_unit does not belong to caller');
  }
  if (unit.status !== 'owned') {
    throw new Error(`owned_unit status is ${unit.status}, expected 'owned'`);
  }

  const qr = (globalThis.crypto?.randomUUID?.() ?? `qr-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const data = await hasuraAdmin<{
    insert_return_requests_one: { id: string };
    insert_return_request_events_one: { id: string };
    update_owned_units_by_pk: { id: string; status: string } | null;
  }>(
    /* GraphQL */ `
      mutation SubmitReturn(
        $owned_unit_id: uuid!
        $account_id: uuid!
        $path: return_path!
        $grade: condition_grade!
        $pickup_address: jsonb
        $pickup_for: timestamptz
        $qr: String!
      ) {
        insert_return_requests_one(
          object: {
            owned_unit_id: $owned_unit_id
            account_id: $account_id
            path: $path
            self_declared_grade: $grade
            pickup_address: $pickup_address
            pickup_scheduled_for: $pickup_for
            pickup_qr_code: $qr
            status: "submitted"
          }
        ) { id }

        update_owned_units_by_pk(
          pk_columns: { id: $owned_unit_id }
          _set: { status: "return_pending" }
        ) { id status }
      }
    `,
    {
      owned_unit_id: body.owned_unit_id,
      account_id: account.id,
      path: body.path,
      grade: body.self_declared_grade,
      pickup_address: body.pickup_address ?? null,
      pickup_for: body.pickup_scheduled_for ?? null,
      qr,
    },
  );

  // Append the inaugural event in a separate call so the FK to the
  // just-inserted return_requests row is guaranteed visible.
  await hasuraAdmin(
    /* GraphQL */ `
      mutation AddEvent($rr: uuid!, $actor: uuid!, $payload: jsonb!) {
        insert_return_request_events_one(
          object: {
            return_request_id: $rr
            event_type: "submitted"
            actor_account_id: $actor
            payload: $payload
          }
        ) { id }
      }
    `,
    {
      rr: data.insert_return_requests_one.id,
      actor: account.id,
      payload: {
        path: body.path,
        self_declared_grade: body.self_declared_grade,
        pickup_scheduled_for: body.pickup_scheduled_for ?? null,
      },
    },
  );

  return {
    return_request_id: data.insert_return_requests_one.id,
    qr_code: qr,
    status: 'submitted',
  };
}

export default async function handler(req: any, res: any) {
  try {
    const session = readSession(req);
    if (!session.userId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    const body = (req.body ?? {}) as ReqBody;
    const out = await submit(session.userId, body);
    res.status(200).json(out);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

export const __test = { submit, loadAccountAndUnit };
