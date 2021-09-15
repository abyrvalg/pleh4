const STORAGE = require(APP_ROOT+"/modules/app")('storage');
const dateUtils = require(APP_ROOT+"/modules/app")("utils", "date");
const dataUtils = require(APP_ROOT+"/modules/app")("utils", "data");
const scheme = process.env.dbscheme;

function getTherapists(params){
	var queryParams = []; 
	if(params.id){
		queryParams.push(params.id);
		return STORAGE.get({query : "select u.id, first_name, last_name, rate, tg_id, rate, share from "+scheme+".users as u \
			left join "+scheme+".therapists on t.user_id = u.id where u.id=$1", params : queryParams});
	}
	if(params.tg_id){
		queryParams.push(params.tg_id);
		return STORAGE.get({query : "select u.id, first_name, last_name, rate, tg_id, rate, share from "+scheme+".users as u \
			left join "+scheme+".therapists on t.user_id = u.id where tg_id=$1", params : queryParams});
	}
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
		var profile = this.scope.session.getVar("currentProfile");
		return getTherapists({id:profile ? profile.id : params}).then(r=>r[0]);
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
			}).catch(err=>{
				console.log(err);
			})
		}
	},
	updateAppointment(query, transaction){
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		}
		if(!this.scope.session.ensure("auth")){
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
			query : "insert into "+scheme+".sessions (id, appointment_id, price_amount, status, date) select (select $1), a.id, price, $2, date from "+scheme+".appointments as a left join "+scheme+".users as u on u.id = a.therapist where a.id = $3",
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
				where cast(FLOOR(roles/(select num from roles where "+where.join(" "+(andOr || "OR")+" ")+")) as integer) % 2 <> 0",
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
		if(params.clientID){
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
		}
		return STORAGE.get({
			query : "select "+params.fields.join(", ")+" from "+scheme+".payment_accounts where "+where,
			params : queryParams
		});
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
	getClient(params) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "select "+params.fields.join(",")+" from "+scheme+".clients where id = $1 and status = $2",
			params : [params.id, 1]
		}).then(r=>r && r[0]);
	},
	addClient(params) {
		if(!this.scope.isServer){
			return {success: false, error: "not_available"}
		} 
		return STORAGE.get({
			query : "insert into "+scheme+".clients (id, name, phone, rate, therapist, status, therapist_share, create_date) values ($1, $2, $3, $4, \
				(select id from "+scheme+".therapists where user_id = $5), $6, $7, now())",
			params : [dataUtils.getUID(32, {lowercase:true}), params.name, params.phone, params.rate, params.userID, 1, params.share]
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
	}
}