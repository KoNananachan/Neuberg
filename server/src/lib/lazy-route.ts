import type { Request, Response, NextFunction } from 'express';

/**
 * Lazy-load an Express router on first request.
 * Reduces startup memory by deferring module loading until the route is actually accessed.
 */
export function lazyRoute(importFn: () => Promise<{ default: any }>) {
  let router: any = null;
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!router) {
        const mod = await importFn();
        router = mod.default;
      }
      router(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}
