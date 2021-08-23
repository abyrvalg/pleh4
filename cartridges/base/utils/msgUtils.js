const TG = require('telegram-bot-api');
const STORAGE = require(APP_ROOT+'/core/storage');
const LOGGER  = require(APP_ROOT+'/core/logger');
const scheme = process.env.dbscheme;

const api = new TG({
    token: process.env.telegram_token
})
const mp = new TG.GetUpdateMessageProvider();
api.setMessageProvider(mp)
const msg = {
    send(options){
        options.text = options.text.replace(/\+/g, '\\+');
        return api.sendMessage(options).then(r=>{
            return r;
        }).catch(err=>{
            LOGGER.error("Error while Telegram message sending");
            LOGGER.error(JSON.stringify(err));
            return err;
        })
    },
    listen(){
        api.start()
            .then(() => {
                console.log('API is started')
            })
            .catch(err=>{
                LOGGER.error("Error while starting tg bot");
                LOGGER.error(JSON.stringify(err));
            })

        api.on('update', update => {
            if(update.message && update.message.from){
                STORAGE.get({
                    query: "select id, first_name from "+scheme+".users where tg_id=$1", 
                    params :  [""+update.message.from.id]
            }).then(therapist=>{
                    if(!therapist || therapist.length == 0) {
                        if(!/\w{32}|\w{64}/.test(update.message.text) && !~update.message.text.indexOf("@") ) {
                            msg.send({
                                chat_id : update.message.from.id,
                                text : "Йо. я тебя пока не знаю, введи свой серийный номер или емейл"
                            }).then(info=>{
                                //console.log(info);
                            });
                        }
                        else {
                            STORAGE.get({
                                query : "update "+scheme+".users set tg_id = $1 where "+(~update.message.text.indexOf("@") ? "email" : "id")+" = $2",
                                params : [""+update.message.from.id, update.message.text],
                            }).then(r=>{
                                if(r.updatedRows == 1) {
                                    msg.send({
                                        chat_id : update.message.from.id,
                                        text : "Записал! Теперь я буду сообщать о новых заявках"
                                    }).then(info=>{
                                        //console.log(info);
                                    });
                                }
                                else{
                                    msg.send({
                                        chat_id : update.message.from.id,
                                        text : "Терапевт не найден, проверте серийный номер"
                                    }).then(info=>{
                                        //console.log(info);
                                    });
                                }                                
                            });
                        }
                    } else {
                        msg.send({
                            chat_id : update.message.from.id,
                            text : "Привет, "+therapist[0].first_name+" чем могу быть полезен?"
                        }).then(info=>{
                            //console.log(info);
                        });
                    }
                }).catch(err=>{
                    console.log(err);
                })
            }
        })
    }
}
module.exports = msg;