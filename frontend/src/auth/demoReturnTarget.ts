// Allow only known internal routes, never external URLs or arbitrary paths.
export function demoReturnTarget(from: unknown): string {
  if (typeof from !== 'string') return '/dashboard';
  const pathname = from.split(/[?#]/, 1)[0];
  const allowed = ['/dashboard', '/subscriptions', '/subscriptions/new', '/settings'];
  return allowed.includes(pathname) ? from : '/dashboard';
}
