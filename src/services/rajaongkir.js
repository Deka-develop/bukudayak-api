const axios = require('axios');
const path = require('path');
const provincesData = require('../data/provinces.json');
const citiesData = require('../data/cities.json');

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY || '';
const ACCOUNT_TYPE = process.env.RAJAONGKIR_ACCOUNT_TYPE || 'starter'; // starter, basic, pro
const ORIGIN_CITY_ID = process.env.ORIGIN_CITY_ID || '501'; // Default: Yogyakarta (501)

const BASE_URL = ACCOUNT_TYPE === 'pro'
  ? 'https://pro.rajaongkir.com/api'
  : (ACCOUNT_TYPE === 'basic' ? 'https://api.rajaongkir.com/basic' : 'https://api.rajaongkir.com/starter');

function isValidApiKey(key) {
  return key && typeof key === 'string' && key.trim().length > 10 && !key.includes('your_');
}

// Get All Provinces
async function getProvinces() {
  if (!isValidApiKey(RAJAONGKIR_API_KEY)) {
    return provincesData;
  }
  try {
    const res = await axios.get(`${BASE_URL}/province`, {
      headers: { key: RAJAONGKIR_API_KEY },
      timeout: 5000
    });
    if (res.data && res.data.rajaongkir && res.data.rajaongkir.results) {
      return res.data.rajaongkir.results;
    }
    return provincesData;
  } catch (err) {
    console.warn('[RajaOngkir] Error fetching provinces, using fallback data:', err.message);
    return provincesData;
  }
}

// Get Cities by Province ID
async function getCities(provinceId) {
  if (!isValidApiKey(RAJAONGKIR_API_KEY)) {
    if (provinceId) {
      return citiesData.filter(c => String(c.province_id) === String(provinceId));
    }
    return citiesData;
  }
  try {
    const url = provinceId ? `${BASE_URL}/city?province=${provinceId}` : `${BASE_URL}/city`;
    const res = await axios.get(url, {
      headers: { key: RAJAONGKIR_API_KEY },
      timeout: 5000
    });
    if (res.data && res.data.rajaongkir && res.data.rajaongkir.results) {
      return res.data.rajaongkir.results;
    }
    return citiesData.filter(c => !provinceId || String(c.province_id) === String(provinceId));
  } catch (err) {
    console.warn('[RajaOngkir] Error fetching cities, using fallback data:', err.message);
    return citiesData.filter(c => !provinceId || String(c.province_id) === String(provinceId));
  }
}

// Calculate Shipping Cost via RajaOngkir
async function calculateCost({ origin = ORIGIN_CITY_ID, destination, weightGrams = 400, courier = 'jne' }) {
  const couriersToQuery = courier === 'all' ? ['jne', 'pos', 'tiki'] : [courier];
  
  if (isValidApiKey(RAJAONGKIR_API_KEY)) {
    try {
      const results = [];
      for (const c of couriersToQuery) {
        try {
          const res = await axios.post(`${BASE_URL}/cost`, {
            origin: String(origin),
            destination: String(destination),
            weight: Number(weightGrams),
            courier: c
          }, {
            headers: {
              key: RAJAONGKIR_API_KEY,
              'content-type': 'application/x-www-form-urlencoded'
            },
            timeout: 7000
          });

          const data = res.data && res.data.rajaongkir ? res.data.rajaongkir.results : [];
          if (data && data.length > 0) {
            data.forEach(item => {
              (item.costs || []).forEach(costItem => {
                results.push({
                  code: item.code.toUpperCase(),
                  name: item.name,
                  service: costItem.service,
                  description: costItem.description,
                  cost: costItem.cost[0]?.value || 0,
                  etd: costItem.cost[0]?.etd ? `${costItem.cost[0].etd} hari` : '-'
                });
              });
            });
          }
        } catch (subErr) {
          console.warn(`[RajaOngkir] Failed querying courier ${c}:`, subErr.message);
        }
      }

      if (results.length > 0) {
        return results;
      }
    } catch (err) {
      console.warn('[RajaOngkir] Cost API failed, falling back to smart estimation:', err.message);
    }
  }

  // Fallback smart calculation based on destination city
  return generateFallbackRates(destination, weightGrams);
}

// Intelligent fallback rate generator
function generateFallbackRates(destinationCityId, weightGrams = 400) {
  const city = citiesData.find(c => String(c.city_id) === String(destinationCityId));
  const provId = city ? parseInt(city.province_id, 10) : 5;
  const weightKg = Math.ceil(weightGrams / 1000);

  // Rate tiers per kg based on province
  let baseRateJNE = 20000;
  let baseRateJNT = 22000;
  let baseRateSiCepat = 21000;
  let baseRatePos = 18000;
  let etd = '2-3 hari';

  if ([5, 6, 9, 10, 11].includes(provId)) {
    // Pulau Jawa (Jabodetabek, DIY, Jateng, Jabar, Jatim)
    baseRateJNE = 15000;
    baseRateJNT = 17000;
    baseRateSiCepat = 16000;
    baseRatePos = 14000;
    etd = '1-2 hari';
  } else if ([12, 13, 14, 15, 16].includes(provId)) {
    // Kalimantan (Kalbar, Kalteng, Kalsel, Kaltim, Kaltara)
    baseRateJNE = 32000;
    baseRateJNT = 34000;
    baseRateSiCepat = 33000;
    baseRatePos = 28000;
    etd = '2-4 hari';
  } else if ([1, 2, 3, 4, 8, 17, 18, 26, 32, 33, 34].includes(provId)) {
    // Sumatera, Bali, Bangka Belitung, Riau
    baseRateJNE = 28000;
    baseRateJNT = 30000;
    baseRateSiCepat = 29000;
    baseRatePos = 25000;
    etd = '2-4 hari';
  } else if ([7, 27, 28, 29, 30, 31, 22, 23].includes(provId)) {
    // Sulawesi, NTB, NTT
    baseRateJNE = 38000;
    baseRateJNT = 40000;
    baseRateSiCepat = 39000;
    baseRatePos = 35000;
    etd = '3-5 hari';
  } else {
    // Maluku & Papua
    baseRateJNE = 58000;
    baseRateJNT = 62000;
    baseRateSiCepat = 60000;
    baseRatePos = 52000;
    etd = '4-7 hari';
  }

  return [
    {
      code: 'JNE',
      name: 'JNE Express',
      service: 'REG',
      description: 'Layanan Reguler',
      cost: baseRateJNE * weightKg,
      etd: etd
    },
    {
      code: 'J&T',
      name: 'J&T Express',
      service: 'EZ',
      description: 'Reguler Express',
      cost: baseRateJNT * weightKg,
      etd: etd
    },
    {
      code: 'SICEPAT',
      name: 'SiCepat',
      service: 'SIUNT',
      description: 'SiUntung Reguler',
      cost: baseRateSiCepat * weightKg,
      etd: etd
    },
    {
      code: 'POS',
      name: 'Pos Indonesia',
      service: 'Kilat Khusus',
      description: 'Pos Kilat Khusus',
      cost: baseRatePos * weightKg,
      etd: etd
    }
  ];
}

module.exports = {
  getProvinces,
  getCities,
  calculateCost
};
