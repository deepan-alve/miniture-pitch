import { gql } from '@apollo/client';

// Catalog and Renewed-collection product queries.

export const BEST_SELLERS_QUERY = gql`
  query BestSellers {
    products(order_by: { created_at: desc }, limit: 6) {
      id
      title
      description
      price_inr
      hero_image_url
      category
    }
  }
`;

// shopify_stub_products mirrors what Shopify's Admin API returns. The
// "renewed" collection is the loop-close of the buyback feature.
export const RENEWED_COLLECTION_QUERY = gql`
  query RenewedCollection {
    shopify_stub_products(
      where: {
        status: { _eq: "ACTIVE" }
        sold_at: { _is_null: true }
        tags: { _contains: ["renewed"] }
      }
      order_by: { created_at: desc }
      limit: 12
    ) {
      id
      shopify_gid
      title
      tags
      variant_price_amount
      variant_price_currency
      variant_compare_at_amount
      variant_compare_at_currency
      images
      created_at
    }
  }
`;
