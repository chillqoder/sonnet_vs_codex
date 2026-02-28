import { config } from "../config.js";

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer)
  };
}

export function absoluteUrl(base, maybeRelative) {
  if (!maybeRelative) {
    return "";
  }

  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return "";
  }
}

export async function fetchHtml(url, timeoutMs = config.requestTimeoutMs) {
  const { signal, clear } = withTimeout(timeoutMs);

  try {
    const response = await fetch(url, {
      signal,
      headers: {
        "User-Agent": config.userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } finally {
    clear();
  }
}
