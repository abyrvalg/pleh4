const MONTH_FORWARD_TO_SET = 3;
const getYearMonth = date=>(+((date.getYear() - 100)+(date.getMonth() < 9 ? "0" : "")+(date.getMonth())))

module.exports = {
	setSchedule : (scope)=>{
		var now = new Date(),
			monthsToGet = [];
		for (let i = 0; i < MONTH_FORWARD_TO_SET; i++){			
			monthsToGet.push(getYearMonth(now));
			now.setMonth(now.getMonth() + 1);
		}
		return require(APP_ROOT+"/modules/app")("model").get("Therapist").then(Therapist=>{
			return Therapist.get({
				id : scope.req.query.id,
				schedule : {
					months : monthsToGet
				}
			}, scope.session).then(therapist=>{
				var data = {
						thereapist : therapist.obj
					},
					now = new Date(),
					months = [],
					monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
				for (let i = 1; i <= MONTH_FORWARD_TO_SET; i++){
					let currentMonth = now.getMonth(),
						days = []
						currentMonthSchedule = therapist.getSchedule(getYearMonth(now)) || Therapist.createDefaultSchedule(getYearMonth(now));
					for(let j = i == 1 ? now.getDate()-1 : 0; j<=31; j++){		
						let hours = [];
						for(let k = 0; k < 24; k++){	
							let counter = j*24+k;				
							hours.push({
								hour : k,
								fromTo : k + " - "+(k+1),
								work : !!(currentMonthSchedule/BigInt(Math.pow(2, counter)) % 2n),
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
				return scope.session.getVar("liteql").call({
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