import { gql } from '@apollo/client';

// Live list of return requests waiting for QC review. Subscription so a
// freshly-submitted request from a parent's phone pops up instantly during
// the demo.
//
// Status filter intentionally includes `qc_downgraded` so requests bounced
// back to a parent for acceptance still surface in case ops needs to take
// further action.

export const ADMIN_PENDING_REQUESTS_SUBSCRIPTION = gql`
  subscription AdminPendingRequests {
    return_requests(
      where: { status: { _in: ["submitted", "received", "qc_downgraded", "pickup_scheduled", "in_transit"] } }
      order_by: { created_at: asc }
    ) {
      id
      status
      path
      self_declared_grade
      created_at
      pickup_scheduled_for
      account {
        id
        display_name
        phone
      }
      owned_unit {
        id
        product {
          id
          title
          hero_image_url
          price_inr
        }
      }
      condition_assessments(where: { phase: { _eq: "self_declared" } }, limit: 1) {
        id
        grade
        notes
        assessment_photos {
          id
          prompt
          storage_path
        }
      }
    }
  }
`;

export type AdminPendingRequest = {
  id: string;
  status: string;
  path: string;
  self_declared_grade: string | null;
  created_at: string;
  pickup_scheduled_for: string | null;
  account: {
    id: string;
    display_name: string;
    phone: string | null;
  };
  owned_unit: {
    id: string;
    product: {
      id: string;
      title: string;
      hero_image_url: string | null;
      price_inr: number;
    };
  };
  condition_assessments: {
    id: string;
    grade: string;
    notes: string | null;
    assessment_photos: {
      id: string;
      prompt: string;
      storage_path: string;
    }[];
  }[];
};

export type AdminPendingRequestsData = {
  return_requests: AdminPendingRequest[];
};
