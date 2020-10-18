module.exports = {
	setSchedule : (scope)=>{
		return require(APP_ROOT+"/modules/app")("model").get("Therapist", scope.req.query.id, scope.session).then(therapist=>{
			var data = {
					thereapist : therapist.obj
				},
				now = new Date(),
				months = [],
				monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
			for (let i = 1; i <= 3; i++){
				let currentMonth = now.getMonth(),
					days = [];
				for(let j = 1; j<=31; j++){		
					let hours = [];
					for(let k = 0; k < 24; k++){
						hours.push({
							hour : k,
							fromTo : k + " - "+(k+1),
							work : true
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
					therapist : therapist.obj,
					months : months
				}]
			});
		});
	}
}