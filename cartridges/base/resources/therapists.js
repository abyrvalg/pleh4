const STORAGE = require(APP_ROOT+'/core/storage');
module.exports = {
	index(query){
		return STORAGE.get({
            query : "SELECT * from public.therapists"
        });
	},
	setSchedules(query){
		var months = {},
			params = [query.therapist],
			monthsQuery = [],
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
		})
	} 
}