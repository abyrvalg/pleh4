class TherapistModel {
	constructor(obj){
		this.obj = {
			name : obj.first_name + " " +obj.last_name,
			email : obj.email,
			price : obj.price
		};
	}
	static get(arg, session){
		var $ = session.getVar("liteql");
	return $.call({
		"!storage_therapists": [{id : arg}]
	}).then((obj)=>{
			if(!obj) {
				return;
			}
			return new TherapistModel(obj[0])
		});

	}
}

module.exports = TherapistModel;