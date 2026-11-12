import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

type Bucket = { count: number; resetAt: number };

/**
 * Prosty limityer in-memory na endpointy auth (anty-spam / brute-force).
 * Na wielu instancjach Render działa per-proces — i tak zmniejsza natłok.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      ip?: string;
      method?: string;
      path?: string;
      url?: string;
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    }>();

    const path = String(req.path ?? req.url ?? '').split('?')[0];
    const limit = path.includes('register') ? 5 : 10;
    const windowMs = 60_000;

    const forwarded = req.headers?.['x-forwarded-for'];
    const forwardedIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : Array.isArray(forwarded)
          ? String(forwarded[0] ?? '').split(',')[0]?.trim()
          : '';
    const ip = forwardedIp || req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${ip}:${req.method ?? 'POST'}:${path}`;
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Okazjonalne sprzątanie, by mapa nie rosła bez końca.
    if (this.buckets.size > 5000) {
      for (const [k, v] of this.buckets) {
        if (v.resetAt <= now) this.buckets.delete(k);
      }
    }

    return true;
  }
}
