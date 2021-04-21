const msgUtils = require(APP_ROOT+"/modules/app")("utils", "msg");
const Sqrl = require('squirrelly');

module.exports = {
	send(query){
        var $ = this.scope.$;
            promise = $.call({"!base_template>tmpl":[query.tmplName]}).then(tmpl=>{
                return {tmpl : tmpl}
            });
        if(!query.contenxts){
            return
        };
        for(let i in query.contenxts){
            let context = query.contenxts[i];
            promise = promise.then((res)=>{
                content = Sqrl.render(res.tmpl, context);
                return msgUtils.send({
                    chat_id : context.tg_id, 
                    parse_mode : "HTML",
                    text : content
                }).then(r=>{
                    return {
                        tmpl : res.tmpl,
                        status : r
                    }
                })
            });
        }
        return promise.then(r=>{
            if(r.status.message_id){
                return {success : true}
            }
            else {
                return {success : false, error : r.status}
            }
        });
    }
}