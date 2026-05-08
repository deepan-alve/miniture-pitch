import { gql } from '@apollo/client';

// Account / current-user queries. The seed accounts have a placeholder
// auth_user_id that will be relinked by `sync-account-from-auth` Function on
// signup; once that runs, the JWT's auth_user_id maps onto the demo account.

export const CURRENT_ACCOUNT_QUERY = gql`
  query CurrentAccount($authUserId: uuid!) {
    accounts(where: { auth_user_id: { _eq: $authUserId } }, limit: 1) {
      id
      auth_user_id
      display_name
      phone
      default_address
      created_at
      child_profiles {
        id
        name
        birth_date
      }
    }
  }
`;

export const ACCOUNT_OWNED_COUNT_QUERY = gql`
  query AccountOwnedCount($authUserId: uuid!) {
    owned_units_aggregate(
      where: {
        account: { auth_user_id: { _eq: $authUserId } }
        status: { _eq: "owned" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
