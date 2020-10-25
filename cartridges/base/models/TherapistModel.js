class TherapistModel {
	constructor(obj){
		this.obj = {
			name : obj.first_name + " " +obj.last_name,
			email : obj.email,
			price : obj.price
		};
	}
	getSchedule(month){
		if(!month || !this.obj.schedules) {
			return null
		}
		for(let i in this.obj.schedules){
			if(this.obj.schedules[i].month == month){
				return this.obj.schedules[i];
			}
		}
		return null;
	}
	static createDefaultSchedule(yearMonth){
		var monthStr = ""+yearMonth,
			date = new Date(),
			schedule = 0,
			i = 0;

		date.setFullYear(+("20"+monthStr.substr(0,2)));
		date.setMonth(+(monthStr.substr(2,2))-1);
		date.setDate(1);
		date.setHours(0);
		var month = date.getMonth();
		while(month == date.getMonth()){
			if(!~[0, 6].indexOf(date.getDay()) && date.getHours() > 9 && date.getHours() < 18){
				schedule += Math.pow(2, i);
			}
			i++;
			date.setHours(date.getHours()+1);
		}
		return schedule;
	}
	static get(arg, session){
		var $ = session.getVar("liteql");
		if(typeof arg == "object") {
			var dataProm  = $.call({"!storage_schedules":[{
				"id":arg.id,
				"months":arg.schedule.months
			}]});
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
			return new TherapistModel(Array.isArray(obj) ? obj[0] : obj[arg.id || arg]);
		});

	}
}

module.exports = TherapistModel;