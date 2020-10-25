const STORAGE = require(APP_ROOT+"/modules/app")('storage');
module.exports = {
	index(query){
		return STORAGE.get(query);
	},
	therapists(params){
		var queryParams = []; 
		if(params.id){
			queryParams.push(params.id);
			return STORAGE.get({query : "select * from public.therapists where id=$1", params : queryParams});
		}		
	},
	schedules(params){
		var queryParams = []; 
		if(params.id){
			queryParams.push(params.id);
			var months = [];
			for (let i in params.months){				
				queryParams.push(params.months[i]);	
				months.push("$"+queryParams.length);			
			}
			return STORAGE.get({
				query : "select t.id, t.first_name, t.last_name, s.month, s.schedule from public.therapists as t left \
				join public.schedules as s on t.id = s.therapist and s.month in ("+months.join(",")+") where t.id = $1",
				params: queryParams
			}).then(r=>{
				var therapists = {};
				for (let i in r) {
					therapists[r[i].id] = therapists[r[i].id]  || {
						id : r[i].id,
						first_name : r[i].first_name,
						last_name : r[i].last_name,
						schedules : []
					};
					r[i].schedule && therapists[r[i].id].schedules.push({
						month : r[i].month,
						schedule : r[i].schedule
					});
				}
				return therapists;
			})
		}
	}
}