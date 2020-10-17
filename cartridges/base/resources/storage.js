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
	}
}