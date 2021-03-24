const TG = require('telegram-bot-api');
const STORAGE = require(APP_ROOT+'/core/storage');
const LOGGER  = require(APP_ROOT+'/core/logger');

const api = new TG({
    token: process.env.telegram_token
})
const mp = new TG.GetUpdateMessageProvider();
api.setMessageProvider(mp)
const msg = {
    send(options){
        return api.sendMessage(options).then(r=>{
            return r;
        }).catch(err=>{
            LOGGER.error(err);
        })
    },
    listen(){
        api.start()
            .then(() => {
                console.log('API is started')
            })
            .catch(console.err)

        api.on('update', update => {
            if(update.message && update.message.from){
                STORAGE.get({
                    query: "select id, first_name from public.users where tg_id=$1", 
                    params :  [""+update.message.from.id]
            }).then(therapist=>{
                    if(!therapist || therapist.length == 0) {
                        if(!/\w{32}|\w{64}/.test(update.message.text)) {
                            msg.send({
                                chat_id : update.message.from.id,
                                text : "Йо. я тебя пока не знаю, введи свой серийный номер"
                            }).then(info=>{
                                //console.log(info);
                            });
                        }
                        else {
                            STORAGE.get({
                                query : "update public.users set tg_id = $1 where id = $2",
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