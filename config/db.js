const {Pool} = require('pg');
const { connectionString } = require('pg/lib/defaults');
require('dotenv').config();

// create a new pool instance using .env credentials
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // recommened for local development to avoid error
    ssl : process.env.NODE_ENV === 'Production' ? { 'rejectUnauthorized' :  false} : false,
});

// logic to check if the connection is successful
pool.on('connect',()=>{
    console.log("connected to postgresql database successfully...");
});

//A safety net. If a connection dies while sitting idle, 
// this prevents your entire app from crashing unexpectedly.
pool.on('error',(err, client)=>{
    console.log('unexcepted error on idle client', err);
    process.exit(-1);
})

module.exports = {
    // Use this for standard queries
    query : (text, params)=> pool.query(text, params),
    // Use this when you need a "client" for Transactions (like in our Webhook)
    connect: ()=>pool.connect()
}


