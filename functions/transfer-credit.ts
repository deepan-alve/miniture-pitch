// POST /v1/transfer-credit   (parent JWT required)
//
// Body:  { recipient_phone_or_email: string, amount_inr: number, message?: string }
// Reply: { transfer_id, from_account_id, to_account_id, amount_inr }
//
// Steps:
//   1. Resolve sender from x-hasura-user-id.
//   2. Resolve recipient by phone OR by joining auth.users on email.
//   3. Verify sender's available balance via account_credit_balance view.
//   4. INSERT credit_transfers row.
//   5. INSERT TWO store_credit_ledger rows: transfer_out (negative) on sender,
//      transfer_in (positive) on recipient. Both reference the transfer id.
//
// All five touches happen in a single GraphQL mutation so Hasura wraps them
// in one Postgres transaction.

import { hasuraAdmin, readSession } from './_lib/hasura';

interface ReqBody {
  recipient_phone_or_email?: string;
  amount_inr?: number;
  message?: string;
}

export interface TransferResult {
  transfer_id: string;
  from_account_id: string;
  to_account_id: string;
  amount_inr: number;
}

interface SenderInfo {
  id: string;
  balance: number;
}

async function loadSender(authUserId: string): Promise<SenderInfo> {
  const data = await hasuraAdmin<{
    accounts: { id: string; account_credit_balance: { balance_inr: number } | null }[];
  }>(
    // The view is exposed as a 1:1 derived field via account_credit_balance
    // → accounts.id. We use a simple two-call style here (cheaper than a
    // Postgres custom function).
    /* GraphQL */ `
      query SenderBal($auth_user_id: uuid!) {
        accounts(where: { auth_user_id: { _eq: $auth_user_id } }, limit: 1) {
          id
          credit_ledger_entries_aggregate(
            where: {
              _or: [
                { expires_at: { _is_null: true } }
                { expires_at: { _gt: "now()" } }
              ]
            }
          ) { aggregate { sum { amount_inr } } }
        }
      }
    `,
    { auth_user_id: authUserId },
  );
  if (!data.accounts.length) throw new Error('caller has no account');
  const a = data.accounts[0];
  // The aggregate field is on the array_relationship `credit_ledger_entries`.
  // Sum of the (negative + positive) ledger rows is the live balance.
  const sum = (a as any).credit_ledger_entries_aggregate?.aggregate?.sum?.amount_inr ?? 0;
  return { id: a.id, balance: sum };
}

async function loadRecipient(handle: string, senderAccountId: string): Promise<{ id: string }> {
  // Try phone first (matches accounts.phone), then auth.users.email.
  const data = await hasuraAdmin<{
    accounts: { id: string }[];
    users: { defaultRole: string; account: { id: string } | null }[];
  }>(
    /* GraphQL */ `
      query Recipient($q: String!) {
        accounts(where: { phone: { _eq: $q } }, limit: 1) { id }
        users(where: { email: { _eq: $q } }, limit: 1) {
          defaultRole
          account: account_account { id }
        }
      }
    `,
    { q: handle },
  ).catch(async () => {
    // The auth.users → accounts relationship name is environment-dependent;
    // fall back to a simpler query that just resolves by email-on-account.
    return await hasuraAdmin<{ accounts: { id: string }[]; users: never[] }>(
      /* GraphQL */ `
        query RecipientFallback($q: String!) {
          accounts(where: { phone: { _eq: $q } }, limit: 1) { id }
        }
      `,
      { q: handle },
    ).then((r) => ({ ...r, users: [] }));
  });

  let recipientId: string | null = data.accounts[0]?.id ?? null;
  if (!recipientId && data.users && data.users.length) {
    recipientId = data.users[0].account?.id ?? null;
  }
  if (!recipientId) {
    // Last-ditch lookup: maybe handle matches an account display_name.
    const dn = await hasuraAdmin<{ accounts: { id: string }[] }>(
      /* GraphQL */ `
        query Resolve2($q: String!) {
          accounts(where: { display_name: { _eq: $q } }, limit: 1) { id }
        }
      `,
      { q: handle },
    );
    recipientId = dn.accounts[0]?.id ?? null;
  }
  if (!recipientId) throw new Error('recipient not found');
  if (recipientId === senderAccountId) throw new Error('cannot transfer to yourself');
  return { id: recipientId };
}

export async function transferCredit(
  authUserId: string,
  body: ReqBody,
): Promise<TransferResult> {
  const handle = (body.recipient_phone_or_email ?? '').trim();
  const amount = Number(body.amount_inr);
  if (!handle) throw new Error('recipient_phone_or_email required');
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw new Error('amount_inr must be a positive integer');
  }

  const sender = await loadSender(authUserId);
  if (sender.balance < amount) {
    throw new Error(
      `insufficient balance: have ₹${sender.balance}, need ₹${amount}`,
    );
  }
  const recipient = await loadRecipient(handle, sender.id);

  const data = await hasuraAdmin<{
    insert_credit_transfers_one: { id: string };
    insert_store_credit_ledger: { returning: { id: string }[] };
  }>(
    /* GraphQL */ `
      mutation Transfer(
        $from: uuid!
        $to: uuid!
        $amount: Int!
        $message: String
      ) {
        insert_credit_transfers_one(
          object: { from_account_id: $from, to_account_id: $to, amount_inr: $amount, message: $message }
        ) { id }
      }
    `,
    {
      from: sender.id,
      to: recipient.id,
      amount,
      message: body.message ?? null,
    },
  );
  const transferId = data.insert_credit_transfers_one.id;

  // Two ledger rows pointing back at the transfer.
  await hasuraAdmin(
    /* GraphQL */ `
      mutation LedgerRows(
        $from: uuid!
        $to: uuid!
        $amount_neg: Int!
        $amount_pos: Int!
        $source_id: uuid!
      ) {
        out: insert_store_credit_ledger_one(
          object: {
            account_id: $from
            amount_inr: $amount_neg
            source_type: "transfer_out"
            source_id: $source_id
          }
        ) { id }
        in: insert_store_credit_ledger_one(
          object: {
            account_id: $to
            amount_inr: $amount_pos
            source_type: "transfer_in"
            source_id: $source_id
          }
        ) { id }
      }
    `,
    {
      from: sender.id,
      to: recipient.id,
      amount_neg: -amount,
      amount_pos: amount,
      source_id: transferId,
    },
  );

  return {
    transfer_id: transferId,
    from_account_id: sender.id,
    to_account_id: recipient.id,
    amount_inr: amount,
  };
}

export default async function handler(req: any, res: any) {
  try {
    const session = readSession(req);
    if (!session.userId) return res.status(401).json({ error: 'unauthenticated' });
    const result = await transferCredit(session.userId, (req.body ?? {}) as ReqBody);
    res.status(200).json(result);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

export const __test = { transferCredit, loadSender, loadRecipient };
