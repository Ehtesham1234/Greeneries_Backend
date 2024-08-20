const axios = require('axios');

const PLANT_API_URL = 'https://api.example.com/v1';
const API_KEY = process.env.PLANT_API_KEY;

exports.getPlantInfo = async (plantName) => {
  try {
    const response = await axios.get(`${PLANT_API_URL}/plants/search`, {
      params: { q: plantName },
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching plant info:', error);
    throw error;
  }
};