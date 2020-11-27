/**
 * Created by iig on 29.10.2015.
 */
//var e = {"results":[{"code":"-1","object":"Sessions","toastr":{"type":"error","title":"ОШИБКА","message":"Не правильный логин/пароль"}}],"connection_id":"","in_out_key":"-qS-6EfVbMO8nJ5BMhYi"};

var errors = require('../error/errors');
var async = require('async');
var config = require('../config');
var lang = config.get('lang') || 'ru';
var translate = require('./translate');

module.exports = function(obj, cb){
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));

    var name = obj.name;
    var params = obj.params;
    var params2 = obj.params2;
    var user = obj.user;


    if (typeof params2=='object'){
        if (typeof params!=='object') params = {message:params};
        for (var i in params2) {
            params[i] = params[i] || params2[i];
        }
    }



    if (name == 'noToastr') {
        delete params.message;
        params.code = 0;
        // return params;
        return cb(null, params)
    }
    if (name == 'noToastrErr') {
        delete params.message;
        return cb(params)
    }

    if (typeof name!=='string') name = 'unknow';
    if (typeof params!=='object') {
        if (typeof params==='string') params = {message:params};
        else params = {};
    }

    // params.title = (typeof params.title!=='undefined')? params.title : (typeof template['title_' + lang]!=='undefined') ? template['title_' + lang] : (typeof template.title!=='undefined')? template.title : 'Error';
    // params.message = (typeof params.message!=='undefined')? params.message : (typeof params.msg!=='undefined')? params.msg : (typeof template['message_' + lang]!=='undefined') ? template['message_' + lang] : (typeof template.message!=='undefined')? template.message : 'Error';
    var template = errors[name] || {
            code: 1001,
            title:'Error',
            message: name,
            type:'error'
        };
    params.type = params.type || template.type || 'error';

    var title, message;

    async.series({
        getTtile:function(cb){
            title = (typeof params.title!=='undefined')? params.title : (template['title_' + lang]) ? template['title_' + lang] : (template.title)? template.title : '';
            var need_translate = (typeof params.title!=='undefined')? true : (template['title_' + lang]) ? false : !!template.title;
            if (lang === 'ru' || !need_translate || !title) return cb(null); // не требует перевода / don`t need translate
            if (title.search(/[А-яЁё]/) === -1) return cb(null); // Не содержит кириллицы -> не требует перевода. / Does not contain Cyrillic -> does not require translation.


            translate({lang: lang, text:title, user:user}, function(err, res){
                if (err) return cb(null); // Ignore error
                title = res;
                return cb(null);
            });
        },
        getMessage:function(cb){
            message = (typeof params.message!=='undefined')? params.message : (typeof params.msg!=='undefined')? params.msg : (template['message_' + lang]) ? template['message_' + lang] : (template.message)? template.message : '';
            var need_translate = (typeof params.message!=='undefined')? true : (typeof params.msg!=='undefined')? true : (template['message_' + lang]) ? false : !!template.message;
            if (lang === 'ru' || !need_translate || !message) return cb(null); // не требует перевода / don`t need translate
            if (message.search(/[А-яЁё]/) === -1) return cb(null); // Не содержит кириллицы -> не требует перевода. / Does not contain Cyrillic -> does not require translation.

            translate({lang: lang, text:message, user:user}, function(err, res){
                if (err) return cb(null); // Ignore error
                message = res;
                return cb(null);
            });

        }
    }, function(err, res){
        if (err) return cb(err);
        params.title = title;
        params.message = message;
        var o = {
            code: template.code,
            toastr:{}
        };
        for (var i in params) {
            var item = params[i];
            if (i=='msg' || i=='toastr') continue;
            if (i=='type' || i=='title' || i=='message'){
                o.toastr[i] = item; continue;
            }
            o[i] = item;
        }
        return cb(null, o);
    });
    //
    //
    // params.title = (function(){
    //     var title = (typeof params.title!=='undefined')? params.title : (template['title_' + lang]) ? template['title_' + lang] : (template.title)? template.title : '';
    //     var need_translate = (typeof params.title!=='undefined')? true : (template['title_' + lang]) ? false : !!template.title;
    //     if (lang === 'ru' || !need_translate || !title) return title; // не требует перевода / don`t need translate
    //     if (title.search(/[А-яЁё]/) === -1) return title; // Не содержит кириллицы -> не требует перевода. / Does not contain Cyrillic -> does not require translation.
    //     translate(title, {to: lang}).then(res => {
    //         return res.text;
    //     }).catch(err => {
    //         console.error('Error then translate title ->', title, err);
    //         return title;
    //     });
    // })();
    // params.message = (function(){
    //     var message = (typeof params.message!=='undefined')? params.message : (typeof params.msg!=='undefined')? params.msg : (template['message_' + lang]) ? template['message_' + lang] : (template.message)? template.message : '';
    //     var need_translate = (typeof params.message!=='undefined')? true : (typeof params.msg!=='undefined')? true : (template['message_' + lang]) ? false : !!template.message;
    //     if (lang === 'ru' || !need_translate || !message) return message; // не требует перевода / don`t need translate
    //     if (message.search(/[А-яЁё]/) === -1) return message; // Не содержит кириллицы -> не требует перевода. / Does not contain Cyrillic -> does not require translation.
    //     translate(message, {to: lang}).then(res => {
    //         return res.text;
    //     }).catch(err => {
    //         console.error('Error then translate message->', message, err);
    //         return message;
    //     });
    // })();
    // var o = {
    //     code: template.code,
    //     toastr:{}
    // };
    // for (var i in params) {
    //     var item = params[i];
    //     if (i=='msg' || i=='toastr') continue;
    //     if (i=='type' || i=='title' || i=='message'){
    //         o.toastr[i] = item; continue;
    //     }
    //     o[i] = item;
    // }
    // return o;
};
