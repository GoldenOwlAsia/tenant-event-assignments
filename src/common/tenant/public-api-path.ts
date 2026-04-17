import type { Request } from 'express';

/**
 * Resolves the HTTP path for routing.
 * - Prefer `originalUrl` (full path `/api/...`) — reliable in both `main.ts` and Nest middleware.
 * - Else `baseUrl` + `path` (Nest often sets `baseUrl` to `/api` and `path` to `/auth/...` only).
 */
export function getRequestPath(
  req: Pick<Request, 'path' | 'url' | 'originalUrl' | 'baseUrl'>,
): string {
  const ou = req.originalUrl;
  if (typeof ou === 'string' && ou.length > 0) {
    return ou.split('?')[0] || '';
  }
  const segment = req.path;
  if (typeof segment === 'string' && segment.length > 0) {
    const base = req.baseUrl ?? '';
    let full = `${base}${segment}`;
    if (!full.startsWith('/')) {
      full = `/${full}`;
    }
    return full.replace(/\/+/g, '/').split('?')[0] || '';
  }
  const raw = req.url ?? '';
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split('?')[0] || '';
  }
  return '';
}

/**
 * Nest may report the path with or without the global `/api` prefix depending on
 * where middleware runs; normalize so management routes match reliably.
 */
function withApiPrefix(path: string): string {
  const trimmed = (path.replace(/\/+$/, '') || '/').trim();
  if (trimmed.startsWith('/api/') || trimmed === '/api') {
    return trimmed;
  }
  return trimmed.startsWith('/') ? `/api${trimmed}` : trimmed;
}

/** Routes that use the `public` management schema only (no `X-Tenant-Id`). */
export function isPublicManagementPath(path: string): boolean {
  const p = withApiPrefix(path);
  return p === '/api/auth/admin/login' || p.startsWith('/api/tenant');
}
