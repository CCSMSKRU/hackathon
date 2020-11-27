var nodemailer = require('nodemailer');
var config = require('../config/index');
var send = function(obj, cb){
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
    var _t = this;
    const options = config.get('mail:mailTransport')
    const optionsLog = {...options, auth:{...options.auth, pass:'*'}}
    var transporter = nodemailer.createTransport(options);
    var mailOptions = {
        from: config.get('mail:from'),
        to: obj.email,
        subject: obj.subject || 'Уведомление', // Subject line
        text: obj.text || '...TEXT', // plaintext body
        html: obj.html || '...HTML',
        attachments:[]
    };
    if (Array.isArray(obj.attachments)) {
        for (var i in obj.attachments) {
            mailOptions.attachments.push(obj.attachments[i]);
        }
    }
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.error('sendMail ERROR:',optionsLog, mailOptions.to, mailOptions.subject);
            console.log(error, info);
            cb(error, info);
        }else{
            console.log('mail sended ---' + obj.email + '----> Ок');
            cb(null, info);
        }
    });
};
module.exports = send;

// Test post server
// openssl s_client -starttls smtp -crlf -connect mail.pro-fm.com:25
// openssl s_client -starttls smtp -crlf -connect mail.pro-fm.com:587
// openssl s_client -crlf -connect mail.pro-fm.com:465
