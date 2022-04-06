const MONTH_FORWARD_TO_SET = 3;
const dateUtils = require(APP_ROOT+"/modules/app")("utils", "date");

module.exports = {
	setSchedule : (scope)=>{
		return require(APP_ROOT+"/modules/app")("model").get("Therapist").then(Therapist=>{
			return Therapist.get({
				schedule : {
					months : "now-"
				},
				getAppointments : true
			}, scope.$).then(therapist=>{
				if(!therapist){
					return Promise.resolve({
						status : 'redirect', 
						path : "/user/login"
					});
				}
				var now = new Date(),
					months = [],
					monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
				for (let i = 1; i <= MONTH_FORWARD_TO_SET; i++){
					let currentMonth = now.getMonth(),
						days = [],
						currentMonthSchedule = therapist.getSchedule(dateUtils.getYearMonth(now)) || Therapist.createDefaultSchedule(dateUtils.getYearMonth(now));
					for(let j = i == 1 ? now.getDate()-1 : 0; j<=31; j++){		
						let hours = [];
						for(let k = 0; k < 24; k++){
							let counter = j*24+k,
								appointment = therapist.getAppointmentByNum(dateUtils.getYearMonth(now), counter);
							hours.push({
								hour : k,
								fromTo : k + " - "+(k+1),
								work : !!(currentMonthSchedule/BigInt(Math.pow(2, counter)) % 2n),
								appointment : appointment,
								num : counter
							});
						}
						days.push({
							date : now.getDate(),
							day : now.getDay(),
							hours : hours
						});
						now.setDate(now.getDate()+1);
						if(now.getMonth() != currentMonth) break;
	
					}
					now.setMonth(now.getMonth()-1);	
					months.push({
						MY : now.getMonth()+"|"+now.getFullYear(),
						M : monthNames[now.getMonth()],
						days : days
					});
					now.setMonth(now.getMonth()+1);
	
				}
				return scope.$.call({
					"!base_template" : ["setSchedule", {
						therapist : {
							name : therapist.obj.name,
							id : therapist.obj.id,
						},
						months : months
					}]
				});
			});
		});
	}
}