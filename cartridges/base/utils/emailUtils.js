const nodemailer = require('nodemailer');
const LOGGER  = require(APP_ROOT+'/core/logger');
const emailUtils = {
    send(options){  
        return Promise.resolve({success : true, mock: true});
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.mailSender,
                pass: process.env.mailPassword
            }
        });
        var mailOptions = {
            from: process.env.mailSender,
            to: options.to,
            subject: options.subject,
            html: options.body
        };
        return transporter.sendMail(mailOptions).catch(err=>{
            LOGGER.error(err);
        });
    }
}
module.exports = emailUtils;