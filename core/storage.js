const mocks = require('./storage.mock');
const LOGGER = require(APP_ROOT+"/modules/app")('logger');
const mode = "pg";
const scheme = process.env.dbscheme;
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
				LOGGER.debug("DB query: "+obj.query.replace(/\$(\d+)/g, (m, v)=>obj.params[+v-1]));
				return client.query(obj.query, obj.params).then(res=>{
					if(res.command == "UPDATE"){
						return {
							updatedRows : res.rowCount
						}
					}
					return res.rows;			
				}).catch(err=>{
					LOGGER.error(err);
					return null;
				});
			}
		}
	},
	upsert(obj){
		var instance = this;
		if(mode == "pg"){
			return instance.get({
				query : "select "+obj.fields.join(",")+" from "+scheme+"."+obj.table+" where "+obj.where, 
				params : obj.params
			}).then(res=>{
				let rows = res,
					insertQueryFields,
					insertParams = [],
					updateParams = [],
					updateQuery;				
				obj.setVals.forEach(setVal=>{
					let match = false,
						where = [];
					rows.forEach(row=>{
						match = true;
						for(let key in setVal.conditions){								
							if(row[key] != setVal.conditions[key]){
								match = false;
								break;
							}								
						}
					});							 
					if(match) {
						for(let key in setVal.condition){	
							updateParams.push(setVal.condition[key]);
							where.push(key +"= $"+updateParams.length);
						}			
						for(let key in setVal.values){
							updateQuery = updateQuery || [];
							updateParams.push(setVal.values[key])
							updateQuery.push(obj.fieldsToSet[key] +"=$"+updateParams.length);
						}
						updateQuery = "update "+scheme+"."+obj.table+" set "+updateQuery.join(",")+" where "+where.join(" and ")
					}
					else {
						insertQueryFields = insertQueryFields || [];
						insertQueryFields.push([]);
						for(let key in setVal.values){								
							insertParams.push(setVal.values[key]);
							insertQueryFields[insertQueryFields.length - 1].push("$"+insertParams.length);
						}
					}

				});
				return (!updateQuery ? Promise.resolve() : instance.get({query:updateQuery, 
					params : updateParams
				})).then(res=>{
					if(!insertQueryFields) {
						return res;
					}
					let subqueries = [];
					insertQueryFields.forEach(fields=>{
						subqueries.push("("+fields.join(",")+")");
					});
					return instance.get({
						query : "insert into "+scheme+"."+obj.table+"  ("+obj.fieldsToSet.join(",")+") values "+subqueries, 
						params: insertParams
					});
				});

			}).catch(err=>{
				LOGGER.error(err);
				throw err;
			});
		}
	}
}