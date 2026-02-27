import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  if (!city) {
    return NextResponse.json({ error: 'Please provide a city name.' }, { status: 400 });
  }

  try {
    const apiKey = process.env.WEATHER_API_KEY; 
    const response = await axios.get(`https://weatherapi-com.p.rapidapi.com/current.json?q=${city}`, {
      headers: {
        'X-RapidAPI-Host': 'weatherapi-com.p.rapidapi.com',
        'X-RapidAPI-Key': apiKey,
      },
    });
    return NextResponse.json(response.data);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching weather data.' }, { status: 500 });
  }
}
