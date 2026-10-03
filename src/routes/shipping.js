const express = require('express');
const router = express.Router();
const rajaongkirService = require('../services/rajaongkir');
const biteshipService = require('../services/biteship');

const SHIPPING_PROVIDER = process.env.SHIPPING_PROVIDER || 'rajaongkir';

// GET /api/shipping/provinces
router.get('/provinces', async (req, res) => {
  try {
    const provinces = await rajaongkirService.getProvinces();
    res.json({
      success: true,
      data: provinces
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// GET /api/shipping/cities?province=ID
router.get('/cities', async (req, res) => {
  try {
    const provinceId = req.query.province || req.query.province_id;
    const cities = await rajaongkirService.getCities(provinceId);
    res.json({
      success: true,
      data: cities
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// POST /api/shipping/cost
router.post('/cost', async (req, res) => {
  try {
    const { destination, weightGrams, courier, items, destinationAreaId } = req.body;

    if (!destination && !destinationAreaId) {
      return res.status(400).json({
        success: false,
        message: 'Kota/Kabupaten tujuan pengiriman harus diisi!'
      });
    }

    let rates = [];

    if (SHIPPING_PROVIDER === 'biteship' && destinationAreaId) {
      rates = await biteshipService.calculateBiteshipCost({
        destinationAreaId,
        items
      });
    } else {
      rates = await rajaongkirService.calculateCost({
        destination,
        weightGrams: weightGrams || 400,
        courier: courier || 'all'
      });
    }

    res.json({
      success: true,
      rates: rates
    });
  } catch (err) {
    console.error('[Shipping Cost Error]', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;
