var api = require('../libs/api');
var sendMail = require('../libs/sendMail');
var MyError = require('../error').MyError;
var UserError = require('../error').UserError;
var UserOk = require('../error').UserOk;
var getCode = require('../libs/getCode');
var funcs = require('../libs/functions');
var async = require('async');
var moment = require('moment');
moment.locale('ru');




exports.site_api = function(req, response, next){
    var obj = req.body;
    var _t = this;
    var apiPrototype = api;
    api = function (obj, cb) {
        apiPrototype(obj, cb, req.user);
    };

    if (typeof obj.json!=='string') {
        getCode({name:'errRequest',params: 'Отсутствует параметр json',user:req.user}, function(code_err, code_res){
            if (code_err) return cb(code_err);
            response.status(200).json(code_res);
        });
        return;
        // return response.status(200).json(getCode('errRequest','Отсутствует параметр json'));
    }
    var o;
    try {
        o = JSON.parse(obj.json);
    } catch (e) {
        getCode({name:'errRequest',params: 'Параметр json имеет не валидный JSON', params2:{json:obj.json},user:req.user}, function(code_err, code_res){
            if (code_err) return cb(code_err);
            response.status(200).json(code_res);
        });
        return;
        // return response.status(200).json(getCode('errRequest','Параметр json имеет не валидный JSON',{json:obj.json}));
    }
    var command = o.command;
    if (!command) {
        getCode({name:'errRequest',params: 'Не передан command', params2:{o:o},user:req.user}, function(code_err, code_res){
            if (code_err) return cb(code_err);
            response.status(200).json(code_res);
        });
        return;
        // return response.status(200).json(getCode('errRequest','Не передан command',{o:o}));
    }

    if (typeof api_functions[command]!=='function') {
        getCode({name:'badCommand',params: {o:o},user:req.user}, function(code_err, code_res){
            if (code_err) return cb(code_err);
            response.status(200).json(code_res);
        });
        return;
        // return response.status(200).json(getCode('badCommand',{o:o}));
    }
    if (typeof o.params!=='object') o.params = {};
    o.params.sid = obj.sid;
    api_functions[command](o.params || {}, function (err, res) {
        if (err) {
            if (err instanceof UserError || err instanceof UserOk) {
                getCode({name:err.message, params: err.data, user:req.user}, function(code_err, code_res){
                    if (code_err) return cb(code_err);
                    response.status(200).json(code_res);
                });
                return;
                // return response.status(200).json(getCode(err.message, err.data));
            }
            console.log('Системная ошибка при запросе с сайта.', err);
            getCode({name:'sysErrorSite',params: {err:err},user:req.user}, function(code_err, code_res){
                if (code_err) return cb(code_err);
                response.status(200).json(code_res);
            });
            return;
            // return response.status(200).json(getCode('sysErrorSite',{err:err}));
        }
        if (typeof res.code!=='undefined') return response.status(200).json(res);
        //var s_json = JSON.stringify
        getCode({name:'ok',params: res, user:req.user}, function(code_err, code_res){
            if (code_err) return cb(code_err);
            response.status(200).json(code_res);
        });
        return;
        // return response.status(200).json(getCode('ok', res));
    });


};

var api_functions = {};

api_functions.test = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
    cb(null, {tests:['test','test2']});
};


api_functions.get_groups = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
    var sid = obj.sid;
    if (!sid) return cb(new MyError('Не передан sid'));

    var o = {
        command:'getGroups',
        object:'Taxon',
        params:{
            name:obj.name
        }
    };
    if (obj.limit) o.params.limit = obj.limit;
    if (obj.page_no) o.params.page_no = obj.page_no;

    api(o, cb);
};



