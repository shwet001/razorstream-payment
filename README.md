# RazorStream: Secure Razorpay Integration

**Robust Node.js Payment Processing with Concurrency Control & Webhooks**

## Project Overview
RazorStream is a production-ready payment integration backend designed to securely handle Razorpay transactions. It features strict idempotency checks to prevent duplicate charges, secure webhook signature validation, and database-level concurrency control to ensure data integrity during asynchronous payment updates.

## System Architecture



```text
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                       │
│              (Frontend / index.html + Checkout Widget)      │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP POST /api/payments/create-order
┌─────────────────────▼───────────────────────────────────────┐
│                    Express.js API (PORT: 3000)              │
│  • CORS Enabled • JSON Parsing • Static File Serving        │
└─────┬───────────────────────────────┬───────────────────────┘
      │                               │ 
┌─────▼─────────────┐           ┌─────▼──────────────┐
│ Payment Controller│           │ Webhook Controller │
│ (create-order)    │           │ (webhook)          │
│ • Idempotency     │           │ • HMAC-SHA256 Auth │
│ • Razorpay API    │           │ • Transactions     │
└─────┬─────────────┘           └─────┬──────────────┘
      │                               │ Webhook Payload (via Ngrok)
┌─────▼───────────────────────────────▼──────────────┐
│                   Payment Model                    │
│ • DB Row-Level Locking (FOR UPDATE)                │
└─────┬──────────────────────────────────────────────┘
      │
┌─────▼──────────────────────────────────────────────┐
│            PostgreSQL (ACID Compliant DB)          │
│ • payments table • idempotency_keys table          │
└────────────────────────────────────────────────────┘
```
## Components Breakdown

### 1. Client Application (`index.html`)
* Simple frontend interface triggering the payment flow.
* Integrates `checkout.js` (Razorpay's frontend widget).
* Handles the dynamic injection of the `order_id` into the Razorpay options.

### 2. Core API Server (`index.js` & Routes) 🌐
* Built with Express.js.
* Manages CORS policies and JSON payload parsing.
* Routes traffic through `/api/payments` to dedicated controllers.

### 3. Payment Controller (`paymentController.js`) 💳
* Securely communicates with the Razorpay API using environment secrets.
* **Idempotency Engine:** Checks `x-idempotency-key` headers against the database before creating an order to prevent duplicate network requests and double-billing.

### 4. Webhook Controller (`webhookController.js`) 🪝
* Listens for asynchronous events (`payment.captured`, `payment.failed`) from Razorpay.
* **Security:** Verifies `x-razorpay-signature` using `crypto` (HMAC-SHA256) to ensure the payload actually originated from Razorpay.
* Manages strict PostgreSQL database transactions (`BEGIN`, `COMMIT`, `ROLLBACK`).

### 5. Database Model (`paymentModel.js` & `db.js`) 🗄️
* Manages the `pg` connection pool with environment-aware SSL handling.
* Executes parameterized queries to prevent SQL injection.
* **Concurrency Control:** Utilizes `FOR UPDATE` row-level locks during webhook processing to prevent race conditions if multiple updates arrive simultaneously.

---

## Data Storage

**Primary Database: PostgreSQL**
* Chosen for strict ACID compliance and transaction support.
* **`payments` Table:** Stores `user_id`, `amount`, `currency`, `razorpay_order_id`, `razorpay_payment_id`, and tracking `status` (CREATED, CAPTURED, FAILED).
* **`idempotency_keys` Table:** Stores cached `key`, `response_status`, and `response_body` to safely replay responses for repeated API calls.

---

## Core Features

### Financial Data Integrity
* **Idempotency:** The system caches the Razorpay order response based on a unique client key. If the client retries the exact same request, the system returns the cached response instead of generating a new financial order.
* **Row-Level Locking:** Webhooks use `SELECT ... FOR UPDATE`. This locks the specific payment row until the database transaction is fully committed, completely eliminating race conditions.

### Security & Compliance
* Database credentials and API keys are strictly isolated in `.env`.
* Webhook payloads are cryptographically verified against tampering.
* Configured to handle idle PostgreSQL clients to prevent memory leaks and unexpected crashes.

---

## System Flows



### Flow 1: Synchronous Order Creation
**Client → API (`/create-order`) → Payment Controller →**
1. Check DB for existing `x-idempotency-key`. (If found, return cached response).
2. Call Razorpay API to generate a unique `order_id`.
3. Insert new 'CREATED' record into `payments` table.
4. Cache the successful response in `idempotency_keys`.
5. Return order details to Client to launch Checkout Widget.

### Flow 2: Asynchronous Webhook Processing
**Razorpay Servers → Ngrok Tunnel → API (`/webhook`) → Webhook Controller →**
1. Generate expected HMAC-SHA256 signature and compare it to the received header.
2. Initialize PostgreSQL Transaction (`BEGIN`).
3. Lock the specific order row in the DB (`FOR UPDATE`).
4. Update the payment status to `CAPTURED` or `FAILED`.
5. Release Lock and Save (`COMMIT`). 
*(If any step fails, `ROLLBACK` is triggered to maintain data purity).*

---

## Local Development & Ngrok Tunneling

Because Razorpay webhooks require a publicly accessible URL to deliver event payloads, this project uses ngrok to bridge the gap between Razorpay's servers and your local machine.

**How the Tunnel Works:**
1. Your local Express server runs on `localhost:3000`.
2. Ngrok creates a secure tunnel (e.g., `https://abc-123.ngrok.app`) that points directly to your local port `3000`.
3. You provide this ngrok URL to the Razorpay Dashboard as your Webhook Endpoint.
4. Razorpay sends the webhook to ngrok -> ngrok forwards it to your `webhookController.js`.

---

## 📁 Project Structure

```text
razorstream/
├── config/
│   └── db.js                 # PostgreSQL Pool setup
├── controllers/
│   ├── paymentController.js  # Order creation & Idempotency logic
│   └── webhookController.js  # Signature validation & Transactions
├── models/
│   └── paymentModel.js       # SQL queries and DB locks
├── routes/
│   └── paymentRoutes.js      # Express router
├── public/
│   └── index.html            # Frontend Checkout UI
├── .env                      # Secrets & DB URLs (Not committed)
├── index.js                  # Entry point & Express setup
└── package.json
```
---
### Prerequisites
* Node.js
* PostgreSQL Database
* Razorpay Test Account credentials
* ngrok installed locally

### Quick Start

**1. Clone & Install:**
```bash
npm install
```
##2. Environment Variables:
Create a .env file in the root directory:
```
Code snippet
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/yourdb
NODE_ENV=Development
RAZORPAY_KEY_ID=rzp_test_yourkey
RAZORPAY_KEY_SECRET=yoursecret
RAZORPAY_WEBHOOK_SECRET=yourwebhooksecret
```
##3. Start the Local Server:
```
Bash
node index.js
```
##4. Start the Ngrok Tunnel (In a separate terminal):
```
Bash
ngrok http 3000
```
**Note: Copy the generated HTTPS ngrok URL and paste it into your Razorpay Dashboard under Webhooks, appending /api/payments/webhook to the end.**

*RazorStream - Clean, Concurrent, and Secure Payments. 🚀💳
