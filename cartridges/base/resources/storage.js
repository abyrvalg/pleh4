const STORAGE = require('app')('storage');
module.exports = {
	index(query){
		return STORAGE.get(query);
	}
}