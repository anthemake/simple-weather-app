const axios = require('axios');

module.exports = async function (context, req) {
  const city = req.query.city;

  if (!city) {
    context.res = {
      status: 400,
      body: "Please provide a city name."
    };
    return;
  }

  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    const response = await axios.get(`https://weatherapi-com.p.rapidapi.com/current.json?q=${city}`, {
      headers: {
        'X-RapidAPI-Host': 'weatherapi-com.p.rapidapi.com',
        'X-RapidAPI-Key': apiKey
      }
    });
    context.res = {
      body: response.data
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: "Error fetching weather data."
    };
  }
};
