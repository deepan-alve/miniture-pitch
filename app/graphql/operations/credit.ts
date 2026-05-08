import { gql } from '@apollo/client';

// Store credit balance + ledger queries.
// Balance comes from the `account_credit_balance` view; ledger entries are
// queried directly for the recent-activity list.

export const CREDIT_BALANCE_QUERY = gql`
  query CreditBalance($authUserId: uuid!) {
    account_credit_balance(
      where: { account: { auth_user_id: { _eq: $authUserId } } }
    ) {
      account_id
      balance_inr
    }
  }
`;

export const RECENT_LEDGER_QUERY = gql`
  query RecentLedger($authUserId: uuid!) {
    store_credit_ledger(
      where: { account: { auth_user_id: { _eq: $authUserId } } }
      order_by: { created_at: desc }
      limit: 10
    ) {
      id
      amount_inr
      source_type
      source_id
      expires_at
      created_at
    }
  }
`;

// Lookup another account by phone or email. Used when sending credit; we
// match against `accounts.phone`. Email-based lookup goes through
// `auth.users` which is admin-only; left as a TODO for the Function.
export const LOOKUP_ACCOUNT_BY_PHONE_QUERY = gql`
  query LookupAccountByPhone($phone: String!) {
    accounts(where: { phone: { _eq: $phone } }, limit: 1) {
      id
      display_name
      phone
    }
  }
`;

// Direct-mutation fallback for the transfer flow. The `transfer-credit`
// Function is preferred (atomic, audit-logged); this is the demo-safe
// version that creates the two ledger rows + transfer record.
//
// TODO: move to `transfer-credit` Function once available.
export const INSERT_CREDIT_TRANSFER_MUTATION = gql`
  mutation InsertCreditTransfer(
    $fromAccountId: uuid!
    $toAccountId: uuid!
    $amount: Int!
    $negAmount: Int!
    $message: String
  ) {
    transfer: insert_credit_transfers_one(
      object: {
        from_account_id: $fromAccountId
        to_account_id: $toAccountId
        amount_inr: $amount
        message: $message
      }
    ) {
      id
      created_at
    }
    debit: insert_store_credit_ledger_one(
      object: {
        account_id: $fromAccountId
        amount_inr: $negAmount
        source_type: "transfer_out"
      }
    ) {
      id
    }
    credit: insert_store_credit_ledger_one(
      object: {
        account_id: $toAccountId
        amount_inr: $amount
        source_type: "transfer_in"
      }
    ) {
      id
    }
  }
`;
