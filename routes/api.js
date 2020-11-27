var api = require('../libs/api');
var UserError = require('../error').UserError;
var UserOk = require('../error').UserOk;
var getCode = require('../libs/getCode');

//
// exports.post = function(req, res, next){
//     var command = req.body.command;
//     var object = req.body.object;
//     var params = req.body.params;
//     var newParams;
//     if (params){
//         try {
//             newParams = JSON.parse(params);
//         } catch (e) {
//             return res.status(500).send('Не валидный JSON в params');
//         }
//     }else{
//         return res.status(500).send('Не передан params');
//     }
//
//     api(command, object, newParams,function(err,result){
//         if (err){
//             res.status(500).send(err);
//         }else{
//             res.status(200).send(result);
//         }
//     });
// };

exports.post = function(req, response, next){
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

    api(o, function (err, res) {
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
    })
};

