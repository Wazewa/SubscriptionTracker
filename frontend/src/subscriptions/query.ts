import type { SubscriptionFilters } from './model.ts';

// Proposed parameter names; confirm with backend before enabling the API.
export function buildSubscriptionsQuery(filters: SubscriptionFilters): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.category) params.set('category', filters.category);
  if (filters.period) params.set('period', filters.period);
  return params.toString();
}
