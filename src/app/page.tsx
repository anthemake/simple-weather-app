import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [city, setCity] = useState<string>('');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true); 
    setError(null);
    try {
      const response = await axios.get(`/api/getWeather?city=${city}`);
      setWeatherData(response.data);
    } catch (err) {
      setError('Could not fetch weather data');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-bold mb-4 text-center">Weather Dashboard</h1>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Enter city name"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="p-2 border border-gray-300 rounded w-full"
        />
        <button
          onClick={fetchWeather}
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Get Weather
        </button>
      </div>

      {loading && <p className="mt-4 text-center">Loading...</p>}
      {error && <p className="mt-4 text-center text-red-500">{error}</p>}
      {weatherData && (
        <div className="mt-6 text-center">
          <h3 className="text-xl font-semibold">Weather in {weatherData.name}</h3>
          <p>{weatherData.weather[0].description}</p>
          <p>Temperature: {Math.round(weatherData.main.temp - 273.15)}°C</p>
          <p>Humidity: {weatherData.main.humidity}%</p>
        </div>
      )}
    </div>
  );
}
