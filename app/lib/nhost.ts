// Nhost client for React Native. Single instance, shared across app.
// Token storage backed by AsyncStorage so sessions survive restarts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NhostClient } from '@nhost/nhost-js';

import { NHOST_REGION, NHOST_SUBDOMAIN } from './env';

export const nhost = new NhostClient({
  subdomain: NHOST_SUBDOMAIN,
  region: NHOST_REGION,
  clientStorageType: 'react-native',
  clientStorage: AsyncStorage,
});
