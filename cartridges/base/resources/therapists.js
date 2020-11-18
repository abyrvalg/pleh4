const STORAGE = require(APP_ROOT+'/core/storage');
const Session = require(APP_ROOT+'/core/session')
module.exports = {
	setSchedules(query){
		var months = {},
			params = [query.therapist],
			monthsQuery = [],    //TODO: use therapist model for this
			setVals = [];
		for(let key in query.months){
			let monthSchedule = 0n,
				monthYear = key.split("|");
			monthYear = +(monthYear[1].substr(2, 2)+(monthYear[0].length == 1 ? "0": "")+monthYear[0])
			params.push(monthYear);
			monthsQuery.push("$"+ params.length);			
			setVals.push({
				condition : {
					month : monthYear,
					therapist : query.therapist
				},
				values : [query.therapist, monthYear, query.months[key]]
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
		return require(APP_ROOT+"/modules/app")("model").get("Therapist").then(Therapist=>{
			return Therapist.get({
				id : query.therapist,
				schedule : {
					months : "now-"
				}
			}, Session.get(this.scope['SID'])).then(therapist=>{
				return {
					name : therapist.obj.name,
					id : therapist.obj.id,
					months : therapist.obj.schedules			
				}
			});
		});
	}
}