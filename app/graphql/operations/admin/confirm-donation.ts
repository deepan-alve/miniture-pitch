// Re-export from ngo-deliveries — kept as a separate file so the index
// barrel reflects one logical operation per file even though the mutation
// lives next to its query.
//
// TODO: move to `confirm-donation` Nhost Function once deployed. The
// production version generates and uploads the impact certificate PDF to
// Storage and signs the delivered_at timestamp server-side.

export { ADMIN_CONFIRM_DONATION_MUTATION } from './ngo-deliveries';
