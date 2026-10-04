const express = require('express');
const router = express.Router();
const mayarService = require('../services/mayar');

// GET /api/invoice/:id (HTML view / Printable PDF)
router.get('/:id', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await mayarService.getInvoice(invoiceId);

    if (!invoice) {
      return res.status(404).send('<h2>Invoice tidak ditemukan atau telah kedaluwarsa.</h2>');
    }

    const tx = (invoice.transactions && invoice.transactions[0]) || {};
    const extra = tx.extraData || {};
    const customer = invoice.customer || {};

    const orderId = extra.orderId || invoice.id.substring(0, 10).toUpperCase();
    const customerName = customer.name || extra.customerName || 'Pelanggan Buku Dayak';
    const customerPhone = customer.mobile || extra.customerPhone || '-';
    const customerEmail = customer.email || extra.customerEmail || '-';
    const address = extra.shippingAddress || '-';
    const city = extra.shippingCity || '-';
    const province = extra.shippingProvince || '-';
    const postalCode = extra.shippingPostalCode ? `(${extra.shippingPostalCode})` : '';
    const courier = `${extra.courierName || 'Kurir'} ${extra.courierService || 'Reguler'}`;
    const shippingCost = Number(extra.shippingCost) || 0;
    const grandTotal = Number(invoice.amount) || Number(extra.grandTotal) || 0;
    const subtotalBooks = Number(extra.subtotalBooks) || (grandTotal - shippingCost);

    // Parse items if available
    let items = [];
    if (extra.itemsJson) {
      try {
        items = JSON.parse(extra.itemsJson);
      } catch (e) {
        items = [];
      }
    }

    // Filter out shipping if it's in items to prevent duplicate rows
    const productItems = items.filter(it => {
      const desc = (it.description || it.title || '').toLowerCase();
      return !desc.startsWith('ongkos kirim') && !desc.startsWith('ongkir');
    });

    const isPaid = (invoice.status || '').toLowerCase() === 'paid';
    const statusText = isPaid ? 'LUNAS (PAID)' : 'MENUNGGU PEMBAYARAN';
    const statusColor = isPaid ? '#10B981' : '#F59E0B';
    const statusBg = isPaid ? '#ECFDF5' : '#FEF3C7';

    // Format date
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${orderId} - BukuDayak.com</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --primary: #8B5A2B;
      --dark: #2C2825;
      --light: #F9F7F3;
      --grey: #E5E5E5;
      --text: #4A4A4A;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--light);
      color: var(--text);
      line-height: 1.6;
      padding: 40px 20px;
    }
    .invoice-wrapper {
      max-width: 800px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      overflow: hidden;
    }
    .top-actions {
      max-width: 800px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      border: none;
    }
    .btn-print {
      background: var(--dark);
      color: #fff;
    }
    .btn-print:hover {
      background: #000;
      transform: translateY(-2px);
    }
    .btn-pay {
      background: linear-gradient(135deg, #10B981, #059669);
      color: #fff;
      box-shadow: 0 4px 12px rgba(16,185,129,0.3);
    }
    .btn-pay:hover {
      background: #059669;
    }
    .btn-back {
      background: transparent;
      color: var(--primary);
      border: 1px solid var(--grey);
    }
    .invoice-card {
      padding: 45px 50px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--grey);
      padding-bottom: 25px;
      margin-bottom: 30px;
    }
    .brand h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.8rem;
      color: var(--primary);
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .brand p {
      font-size: 0.85rem;
      color: #777;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-number {
      font-family: 'Outfit', sans-serif;
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--dark);
    }
    .badge-status {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 50px;
      font-size: 0.85rem;
      font-weight: 700;
      margin-top: 6px;
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusColor}33;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 35px;
    }
    .info-box h3 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      margin-bottom: 10px;
    }
    .info-box p {
      font-size: 0.95rem;
      color: var(--dark);
      margin-bottom: 4px;
    }
    .table-container {
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: var(--light);
      color: var(--dark);
      font-weight: 700;
      font-size: 0.9rem;
      padding: 12px 16px;
      text-align: left;
      border-bottom: 2px solid var(--grey);
    }
    td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--grey);
      font-size: 0.95rem;
      color: var(--dark);
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .totals-table {
      width: 320px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 0.95rem;
    }
    .totals-row.grand-total {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--primary);
      border-top: 2px solid var(--grey);
      padding-top: 12px;
      margin-top: 6px;
    }
    .footer-note {
      border-top: 1px dashed var(--grey);
      padding-top: 20px;
      text-align: center;
      font-size: 0.85rem;
      color: #888;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .top-actions {
        display: none !important;
      }
      .invoice-wrapper {
        box-shadow: none;
        border-radius: 0;
      }
      .invoice-card {
        padding: 20px;
      }
    }
  </style>
</head>
<body>

  <div class="top-actions">
    <a href="https://bukudayak.com" class="btn btn-back">
      <i class="fas fa-arrow-left"></i> Kembali ke Toko
    </a>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" class="btn btn-print">
        <i class="fas fa-print"></i> Download / Cetak PDF
      </button>
      ${!isPaid && invoice.paymentUrl ? `
      <a href="${invoice.paymentUrl}" target="_blank" class="btn btn-pay">
        <i class="fas fa-credit-card"></i> Bayar Sekarang via Mayar
      </a>` : ''}
    </div>
  </div>

  <div class="invoice-wrapper">
    <div class="invoice-card">
      
      <div class="header-row">
        <div class="brand">
          <h1>BUKU DAYAK</h1>
          <p>Pusat Buku & Literatur Budaya Borneo</p>
          <p style="font-size: 0.8rem; margin-top: 2px;">Website: www.bukudayak.com | CS: 0812-8774-3789</p>
        </div>
        <div class="invoice-meta">
          <div class="invoice-number">INVOICE #${orderId}</div>
          <p style="font-size: 0.85rem; color: #777; margin-top: 4px;">Tanggal: ${dateStr}</p>
          <span class="badge-status">${statusText}</span>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Ditujukan Kepada:</h3>
          <p><strong>${customerName}</strong></p>
          <p><i class="fab fa-whatsapp" style="color:#25D366; margin-right:4px;"></i> ${customerPhone}</p>
          <p><i class="far fa-envelope" style="color:#666; margin-right:4px;"></i> ${customerEmail}</p>
        </div>
        <div class="info-box">
          <h3>Tujuan Pengiriman & Kurir:</h3>
          <p>${address}</p>
          <p><strong>${city}, ${province} ${postalCode}</strong></p>
          <p style="margin-top:6px; color:var(--primary); font-weight:600;"><i class="fas fa-shipping-fast"></i> ${courier}</p>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 50px;" class="text-center">#</th>
              <th>Deskripsi Item / Produk</th>
              <th class="text-center" style="width: 80px;">Qty</th>
              <th class="text-right" style="width: 140px;">Harga Satuan</th>
              <th class="text-right" style="width: 140px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${productItems.length > 0 ? productItems.map((it, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td><strong>${it.description || it.title}</strong></td>
                <td class="text-center">${it.quantity || 1}</td>
                <td class="text-right">Rp ${(Number(it.rate || it.price) || 0).toLocaleString('id-ID')}</td>
                <td class="text-right">Rp ${(Number((it.quantity || 1) * (it.rate || it.price)) || 0).toLocaleString('id-ID')}</td>
              </tr>
            `).join('') : `
              <tr>
                <td class="text-center">1</td>
                <td><strong>Pesanan Buku Dayak</strong></td>
                <td class="text-center">1</td>
                <td class="text-right">Rp ${subtotalBooks.toLocaleString('id-ID')}</td>
                <td class="text-right">Rp ${subtotalBooks.toLocaleString('id-ID')}</td>
              </tr>
            `}
            <tr>
              <td class="text-center">${(productItems.length || 1) + 1}</td>
              <td><strong>Ongkos Kirim (${courier})</strong></td>
              <td class="text-center">1</td>
              <td class="text-right">Rp ${shippingCost.toLocaleString('id-ID')}</td>
              <td class="text-right">Rp ${shippingCost.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="totals-area">
        <div class="totals-table">
          <div class="totals-row">
            <span>Subtotal Produk:</span>
            <span>Rp ${subtotalBooks.toLocaleString('id-ID')}</span>
          </div>
          <div class="totals-row">
            <span>Ongkos Kirim:</span>
            <span>Rp ${shippingCost.toLocaleString('id-ID')}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Total Tagihan:</span>
            <span>Rp ${grandTotal.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      <div class="footer-note">
        <p>Terima kasih atas pesanan Anda di <strong>BukuDayak.com</strong>.</p>
        <p style="margin-top: 4px;">Dokumen ini merupakan bukti transaksi sah yang diterbitkan melalui sistem pembayaran otomatis Mayar.id & Buku Dayak.</p>
      </div>

    </div>
  </div>

</body>
</html>`;

    res.send(html);
  } catch (err) {
    console.error('[Invoice Render Error]', err);
    res.status(500).send(`<h2>Gagal memuat invoice: ${err.message}</h2>`);
  }
});

module.exports = router;
