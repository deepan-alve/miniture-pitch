import { gql } from '@apollo/client';

// Owned units = the parent's per-unit inventory of physical Miniture items.
// Returning anything goes through this list.

export const MY_OWNED_UNITS_QUERY = gql`
  query MyOwnedUnits($authUserId: uuid!) {
    owned_units(
      where: {
        account: { auth_user_id: { _eq: $authUserId } }
        status: { _eq: "owned" }
      }
      order_by: { acquired_at: desc }
    ) {
      id
      account_id
      acquired_at
      status
      product {
        id
        title
        description
        price_inr
        hero_image_url
        category
      }
    }
  }
`;

export const OWNED_UNIT_DETAIL_QUERY = gql`
  query OwnedUnitDetail($id: uuid!) {
    owned_units_by_pk(id: $id) {
      id
      account_id
      acquired_at
      status
      product {
        id
        title
        description
        price_inr
        hero_image_url
        category
        min_age_months
        max_age_months
      }
    }
  }
`;
