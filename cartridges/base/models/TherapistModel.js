const MONTH_FORWARD_TO_SET = 3;
const dateUtils = require(APP_ROOT+"/modules/app")("utils", "date");
const MONTH_BACKWARD_TO_SET = 3;

class TherapistModel {
	constructor(obj){
		this.obj = obj;
		this.obj.name = obj.first_name+ " "+obj.last_name;		
	}
	substractAppointmentsFromSchedule(){
		if(this.obj.appointments && this.obj.appointments.length) {
			var that = this;
			that.obj.appointments.forEach(appointment=>{
				let yearMonth = dateUtils.getYearMonth(appointment.date);		
				that.obj.schedules = that.obj.schedules.map(schedule=>{
					if(schedule.month == yearMonth && dateUtils.isSlotAvailable(BigInt(schedule.schedule), appointment.date, appointment.time)) {
						schedule.schedule = dateUtils.substractDateTimeFromSchedule(BigInt(schedule.schedule), appointment.date, appointment.time).toString();
					}
					return schedule;					;
				});					
			});
		}
	}
	getAppointmentByNum(num){		
		if(!this.obj.appointments || !this.obj.appointmentNums || !~this.obj.appointmentNums.indexOf(num)) return null;
		for(let i in this.obj.appointments)
			if(this.obj.appointments[i].num == num) 
				return this.obj.appointments[i];		
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
		if(typeof arg == "object" && arg.schedule) {
			let months = [];
			if(~arg.schedule.months.indexOf("-")){
				var monthFrame = arg.schedule.months.split("-");
				monthFrame = monthFrame.map(month=>{
					if(!month){
						let date = new Date();
						date.setMonth(date.getMonth() + MONTH_FORWARD_TO_SET);
						return date;
					}
					if(month == "now"){
						return new Date();
					}
				});
				var date = monthFrame[0];
				date.setDate(1)
				while(date < monthFrame[1]){
					months.push(dateUtils.getYearMonth(date))
					date.setMonth(date.getMonth() + 1);
				}		
			}
			else {
				months = arg.schedule.months;
			}			
			var dataProm  = $.call({"!storage_schedules":[{
				"id":arg.id,
				"months":months,
				"getAppointments" : arg.getAppointments
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
			(obj.schedules)
			return new TherapistModel(Array.isArray(obj) ? obj[0] : obj[arg.id || arg]);
		});
	}
}
module.exports = TherapistModel;