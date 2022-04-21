const STORAGE = require(APP_ROOT+"/modules/app")('storage');
const dateUtils = require(APP_ROOT+"/modules/app")("utils", "date");
const dataUtils = require(APP_ROOT+"/modules/app")("utils", "data");
const scheme = process.env.dbscheme;

function getTherapists(params){
	params = params || {};
	var queryParams = [],
		fileds = params.fields ? JSON.parse(dataUtils.cammelCaseToUnderscore(JSON.stringify(params.fields))) : ["t.id", "first_name", "last_name", "t.rate", "tg_id", "share"],
		where = [],
		joins = ["left join "+scheme+".therapists as t on t.user_id = u.id"];
	if(params.id){
		queryParams.push(params.id);
		where.push("u.id=$"+queryParams.length);
	}
	if(params.tg_id){
		queryParams.push(params.tg_id);
		where.push("tg_id=$"+queryParams.length);
	}
	if(params.clientID) {
		queryParams.push(params.clientID);
		where.push("c.id=$"+queryParams.length);
		joins.push("left join "+scheme+".clients as c on c.therapist = t.id");
	}
	return STORAGE.get({query : "select "+fileds.join(", ")+" from "+scheme+".users as u "+joins.join(" ")+" \
		"+(where.length ? +"where "+where.join(" and ") : ""), params : queryParams});
}
module.exports = {
	therapists(params) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		if(!this.scope.session.ensure("auth")){
			return {success: false, error: "not_available"}
		}
		return getTherapists(params);
	},
	therapist(params) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var data; 
		var profile = this.scope.session.getVar("currentProfile");
		if(params && typeof params == "string") {
			data = {id: params};
		} else if(params) {
			data = {clientID: params.clientID};
		} else {
			data = {id : profile.id}
		}
		data.fields = params.fields;
		return getTherapists(data).then(r=> r && r[0]);
	},
	therapistByTgID(tg_id) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return getTherapists({tg_id:tg_id}).then(r=>r[0]);
	},
	appointment(id){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "select * from "+scheme+".appointments where id=$1",
			params : [id]
		}).then(r=>r[0]);
	},
	appointmentAndSchedule(arg){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
            query : "select s.schedule, ap.id as appointment from "+scheme+".schedules as s \
                left join "+scheme+".appointments as ap on ap.therapist=$1 and ap.date = $3 and ap.time = $4 and (ap.status > 0 or (ap.status = 0 and ap.create_date < now() + interval '6 hours'))\
                where s.therapist=$1 and s.month=$2", 
            params : [arg.therapistID, dateUtils.getYearMonth(new Date(arg.date)), arg.date, arg.time]
        }).then(res=>res && res[0]);
	},
	addAppointment(arg){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		var vals = ["$1", "$2", "$3"],
			names = ['id', 'name', 'phone'],
			params = [dataUtils.getUID(32), arg.name, arg.phone];
		if(arg.therapistID) {
			params.push(arg.therapistID);
			vals.push("$"+params.length);
			names.push('therapist');

		}
		if(arg.date) {
			params.push(arg.date);
			vals.push("$"+params.length);
			names.push('date');
		}
		if(arg.time) {
			params.push(+arg.time);
			vals.push("$"+params.length);
			names.push('time');
		}
		if(arg.howToCall) {
			params.push(+arg.howToCall);
			vals.push("$"+params.length);
			names.push('how_to_call');
		}
		params.push(0);
		vals.push("$"+params.length);
		names.push('status');
		return STORAGE.get({
			query : "insert into "+scheme+".appointments ("+names.join(',')+", create_date)\
                    values ("+vals.join(",")+", now())",
            params : params
		}).then(r=>{
			return r;
		});
	},
	myAppointments(){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		if(!this.scope.session.ensure("auth")){
			return {success: false, error: "not_available"}
		}
		therapistID = this.scope.session.getVar("currentProfile").id;
		if(!therapistID){
			return {success : false, error : "therapist_id_is_missing"}
		}
		return STORAGE.get({
			query : "select id, date, time, status, name, phone, how_to_call, therapist from "+scheme+".appointments where therapist=$1 and (date > now() or date is null) order by date, time",
			params : [therapistID]
		}).then(res=>res.map(ap=>{
			return {
				"id" : ap.id,
				"therapist" : ap.therapist,
				"date" : dateUtils.dateToString(ap.date),
				"time" : dateUtils.timeToString(ap.time),
				"confirmed" : ap.status > 0,
				"canceled" : ap.status < 0, 
				"name" : ap.name,
				"phone" : ap.phone,
				"how_to_call" : ["viber", "telegram", "whatsUp", "Звонок"][ap.how_to_call],
				"how_to_call_num" : ap.how_to_call,
				"time_num" : ap.time
			}
		}));
	},
	unassignedAppointments(){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "select id, name, phone, how_to_call from "+scheme+".appointments where therapist is null"
		}).then(res=>res.map(ap=>{
			return {
			"id" : ap.id,
			"name" : ap.name,
			"phone" : ap.phone,
			"how_to_call" : ["viber", "telegram", "whatsUp", "Звонок"][ap.how_to_call],
			"how_to_call_num" : ap.how_to_call}
		}));
	},
	schedules(params){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var queryParams = [],
			profile = this.scope.session.getVar("currentProfile"),
			therapistID = profile ? profile.id : params.id;
		if(therapistID){
			queryParams.push(therapistID);
			var months = [],
				dateMonthQuery = [];
			for (let i in params.months){				
				queryParams.push(params.months[i]);
				months.push("$"+queryParams.length);
				if(params.getAppointments) {
					queryParams.push(dateUtils.getDateFromYearMonth(params.months[i]));
					let from = "$"+queryParams.length;
					queryParams.push(dateUtils.getDateFromYearMonth(params.months[i], true));
					let to = "$"+queryParams.length;
					dateMonthQuery.push("(a.date >= "+from +" and "+"a.date <= "+to+")");
				}
			}
			if(params.getAppointments) {
				var appointmentsQuery = {
					fields : "a.id as appointment_id, a.date as appointment_date, a.time as appointment_time, a.name as client_name, a.phone as client_phone",
					join : "left join "+scheme+".appointments as a on a.therapist = t.id and (a.status > 0 or (a.status = 0 and a.create_date < now() + interval '6 hours')) and ("+dateMonthQuery.join(" or ")+")"
				} //TODO configure interval value
			}
			let sqlQuery = {
				query : "select "+(appointmentsQuery ? appointmentsQuery.fields+", " : "")+" t.id, t.first_name, t.last_name, s.month, s.schedule from "+scheme+".users as t\
				left join "+scheme+".schedules as s on t.id = s.therapist and s.month in ("+months.join(",")+")\
				"+(appointmentsQuery ? appointmentsQuery.join : "")+"\
				where t.id = $1 order by s.month",
				params: queryParams
			};
			return STORAGE.get(sqlQuery).then(r=>{
				let therapists = {},
					processed = {
						schedules : [],
						appointments : []
					};
				for (let i in r) {
					therapists[r[i].id] = therapists[r[i].id]  || {
						id : r[i].id,
						first_name : r[i].first_name || (profile && profile.first_name),
						last_name : r[i].last_name || (profile && profile.last_name),
						schedules : [],
						appointments : []
					};
					if(r[i].schedule && !~processed.schedules.indexOf(r[i].month)) {
						therapists[r[i].id].schedules.push({
							month : r[i].month,
							schedule : r[i].schedule
						});
						processed.schedules.push(r[i].month);
					}
					if(r[i].appointment_id && !~processed.appointments.indexOf(r[i].appointment_id)) {
						let appointmentNum = dateUtils.getNumFromDateTime(r[i].appointment_date, r[i].appointment_time);
						therapists[r[i].id].appointments.push({
							date : r[i].appointment_date,
							time : r[i].appointment_time,
							name : r[i].client_name,
							phone : r[i].client_phone,
							num : appointmentNum
						});
						therapists[r[i].id].appointmentNums = therapists[r[i].id].appointmentNums || {};
						let yearMonth = dateUtils.getYearMonth(r[i].appointment_date);
						therapists[r[i].id].appointmentNums[yearMonth] = therapists[r[i].id].appointmentNums[yearMonth] || [];
						therapists[r[i].id].appointmentNums[yearMonth].push(appointmentNum);
						processed.appointments.push(r[i].appointment_id);
					}

				}
				return therapists;
			});
		}
	},
	updateAppointment(query, transaction){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
        var setFields = [],
			session = this.scope.session,
			profile = session && session.getVar("currentProfile"),
            params = [query.id, profile && profile.id];
        ["status", "name", "phone", "time", "date"].forEach(e=>{
            if(query[e]){
                params.push(e == "date" ? new Date(query[e]) : query[e]);
                setFields.push(e+" = $"+params.length)
            }
        });  
        if(!setFields.length) return;
        return STORAGE.get({
            query : "update "+scheme+".appointments set "+setFields.join(",")+" where id = $1 and therapist = $2",
            params : params
        }, transaction).then(r=>{
            return r.transaction !== undefined ? r : {status : r.updatedRows ? "ok" : "error"}
        });
	},
	createTherapySession(query, transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "insert into "+scheme+".sessions (id, appointment, price_amount, status, date) select (select $1), a.id, price, $2, date from "+scheme+".appointments as a left join "+scheme+".users as u on u.id = a.therapist where a.id = $3",
			params : [dataUtils.getUID(32), 0, query.appointmentID]
		}, transaction);
	},
	removeTherapySession(query, transaction){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "delete from "+scheme+".sessions where appointment_id = $1",
			params : [query.appointmentID]
		}, transaction);
	},
	getUsersByRoles(roles, andOr){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		var where = [],
			params = [];
		!Array.isArray(roles) && (roles = [roles])
		for(let i in roles){
			params.push(roles[i]);
			where.push("name = $"+params.length);
		}
		return STORAGE.get({
			query : "select id, first_name, last_name, tg_id from "+scheme+".users \
				where cast(FLOOR(roles/(select num from "+scheme+".roles where "+where.join(" "+(andOr || "OR")+" ")+")) as integer) % 2 <> 0",
			params : params
		})
	},
	assignAppointemnts(query){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		var map = [],
            params = [];
        for(let key in query){
            params.push(query[key]);
			params.push(key);
			map.push("($"+(params.length-1)+", $"+params.length+")")
        }
        return STORAGE.get({query: "update "+scheme+".appointments as a set therapist = r.therapist\
		from (values "+map.join(",")+") as r(therapist, id) where a.id = r.id", params: params}).then(r=>{
            return r.updatedRows ? {success : true} : {success : false, error : r}
        });
	},
	getAppintmentsWithTherapist(query){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		var where = query.map((val, index)=>"$"+(index+1))
		return STORAGE.get({
			query : "select a.name, a.phone, a.date, a.time, u.tg_id from "+scheme+".appointments as a\
				left join "+scheme+".users as u on u.id = a.therapist where a.id in ("+where.join(",")+")",
			params: query
		}).then(r=>r.map(el=>{
			el.tgid = el.tg_id //remove after fixing liteql
			return el;
		}));
	},
	getRoles(){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "select id, name, num from "+scheme+".roles"
		});
	},
	updateRoles(query) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		var map = [],
            params = [];
		for(let key in query){
            params.push(query[key]);
			params.push(key);
			map.push("(cast($"+(params.length-1)+" as integer), $"+params.length+")")
        }
		return STORAGE.get({
			query : "update "+scheme+".users as u set roles = r.roles\
				from (values "+map.join(",")+") as r(roles, id) where u.id = r.id",
			params : params
		}).then(r=>{
            return r && r.updatedRows ? {success : true} : {success : false, error : r}
        });
	},
    getUsers(params){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		      /*  if(!this.scope.session.ensure("auth")){
			return {success: false, error: "not_available"}
		}*/
		
    	return STORAGE.get({
			query : "select id, first_name, last_name, email, roles from "+scheme+".users order by first_name"
		});
    },
	getTransaction(params) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "select "+params.fields.join(",")+" from "+scheme+".payment_transactions where id = $1",
			params : [params.id]
		}).then(r=>r && r[0]);
	},
	fulfillPaymentTransaction(transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		if(transaction.id) {
			return STORAGE.get({
				query : "select pt.id, pt.status, pt.amount, c.name as client_name, c.thearapist, c.phone, s.id as session_id, s.price_amount as amount \
					s.date, u.tg_id, u.id from "+shceme+".payment_transactions as pt left join "+scheme+".clients as c on pt.client = c.id \
					left join "+scheme+".sessions as s on pt.session = s.id \
					left join "+scheme+".users as u on u.id = c.therapist \
					left join "+scheme+".therapists as t on t.id=c.therapist where pt.id = $1",
				params : [transaction.id]
			}).then(r=>{
				var result = r && r[0];
				if(!result) return {success : false, error : "no_transaction_data_found"};
				let amountDif = transaction.ammount - result.amount,
					paymentStatus = amountDif > 0 ? 3 : (amountDif < 0 ? 1 : 2);
				return STORAGE.get({
					query : "update "+scheme+".paymant_transaction status = $1 where id = $2",
					params : [paymentStatus, transaction.id]
				}).then((r)=>{
					return {success : true, data : result}
				});
			});
		}
		else if(transaction.clientID){
			return STORAGE.get({
				query : "select c.name as client_name, c.therapist_share, c.phone as client_phone, u.tg_id, pa.merchant as therapist_merchant, tpa.merchant as tech_merchant, cpa.merchant as center_merchant \
				from "+scheme+".clients as c \
				left join "+scheme+".therapists as t on t.id = c.therapist\
				left join "+scheme+".users as u on t.user_id = u.id \
				left join "+scheme+".payment_accounts as pa on pa.user_id = t.user_id\
				left join "+scheme+".payment_accounts as tpa on tpa.role = 2\
				left join "+scheme+".payment_accounts as cpa on cpa.role = 1\
				where c.id = $1",
				params : [transaction.clientID]	
			}).then(result=>{
				let transactionID = dataUtils.getUID(32);
				return STORAGE.get({
					query : "insert into "+scheme+".payment_transactions (id, amount, status, external_id, client, therapist_share, date) values ($1, $2, $3, $4, $5, $6, now())",
					params : [transactionID, transaction.amount, 3, transaction.external, transaction.clientID, result[0].therapist_share]
				}).then(r=>{
					let data = result[0];
					data.transactionID = transactionID;
					return result ? {success : true, data: data} : {success : false};
				});
			});
		}
	},
	getExtendedPaymentTransaction(id){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "select u.first_name as therapist_first_name, u.last_name as therapist_last_name, c.name as client_name,  pt.amount, pt.external_id, pt.therapist_share, \
			pa.merchant as therapist_merchant, tpa.merchant as tech_merchant,\
			cpa.merchant as center_merchant, tpa.secret as tech_secret \
			from "+scheme+".payment_transactions as pt \
			left join "+scheme+".clients as c on c.id = pt.client \
			left join "+scheme+".therapists as t on t.id = c.therapist \
			left join "+scheme+".users as u on u.id = t.user_id \
			left join "+scheme+".payment_accounts as pa on pa.user_id = t.user_id \
			left join "+scheme+".payment_accounts as tpa on tpa.role = 1\
			left join "+scheme+".payment_accounts as cpa on cpa.role = 2\
			where pt.id = $1",
			params : [id]
		}).then(r => r && r[0]);
	},
	settleTransaction(id){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "update "+scheme+".payment_transactions set settled = true where id = $1",
			params : [id]
		}).then(res=>{
			return {success : !!res}
		});
	},
	getSplitTransactionReciever() {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "select u.tg_id from "+scheme+".payment_accounts as pa \
			left join "+scheme+".users as u on u.id = pa.user_id \
			where pa.role = $1",
			params : [2]
		}).then(res=>res && res[0] && res[0].tg_id);
	},
	getPaymentAccount(params) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		var where = [],
			queryParams = [];
		if(params.roles){
			params.roles.forEach(role=>{
				queryParams.push(role);
				where.push("$"+(queryParams.length))
			});
			where = "role in ("+where.join(", ")+")";
		}
		/*if(params.clientID){
			return STORAGE.get({
				query : "select p.merchant as merchant_therapist, p.secret as secret_therapist, tp.merchant as merchant_tech, tp.secret as secret_tech \
					from "+scheme+".payment_accounts tp \
					left join "+scheme+".clients as c on c.id = $1 \
					left join "+scheme+".therapists as t on t.id = c.therapist \
					left join "+scheme+".payment_accounts as p on p.user_id = t.user_id and p.role = 2\
					where tp.role = 1",
				params : [params.clientID]
			}).then(res=>{
				res = res && res[0];
				let suffix = res.merchant_therapist ? "therapist" : "tech",
					fieldToReturn = {};
				params.fields.forEach(field=>{
					fieldToReturn[field] = res[field+"_"+suffix];
				});
				fieldToReturn.noSplit = !!res.merchant_therapist;
				return fieldToReturn;
			});
		}*/
		return STORAGE.get({
			query : "select "+params.fields.join(", ")+" from "+scheme+".payment_accounts where "+where,
			params : queryParams
		}).then(res=>res && res[0]);
	},
	getClients(params){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "select c.id, c.name, c.phone, c.rate, c.therapist_share from "+scheme+".therapists as t \
				left join "+scheme+".clients as c on c.therapist = t.id\
				where t.user_id = $1 and status = $2",
			params : [params.userID, 1]
		});
	},
	getClient(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var params = [1],
			where = [];
		if(data.id) {
			params.push(data.id);
			where.push("id = $"+params.length);
		}
		if(data.userID) {
			params.push(data.userID);
			where.push("user_id = $"+params.length);
		}
		return STORAGE.get({
			query : "select "+data.fields.join(",")+" from "+scheme+".clients where status = $1 and "+where.join(" and "),
			params : params
		}).then(r=>r && r[0]);
	},
	addClient(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var params = [dataUtils.getUID(32, {lowercase:true}), data.name, data.phone, data.rate, 1, data.share, data.therapistUserID || null, data.userID || null];
		return STORAGE.get({
			query : "insert into "+scheme+".clients (id, name, phone, rate, status, therapist_share, therapist, create_date, user_id) values ($1, $2, $3, $4, $5, $6, \
				"+ (data.therapistUserID ? "(select id from "+scheme+".therapists where user_id = $7)" : "$7")+", now(), $8)",
			params : params
		}).then(r=>{
			return {success : true}
		});
	},
	disableClient(params) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "update "+scheme+".clients set status = $2 where id=$1",
			params : [params.id, 0]
		}); 
	},
	createTherapists(){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "select u.id from "+scheme+".users as u left join "+scheme+".therapists as t on u.id = t.user_id \
			where cast(FLOOR(roles/(select num from roles where name = $1)) as integer) % 2 <> 0 and t.id is null",
			params : ["therapist"]
		}).then((users)=>{
			var lines = [];
			if(!users.length) {
				return {success : true, msg : "no therapists to create"}
			}
			users.forEach(user=>{
				lines.push("("+["'"+dataUtils.getUID(32)+"'", "'"+user.id+"'"].join(", ")+")")
			});
			return STORAGE.get({
				query : "insert into "+scheme+".therapists (id, user_id) values "+lines.join(",")
			}).then(r=>{
				return {success : true, msg : lines.length+" therapists has been created"}
			});
		});
	},
	getUserData(params) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		var queryParams = [],
			where,
			fields = [],
			joins = [],
			joinedTables = [];
		if(params.id) {
			queryParams.push(params.id);
			where = 'u.id = $1';
		} else if(params.email) {
			queryParams.push(params.email);
			where = 'u.email = $1';
		};
		params.fields && params.fields.forEach(el=>{
			if(typeof el == 'string') {
				fields.push('u.'+dataUtils.cammelCaseToUnderscore(el))
			} else {typeof el == 'object'}
			Object.keys(el).forEach(key=>{
				if(key == 'roles' || key == 'permissions') {
					if (!~joinedTables.indexOf('roles')) {
						joins.push('left join '+scheme+'.roles as r on cast (FLOOR(u.roles/r.num) as integer) % 2 <> 0');
						joinedTables.push('roles');
					}
					if(key == 'permissions' && !~joinedTables.indexOf('permissions')) {
						joins.push('left join '+scheme+'.permissions as p on cast (FLOOR(r.permissions/p.num) as integer) % 2 <> 0');
						joinedTables.push('permissions');
					}
					el[key].forEach(el2=>{
						fields.push(key[0]+'.'+dataUtils.cammelCaseToUnderscore(el2)+' as '+key+"__"+el2);
					});
				}
			})
		});
		return STORAGE.get({
			query : "select "+fields.join(', ')+" from "+scheme+".users as u "+joins.join(' ')+" where "+where, 
			params : queryParams
		}).then(resp=>{
			var res = {},
				json = {};
			resp.forEach(el=>{
				let rows = {};
				Object.keys(el).forEach(el2=>{
					let el2Arr = el2.split("__");
					if(el2Arr.length >1){
						rows[el2Arr[0]] = rows[el2Arr[0]] || {};
						rows[el2Arr[0]][el2Arr[1]] = el[el2];
					} else {
						res[el2] = el[el2];
					}
				});
				Object.keys(rows).forEach(key=>{
					json[key] = json[key] || [];
					json[key].push(JSON.stringify(rows[key]));
				})
			});
			Object.keys(json).forEach(key=>{
				res[key] = json[key].filter((el, index, self)=>self.indexOf(el) === index).map(el=>JSON.parse(el));
			});
			return res;
		});
	},
	createUser(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var userID = data.id || dataUtils.getUID(32);
		var params = [userID, data.email, true, data.firstName, data.lastName];
		!data.role && params.push(0) || params.push(data.role);
		return STORAGE.get({
			query : "insert into "+scheme+".users (id, email, cognito_confirmed, first_name, last_name, roles) values ($1, $2, $3, $4, $5, "+( data.role ? " \
				(select num from "+scheme+".roles where name = $6) " :"$6")+")",
			params : params
		}).then(r=>{
			return {success : true, id:userID}
		})
	},
	createTherapyTest(data, transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		var UUID = dataUtils.getUID(32);
		return STORAGE.get({
			query : "insert into "+scheme+".tests (id, name, details, published) values ($1, $2, $3, $4)",
			params : [UUID, data.test.name, data.test.description, true]
		}, transaction).then(r=>{
			return {
				id : UUID,
				transactionID : r.transaction,
				success : true
			}
		});
	},
	editTherapyTest(data, transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		return STORAGE.get({
			query : `update ${scheme}.tests set name = $1 where id = $2`,
			params : [data.test.name, data.test.id]
		}, transaction).then(r=>{
			return {
				transactionID : r.transaction,
				success : true
			}
		});
	},
	createTherapyTestQuestions(data, transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		if(!data || !data.questions) {
			return {success : false, error: "noDataProvided"}
		}
		var values =[]
			params = [data.testID, 1],
			options = [];
		if(!data.questions.length) {
			return {success : true, details : "nothing_to_add", options : []}
		}
		data.questions.forEach((question, index)=>{
			var UUID = dataUtils.getUID(32),
				row = [];
			params.push(UUID);
			row.push("$"+params.length);
			params.push(question.text);
			row.push("$"+params.length);
			params.push(index);
			row.push("$"+params.length);
			values.push("($1, $2, "+row.join(", ")+")");
			options = options.concat(question.options.map(el=>{el.question = UUID; return el}));
		});
		return STORAGE.get({
			query : "insert into "+scheme+".test_questions (test, type, id, val, order_num) values "+values,
			params : params
		}, transaction).then(r=>{
			return {
				transactionID : r.transaction.id,
				options : options,
				success : true
			}
		});
	},
	editTherapyTestElements(data, transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var queries = [],
			queryMap = [],
			params = [data.locale];
		['questions', 'options', 'transcripts'].forEach(element=>{
			if(!data.obj[element] || !data.obj[element].length) {
				return;
			}
			let map = data.obj[element].map(q=>{
				var pair = [];
				params.push(q.id);
				pair.push(`$${params.length}`);
				params.push(q.text);
				pair.push(`$${params.length}`);
				return `(${pair.join(',')})`;
			});
			queryMap.push(`select s.key, v.new_val from (values ${map.join(", ")}) as v("id", new_val)
					left join ${scheme}.${{
						questions : "test_questions",
						options : "test_questions_options",
						transcripts : "test_transcripts"
					}[element]} as q on q.id = v.id
					left join test.local_strings as s on s.key = q.${element == "transcripts" ? "details" :"val"} and s.locale = $1`);
			if(element == 'options') {
				let map = data.obj[element].map(o=>{
					var pair = [];
					params.push(o.id);
					pair.push(`$${params.length}`);
					params.push(+o.points);
					pair.push(`cast ($${params.length} as integer)`);
					return `(${pair.join(',')})`;
				});
				queries.push(`update ${scheme}.test_questions_options as o set points = v.points
					from (values ${map.join(",")}) as v("id", "points") where o.id = v.id`);
			}
			if(element == 'transcripts') {
				let map = data.obj[element].map(t=>{
					var pair = [];
					params.push(t.id);
					pair.push(`$${params.length}`);
					let fromTo = t.frame.split("-");
					params.push(+fromTo[0]);
					pair.push(`$${params.length}`);
					params.push(+fromTo[1]);
					pair.push(`$${params.length}`);
					return `(${pair.join(',')})`;
				});
				queries.push(`update ${scheme}.test_transcripts as t 
					set "from"= cast (v.from as integer), "to"= cast (v.to as integer)
					from (values ${map.join(",")}) as v(id, "from", "to") where t.id = v.id`);
			}
		});
		if(!queryMap.length) {
			return {success : true, details : "nothingToUpdate"}
		}
		queries.push(`update ${scheme}.local_strings as ls set val = m.new_val from (${queryMap.join(" union ")}) as m 
			where ls.key = m.key and ls.locale = $1`);
		return STORAGE.get({
			query : queries,
			params : params
		}, transaction);
	},
	addTherapyTestElements(data, transaction) {
		return this.scope.$.call([
			{"storage_createTherapyTestQuestions>questionsResult" : [{questions : data.elements.questions, testID : data.test}, 
				transaction]},
			{"storage_createTherapyTestQuestionOptions" : [[data.elements.options, "_questionsResult.options"], transaction]},
			{"storage_createTherapyTestTranscripts" : [{transcripts : data.elements.transcripts, testID: data.test}, transaction]}
		]);
	},
	deleteTherapyTestElements(data, transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		var queries = [],
			params = [],
			subQuesries = [];
		if(data.questions && data.questions.length) {
			let where = [];
			data.questions.forEach(el=>{
				params.push(el);
				where.push(`$${params.length}`)
			})
			queries.push(`delete from ${scheme}.test_questions where id in (${where.join(',')})`);
			queries.push(`delete from ${scheme}.test_questions_options where question in (${where.join(', ')})`);
			subQuesries.push(`select val from ${scheme}.test_questions where id in (${where.join(',')})`);
			subQuesries.push(`select val from ${scheme}.test_questions_options where question in (${where.join(',')})`);
		}
		if(data.options && data.options.length) {
			let where = [];
			data.options.forEach(el=>{
				params.push(el);
				where.push(`$${params.length}`)
			})
			queries.push(`delete from ${scheme}.test_questions_options where id in (${where.join(', ')})`);
			subQuesries.push(`select val from ${scheme}.test_questions_options where id in (${where.join(',')})`);
		}
		if(data.transcripts && data.transcripts.length) {
			let where = [];
			data.transcripts.forEach(el=>{
				params.push(el);
				where.push(`$${params.length}`)
			});
			queries.push(`delete from ${scheme}.test_transcripts where id in (${where.join(', ')})`);
			subQuesries.push(`select val from ${scheme}.test_transcripts where id in (${where.join(',')})`);
		}
		if(!queries.length) {
			return {success : true}
		}
		queries.unshift(`delete from ${scheme}.local_strings where key in (${subQuesries.join(' union ')})`);
		return STORAGE.get({   //TODO: refactor storage methods naming
			query : queries,
			params : params 
		}, transaction);
	},
	createTherapyTestQuestionOptions(options, transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		if(!options) {
			return {success : false, error: "noDataProvided"}
		}
		options = dataUtils.concatSubArrays(options);
		var params = [],
			values = [];
		options.forEach((option, index)=>{
			let row = [];
			params.push(option.question);
			row.push("$"+params.length);
			params.push(dataUtils.getUID(32));
			row.push("$"+params.length);
			params.push(option.text);
			row.push("$"+params.length);
			params.push(+option.points);
			row.push("$"+params.length);
			params.push(index);
			row.push("$"+params.length);
			values.push("("+row.join(", ")+")");		
		});
		if(!values.length) {
			return {success : true, details : "nothingToUpdate"}
		}
		return STORAGE.get({
			query : "insert into "+scheme+".test_questions_options (question, id, val, points, order_num) values "+values.join(","),
			params : params
		}, transaction).then(r=>{
			return {
				transactionID : r.transaction,
				success : true
			}
		});
	},
	createTherapyTestTranscripts(data, transaction){
		var params = [data.testID],
			values = [];
		if(!data || !data.transcripts || !data.testID) {
			return {success : false, error: "noDataProvided"}
		}
		data.transcripts.forEach(transcript=>{
			var row = ["$1"];
			params.push(transcript.text);
			row.push("$"+params.length);
			var [from, to] = transcript.frame.split("-");
			params.push(from);
			row.push("$"+params.length);
			params.push(to);
			row.push("$"+params.length);
			params.push(dataUtils.getUID(32));
			row.push("$"+params.length);
			values.push("("+row.join(",")+")");
		});
		return STORAGE.get({
			query : "insert into "+scheme+".test_transcripts (test, details, \"from\", \"to\" , id) values "+values.join(","),
			params : params
		}, transaction).then(r=>{
			return {success : r.success}
		});
	},
	localize(data, transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var params = [data.locale, 1],
			values = [];
		function loop(obj){
			Object.keys(obj).forEach(key=>{
				if(typeof obj[key] == "object") return loop(obj[key]);
				if(~["text", "name", "description"].indexOf(key)) {
					let UUID = dataUtils.getUID(32),
						row = ["$1", "$2"];
					params.push(UUID);
					row.push("$"+params.length);
					params.push(obj[key]);
					row.push("$"+params.length);
					values.push("("+row.join(",")+")");
					obj[key] = UUID;					
				}
			})
			return obj;
		}
		obj = loop(data.obj);
		if(!values.length) {
			return {
				obj : obj,
				success : true
			}
		}
		return STORAGE.get({
			query : "insert into "+scheme+".local_strings (locale, entries, key, val) values "+values.join(","),
			params : params
		}, transaction).then(r=>{
			return {
				transactionID : r.transaction,
				obj : obj,
				success : true
			}
		});
	},
	getLocalizedTherapyTests(data){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		return STORAGE.get({
			query : "select t.id, lsn.val as name, lsd.val as details from "+scheme+".tests as t \
				left join "+scheme+".local_strings lsn on lsn.key = t.name and lsn.locale = $1 \
				left join "+scheme+".local_strings lsd on lsd.key = t.details and lsd.locale = $1",
			params : [data.locale]
		});
	},
	getTestDetails (data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		
		var params = [],
			joins = [],
			where,
			fields = ["t.id as testid", "t.name as testname", "tq.id as q_id", "tq.val as q_val", "too.id as o_id", "too.val as o_val"];
		if(data.prescription) {
			joins.push("left join "+scheme+".test_prescriptions as tp on tp.id=$1");
			where = "t.id = tp.test";
			params.push(data.prescription);
		} 
		else if(data.id) {
			params.push(data.id);
			where = "t.id = $1";
		}
		if(data.getTranscripts) {
			joins.push(`left join ${scheme}.test_transcripts as tt on tt.test = t.id`);
			fields.push("tt.id as tt_id");
			fields.push("tt.details as tt_val");
			fields.push("tt.from as tt_from");
			fields.push("tt.to as tt_to");
		}
		if(data.getPoints) {
			fields.push("too.points as points");
		}
		return STORAGE.get({
			query : "select "+fields.join(", ")+" \
				from "+scheme+".tests as t\
				"+joins.join(" ")+" \
				left join "+scheme+".test_questions as tq on tq.test = t.id \
				left join "+scheme+".test_questions_options as too on too.question = tq.id \
				where "+where+" order by tq.id, too.id, tq.order_num, too.order_num",
			params : params
		}).then(r=>{
			if (!r || !r.length) {
				return {success : false, error : "no_data_found"}
			}
			var result = {
					id : r[0].testid,
					name : r[0].testname,
					questions : [],
					transcripts :[]
				},
				processed = {
					transcripts : [],
					options : []
				};
			r.forEach(el=>{
				if(!result.questions.length || result.questions[result.questions.length-1].id != el.q_id) {
					result.questions.push({
						id : el.q_id,
						val : el.q_val,
						options : []
					});
				}
				if(!~processed.options.indexOf(el.o_id)) {
					result.questions[result.questions.length-1].options.push({
						id : el.o_id,
						val: el.o_val,
						points : el.points
					});
					processed.options.push(el.o_id);
				}
				if(!~processed.transcripts.indexOf(el.tt_val)) {
					result.transcripts.push({
						val: el.tt_val,
						id : el.tt_id,
						to : el.tt_to,
						from : el.tt_from
					});
					processed.transcripts.push(el.tt_val);
				}
			});
			return result;
		});
	},
	getLocalized(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		if(!data || !data.obj) {
			return {success : false, error: "no_data_provided"}
		}
		var where = [],
			params = data.locale && data.local == 'all' ? [] : [data.locale || this.scope.locale]
		function loop(obj){
			Object.keys(obj).forEach(key=>{
				if(obj[key] && typeof obj[key] == 'object') return loop(obj[key]);
				if(~["val", "name"].indexOf(key)) {
					params.push(obj[key]);
					where.push("$"+params.length);
				}
			});
		}
		loop(data.obj);
		return STORAGE.get({
			query : "select key, val from "+scheme+".local_strings where locale = $1 and key in ("+where.join(", ")+")",
			params : params
		}).then(r=>{
			if(!r || !r.length) {
				return {success : false, error : "no_data_found"}
			}
			var lacalizationMap = {};
			r.forEach(el=> {
				lacalizationMap[el.key] = el.val;
			});
			function loop(obj) {
				Object.keys(obj).forEach(key=>{
					if(obj[key] && typeof obj[key] == 'object') return loop(obj[key]);
					if(~["val", "name"].indexOf(key)) {
						obj[key] = lacalizationMap[obj[key]]
					}
				});
				return obj;
			}
			return loop(data.obj);
		});
	},
	getTestPrescriptions(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var where = [],
			params = [];
		Object.keys(data.where).forEach(key=>{
			where.push(key+(data.where[key] === null ? " is null" : " = "+" $"+(params.push(data.where[key]), params.length)));
		});
		where = where.join(" and ");
		return STORAGE.get({
			query : "select "+data.fields.join(",")+" from "+scheme+".test_prescriptions where "+where,
			params : params
		});
	},
	getMyClientCard(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		return STORAGE.get({
			query : "select c.id, c.name, tp.id as prescription_id, tp.test, tp.prescription_date, tp.result, tr.id as result_id, \
				tr.details as result_details, tr.test as result_test, tr.date as result_date \
				from "+scheme+".clients as c \
				left join "+scheme+".therapists as th on th.id = c.therapist \
				left join "+scheme+".users as u on th.user_id = u.id \
				left join "+scheme+".test_results as tr on tr.client = $2 \
				left join "+scheme+".test_prescriptions as tp on tp.client = c.id \
				where u.id = $1 and c.id=$2",
			params : [data.userID, data.clientID]
		}).then(r=>{
			if(!r || !r.length){
				return null;
			}
			var card = {
					id : r[0].id,
					name : r[0].name,
					prescriptions : [],
					results : []
				},
				processedPrescriptionIDs = [],
				processedResultIDs = [];
			r.forEach(el=>{
				if(el.prescription_id) {
					let index = processedPrescriptionIDs.indexOf(el.prescription_id);
					if(!~index) {
						card.prescriptions.push({
							id : el.prescription_id,
							date : el.prescription_date,
							testID : el.test,
							results : el.result ? [el.result] : []
						});
						processedPrescriptionIDs.push(el.prescription_id);
					}
					else {
						el.result && !~card.prescriptions[index].results.indexOf(el.result) && card.prescriptions[index].results.push(el.result);
					}
				}
				if(el.result_id) {
					if(!~processedResultIDs.indexOf(el.result_id)) {
						card.results.push({
							id : el.result_id,
							date : el.result_date,
							details : JSON.parse(el.result_details),
							testID : el.result_test
						});
						processedResultIDs.push(el.result_id);
					}
				}
			});
			return card;
		});
	}, 
	prescriptTest(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		return STORAGE.get({
			query : "insert into "+scheme+".test_prescriptions (id, client, test, prescription_date) values($1, $2, $3, now())",
			params : [dataUtils.getUID(32), data.clientID, data.testID]
		}).then(r=>{
			return {success : true}
		});
	},
	getPrescriptions(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var where = [],
			params = [];
		if(!data || !data.client || !data.client.userID) {
			return {success : false, error : "not_data_provided"}
		}
		else {
			params.push(data.client.userID);
			where .push("c.user_id = $"+params.length);
		}
		if(data.status == "notCompleted") {
			where.push("result is null");
		}
		return STORAGE.get({
			query : "select p.id, t.name, p.test, p.prescription_date, p.complete_date \
				from "+scheme+".test_prescriptions as p \
				left join "+scheme+".tests as t on t.id = p.test \
				left join "+scheme+".clients as c on c.id = p.client \
				where "+where.join(" and "),
			params : params
		});
	},
	saveTestResult(data, transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var resultID = dataUtils.getUID(32);
		return STORAGE.get({
			query : "insert into "+scheme+".test_results (id, client, test, details) values ($1, $2, $3, $4)",
			params : [resultID, data.clientID, data.testID, data.details]
		}, transaction).then(r=>{
			return {
				success : true,
				resultID : resultID,
				transaction : r.transaction
			}
		});
	},
	updatePrescription(data, transaction) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var params = [data.id],
			updates = [];
		Object.keys(data.fields).forEach(key=>{
			params.push(data.fields[key]);
			updates.push(dataUtils.cammelCaseToUnderscore(key) + "=$"+params.length);
		});
		return STORAGE.get({
			query : "update "+scheme+".test_prescriptions set "+updates.join(", ")+" where id=$1",
			params : params
		}, transaction)
	},
	isMyClient(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		return STORAGE.get({
			query : "select c.id from "+scheme+".clients as c \
				left join "+scheme+".therapists as t on t.id = c.therapist \
				left join "+scheme+".users as u on u.id = t.user_id where u.id = $1 and c.id =$2",
			params : [data.userID, data.clientID]
		}).then(r=>{
			return !!r.length;
		});
	},
	getTestResult(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		if(!data || !data.id) {
			return {success: false, error: "no_data_provided"}
		}
		var fields = data.fields || ["id", "details"];
		return STORAGE.get({
			query : "select "+fields.join(", ")+" from "+scheme+".test_results where id = $1",
			params : [data.id]
		}).then(r=>r ? r[0] : {});
	},
	localizeTestResult(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		if(!data || !data.result) {
			return {success: false, error: "no_data_provided"}
		}
		typeof data.result == "string" && (data.result = JSON.parse(data.result));
		var params = [data.locale || this.scope.locale],
			start = params.length;
		params = params.concat(Object.keys(data.result));
		var qIDs = Array(params.length-start).join(",").split(",").map((el, index)=>"$"+(1+index+start));
		start = params.length;
		params = params.concat(Object.values(data.result));
		var oIDs = Array(params.length-start).join(",").split(",").map((el, index)=>"$"+(1+index+start));
		return STORAGE.get({
			query : "select id, order_num, l.val, '@question' as question from "+scheme+".test_questions as q \
				left join "+scheme+".local_strings as l on l.key = q.val and locale = $1 \
				where q.id in ("+qIDs.join(",")+") \
				UNION \
				select id, order_num, l.val, question from "+scheme+".test_questions_options as o \
				left join "+scheme+".local_strings as l on l.key = o.val and locale = $1 \
				where o.id in ("+oIDs.join(",")+") order by question desc, order_num",
			params : params
		}).then(r=>{
			var result = [],
				questionIDs = [];
			r && r.forEach(el=>{
				if(el.question == "@question"){
					result.push({
						id : el.id,
						val : el.val
					});
					questionIDs.push(el.id);
					return;
				}
				result[questionIDs.indexOf(el.question)].answer = {
					id : el.id,
					val : el.val
				}
			});
			return result;
		});
	},
	getTestTranscriptByAnswers(data){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		if(!data || !data.answers) {
			return {success : false, error : "not_data_provided"}
		}
		var params = data.answers,
			IDs = Array(params.length).join(",").split(",").map((el, index)=>"$"+(1+index)),
			where = ["tt.from <= qo.s", "tt.to >= qo.s"];
		if(data.localize === true) {
			params.push(data.locale || this.scope.locale);
			where.push("ls.locale = $"+params.length);
		}
		if(data.testID) {
			params.push(data.testID);
			where.push("tt.test = $"+params.length)
		}
		return STORAGE.get({
			query : "select "+(data.localize === true ? "ls.val" : "tt.details")+" from test.test_transcripts as tt\
			left join (select sum(o.points) as s from test.test_questions_options as o where id in ("+IDs.join(", ")+")) as qo on qo.s>-1\
			"+(data.localize === true ? "left join "+scheme+".local_strings as ls on ls.key=tt.details" : "")+"\
			where "+where.join(" and "),
			params : params
		}).then(r=>r && r[0])
	},
	getUnassignedClients() {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		return STORAGE.get({
			query : `select id, name, phone from ${scheme}.clients where therapist is null`
		})
	},
	assignClientsToTherapists(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		var map = [], 
			params = [];
		Object.keys(data).forEach(key=>{
			params.push(data[key]);
			params.push(key);
			map.push("($"+(params.length-1)+", $"+params.length+")")
		})
		return STORAGE.get({
			query : `update ${scheme}.clients as c set therapist = v.therapist from (values ${map.join(",")}) as v(therapist, id) where c.id = v.id`,
			params : params
		}).then(r=>{
			return {success : true}
		});
	},
	deleteTest(data) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		STORAGE.get({
			query : [
				`delete from ${scheme}.local_strings where key in 
					(select details as val from ${scheme}.test_transcripts where test = $1 union
					select name as val from ${scheme}.tests where id = $1 union
					select val from ${scheme}.test_questions where test = $1 union
					select val from ${scheme}.test_questions_options where question in 
					(select id from ${scheme}.test_questions where test = $1))`,
				`delete from ${scheme}.test_questions_options where question in 
					(select id from ${scheme}.test_questions where test = $1)`,
				`delete from ${scheme}.test_questions where test = $1`,
				`delete from ${scheme}.test_transcripts where test = $1`,
				`delete from ${scheme}.tests where id = $1`
				],
			params : [data.id]
		}).then(r=>{
			return {success : true}
		})
	},
	getAllLocales() {
		return  STORAGE.get({
			query : `select id, name, parent, "default" from ${scheme}.locals`,
			params : []
		});
	},
	commitTransaction(data) {
		return STORAGE.get({
			query : " ",
			params : []
		}, {id : data.id, commit : true})
	},
	beginTransaction(){
		return STORAGE.get({
			query : " ",
			params : []
		}, {id : -1}).then(r=>{
			return {transactionID : r.transaction}
		});
	}
}