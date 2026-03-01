const crypto = require('crypto');
const db = require('../config/db');
const PaymentModel = require('../models/paymentModel');

 async function handleRazorpayWebhook (req, res){

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const received_signature = req.headers['x-razorpay-signature'];

  // Verify Webhook Signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(req.body));
  const expectedSignature = hmac.digest('hex');

  if (expectedSignature !== received_signature) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body.event;
  const payload = req.body.payload.payment.entity;
  const client = await db.connect();

  try {
    await client.query('BEGIN'); // Start Transaction

    if (event === 'payment.captured') {
      await PaymentModel.updateStatusWithLock(
        payload.order_id, 
        'CAPTURED', 
        payload.id, 
        client
      );
    } else if (event === 'payment.failed') {
      await PaymentModel.updateStatusWithLock(
        payload.order_id, 
        'FAILED', 
        payload.id, 
        client
      );
    }

    await client.query('COMMIT'); // Release Lock
    res.status(200).send('OK');
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).send('Webhook Processing Failed');
  } finally {
    client.release();
  }
};

module.exports = {handleRazorpayWebhook,};