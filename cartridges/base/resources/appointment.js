const { logger } = require("handlebars");

const STORAGE = require(APP_ROOT+'/core/storage');
const Session = require(APP_ROOT+'/core/session');
const LOGGER  = require(APP_ROOT+'/core/logger');
const getYearMonth = date=>(+((date.getYear() - 100)+(date.getMonth() < 9 ? "0" : "")+(date.getMonth()))); //TODO: store such thinks in dateUtils.js
const isSlotAvailable = (schedule, date, time)=>{
    var slotNum =  time ? (date.getDate()-1)*24+time : date;
    return !!(schedule/BigInt(Math.pow(2, slotNum)) % 2n);
};

function getUID(length) {
	var text = "",
		possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (var i = 0; i < length; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}
module.exports = {
	submit(query){
        var date = new Date(query.date);
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
            params : [query.therapist, getYearMonth(date), date, query.time]
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
            if(!isSlotAvailable(BigInt(res.schedule), date, +query.time)){
                return{
                    success : false,
                    error : "slot_is_not_available"
                } 
            }
            return STORAGE.get({
                query : "insert into public.appointments (id, name, phone, therapist, date, time, status, how_to_call, create_date)\
                    values ($1, $2, $3, $4, $5, $6, $7, $8, now())",
                params : [getUID(32), query.name, query.phone, query.therapist, date, +query.time, 0, +query.howToCall]
            }).then(res=>{
                if(!res){
                    return {success : false, error : "internal"};
                }
                return res;
                var nodemailer = require('nodemailer');

                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'noreplybot4help@gmail.com',
                        pass: ''
                    }
                });

                var mailOptions = {
                    from: 'noreplybot4help@gmail.com',
                    to: 's.lozhechnikov@gmail.com',
                    subject: 'new appointment',
                    text: 'That was easy!'
                };

                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        console.log(error);
                        return {success : false, error : "internal"};
                    } else {
                        console.log('Email sent: ' + info.response);
                        return {success: true};
                    }
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