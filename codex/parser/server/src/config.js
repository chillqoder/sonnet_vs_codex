export const config = {
  port: Number(process.env.PORT ?? 4000),
  requestTimeoutMs: 6500,
  sourceTimeoutMs: 7000,
  cacheTtlMs: 1000 * 60 * 5,
  maxResults: 80,
  defaultPerPage: 16,
  maxPerPage: 24,
  userAgent:
    process.env.MOODFLIX_UA ??
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
};
