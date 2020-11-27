/**
 * Created by iig on 29.10.2015.
 */
var MyError = require('../error').MyError;
var UserError = require('../error').UserError;
var UserOk = require('../error').UserOk;
var BasicClass = require('./system/BasicClass');
var util = require('util');
var async = require('async');
var rollback = require('../modules/rollback');
var funcs = require('../libs/functions');
var request = require('request');
var guid = require('guid');
var newXhr = require('socket.io-client-cookies-headers');

var Model = function(obj){
    this.name = obj.name;
    this.tableName = obj.name.toLowerCase();

    this.ccsSocketQuery_stack = {
        items: {},
        getItem: function (id) {
            return this.items[id];
        },
        addItem: function (cb, obj) {
            var id = guid.create();
            this.items[id] = {
                cb: cb,
                request: obj
            };

            return id;
        },
        removeItem: function (id) {
            delete this.items[id];
        }
    };

    var basicclass = BasicClass.call(this, obj);
    if (basicclass instanceof MyError) return basicclass;
};
util.inherits(Model, BasicClass);
Model.prototype.getPrototype = Model.prototype.get;
Model.prototype.addPrototype = Model.prototype.add;
Model.prototype.modifyPrototype = Model.prototype.modify;
Model.prototype.removePrototype = Model.prototype.remove;
Model.prototype.getForSelectPrototype = Model.prototype.getForSelect;

Model.prototype.init = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb'); // The method is not passed to cb
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj')); // The method is not passed to obj
    var _t = this;
    Model.super_.prototype.init.apply(this, [obj , function (err) {
        cb(null);
    }]);
};

Model.prototype.hide_pass = function (field, obj) {
    if (typeof field === 'undefined' || typeof obj !== 'object') return cb(new MyError('В hide_pass не переданы field или obj (get_formating func)',{field:field,obj:obj}));
    var params = obj.params;
    if (typeof params !== 'object') return cb(new MyError('В hide_pass не переданы параметры запроса params. (get_formating func)',{field:field,obj:obj}));
    return (params.fromClient)? '*' : field;
};

Model.prototype.get = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var client_object = _t.client_object || '';

    var coFunction = 'get_' + client_object;
    if (typeof _t[coFunction] === 'function') {
        _t[coFunction](obj, cb);
    } else {
        if (typeof _t['get_'] === 'function') {
            _t['get_'](obj, cb);
        } else {
            _t.getPrototype(obj, cb);
        }
    }
};

Model.prototype.add = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var client_object = _t.client_object || '';

    var coFunction = 'add_' + client_object;
    if (typeof _t[coFunction] === 'function') {
        _t[coFunction](obj, cb);
    } else {
        if (typeof _t['add_'] === 'function') {
            _t['add_'](obj, cb);
        } else {
            _t.addPrototype(obj, cb);
        }
    }
};

Model.prototype.modify = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var client_object = _t.client_object || '';

    var coFunction = 'modify_' + client_object;

    if (typeof _t[coFunction] === 'function') {
        _t[coFunction](obj, cb);
    } else {
        if (typeof _t['modify_'] === 'function') {
            _t['modify_'](obj, cb);
        } else {
            _t.modifyPrototype(obj, cb);
        }
    }
};

Model.prototype.remove = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var client_object = _t.client_object || '';

    var coFunction = 'remove_' + client_object;

    if (typeof _t[coFunction] === 'function') {
        _t[coFunction](obj, cb);
    } else {
        if (typeof _t['remove_'] === 'function') {
            _t['remove_'](obj, cb);
        } else {
            _t.removePrototype(obj, cb);
        }
    }
};

Model.prototype.getForSelect = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var client_object = _t.client_object || '';

    var coFunction = 'getForSelect_' + client_object;
    if (typeof _t[coFunction] === 'function') {
        _t[coFunction](obj, cb);
    } else {
        if (typeof _t['getForSelect_'] === 'function') {
            _t['getForSelect_'](obj, cb);
        } else {
            _t.getForSelectPrototype(obj, cb);
        }
    }
};

Model.prototype.ccsSocketQuery = function(obj, cb){
    var _t = this;
    obj.params.sid = _t.user.sid;

    var in_use;

    async.series({
        getInUse:function(cb){
            var params = {
                param_where:{
                    in_use:true
                },
                collapseData:false
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить используемое подключение',{params : params, err : err}));
                if (!res.length) return cb(new UserError('Ни одно подключение не указано для использования.'));
                if (res.length > 1) return cb(new MyError('Слишком много подключений указано для использования.'));
                in_use = res[0];
                cb(null);
            });
        },
        query:function(cb){
            if (_t.ccsSocketQueryState !== 'READY'){
                console.log('ccsSocketQuery еще не готова к использованию', _t.ccsSocketQueryState);
                if (_t.ccsSocketQueryState !== 'ERROR') {
                    setTimeout(function () {
                        _t.ccsSocketQuery(obj, cb);
                    }, 50);
                }
                // if (_t.ccsSocketQueryState !== 'INITIALIZATION'){
                if (!_t.ccsSocketQueryState){
                    // Запустим процес инициализации
                    _t.ccsSocketQueryInit(in_use, function(err, res){
                        if (err) {
                            delete _t.ccsSocketQueryState;
                            console.log('Не удалось инициализировать ccsSocket', err);
                        }
                    });
                }
                if (_t.ccsSocketQueryState === 'CONNECTED'){
                    // Запустим процес авторизации

                    _t.ccsSocketQueryState = 'AUTHORIZATION';

                    var o = {
                        command:'login',
                        object:'User',
                        params:{
                            login:in_use.username,
                            password:in_use.pass
                        }
                    };
                    _t.ccsSocketQueryRealy(o, function(err, r){
                        if (r.code) {
                            console.log('Во время авторизации ccsSocket произошла ош.', r);
                            _t.ccsSocketQueryState = 'ERROR';
                            return cb(r);
                        }

                        _t.ccsSocket.disconnect();
                        _t.ccsSocket.connect();
                    });
                }
            }else{
                _t.ccsSocketQueryRealy(obj, (err, res) => {
                    if (err) return cb(err, res);
                    if ('code' in res && res.code !== 0) return cb(res, res);
                    return cb(err, res);
                });
            }
        }
    }, function(err, res){
        return cb(err, res.query);
    });
};

Model.prototype.ccsSocketQueryInit = function(obj, cb){
    var _t = this;
    if (typeof obj !== 'object') return cb(new MyError('В ccsSocketQueryInit некоректно передан obj'));
    _t.ccsSocketQueryState = 'INITIALIZATION';

    request(obj.ip + '/set_cookie', function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
        var myCookie = response.headers['set-cookie'][0];
        // if (myCookie) myCookie = myCookie.replace('mysid','mySiteSid');
        newXhr.setCookies(myCookie);

        _t.ccsSocket = require('socket.io-client')(obj.ip);

        _t.ccsSocket.on('connect', function (data) {
            console.log('\n======>>>>>>CONNECTED ccsSocketQuery\n');

            _t.ccsSocketQueryRealy = function (obj, cb, type) {
                console.log('INC OBJ ccsSocketQuery', obj);
                if (typeof cb === "function"){
                    var id = _t.ccsSocketQuery_stack.addItem(cb, obj);
                }
                _t.ccsSocket.emit('socketQuery', obj, id, type);
            };
            if (_t.ccsSocketQueryState === 'INITIALIZATION'){
                _t.ccsSocketQueryState = 'CONNECTED';
            }else{
                // Уже прошла авторизация
                _t.ccsSocketQueryState = 'READY';
            }
        });

        _t.ccsSocket.on('disconnect', function (data) {
            console.warn('Соединение с сервером прервано. ccsSocketQuery');

            _t.ccsSocketQueryState = 'DISCONNECT';

        });

        _t.ccsSocket.on('error', function (data, arg2) {
            console.log('Ошибка соединения ccsSocketQuery', data, arg2);

            _t.ccsSocketQueryState = 'ERROR';
            if (data=='handshake unauthorized') {
                console.log('Необходимо авторизироваться');
                _t.ccsSocketQueryState = 'CONNECTED';
            }
        });

        _t.ccsSocket.on('message', function (obj) {
            if (typeof obj !== "object") return;
            var mode = obj.mode || "normal";

            console.log('message',mode, obj);

            switch (mode) {
                case "getFile":
                    break;
                default :
                    break;
            }
        });

        _t.ccsSocket.on('log', function (data) {
            console.log(data);
        });

        _t.ccsSocket.on('sendToClient', function (data) {
            console.log('sendToClient', data);
            _t.user.socket.emit('log', data);
        });

        _t.ccsSocket.on('sendToClientBody', function (data) {
            console.log('sendToClientBody', data);
            _t.user.socket.emit('logBody', data);
        });



        _t.ccsSocket.on('socketQueryCallback', function (callback_id, result, request_time) {
            var item = _t.ccsSocketQuery_stack.getItem(callback_id);
            if (typeof item !== "object") return;
            // Не удалять это сравнение, так как typeof null возвращает "object"
            if (typeof result==='object' && result!==null){
                if (result.code !== 10){
                    result.time = request_time;
                    var t = result.toastr;
                    if (t && t.message!=='noToastr') console.log(t.type, t.message, t.title);
                    if (t && t.additionalMessage) console.log('error', t.additionalMessage, 'ВНИМАНИЕ!');

                    if(result.code === -4){
                        _t.ccsSocketQueryState = 'CONNECTED';
                        // _t.ccsSocketQuery_stack.removeItem(callback_id);
                        return;

                    }
                }
            }else{
                console.log('RESULT ccsSocketQuery:', result);
            }

            if (typeof item.cb === "function") {


                // console.log('RESULT BEFORE ccsSocketQuery:', result);

                if(result !== null && typeof result == 'object'){

                    if (typeof result.data == 'object' && typeof result.data_columns == 'object' && item.request.collapseData){
                        result.data = funcs.jsonToObj(result);

                    }

                }else{
                    var primal_res = result;
                    result = {
                        code: -888,
                        toastr: {
                            type: 'error',
                            title: 'Ошибка',
                            message: 'В ответ пришел null или ответ не является объектом'
                        },
                        results:[primal_res]
                    };
                }




                item.cb(null, result);
            }
            _t.ccsSocketQuery_stack.removeItem(callback_id);
        });

        _t.ccsSocket.on('socketQueryCallbackError', function (err) {
            console.log(err);
        });


        cb(null);

    });
};


// var o = {
//     command:'getLocation',
//     object:'Update_connection',
//     params:{}
// };
// socketQuery(o, function(r){
//     console.log(r);
// });

Model.prototype.getLocation = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var locations;
    async.series({
        getC:function(cb){
            var o = {
                command: 'get',
                object: 'Location',
                params: {
                    page_no: 1,
                    limit: 10,
                    collapseData: false
                }
            };

            _t.ccsSocketQuery(o, function (err, res) {
                if (err) return cb(new UserError('Cannot get Locations',{err:err}));
                locations = res;
                cb(null, res);
            });
        }
    },function (err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err);
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            cb(null, new UserOk('Ок',{locations:locations}));
        }
    });
};


Model.prototype.exampleGet = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id

    async.series({

    },function (err, res) {
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',{data:data}));
    });
};

Model.prototype.example = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    async.series({

    },function (err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err);
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            cb(null, new UserOk('Ок'));
        }
    });
};

module.exports = Model;
