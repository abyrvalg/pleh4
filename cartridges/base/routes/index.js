$ = require('liteql');

module.exports = {
	index : ($)=>{return {"hello":"world"}},
	testDB : ($)=>{
		const { Pool, Client } = require('pg')
		// pools will use environment variables
		// for connection information
		const pool = new Pool()
		return pool.query('SELECT NOW()').then((res)=>{
			console.log(res);
			return "success";
		}).catch(err=>{
			console.log("WAAAAAT");
			console.log(err);
			return err;
		});
	}
}
