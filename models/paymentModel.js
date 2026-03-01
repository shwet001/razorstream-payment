const db = require("../config/db");

class PaymentModel {
    // 1. Check for Idempotency Key
    static async findIdempotencyKey(key) {
        // Corrected 'indempotency' typo
        const query = 'SELECT * FROM idempotency_keys WHERE key = $1';
        const result = await db.query(query, [key]);
        return result.rows[0];
    }

    // 2. Save Idempotency Key and Response
    static async saveIdempotencykey(key, status, body) {
        const query = `INSERT INTO idempotency_keys (key, response_status, response_body) VALUES ($1,$2,$3)`;
        // Note: Ensure column names match your Controller (response_status/response_body)
        await db.query(query, [key, status, JSON.stringify(body)]);
    }

    // 3. Create initial Payment Record
    static async createPayment({ userId, amount, currency, orderId, receipt }) {
        const query = `
            INSERT INTO payments (user_id, amount, currency, razorpay_order_id, receipt, status)
            VALUES ($1, $2, $3, $4, $5, 'CREATED')
            RETURNING *
        `;
        const values = [userId, amount, currency, orderId, receipt];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    // 4. Update Payment Status (Used by Webhook with Row Locking)
    static async updateStatusWithLock(orderId, status, paymentId, client) {
        // FOR UPDATE locks the row until the transaction COMMITS
        // This prevents another process from updating this payment simultaneously
        await client.query(
            'SELECT * FROM payments WHERE razorpay_order_id = $1 FOR UPDATE', 
            [orderId]
        );

        const query = `
            UPDATE payments 
            SET status = $1, razorpay_payment_id = $2, updated_at = CURRENT_TIMESTAMP
            WHERE razorpay_order_id = $3
        `;

        return await client.query(query, [status, paymentId, orderId]);
    }
}

// Corrected module.export to module.exports
module.exports = PaymentModel;