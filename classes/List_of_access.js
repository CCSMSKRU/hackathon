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

var Model = function(obj){
    this.name = obj.name;
    this.tableName = obj.name.toLowerCase();

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
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
    var _t = this;
    Model.super_.prototype.init.apply(this, [obj , function (err) {
        cb(null);
    }]);
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


Model.prototype.modify_ = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj}));
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var list_of_access;
    var class_operation;
    async.series({
        get:function(cb){
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить list_of_access.',{id:id,err:err}));
                list_of_access = res[0];
                cb(null);
            });
        },
        modify:function(cb){
            _t.modifyPrototype(obj, function(err, res){
                return cb(err, res);
            });
        },
        skipAccessList:function(cb){

            for (var i in io.sockets.sockets) {
                var socket = io.sockets.sockets[i];
                if (!socket.handshake.user) continue;
                if (!socket.handshake.user.user_data) continue;
                if (socket.handshake.user.user_data.id === list_of_access.user_id){
                    socket.handshake.user.need_reload_access_list = true;
                }
            }
            cb(null);
        },
        getClassById:function(cb){
            var o = {
                command:'getById',
                object:'class_operation',
                params:{
                    id:list_of_access.class_operation_id
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось class_operation',{o : o, err : err}));
                class_operation = res[0];
                cb(null);
            });

        },
        clearCache:function(cb){
            var o = {
                command: '_clearCache',
                object: class_operation.class
            };
            // if (_t.client_object) o.client_object = _t.client_object;
            _t.api(o, function (err) {
                if (err) {
                    console.log('\nНемогу очистить кеш класса.', err);
                }
                cb(null);
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
            cb(null, res.modify);
        }
    });
};

Model.prototype.add_ = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var list_of_access;
    var class_operation;
    var id;

    async.series({

        add:function(cb){
            obj.is_active = (typeof obj.is_active!=='undefined')? obj.is_active : true;
            _t.addPrototype(obj, function(err, res){
                if (err) return cb(err);
                id = res.id;
                return cb(err, res);
            });
        },
        get:function(cb){
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить list_of_access.',{id:id,err:err}));
                list_of_access = res[0];
                cb(null);
            });
        },
        skipAccessList:function(cb){

            for (var i in io.sockets.sockets) {
                var socket = io.sockets.sockets[i];
                if (!socket.handshake.user) continue;
                if (!socket.handshake.user.user_data) continue;
                if (socket.handshake.user.user_data.id === list_of_access.user_id){
                    socket.handshake.user.need_reload_access_list = true;
                }
            }
            cb(null);
        },
        getClassById:function(cb){
            var o = {
                command:'getById',
                object:'class_operation',
                params:{
                    id:list_of_access.class_operation_id
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось class_operation',{o : o, err : err}));
                class_operation = res[0];
                cb(null);
            });

        },
        clearCache:function(cb){
            var o = {
                command: '_clearCache',
                object: class_operation.class
            };
            // if (_t.client_object) o.client_object = _t.client_object;
            _t.api(o, function (err) {
                if (err) {
                    console.log('\nНемогу очистить кеш класса.', err);
                }
                cb(null);
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
            cb(null, res.add);
        }
    });
};

Model.prototype.remove_ = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id (ListOfAccess - remove_)',{obj:obj})); // not passed id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var list_of_access;
    var class_operation;
    async.series({
        get:function(cb){
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить list_of_access.',{id:id,err:err}));
                list_of_access = res[0];
                cb(null);
            });
        },
        remove:function(cb){
            _t.removePrototype(obj, function(err, res){
                return cb(err, res);
            });
        },
        skipAccessList:function(cb){

            for (var i in io.sockets.sockets) {
                var socket = io.sockets.sockets[i];
                if (!socket.handshake.user) continue;
                if (!socket.handshake.user.user_data) continue;
                if (socket.handshake.user.user_data.id === list_of_access.user_id){
                    socket.handshake.user.need_reload_access_list = true;
                }
            }
            cb(null);
        },
        getClassById:function(cb){
            var o = {
                command:'getById',
                object:'class_operation',
                params:{
                    id:list_of_access.class_operation_id
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось class_operation',{o : o, err : err}));
                class_operation = res[0];
                cb(null);
            });

        },
        clearCache:function(cb){
            var o = {
                command: '_clearCache',
                object: class_operation.class
            };
            // if (_t.client_object) o.client_object = _t.client_object;
            _t.api(o, function (err) {
                if (err) {
                    console.log('\nНемогу очистить кеш класса.', err);
                }
                cb(null);
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
            cb(null, res.remove);
        }
    });
};

Model.prototype.getCommands = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
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

Model.prototype.getUsers = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;

    var class_operation_id = obj.class_operation_id || (obj.param_where)? obj.param_where.class_operation_id : false;
    if (isNaN(+class_operation_id)) return cb(new MyError('Не передан class_operation_id',{obj:obj}));
    var record_id = obj.record_id || (obj.param_where)? obj.param_where.record_id : false;
    if (isNaN(+record_id)) return cb(new MyError('Не передан record_id',{obj:obj}));

    var list_of_access;
    async.series({
        get:function(cb){
            var params = {
                param_where:{
                    class_operation_id:class_operation_id,
                    record_id:record_id
                },
                collapseData:false
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить list_of_access',{params : params, err : err}));
                list_of_access = res;
                cb(null);
            });
        }
    },function (err, res) {
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',{list_of_access:list_of_access}));
    });
};

Model.prototype.example = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj}));
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
