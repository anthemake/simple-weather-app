"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import validator from "validator";
import type { WeatherData } from "@/types/weather";

const WeatherDetails = dynamic(() => import("@/components/WeatherDetails"), {
  loading: () => <p className="text-center text-slate-300">Loading weather details...</p>,
});

const FavoritesList = dynamic(() => import("@/components/FavoritesList"), {
  loading: () => <p className="text-sm text-slate-300">Loading favorites...</p>,
});

const images = ["/img/1.jpg", "/img/2.jpg", "/img/3.jpg", "/img/4.jpg", "/img/5.jpg"];
const FAVORITES_STORAGE_KEY = "weather-dashboard:favorites";
const MAX_PREFETCH_FAVORITES = 5;

type FetchOptions = {
  silent?: boolean;
  setAsCurrent?: boolean;
  favoriteKey?: string;
};

export default function Home() {
  const [city, setCity] = useState<string>("");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [randomImage, setRandomImage] = useState<string>("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [prefetchedTemps, setPrefetchedTemps] = useState<Record<string, number | undefined>>({});
  const [locationHint, setLocationHint] = useState<string>(
    "Search by city or use your current location."
  );

  const saveFavorites = useCallback((nextFavorites: string[]) => {
    setFavorites(nextFavorites);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
  }, []);

  const fetchWeather = useCallback(async (query: string, options: FetchOptions = {}) => {
    const { silent = false, setAsCurrent = true, favoriteKey } = options;

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await axios.get<WeatherData>("/api/getWeather", {
        params: { city: query },
        timeout: 8000,
      });

      if (setAsCurrent) {
        setWeatherData(response.data);
      }

      if (favoriteKey) {
        setPrefetchedTemps((prev) => ({
          ...prev,
          [favoriteKey]: Math.round(response.data.current.temp_f),
        }));
      }

      return response.data;
    } catch (requestError) {
      if (!silent) {
        const message =
          axios.isAxiosError(requestError) &&
          typeof requestError.response?.data?.error === "string"
            ? requestError.response.data.error
            : "Could not fetch weather data.";
        setError(message);
      }
      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  const handleSearch = useCallback(async () => {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setError("Enter a city name.");
      return;
    }

    if (!validator.isLength(trimmedCity, { max: 50 })) {
      setError("City name must be no longer than 50 characters.");
      return;
    }

    if (!validator.matches(trimmedCity, "^[A-Za-z\\s.'-]+$")) {
      setError("City name can only include letters, spaces, apostrophes, periods, and hyphens.");
      return;
    }

    await fetchWeather(trimmedCity);
  }, [city, fetchWeather]);

  const requestGeolocation = useCallback(
    (silent: boolean) => {
      if (!navigator.geolocation) {
        setLocationHint("Location is unavailable in this browser. Search for a city instead.");
        return;
      }

      if (!silent) {
        setLocationHint("Requesting location...");
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lon = position.coords.longitude.toFixed(4);
          const locationQuery = `${lat},${lon}`;
          const data = await fetchWeather(locationQuery, { silent, setAsCurrent: true });

          if (data) {
            setLocationHint("Showing weather for your current location.");
          } else {
            setLocationHint("Location lookup failed. Search for a city.");
          }
        },
        () => {
          setLocationHint("Location permission denied or unavailable. Search for a city.");
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 600000,
        }
      );
    },
    [fetchWeather]
  );

  const addFavorite = useCallback(
    async (candidate: string) => {
      const trimmedCity = candidate.trim();
      if (!trimmedCity) {
        setError("Search for a city first, then save it as a favorite.");
        return;
      }

      if (favorites.some((favorite) => favorite.toLowerCase() === trimmedCity.toLowerCase())) {
        setError(`${trimmedCity} is already in favorites.`);
        return;
      }

      const nextFavorites = [...favorites, trimmedCity];
      saveFavorites(nextFavorites);
      const prefetched = await fetchWeather(trimmedCity, {
        silent: true,
        setAsCurrent: false,
        favoriteKey: trimmedCity,
      });

      if (!prefetched) {
        setLocationHint("City saved, but prefetch failed. It will refresh on next request.");
      }
    },
    [favorites, fetchWeather, saveFavorites]
  );

  const removeFavorite = useCallback(
    (favoriteToRemove: string) => {
      const nextFavorites = favorites.filter((favorite) => favorite !== favoriteToRemove);
      saveFavorites(nextFavorites);
      setPrefetchedTemps((prev) => {
        const next = { ...prev };
        delete next[favoriteToRemove];
        return next;
      });
    },
    [favorites, saveFavorites]
  );

  useEffect(() => {
    const selectedImage = images[Math.floor(Math.random() * images.length)];
    setRandomImage(selectedImage);

    const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (storedFavorites) {
      try {
        const parsed = JSON.parse(storedFavorites);
        if (Array.isArray(parsed)) {
          const normalizedFavorites = parsed
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);
          const uniqueFavorites = Array.from(new Set(normalizedFavorites));
          setFavorites(uniqueFavorites);

          uniqueFavorites.slice(0, MAX_PREFETCH_FAVORITES).forEach((favorite) => {
            void fetchWeather(favorite, {
              silent: true,
              setAsCurrent: false,
              favoriteKey: favorite,
            });
          });
        }
      } catch {
        localStorage.removeItem(FAVORITES_STORAGE_KEY);
      }
    }

    requestGeolocation(true);
  }, [fetchWeather, requestGeolocation]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-950 via-blue-800 to-cyan-700 p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${randomImage})` }}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/20 bg-slate-900/75 p-4 shadow-2xl backdrop-blur-md sm:p-8">
        <h1 className="mb-2 text-center text-2xl font-bold text-white sm:text-4xl">
          {weatherData
            ? `${weatherData.location.name}, ${weatherData.location.region}`
            : "Weather Dashboard"}
        </h1>
        <p className="mb-6 text-center text-sm text-slate-200" aria-live="polite">
          {locationHint}
        </p>

        <label htmlFor="city-search" className="sr-only">
          Search city
        </label>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="city-search"
            type="text"
            placeholder="Enter city name"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSearch();
              }
            }}
            className="w-full rounded-lg border border-slate-300 p-3 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Enter city name"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            className="w-full rounded-lg bg-blue-500 px-4 py-3 text-white transition hover:bg-blue-600 sm:w-auto"
            aria-label="Get weather for city"
          >
            Get Weather
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => requestGeolocation(false)}
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
            aria-label="Use my current location"
          >
            Use My Location
          </button>
          <button
            type="button"
            onClick={() => void addFavorite(weatherData?.location.name ?? city)}
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
            aria-label="Save current city as favorite"
          >
            Save Favorite
          </button>
          <button
            type="button"
            onClick={() => {
              saveFavorites([]);
              setPrefetchedTemps({});
            }}
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
            aria-label="Clear all favorites"
          >
            Clear Favorites
          </button>
        </div>

        <section className="mb-6 rounded-xl bg-white/10 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-100">
            Favorite Cities
          </h2>
          <FavoritesList
            favorites={favorites}
            onSelect={(favorite) => void fetchWeather(favorite, { favoriteKey: favorite })}
            onRemove={removeFavorite}
            activeCity={weatherData?.location.name ?? ""}
            prefetchedTemps={prefetchedTemps}
          />
        </section>

        {loading && (
          <p className="text-center text-slate-300" role="status" aria-live="polite">
            Loading weather data...
          </p>
        )}
        {error && (
          <p className="text-center text-red-300" role="alert">
            {error}
          </p>
        )}
        {weatherData && <WeatherDetails weatherData={weatherData} />}
      </div>
    </main>
  );
}
