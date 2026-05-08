// GET /v1/list-pending-qc   (ops/admin role required)
//
// Reply: {
//   items: [{
//     return_request_id, status, path, self_declared_grade,
//     created_at, account_display_name, product_title,
//     pickup_scheduled_for, photos: [{prompt, storage_path}]
//   }]
// }
//
// This is a thin Hasura proxy. The admin app could query Hasura directly,
// but exposing it as a Function gives us a clean integration point and a
// single place to add caching/auth tweaks later.

import { hasuraAdmin, readSession } from './_lib/hasura';

export interface PendingQcItem {
  return_request_id: string;
  status: string;
  path: 'refurb' | 'trade_in' | 'donate';
  self_declared_grade: string | null;
  created_at: string;
  account_display_name: string;
  product_title: string;
  pickup_scheduled_for: string | null;
  photos: { prompt: string; storage_path: string }[];
}

export async function listPendingQc(): Promise<PendingQcItem[]> {
  const data = await hasuraAdmin<{
    return_requests: {
      id: string;
      status: string;
      path: 'refurb' | 'trade_in' | 'donate';
      self_declared_grade: string | null;
      created_at: string;
      pickup_scheduled_for: string | null;
      account: { display_name: string };
      owned_unit: { product: { title: string } };
      assessments: {
        phase: string;
        photos: { prompt: string; storage_path: string }[];
      }[];
    }[];
  }>(
    /* GraphQL */ `
      query PendingQc {
        return_requests(
          where: { status: { _in: ["submitted", "received", "in_transit", "pickup_scheduled"] } }
          order_by: { created_at: asc }
        ) {
          id status path self_declared_grade created_at pickup_scheduled_for
          account { display_name }
          owned_unit { product { title } }
          assessments(where: { phase: { _eq: "self_declared" } }) {
            phase
            photos { prompt storage_path }
          }
        }
      }
    `,
  );
  return data.return_requests.map((r) => ({
    return_request_id: r.id,
    status: r.status,
    path: r.path,
    self_declared_grade: r.self_declared_grade,
    created_at: r.created_at,
    account_display_name: r.account.display_name,
    product_title: r.owned_unit.product.title,
    pickup_scheduled_for: r.pickup_scheduled_for,
    photos: r.assessments.flatMap((a) => a.photos),
  }));
}

export default async function handler(req: any, res: any) {
  try {
    const session = readSession(req);
    if (session.role !== 'ops' && session.role !== 'admin') {
      return res.status(403).json({ error: 'ops or admin role required' });
    }
    const items = await listPendingQc();
    res.status(200).json({ items });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

export const __test = { listPendingQc };
