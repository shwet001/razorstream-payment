require('dotenv').config();
const express = require("express");
const cors = require("cors");

const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// Middleware
app.use(cors()) //allow your frontend to talk to your backend
app.use(express.json()); //parsing incoming JSON requests
app.use(express.static('public'));

// use all payments routes
// All routes inside paymentRoutes will now start with /api/payments
app.use('/api/payments', paymentRoutes);

const PORT = process.env.PORT || 3000;

app.get('/',(req, res)=>{
 res.send('Payment server is live');
})

app.listen(PORT, () => {
    console.log(` Server is running on port ${PORT}`);
    console.log(`Create Order: http://localhost:${PORT}/api/payments/create-order`);
    console.log(`Webhook URL: http://localhost:${PORT}/api/payments/webhook`);
});