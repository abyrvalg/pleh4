const STORAGE = require(APP_ROOT+'/core/storage');
module.exports = {
	index(query){
		return STORAGE.get({
            query : "SELECT * from public.therapists"
        });
	}
}