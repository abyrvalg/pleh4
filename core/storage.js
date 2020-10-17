const mocks = require('./storage.mock');
const mode = "pg";
if(mode == "pg"){
	const { Client } = require('pg');
	var client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: {
		rejectUnauthorized: false
		}
	});		
	client.connect();
}
module.exports = {
	get(obj){
		if(obj.type && obj.id || obj.query){
			if(mode == "mock"){
				return new Promise((resolver)=>{
					if(obj.id instanceof Array) {
						let result = obj.format == "array" ? [] : {};
						for (let i in obj.id) {
							if(obj.format == "array") {
								result.push(mocks[obj.type][''+obj.id[i]]);
							}
							else {
								result[obj.id[i]] = mocks[obj.type][''+obj.id[i]];
							}
						}
						resolver(result);
					}
					else {						
						resolver(mocks[obj.type][""+obj.id]);
					}
				});
			}
			else if(mode == "pg"){
				return client.query(obj.query, obj.params).then(res=>{		
					return res.rows;			
				}).catch(err=>{
					console.log(err);
					return err;
				});
			}
		}
	}
}