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
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb'); // The method is not passed to cb
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj')); // The method is not passed to obj
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


Model.prototype.mergeFilters = function (obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0];
        obj = {};
    }
    let _t = this;
    let rollback_key = obj.rollback_key || rollback.create();
    let doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    let user_id = obj.user_id,
        co_and_class = obj.co_and_class,
        filters_data = obj.filters_data.length > 0 ? JSON.parse(obj.filters_data) : 'EMPTY',
        storedFilters,
        filtersToRemove,
        filtersToAdd,
        filtersToModify;


    async.series({

        getSettings: function(cb){
            let o = {
                command: 'get',
                object: 'user_setting_co_filter',
                params: {
                    where: [{
                        key: 'user_id',
                        val1: user_id
                    },{
                        key: 'co_and_class',
                        val1: co_and_class
                    }],
                    collapseData: false
                }
            }

            _t.api(o, function(err,res){

                if(err) return cb(new MyError('Не удалось получить user_setting_co_filter', {o:o}))

                storedFilters = res;

                cb(null)

            })

        },
        removeStoredFilters: function(cb){

            async.eachSeries(storedFilters, function(item,cb){

                let o = {
                    command: 'remove',
                    object: 'user_setting_co_filter',
                    params: {
                        id: item.id
                    }
                }

                _t.api(o, function(err,res){
                    if(err) return cb(new MyError('Не удалось удалить запись user_setting_co_filter', {o:o}))

                    cb(null)
                })

            }, cb)

        },
        addFiltersFromClient: function(cb){

            async.eachSeries(filters_data, function(item,cb){

                let o = {
                    command: 'add',
                    object: 'user_setting_co_filter',
                    params: {
                        user_id: user_id,
                        co_and_class: co_and_class,
                        comparisonType: item.comparisonType,
                        key_: item.key,
                        type: item.type,
                        val1: item.val1,
                        val2: item.val2
                    }
                }

                _t.api(o, function(err,res){
                    if(err) return cb(new MyError('Не удалось создать запись user_setting_co_filter', {o:o}))

                    cb(null)
                })

            }, cb)

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
            cb(null, new UserOk('Ок'));
        }
    });
};


Model.prototype.exampleGet = function (obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id

    let data;
    async.series({

    },function (err, res) {
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',{data:data}));
    });
};

Model.prototype.example = function (obj, cb) {
    if (arguments.length === 1) {
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
