const axios = require('axios');

const MAYAR_API_KEY = process.env.MAYAR_API_KEY || '';
const MAYAR_REDIRECT_URL = process.env.MAYAR_REDIRECT_URL || 'https://bukudayak.com/?payment=success';
const MAYAR_API_ENDPOINT = 'https://api.mayar.id/hl/v1/invoice/create';

function isValidApiKey(key) {
  return key && typeof key === 'string' && key.trim().length > 10 && !key.includes('your_');
}

/**
 * Create an Invoice on Mayar.id
 * Customer will bear the product cost + shipping cost
 */
async function createInvoice({ customer, items = [], shipping = {}, orderId }) {
  // Generate Unique Order ID if not provided
  const safeOrderId = orderId || `BD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  if (!isValidApiKey(MAYAR_API_KEY)) {
    console.warn('[Mayar API] MAYAR_API_KEY belum dikonfigurasi. Menggunakan mode simulasi / demo link.');
    const totalAmount = items.reduce((acc, curr) => acc + (Number(curr.quantity || 1) * Number(curr.price || 0)), 0) + (Number(shipping.cost) || 0);
    return {
      success: true,
      isSimulation: true,
      orderId: safeOrderId,
      invoiceId: `SIM-${safeOrderId}`,
      invoiceUrl: `https://web.mayar.id/?simulation=true&order_id=${safeOrderId}&amount=${totalAmount}`,
      totalAmount: totalAmount,
      shippingCost: Number(shipping.cost) || 0,
      note: 'Ini adalah invoice simulasi karena MAYAR_API_KEY belum diisi di file .env'
    };
  }

  // Format Items for Mayar
  const invoiceItems = items.map(item => ({
    quantity: Number(item.quantity) || 1,
    rate: Number(item.price) || 0,
    description: item.title || 'Buku Dayak'
  }));

  // Add Shipping Cost as an Item (borne by customer)
  const shippingCost = Number(shipping.cost) || 0;
  if (shippingCost > 0) {
    invoiceItems.push({
      quantity: 1,
      rate: shippingCost,
      description: `Ongkos Kirim: ${shipping.courier || 'Ekspedisi'} (${shipping.service || 'Reguler'}) ke ${customer.city || 'Tujuan'}`
    });
  }

  // Calculate Total Amount
  const totalAmount = invoiceItems.reduce((acc, curr) => acc + (curr.quantity * curr.rate), 0);

  // Set invoice expiry (24 hours from now)
  const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Clean Mobile Phone Number format (e.g., 0812xxx -> 62812xxx or clean string)
  let cleanMobile = (customer.phone || '').replace(/[^0-9]/g, '');
  if (cleanMobile.startsWith('0')) {
    cleanMobile = '62' + cleanMobile.slice(1);
  } else if (!cleanMobile.startsWith('62')) {
    cleanMobile = '62' + cleanMobile;
  }

  const payload = {
    name: customer.name || 'Pembeli Buku Dayak',
    email: customer.email || 'customer@bukudayak.com',
    mobile: cleanMobile,
    redirectUrl: `${MAYAR_REDIRECT_URL}&order_id=${safeOrderId}`,
    description: `Pembelian Buku Dayak - Pesanan #${safeOrderId}`,
    expiredAt: expiredAt,
    items: invoiceItems,
    extraData: {
      orderId: safeOrderId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      shippingAddress: customer.address,
      shippingProvince: customer.province,
      shippingCity: customer.city,
      shippingPostalCode: customer.postalCode || '',
      courierName: shipping.courier || '-',
      courierService: shipping.service || '-',
      shippingCost: shippingCost,
      subtotalBooks: totalAmount - shippingCost,
      grandTotal: totalAmount
    }
  };

  try {
    const response = await axios.post(MAYAR_API_ENDPOINT, payload, {
      headers: {
        Authorization: `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const resData = response.data;
    // Expected response: { statusCode: 200, messages: 'success', data: { id, link, ... } }
    const invoiceUrl = resData?.data?.link || resData?.data?.url || resData?.link;

    if (!invoiceUrl) {
      throw new Error(resData?.messages || 'Gagal memperoleh link pembayaran dari Mayar');
    }

    return {
      success: true,
      orderId: safeOrderId,
      invoiceId: resData?.data?.id,
      invoiceUrl: invoiceUrl,
      totalAmount: totalAmount,
      shippingCost: shippingCost
    };
  } catch (err) {
    const errMsg = err.response?.data?.messages || err.response?.data?.message || err.message;
    console.error('[Mayar API Error]', errMsg);
    throw new Error(`Mayar Error: ${errMsg}`);
  }
}

module.exports = {
  createInvoice
};
