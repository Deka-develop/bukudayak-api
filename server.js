require('dotenv').config();
const express = require('express');
const cors = require('cors');

const shippingRoutes = require('./src/routes/shipping');
const paymentRoutes = require('./src/routes/payment');
const webhookRoutes = require('./src/routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS setup
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any subdomain of bukudayak.com or vercel.app or localhost
    if (/bukudayak\.com$/.test(origin) || /vercel\.app$/.test(origin) || /localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(null, true); // Permissive for initial setup
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    name: 'Buku Dayak API Service',
    version: '1.0.0',
    endpoints: {
      provinces: '/api/shipping/provinces',
      cities: '/api/shipping/cities?province=ID',
      calculateCost: 'POST /api/shipping/cost',
      createInvoice: 'POST /api/payment/create-invoice',
      webhook: 'POST /api/webhook/mayar'
    }
  });
});

// API Routes
app.use('/api/shipping', shippingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/webhook', webhookRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Buku Dayak API Server running on port ${PORT}`);
    console.log(`🔗 Local URL: http://localhost:${PORT}`);
    console.log(`📦 Mayar Mode: ${process.env.MAYAR_MODE || 'production'}`);
    console.log(`===============================================`);
  });
}

module.exports = app;
