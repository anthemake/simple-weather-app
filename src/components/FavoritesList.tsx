"use client";

type FavoritesListProps = {
  favorites: string[];
  onSelect: (city: string) => void;
  onRemove: (city: string) => void;
  activeCity: string;
  prefetchedTemps: Record<string, number | undefined>;
};

export default function FavoritesList({
  favorites,
  onSelect,
  onRemove,
  activeCity,
  prefetchedTemps,
}: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <p className="text-sm text-slate-300" role="status">
        Save a city to your favorites for quick access.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Favorite cities">
      {favorites.map((favorite, index) => (
        <li key={favorite} className="flex items-center gap-2">
          <button
            type="button"
            data-favorite-button="true"
            className={`min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm transition ${
              activeCity.toLowerCase() === favorite.toLowerCase()
                ? "bg-blue-500 text-white"
                : "bg-white/15 text-slate-100 hover:bg-white/25"
            }`}
            onClick={() => onSelect(favorite)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                return;
              }

              const selector = "[data-favorite-button='true']";
              const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(selector));
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const nextIndex = (index + direction + buttons.length) % buttons.length;
              buttons[nextIndex]?.focus();
              event.preventDefault();
            }}
            aria-label={`Load weather for ${favorite}`}
          >
            <span className="truncate">{favorite}</span>
            {prefetchedTemps[favorite] !== undefined && (
              <span className="ml-2 text-xs opacity-80">{prefetchedTemps[favorite]} F</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onRemove(favorite)}
            className="rounded-md bg-red-500/80 px-2 py-2 text-xs text-white transition hover:bg-red-600"
            aria-label={`Remove ${favorite} from favorites`}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
