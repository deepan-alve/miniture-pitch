// Admin lane GraphQL operations. Re-exports keep call sites tidy.
//
// Conventions:
//   - Queries → `useQuery` for one-shot reads
//   - Subscriptions → `useSubscription` for live admin views (pending list, stub log)
//   - Mutations → fall back to direct Hasura mutation chains until the
//     `approve-qc` / `confirm-donation` Functions are deployed. The chain
//     mirrors what those Functions will eventually do.

export * from './pending-list';
export * from './qc-detail';
export * from './ngo-deliveries';
export * from './stub-log';
export * from './approve-qc';
export * from './confirm-donation';
