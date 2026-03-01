// The Controller handles the logic: checking keys, calling Razorpay, 
// and coordinating with the Model.

const Razorpay = require('razorpay'); // 1. Corrected case
const PaymentModel = require("../models/paymentModel");
// const db = require("../config/dv"); // Ensure this is the correct path to your DB config


async function handleCreateOrder(req, res) {

    const razorpay = new Razorpay({ // 2. Renamed for consistency
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const { amount, currency, receipt, userId } = req.body; // Using userId
    const idempotencyKey = req.headers['x-idempotency-key'];

    try {
        // 1. Idempotency Check
        if (idempotencyKey) {
            const cachedResponse = await PaymentModel.findIdempotencyKey(idempotencyKey);
            if (cachedResponse) {
                return res.status(cachedResponse.response_status).json(cachedResponse.response_body);
            }
        }

        // 2. Create order in Razorpay
        const options = {
            amount: amount * 100, // Amount in paise (Ensure frontend sends * 100)
            currency: currency || 'INR',
            receipt: receipt,
        };

        // 3. Note the plural 'orders'
        const order = await razorpay.orders.create(options);

        // 4. Save payment to DB
        // Using userId to match the destructured variable above
        const newPayment = await PaymentModel.createPayment({
            userId,
            amount,
            currency: options.currency,
            orderId: order.id,
            receipt
        });

        // 5. Cache the response for Idempotency
        if (idempotencyKey) {
            await PaymentModel.saveIdempotencykey(idempotencyKey, 201, order);
        }

        return res.status(201).json(order);

    } catch (error) {
        console.error("Razorpay Error:", error);
        return res.status(500).json({ // 500 is standard for server errors
            message: "Order Creation failed",
            error: error.message
        });
    }
}

module.exports = { handleCreateOrder }; // Export as an object if you plan to add verifyPayment later