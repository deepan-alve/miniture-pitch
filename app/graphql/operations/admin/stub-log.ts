import { gql } from '@apollo/client';

// Live tail of every Shopify connector operation. THE wow demo subscription
// — when ops approves a QC, a `createRenewedProduct` row appears here in
// real time with the request/response payloads. Reviewer instantly grasps
// the connector boundary story.

export const ADMIN_STUB_LOG_SUBSCRIPTION = gql`
  subscription AdminStubLog {
    shopify_stub_log(order_by: { created_at: desc }, limit: 50) {
      id
      operation
      request_payload
      response_payload
      ok
      error_message
      duration_ms
      created_at
    }
  }
`;

export type AdminStubLogRow = {
  id: string;
  operation: string;
  request_payload: Record<string, unknown> | unknown;
  response_payload: Record<string, unknown> | unknown | null;
  ok: boolean;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
};

export type AdminStubLogData = {
  shopify_stub_log: AdminStubLogRow[];
};
