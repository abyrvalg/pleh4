const { compile } = require("handlebars");

class TherapistModel {
	constructor(obj){
		this.obj = obj;
		this.obj.name = obj.first_name+ " "+obj.last_name;
	}
	getSchedule(month){
		if(!month || !this.obj.schedules) {
			return null
		}
		for(let i in this.obj.schedules){
			if(this.obj.schedules[i].month == month){
				return BigInt(this.obj.schedules[i].schedule);
			}
		}
		return null;
	}
	static createDefaultSchedule(yearMonth){
		var monthStr = ""+(yearMonth+1),
			date = new Date("20"+monthStr.substr(0,2)+"-"+monthStr.substr(2,2)+"-01T00:00"),
			schedule = BigInt(0),
			i = 0;
		var month = date.getMonth();
		while(month == date.getMonth()){
			if(!~[0, 6].indexOf(date.getDay()) && date.getHours() >= 9 && date.getHours() < 18){
				schedule = schedule + BigInt(Math.pow(2, i));
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