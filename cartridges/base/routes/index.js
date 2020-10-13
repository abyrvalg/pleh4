$ = require('liteql');

module.exports = {
	index : ($)=>{return {"hello":"world"}},
	testDB : ($)=>{
		const { Client } = require('pg');

		const client = new Client({
		  connectionString: process.env.DATABASE_URL,
		  ssl: {
			rejectUnauthorized: false
		  }
		});

		client.connect();
		return client.query('SELECT NOW()').catch(err=>err);
	}
}
