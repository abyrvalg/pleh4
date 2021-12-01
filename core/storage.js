const e = require('express');
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

var transactions = [];

module.exports = {
	get(obj, transaction){
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
				let currentTransaction;
				if(transaction && transaction.id !== undefined){
					if(transaction.id == -1) {
						transactions = transactions.filter(tr=>!tr.comitted);
						transactions.push({
							queries : [],
							params : []
						});
						transaction.id = transactions.length - 1;
					}
					transactions[transaction.id].queries.push(obj.query);
					transactions[transaction.id].params.push(obj.params);
					currentTransaction = transactions[transaction.id];
				} else {
					currentTransaction = {
						queries : [obj.query],
						params : [obj.params]
					};
				}
				if (!transaction || transaction.commit || transaction.id === undefined) {
					let queryPromise = currentTransaction.queries.length == 1 ? Promise.resolve() : client.query("BEGIN");
					currentTransaction.results = [];
					currentTransaction.queries.forEach((el, key)=>{
						queryPromise = queryPromise.then(r=>{
							r && currentTransaction.results.push(r);
							LOGGER.debug("DB query: "+el.replace(/\$(\d+)/g, (m, v)=>currentTransaction.params[key][+v-1]));
							return client.query(el, currentTransaction.params[key]).catch(err=>{
								LOGGER.error("ERROR during processing query:"+el);
								LOGGER.error(err);
								return client.query("ROLLBACK").then(r=>{
									return {success : false}
								});
							});
						})
					});
					return currentTransaction.queries.length == 1 ? queryPromise.then(res=>{
						res && currentTransaction.results.push(res);
						if(res.command == "UPDATE"){
							return {
								updatedRows : res.rowCount
							}
						}
						return res.rows;
					}) : queryPromise.then(r=>client.query("COMMIT").then(res=>{
						r && currentTransaction.results.push(r);
						res && currentTransaction.results.push(res);
						currentTransaction.comitted = true;
						return {success: true, results : currentTransaction.results};		
					}).catch(err=>{
						LOGGER.error(err);
						return {success:false};
					}));
				} else {
					return  Promise.resolve({success : true, transaction : transaction.id});
				}
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