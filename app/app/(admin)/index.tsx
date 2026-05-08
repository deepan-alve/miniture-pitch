import { Redirect } from 'expo-router';

// /(admin) → /(admin)/pending. The tabs declare `index` as `href: null`
// so it never appears as its own tab.

export default function AdminIndex() {
  return <Redirect href="/(admin)/pending" />;
}
