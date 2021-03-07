const STORAGE = require(APP_ROOT+'/core/storage');
const Session = require(APP_ROOT+'/core/session');
module.exports = {
	setSchedules(query){
		var profile = this.scope.session.getVar("currentProfile"),
			therapistID = (profile && profile.id) || query.therapist,
			params = [query.therapist],
			monthsQuery = [],    //TODO: use therapist model for this
			setVals = [];
		if(!therapistID) {
			return {success: false, error : "therapist_id_is_missing"}
		}
		for(let key in query.months){
			let monthSchedule = 0n,
				monthYear = key.split("|");
			monthYear = +(monthYear[1].substr(2, 2)+(monthYear[0].length == 1 ? "0": "")+monthYear[0])
			params.push(monthYear);
			monthsQuery.push("$"+ params.length);			
			setVals.push({
				condition : {
					month : monthYear,
					therapist : therapistID
				},
				values : [therapistID, monthYear, query.months[key]]
			});
		}
		return STORAGE.upsert({
			table : "schedules",
			fieldsToSet : ["therapist", "month", "schedule"],
			where : "therapist = $1 and month in ("+monthsQuery.join(",")+")",
			fields : ["therapist", "month"],
			setVals : setVals,
			params : params
		}).then(r=>{		
			return {
				success : true
			}
		})
	},
	getSchedules(query){
		var profile = this.scope.session.getVar("currentProfile"),
			therapistID = (profile && profile.id) || query.therapist;
		return require(APP_ROOT+"/modules/app")("model").get("Therapist").then(Therapist=>{
			return Therapist.get({
				id : therapistID,
				schedule : {
					months : "now-"
				},
				getAppointments : !!query.substractAppointments
			}, this.scope.session.getVar("liteql")).then(therapist=>{
				if(query.substractAppointments){
					therapist.substractAppointmentsFromSchedule();
				}
				return {
					name : therapist.obj.name,
					id : therapist.obj.id,
					months : therapist.obj.schedules			
				}
			});
		});
	},
	list(query){
		if(!query) {
			return require(APP_ROOT+"/modules/app")("model").get("Therapist").list()
		}
	}
}