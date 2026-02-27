import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cityRaw = searchParams.get('city')
  const city = cityRaw?.trim()

  if (!city) {
    return NextResponse.json({ error: 'Please provide a city name.' }, { status: 400 })
  }

  if (city.length > 100) {
    return NextResponse.json({ error: 'City name too long.' }, { status: 400 })
  }

  const encodedCity = encodeURIComponent(city)

  const apiKey = process.env.WEATHER_API_KEY
  if (!apiKey) {
    console.error('WEATHER_API_KEY is not set')
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  try {
    const response = await axios.get(
      `https://weatherapi-com.p.rapidapi.com/current.json?q=${encodedCity}`,
      {
        headers: {
          'X-RapidAPI-Host': 'weatherapi-com.p.rapidapi.com',
          'X-RapidAPI-Key': apiKey,
        },
        timeout: 5000,
      }
    )

    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (err) {
    console.error('Error fetching weather data:', err?.toString?.() ?? err)

    return NextResponse.json({ error: 'Error fetching weather data.' }, { status: 502 })
  }
}
