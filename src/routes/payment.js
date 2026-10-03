const express = require('express');
const router = express.Router();
const mayarService = require('../services/mayar');

// POST /api/payment/create-invoice
router.post('/create-invoice', async (req, res) => {
  try {
    const { customer, items, shipping, orderId } = req.body;

    // Validation
    if (!customer || !customer.name || !customer.phone || !customer.address) {
      return res.status(400).json({
        success: false,
        message: 'Data nama, nomor telepon/WA, dan alamat lengkap wajib diisi!'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keranjang belanja kosong! Silakan pilih buku terlebih dahulu.'
      });
    }

    if (!shipping || typeof shipping.cost === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Silakan pilih kurir dan opsi pengiriman terlebih dahulu!'
      });
    }

    const invoiceResult = await mayarService.createInvoice({
      customer,
      items,
      shipping,
      orderId
    });

    res.json(invoiceResult);
  } catch (err) {
    console.error('[Payment Invoice Error]', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;
