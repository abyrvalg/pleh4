const STORAGE = require(APP_ROOT+'/core/storage');
const LOGGER  = require(APP_ROOT+'/core/logger');
const dateUtils = require(APP_ROOT+"/modules/app")("utils", "date");
const urlUtils = require(APP_ROOT+"/modules/app")("utils", "url");
const Session = require(APP_ROOT+"/modules/app")('session');

function getUID(length) {
	var text = "",
		possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (var i = 0; i < length; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}
module.exports = {
    update(query){
        return STORAGE.get({
            query : "update public.appointments set status = $2 where id = $1",
            params : [query.id, query.status]
        }).then(r=>{
            return {status : r.updatedRows ? "ok" : "error"}
        });
    },
	submit(query){
        var date = new Date(query.date);
        LOGGER.debug("submit appointment. Date:");
        LOGGER.debug(date);
        if (isNaN(date.getTime())){
            return {
                success: false,
                error: "invalide_date"
            }
        }
        return STORAGE.get({
            query : "select s.schedule, ap.id as appointment_id from public.schedules as s \
                left join public.appointments as ap on ap.therapist=$1 and ap.date = $3 and ap.time = $4\
                where s.therapist=$1 and s.month=$2", 
            params : [query.therapist, dateUtils.getYearMonth(date), date, query.time]
        }).then(res=>{
            res = res && res[0];
            if(res.appointment_id){
                return {
                    success : false,
                    error : "another_appointment_exist"
                }
            }
            if(!res.schedule){
                return{
                    success : false,
                    error : "no_schedule_defined"
                }
            }
            if(!dateUtils.isSlotAvailable(BigInt(res.schedule), date, +query.time)){
                return{
                    success : false,
                    error : "slot_is_not_available"
                } 
            }
            var appointmentID = getUID(32);
            return STORAGE.get({
                query : "insert into public.appointments (id, name, phone, therapist, date, time, status, how_to_call, create_date)\
                    values ($1, $2, $3, $4, $5, $6, $7, $8, now())",
                params : [appointmentID, query.name, query.phone, query.therapist, date, +query.time, 0, +query.howToCall]
            }).then(res=>{
                if(!res){
                    return {success : false, error : "internal"};
                }
                return Session.get(this.scope.SID).getVar("liteql").call([
                    {"storage_therapist>therapist":[query.therapist]},
                    {"base_msg>msg" : ["mail", ["\\w*"]]},
                    {"base_template>body" : ["mails/newAppointment", {
                        "name" : query.name, 
                        "phone" : query.phone,
                        "date" : dateUtils.dateToString(date),
                        "time" : dateUtils.timeToString(+query.time),
                        "howToCall" : ["viber", "telegram", "whatsUp", "Звонок"][+query.howToCall],
                        "appoinmentListLink" : urlUtils.getFullUrl("appointment/list?therapist="+query.therapist)
                    }]}
                ]).then(mailData=>{
                    return require(APP_ROOT+"/modules/app")("utils", "email").send({
                        to : mailData.therapist.email,
                        body : mailData.body,
                        subject : mailData.msg.appointmentNewSubject
                    }).then(info=>{
                        LOGGER.debug("Email is sent. Details: "+JSON.stringify(info));
                        return {success: true};
                    });
                });                       
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