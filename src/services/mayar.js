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

  const isEbookOrder = shippingCost === 0 || 
                       (shipping.courier || '').toLowerCase().includes('digital') || 
                       (shipping.courier || '').toLowerCase().includes('ebook');

  const extraData = {
    orderId: String(safeOrderId),
    customerName: String(customer.name || '-'),
    customerPhone: String(customer.phone || '-'),
    customerEmail: String(customer.email || '-'),
    shippingAddress: String(customer.address || (isEbookOrder ? 'Pengiriman Digital (Email & WA)' : '-')),
    shippingProvince: String(customer.province || (isEbookOrder ? 'Digital' : '-')),
    shippingCity: String(customer.city || (isEbookOrder ? 'Digital Delivery' : '-')),
    courierName: String(isEbookOrder ? 'Digital Delivery' : (shipping.courier || '-')),
    courierService: String(isEbookOrder ? 'Ebook (Email & WhatsApp)' : (shipping.service || '-')),
    shippingCost: String(shippingCost),
    subtotalBooks: String(totalAmount - shippingCost),
    grandTotal: String(totalAmount),
    isEbookOrder: String(isEbookOrder ? 'true' : 'false'),
    itemsJson: JSON.stringify(invoiceItems)
  };
  if (customer.postalCode && String(customer.postalCode).trim()) {
    extraData.shippingPostalCode = String(customer.postalCode).trim();
  }

  const payload = {
    name: customer.name || 'Pembeli Buku Dayak',
    email: customer.email || 'customer@bukudayak.com',
    mobile: cleanMobile,
    redirectUrl: `${MAYAR_REDIRECT_URL}&order_id=${safeOrderId}`,
    description: isEbookOrder ? `Pembelian Ebook (Digital) - Pesanan #${safeOrderId}` : `Pembelian Buku Dayak - Pesanan #${safeOrderId}`,
    expiredAt: expiredAt,
    items: invoiceItems,
    extraData: extraData
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

    if (resData?.data?.id) {
      invoiceCache.set(resData.data.id, resData.data.id);
      if (safeOrderId) invoiceCache.set(safeOrderId, resData.data.id);
      const match = (invoiceUrl || '').match(/\/invoices\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        invoiceCache.set(match[1], resData.data.id);
      }
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

// In-memory cache for mapping orderId or short code to invoice UUID
const invoiceCache = new Map();

/**
 * Retrieve invoice details from Mayar
 */
async function getInvoice(invoiceId) {
  if (!isValidApiKey(MAYAR_API_KEY)) {
    throw new Error('MAYAR_API_KEY belum dikonfigurasi di file environment .env server!');
  }

  let targetId = invoiceCache.get(invoiceId) || invoiceId;

  // Try direct lookup with targetId
  try {
    const response = await axios.get(`https://api.mayar.id/hl/v1/invoice/${targetId}`, {
      headers: {
        Authorization: `Bearer ${MAYAR_API_KEY}`
      },
      timeout: 10000
    });
    return response.data?.data;
  } catch (err) {
    // If not found and input might be a short code or orderId, try listing recent invoices
    try {
      const listRes = await axios.get(`https://api.mayar.id/hl/v1/invoice?page=1&pageSize=20`, {
        headers: {
          Authorization: `Bearer ${MAYAR_API_KEY}`
        },
        timeout: 10000
      });
      const invoices = listRes.data?.data || [];
      const found = invoices.find(inv => 
        inv.id === invoiceId ||
        (inv.link && inv.link.includes(invoiceId)) ||
        (inv.transactions && inv.transactions.some(t => t.extraData?.orderId === invoiceId))
      );
      if (found) {
        invoiceCache.set(invoiceId, found.id);
        return found;
      }
    } catch (listErr) {
      console.error('[Mayar List Invoices Error]', listErr.message);
    }
    throw err;
  }
}

module.exports = {
  createInvoice,
  getInvoice,
  invoiceCache
};

