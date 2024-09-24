"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import validator from 'validator';
import Image from 'next/image';

// Define the WeatherData type so we can display specific conditions
type WeatherData = {
  location: {
    name: string;
    region: string;
    country: string;
  };
  current: {
    temp_f: number;
    feelslike_f: number;
    weather_descriptions: string[];
    humidity: number;
    wind_mph: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
  };
};

// Array of image paths for dashboard background 
const images = [
  '/img/1.jpg',
  '/img/2.jpg',
  '/img/3.jpg',
  '/img/4.jpg', 
  '/img/5.jpg', 
];

export default function Home() {
  const [city, setCity] = useState<string>('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [randomImage, setRandomImage] = useState<string>(''); 

  // Sets random background image on page load
  useEffect(() => {
    const selectedImage = images[Math.floor(Math.random() * images.length)];
    setRandomImage(selectedImage);
  }, []); // Empty dependency array ensures this runs only on mount and not for each search

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    // Validate city name to contain letters, characters, and spaces avoiding malicious code entry
    if (!validator.isAlpha(city.replace(/\s/g, ''), 'en-US', { ignore: ' ' })) {  
      setError('City name should contain only alphabetic characters and spaces.');
      setLoading(false);
      return;
    }

    // Check for max length of 50 characters to avoid malicious extra input
    if (!validator.isLength(city, { max: 50 })) {
      setError('City name must be no longer than 50 characters.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`/api/getWeather?city=${city}`);
      setWeatherData(response.data);
    } catch (err) {
      setError('Could not fetch weather data');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8 text-white text-center">{weatherData ? `${weatherData.location?.name}, ${weatherData.location?.region}` : "Weather Dashboard"}</h1>
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-8 shadow-lg max-w-lg w-full relative">
        {/* Background Image without blur */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 rounded-lg"
          style={{ backgroundImage: `url(${randomImage})` }}
        ></div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-6">
            <input
              type="text"
              placeholder="Enter city name"
              value={city}
              onChange={(e) => setCity(e.target.value)} 
              className="p-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
            />
            <button
              onClick={fetchWeather}
              className="bg-blue-500 text-white px-4 py-3 w-full rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Get Weather
            </button>
          </div>

          {loading && <p className="text-center text-gray-300">Loading...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          {weatherData && (
            <>
              <h2 className="text-center text-lg font-medium text-gray-300 mb-4">Current Condition</h2>

              {/* Display condition text and icon*/}
              {weatherData.current?.condition && (
                <div className="flex flex-col items-center mb-6">
                  <Image
                    src={`https:${weatherData.current.condition.icon}`}
                    alt={weatherData.current.condition.text}
                    width={64}  
                    height={64}
                    className="w-16 h-16 mb-2"
                  />
                  <p className="text-lg text-white">{weatherData.current.condition.text}</p>
                </div>
              )}

             {/* Weather data details in frosted glass box fields */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Temperature', value: `${weatherData.current.temp_f}°F` },
                  { label: 'Feels Like', value: `${weatherData.current.feelslike_f}°F` },
                  { label: 'Humidity', value: `${weatherData.current.humidity}%` },
                  { label: 'Wind Speed', value: `${weatherData.current.wind_mph} km/h` },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="frosted-box rounded-lg p-4 text-center"
                  >
                    <p className="font-medium">{item.label}</p>
                    <p className="text-2xl font-bold">{item.value}</p>
                  </div>
                ))}
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
