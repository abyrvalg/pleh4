
const LOGGER  = require(APP_ROOT+'/core/logger');
const dateUtils = require(APP_ROOT+"/modules/app")("utils", "date");
class AppiontmentModel {
	constructor(obj) {
		this.obj = obj;
	}
	static get(arg, $) {
		if(typeof arg == "object" && arg) {

		}
		else {

		}		
		return dataProm.then((obj)=>{
			if(!obj) {
				return;
			}
			return new AppiontmentModel(Array.isArray(obj) ? obj[0] : obj[arg.id || arg]);
		});
	}
	static submit(arg, $){
		return $.call({"!storage_appointmentAndSchedule":[{
			therapistID: arg.therapistID, 
			date: arg.date,
			time: arg.time
		}]}).then(res=>{
            if(res && res.appointment_id){
                return {
                    success : false,
                    error : "another_appointment_exist"
                }
            }
            if(!res || !res.schedule){
                return{
                    success : false,
                    error : "no_schedule_defined"
                }
            }
            if(!dateUtils.isSlotAvailable(BigInt(res.schedule), arg.date, +arg.time)){
                if(!arg.byTherapist){
                    return{
                        success : false,
                        error : "slot_is_not_available"
                    }
                }
            }           
            return $.call({
                "!storage_addAppointment": [{
					name : arg.name, 
					phone: arg.phone, 
					therapistID: arg.therapistID, 
					date: arg.date, 
					time: arg.time,
					howToCall: arg.howToCall
				}]
            }).then(res=>{
                if(!res){
                    return {success : false, error : "internal"};
                }
                return {success: true}                    
            });
        }).catch(err=>{
            LOGGER.error(err);
            return {
                success: false,
                error : "internal"
            }
        });
	}
}

module.exports = AppiontmentModel;