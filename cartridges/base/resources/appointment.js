const STORAGE = require(APP_ROOT+'/core/storage');
const LOGGER  = require(APP_ROOT+'/core/logger');
const dateUtils = require(APP_ROOT+"/modules/app")("utils", "date");
const dataUtils = require(APP_ROOT+"/modules/app")("utils", "data");
const urlUtils = require(APP_ROOT+"/modules/app")("utils", "url");
const Session = require(APP_ROOT+"/modules/app")('session');

module.exports = {
	submit(query){
        var date = new Date(query.date),
            session = Session.get(this.scope['SID'])
            profile = session.getVar("currentProfile"),
            therapistID = (profile && profile.id) || query.therapist;
        if(!therapistID) {
            return {success: false, error : "therapist_id_is_missing"}
        }
        LOGGER.debug("submit appointment. Date:");
        LOGGER.debug(date);
        if (isNaN(date.getTime())){
            return {
                success: false,
                error: "invalide_date"
            }
        }
        return require(APP_ROOT+"/modules/app")("model").get("Appointment").then(Appointment=>{
            return Appointment.submit({
                therapistID : therapistID,
                date : date,
                time : query.time,
                name : query.name,
                phone : query.phone,
                howToCall : query.howToCall,
                byTherapist : query.byTherapist
            }, session.getVar("liteql")).then(res=>{
                if(!res) {
                    return {success:false, error: "internal"}
                }
                if(!res.success) {
                    return res;
                }
                return session.getVar("liteql").call([
                    {"storage_therapist>therapist":[therapistID]},
                    {"base_msg>msg" : ["mail", ["\\w*"]]},
                    {"base_template>body" : ["mails/newAppointment", {
                        "name" : query.name, 
                        "phone" : query.phone,
                        "date" : dateUtils.dateToString(date),
                        "time" : dateUtils.timeToString(+query.time),
                        "howToCall" : ["viber", "telegram", "whatsUp", "Звонок"][+query.howToCall],
                        "appoinmentListLink" : urlUtils.getFullUrl("appointment/list")
                    }]}
                ]).then(mailData=>{
                    return require(APP_ROOT+"/modules/app")("utils", "email").send({
                        to : mailData.therapist.email,
                        body : mailData.body,
                        subject : mailData.msg.appointmentNewSubject
                    }).then(info=>{
                        LOGGER.debug("Email is sent. Details: "+JSON.stringify(info));
                            return mailData.therapist.tg_id ? require(APP_ROOT+"/modules/app")("utils", "msg").send({
                                chat_id : mailData.therapist.tg_id, 
                                parse_mode : "MarkdownV2",
                                text : 'Новая заявка\\. От '+query.name+'\\. Телефон\\: '+query.phone+'\\. Предпочитает '+["viber", "telegram", "whatsUp", "Звонок"][+query.howToCall]+ 
                                ' как способ связи\\. [список заявок]('+urlUtils.getFullUrl("appointment/list")+')' 
                            }).then(r=>{
                                return {success : true}
                            }) : {success : true};
                    });
                });  
            });
        });
    }
}