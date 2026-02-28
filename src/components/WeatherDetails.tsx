"use client";

import Image from "next/image";
import type { WeatherData } from "@/types/weather";

type WeatherDetailsProps = {
  weatherData: WeatherData;
};

export default function WeatherDetails({ weatherData }: WeatherDetailsProps) {
  return (
    <section aria-label="Current weather details" className="space-y-4">
      <h2 className="text-center text-lg font-semibold text-slate-100">Current Condition</h2>

      <div className="flex flex-col items-center">
        <Image
          src={`https:${weatherData.current.condition.icon}`}
          alt={weatherData.current.condition.text}
          width={64}
          height={64}
          className="h-16 w-16"
        />
        <p className="text-lg text-white">{weatherData.current.condition.text}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { label: "Temperature", value: `${weatherData.current.temp_f} F` },
          { label: "Feels Like", value: `${weatherData.current.feelslike_f} F` },
          { label: "Humidity", value: `${weatherData.current.humidity}%` },
          { label: "Wind Speed", value: `${weatherData.current.wind_mph} mph` },
        ].map((item) => (
          <div key={item.label} className="frosted-box rounded-lg p-4 text-center">
            <p className="font-medium text-slate-100">{item.label}</p>
            <p className="text-2xl font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
