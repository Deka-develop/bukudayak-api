const express = require('express');
const router = express.Router();

/**
 * POST /api/webhook/mayar
 * Mayar will ping this webhook endpoint when customer completes payment
 */
router.post('/mayar', (req, res) => {
  try {
    const event = req.body;
    console.log('[Mayar Webhook Event Received]:', JSON.stringify(event, null, 2));

    // Handle different event types from Mayar
    // e.g. "payment.received", "invoice.paid"
    const eventType = event.event || event.status || 'unknown';
    const data = event.data || event;

    if (eventType === 'payment.received' || event.status === 'PAID') {
      console.log(`[Mayar Webhook] Order #${data?.extraData?.orderId || data?.id} is PAID successfully!`);
      // Here you can trigger an automated email, Telegram bot message, or record to Google Sheets / Database.
    }

    // Always respond 200 OK to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Mayar Webhook Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
