const STORAGE = require(APP_ROOT+"/modules/app")('storage');
const dateUtils = require(APP_ROOT+"/modules/app")("utils", "date");
const dataUtils = require(APP_ROOT+"/modules/app")("utils", "data");
const scheme = process.env.dbscheme;

function getTherapists(params){
	var queryParams = []; 
	if(params.id){
		queryParams.push(params.id);
		return STORAGE.get({query : "select * from "+scheme+".users where id=$1", params : queryParams});
	}
	if(params.tg_id){
		queryParams.push(params.tg_id);
		return STORAGE.get({query : "select * from "+scheme+".users where tg_id=$1", params : queryParams});
	}
}
module.exports = {
	therapists(params) {
		if(!this.scope.session.ensure("auth")){
			return {success: false, error: "not_available"}
		}
		return getTherapists(params);
	},
	therapist(params) {
		/*if(!this.scope.session.ensure("auth")){
			return {success: false, error: "not_available"}
		}*/
		var profile = this.scope.session.getVar("currentProfile");
		return getTherapists({id:profile ? profile.id : params}).then(r=>r[0]);
	},
	therapistByTgID(tg_id) {
		return getTherapists({tg_id:tg_id}).then(r=>r[0]);
	},
	appointment(id){
		return STORAGE.get({
			query : "select * from "+scheme+".appointments where id=$1",
			params : [id]
		}).then(r=>r[0]);
	},
	appointmentAndSchedule(arg){
		return STORAGE.get({
            query : "select s.schedule, ap.id as appointment_id from "+scheme+".schedules as s \
                left join "+scheme+".appointments as ap on ap.therapist=$1 and ap.date = $3 and ap.time = $4 and (ap.status > 0 or (ap.status = 0 and ap.create_date < now() + interval '6 hours'))\
                where s.therapist=$1 and s.month=$2", 
            params : [arg.therapistID, dateUtils.getYearMonth(new Date(arg.date)), arg.date, arg.time]
        }).then(res=>res && res[0]);
	},
	addAppointment(arg){
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
	updateAppointment(query){
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
        }).then(r=>{
            return {status : r.updatedRows ? "ok" : "error"}
        });
	},
	getUsersByRoles(roles, andOr){
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
		var where = query.map((val, index)=>"$"+(index+1))
		return STORAGE.get({
			query : "select a.name, a.phone, a.date, a.time, u.tg_id from "+scheme+".appointments as a\
				left join "+scheme+".users as u on u.id = a.therapist where a.id in ("+where.join(",")+")",
			params: query
		});
	}
}