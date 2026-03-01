const express = require('express');
const router = express.Router();
const { handleCreateOrder } = require('../controllers/paymentController'); // Check spelling of filename
const { handleRazorpayWebhook } = require('../controllers/webhookController'); // Check spelling of filename

// This maps the URL to your controller functions

// Route to create a new order (called by your frontend)
router.post('/create-order', handleCreateOrder);

// Route for Razorpay webhooks (called by Razorpay servers)
router.post('/webhook', handleRazorpayWebhook);

module.exports = router;