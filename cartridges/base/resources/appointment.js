const STORAGE = require(APP_ROOT+'/core/storage');
const LOGGER  = require(APP_ROOT+'/core/logger');
const dateUtils = require(APP_ROOT+"/modules/app")("utils", "date");
const dataUtils = require(APP_ROOT+"/modules/app")("utils", "data");
const urlUtils = require(APP_ROOT+"/modules/app")("utils", "url");

function addAppointment(query, currentInstance){
    if (query.date && isNaN(query.date.getTime())){
        return {
            success: false,
            error: "invalide_date"
        }
    }
    return require(APP_ROOT+"/modules/app")("model").get("Appointment").then(Appointment=>{
        return Appointment.submit({
            therapistID : query.therapist,
            date : query.date,
            time : query.time,
            name : query.name,
            phone : query.phone,
            howToCall : query.howToCall,
            byTherapist : query.byTherapist
        }, currentInstance.scope.$).then(res=>{
            if(!res) {
                return {success:false, error: "internal"}
            }
            if(!res.success) {
                return res;
            }
            var toNotifyQuery = [{"storage_getUsersByRoles>coordinators" : ["coordinator"]}];
            if(query.therapist) {
                toNotifyQuery.push({"storage_therapist>therapist":[query.therapist]});
            }
            return currentInstance.scope.$.call(toNotifyQuery).then(mailData=>{
                return require(APP_ROOT+"/modules/app")("utils", "email").send({
                    to : mailData.therapist && mailData.therapist.email
                }).then(info=>{   
                        var promise = Promise.resolve();
                        for(let i in mailData.coordinators) {
                            let coordinator = mailData.coordinators[i];
                            promise = promise.then(()=>{
                               return require(APP_ROOT+"/modules/app")("utils", "msg").send({
                                    chat_id : coordinator.tg_id, 
                                    parse_mode : "MarkdownV2",
                                    text : 'Новая заявка\\. От '+query.name+
                                        '\\. Телефон\\: '+query.phone+'\\. Предпочитает '+
                                        ["viber", "telegram", "whatsUp", "Звонок"][+query.howToCall]+ 
                                        ' как способ связи\\. [список заявок]('+urlUtils.getFullUrl("appointment/unassigned")+')'})
                            });
                        }                         
                        return promise.then(()=>mailData.therapist && mailData.therapist.tg_id ? require(APP_ROOT+"/modules/app")("utils", "msg").send({
                            chat_id : mailData.therapist.tg_id, 
                            parse_mode : "MarkdownV2",
                            text : 'Новая заявка\\. От '+query.name+'\\. Телефон\\: '+query.phone+'\\. Предпочитает '+["viber", "telegram", "whatsUp", "Звонок"][+query.howToCall]+ 
                            ' как способ связи\\. [список заявок]('+urlUtils.getFullUrl("appointment/list")+')' 
                        }).then(r=>{                            
                            return {success : true}
                        }) : {success : true})
                });
            });  
        });
    });
}

module.exports = {
    add(query){
        var session = this.scope.session,
            profile = session.getVar("currentProfile");
        query.date = query.date && new Date(query.date),
        query.therapist = profile.id;
        query.byTherapist = true;
        return addAppointment(query, this);
    },
	submit(query){
        query.date = query.date && new Date(query.date),
        LOGGER.debug("submit appointment. Date:");
        LOGGER.debug(query.date);
        return addAppointment(query, this);
    },
    assign(query){
        return this.scope.$.call([            
            {"storage_assignAppointemnts>assignmentResult": [query]},
            {"storage_getAppintmentsWithTherapist>appointments": [Object.keys(query)]},  
            {"array_addToEach>appointments": ["_appointments", "link", urlUtils.getFullUrl("appointment/list")]},       
            {"!msg_send": [{
                "tmplName" : "mails/myNewAppointment",
                "contenxts" :  "_appointments",
            }]},
        ]);
    },
    cancel(query){
        return this.scope.$.call([
            {"storage_updateAppointment>upd" : [{id: query.id, status: -1}, {id : -1}]},
            {"!storage_removeTherapySession" : [{appointmentID : query.id}, {id : "_upd.transaction", commit: true}]}
        ]).then(r=>{
            if(r.success){
                return {success : true}
           }
        });
    },
    confirm(query){
        return this.scope.$.call([
            {"storage_updateAppointment>upd" : [{id: query.id, status: 1}, {id : -1}]},
            {"!storage_createTherapySession" : [{appointmentID : query.id}, {id : "_upd.transaction", commit: true}]}
        ]).then(r=>{
            if(r.success){
                return {success : true}
           }
        });
    }
}