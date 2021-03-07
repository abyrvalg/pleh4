const STORAGE = require(APP_ROOT+"/modules/app")('storage');
const dateUtils = require(APP_ROOT+"/modules/app")("utils", "date");
const dataUtils = require(APP_ROOT+"/modules/app")("utils", "data");
const Session = require(APP_ROOT+'/core/session');

function getTherapist(params){
	var queryParams = []; 
	if(params.id){
		queryParams.push(params.id);
		return STORAGE.get({query : "select * from public.users where id=$1", params : queryParams});
	}
	if(params.tg_id){
		queryParams.push(params.tg_id);
		return STORAGE.get({query : "select * from public.users where tg_id=$1", params : queryParams});
	}
}
module.exports = {
	therapists(params) {
		if(!this.scope.session.ensure("auth")){
			return {success: false, error: "not_available"}
		}
		return getTherapist(params);
	},
	therapist(id) {
		return getTherapist({id:id}).then(r=>r[0]);
	},
	therapistByTgID(tg_id) {
		return getTherapist({tg_id:tg_id}).then(r=>r[0]);
	},
	appointment(id){
		return STORAGE.get({
			query : "select * from public.appointments where id=$1",
			params : [id]
		}).then(r=>r[0]);
	},
	appointmentAndSchedule(arg){
		return STORAGE.get({
            query : "select s.schedule, ap.id as appointment_id from public.schedules as s \
                left join public.appointments as ap on ap.therapist=$1 and ap.date = $3 and ap.time = $4 and (ap.status > 0 or (ap.status = 0 and ap.create_date < now() + interval '6 hours'))\
                where s.therapist=$1 and s.month=$2", 
            params : [arg.therapistID, dateUtils.getYearMonth(new Date(arg.date)), arg.date, arg.time]
        }).then(res=>res && res[0]);
	},
	addAppointment(arg){
		var appointmentID = dataUtils.getUID(32);
		return STORAGE.get({
			query : "insert into public.appointments (id, name, phone, therapist, date, time, status, how_to_call, create_date)\
                    values ($1, $2, $3, $4, $5, $6, $7, $8, now())",
            params : [appointmentID, arg.name, arg.phone, arg.therapistID, arg.date, +arg.time, 0, +arg.howToCall]
		});
	},
	appointments(){
		if(!this.scope.session.ensure("auth")){
			return {success: false, error: "not_available"}
		}
		therapistID = this.scope.session.getVar("currentProfile").id;
		if(!therapistID){
			return {success : false, error : "therapist_id_is_missing"}
		}
		return STORAGE.get({
			query : "select * from public.appointments where therapist=$1 and date > now() order by date, time",
			params : [therapistID]
		}).then(res=>res.map(ap=>{
			return {
				"id" : ap.id,
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
	schedules(params){
		var queryParams = [],
			profile = this.scope.session.getVar("currentProfile");
		if(params.id){
			queryParams.push(params.id);
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
					join : "left join public.appointments as a on a.therapist = t.id and (a.status > 0 or (a.status = 0 and a.create_date < now() + interval '6 hours')) and ("+dateMonthQuery.join(" or ")+")"
				} //TODO configure interval value
			}
			let sqlQuery = {
				query : "select "+(appointmentsQuery ? appointmentsQuery.fields+", " : "")+" t.id, t.first_name, t.last_name, s.month, s.schedule from public.users as t\
				left join public.schedules as s on t.id = s.therapist and s.month in ("+months.join(",")+")\
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
            query : "update public.appointments set "+setFields.join(",")+" where id = $1 and therapist = $2",
            params : params
        }).then(r=>{
            return {status : r.updatedRows ? "ok" : "error"}
        });
	}
}