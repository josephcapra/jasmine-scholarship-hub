/**
 * Vercel Edge Middleware - Rate Limiting
 * Protects AI endpoints from abuse
 * Uses standard Web APIs (no Next.js dependency)
 */

const RATE_LIMIT_WINDOW = 3600000; // 1 hour in ms
const MAX_AI_REQUESTS = 30; // max AI requests per hour

// In-memory rate limit store (resets on cold start, which is fine for edge)
const rateLimitStore = new Map();

function getClientIP(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key);
    }
  }
}

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only rate limit AI endpoints
  const aiEndpoints = [
    '/api/ai-assist',
    '/api/essay-builder',
    '/api/extract-profile',
    '/api/extract-scholarship',
    '/api/find-scholarships',
    '/api/identify-document',
    '/api/parse-scholarship-list',
    '/api/scholarship-checkin',
    '/api/scholarship-search',
    '/api/writing-guide'
  ];

  if (!aiEndpoints.some(ep => pathname.startsWith(ep))) {
    return; // Let request continue without modification
  }

  // Clean up old entries periodically
  if (Math.random() < 0.1) cleanupOldEntries();

  const clientIP = getClientIP(request);
  const now = Date.now();

  let clientData = rateLimitStore.get(clientIP);

  if (!clientData || now - clientData.windowStart > RATE_LIMIT_WINDOW) {
    clientData = { windowStart: now, count: 0 };
  }

  clientData.count++;
  rateLimitStore.set(clientIP, clientData);

  if (clientData.count > MAX_AI_REQUESTS) {
    const resetTime = new Date(clientData.windowStart + RATE_LIMIT_WINDOW).toISOString();
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many AI requests. Limit: ${MAX_AI_REQUESTS} per hour.`,
        resetAt: resetTime
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': MAX_AI_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime,
          'Retry-After': Math.ceil((clientData.windowStart + RATE_LIMIT_WINDOW - now) / 1000).toString()
        }
      }
    );
  }

  // Continue with request - rate limit headers will be added by the API function
  return;
}

export const config = {
  matcher: '/api/:path*'
};
