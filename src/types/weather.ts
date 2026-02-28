export type WeatherData = {
  location: {
    name: string;
    region: string;
    country: string;
  };
  current: {
    temp_f: number;
    feelslike_f: number;
    humidity: number;
    wind_mph: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
  };
};
