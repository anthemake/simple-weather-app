import { NextRequest, NextResponse } from "next/server";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

type CacheEntry = {
  data: unknown;
  expiresAt: number;
};

const CACHE_TTL_MS = 2 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 40;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;
const TRANSIENT_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

declare global {
  var weatherApiCache: Map<string, CacheEntry> | undefined;
  var weatherApiRateLimitStore: Map<string, number[]> | undefined;
}

const weatherApiCache = globalThis.weatherApiCache ?? new Map<string, CacheEntry>();
const weatherApiRateLimitStore =
  globalThis.weatherApiRateLimitStore ?? new Map<string, number[]>();

globalThis.weatherApiCache = weatherApiCache;
globalThis.weatherApiRateLimitStore = weatherApiRateLimitStore;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getClientKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  return firstForwardedIp || realIp || "unknown";
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const existingTimestamps = weatherApiRateLimitStore.get(clientKey) ?? [];
  const recentTimestamps = existingTimestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    weatherApiRateLimitStore.set(clientKey, recentTimestamps);
    return true;
  }

  recentTimestamps.push(now);
  weatherApiRateLimitStore.set(clientKey, recentTimestamps);
  return false;
}

function pruneExpiredCacheEntries() {
  const now = Date.now();
  for (const [key, value] of weatherApiCache.entries()) {
    if (value.expiresAt <= now) {
      weatherApiCache.delete(key);
    }
  }
}

async function fetchWithRetry<T>(
  url: string,
  config: AxiosRequestConfig<T>
): Promise<AxiosResponse<T>> {
  let attempt = 0;
  while (attempt < RETRY_ATTEMPTS) {
    try {
      return await axios.get<T>(url, config);
    } catch (requestError) {
      const isAxiosRequestError = axios.isAxiosError(requestError);
      const statusCode = isAxiosRequestError ? requestError.response?.status : undefined;
      const shouldRetry =
        isAxiosRequestError &&
        (!statusCode || TRANSIENT_STATUS_CODES.has(statusCode)) &&
        attempt < RETRY_ATTEMPTS - 1;

      if (!shouldRetry) {
        throw requestError;
      }

      const waitTime = RETRY_BASE_DELAY_MS * 2 ** attempt;
      await sleep(waitTime);
      attempt += 1;
    }
  }

  throw new Error("Failed to fetch weather after retries.");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryRaw = searchParams.get("city");
  const query = queryRaw?.trim();

  if (!query) {
    return NextResponse.json({ error: "Please provide a city name." }, { status: 400 });
  }

  if (query.length > 100) {
    return NextResponse.json({ error: "City name too long." }, { status: 400 });
  }

  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
        },
      }
    );
  }

  const cacheKey = query.toLowerCase();
  const now = Date.now();
  const cached = weatherApiCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      status: 200,
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
        "X-Weather-Cache": "HIT",
      },
    });
  }

  if (!cached || cached.expiresAt <= now) {
    weatherApiCache.delete(cacheKey);
  }

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    console.error("WEATHER_API_KEY is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetchWithRetry(
      `https://weatherapi-com.p.rapidapi.com/current.json?q=${encodedQuery}`,
      {
        headers: {
          "X-RapidAPI-Host": "weatherapi-com.p.rapidapi.com",
          "X-RapidAPI-Key": apiKey,
        },
        timeout: 5000,
      }
    );

    weatherApiCache.set(cacheKey, {
      data: response.data,
      expiresAt: now + CACHE_TTL_MS,
    });

    if (weatherApiCache.size > 300) {
      pruneExpiredCacheEntries();
    }

    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
        "X-Weather-Cache": "MISS",
      },
    });
  } catch (requestError) {
    console.error("Error fetching weather data:", requestError);
    return NextResponse.json({ error: "Error fetching weather data." }, { status: 502 });
  }
}
