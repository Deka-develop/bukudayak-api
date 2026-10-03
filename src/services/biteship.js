const axios = require('axios');

const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || '';
const BITESHIP_ORIGIN_AREA_ID = process.env.BITESHIP_ORIGIN_AREA_ID || ''; // Area ID Asal Pengiriman

async function calculateBiteshipCost({ destinationAreaId, items = [], couriers = 'jne,sicepat,jnt' }) {
  if (!BITESHIP_API_KEY) {
    throw new Error('BITESHIP_API_KEY is not configured');
  }

  const payload = {
    origin_area_id: BITESHIP_ORIGIN_AREA_ID,
    destination_area_id: destinationAreaId,
    couriers: couriers,
    items: items.map(item => ({
      name: item.title || 'Buku Dayak',
      description: 'Buku Literatur & Sejarah Dayak',
      value: item.price || 100000,
      weight: item.weightGrams || 400,
      quantity: item.quantity || 1
    }))
  };

  const response = await axios.post('https://api.biteship.com/v1/rates/couriers', payload, {
    headers: {
      Authorization: BITESHIP_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 8000
  });

  const pricing = response.data?.pricing || [];
  return pricing.map(p => ({
    code: p.courier_code?.toUpperCase(),
    name: p.courier_name,
    service: p.courier_service_name,
    description: p.description || `${p.courier_name} ${p.courier_service_name}`,
    cost: p.price,
    etd: p.duration ? `${p.duration} hari` : '-'
  }));
}

module.exports = {
  calculateBiteshipCost
};
