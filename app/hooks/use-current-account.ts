import { useQuery } from '@apollo/client';
import { useUserData } from '@nhost/react';

import { CURRENT_ACCOUNT_QUERY } from '@/graphql/operations/account';

// Single source of truth for "who is the signed-in parent?"
// Returns the joined account row (with child_profiles) keyed by the JWT's
// auth_user_id. Will be empty until `sync-account-from-auth` Function has
// linked the demo account to the freshly-created auth user.

export type ChildProfile = {
  id: string;
  name: string;
  birth_date: string;
};

export type CurrentAccount = {
  id: string;
  auth_user_id: string;
  display_name: string;
  phone: string | null;
  default_address: Record<string, unknown> | null;
  created_at: string;
  child_profiles: ChildProfile[];
};

export function useCurrentAccount() {
  const userData = useUserData();
  const authUserId = userData?.id;

  const { data, loading, error, refetch } = useQuery<{ accounts: CurrentAccount[] }>(
    CURRENT_ACCOUNT_QUERY,
    {
      variables: { authUserId },
      skip: !authUserId,
    },
  );

  const account = data?.accounts?.[0] ?? null;

  return {
    account,
    authUserId,
    userData,
    loading: !!authUserId && loading,
    error,
    refetch,
  };
}
