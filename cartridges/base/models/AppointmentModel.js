
class AppiontmentModel {
	constructor(obj) {
		this.obj = obj;
	}
	static get(arg, session) {
		var $ = session.getVar("liteql");
		if(typeof arg == "object" && arg) {

		}
		else {
			var dataProm = $.call({
				"!storage_therapists": [{id : arg}]
			});
		}		
		return dataProm.then((obj)=>{
			if(!obj) {
				return;
			}
			return new AppiontmentModel(Array.isArray(obj) ? obj[0] : obj[arg.id || arg]);
		});
	}
}

module.exports = TherapistModel;