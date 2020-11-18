const STORAGE = require(APP_ROOT+'/core/storage');
const Session = require(APP_ROOT+'/core/session')
module.exports = {
	submit(query){
       return STORAGE.get({
            query : "select s.schedule a.id from public.schedules, public.appointment where s.therapist = $1 and s.month = $2 and a.therapist = $1 and date = $3 and a.time = $4", 
            params : {}
        }).then(resp=>{
        });
	}
}