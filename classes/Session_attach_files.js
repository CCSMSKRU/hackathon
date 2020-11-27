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

const File = require('../modules/file.js')


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

Model.prototype.createSessid = function () {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 100; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

// Model.prototype.getFile = function (obj, cb) {
//     if (arguments.length == 1) {
//         cb = arguments[0];
//         obj = {};
//     }
//     let _t = this;
//     // var id = obj.id;
//     if (!obj.sessid && !obj.id) return cb(new MyError('Не передан id/sessid',{obj:obj})); // Not passed to id
//
//     async.series({
//         getFiles: cb => {
//             let o = {
//                 command: 'get',
//                 object: 'session_attach_files',
//                 params: {
//                     where: []
//                 }
//             }
//             if (obj.id) o.params.where.push({key: 'id', type: '=', val1: obj.id})
//             if (obj.sessid) o.params.where.push({key: 'session', type: '=', val1: obj.sessid})
//
//             _t.api(o, (err, res) => {
//                 console.log(o, res, err)
//                 debugger
//             })
//
//         }
//     })
//
// };

Model.prototype.main_class_file = 'File';
Model.prototype.class_file = 'session_attach_files';
Model.prototype.field_parent_link = 'session_attach_id'

Model.prototype.removeFile = File.prototype.removeFile;
Model.prototype.getFiles = File.prototype.getFiles;


Model.prototype.uploadFile = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
    var _t = this;
    // if (!obj.filename) return cb(new MyError('Не передан filename'));
    // if (!obj.id) return cb(new MyError('Не передан id'));
    // if (!obj.description) return cb(new MyError('Не передан description'));
    // if (!obj.type_sysname) return cb(new MyError('Не передан type_sysname'));
    var rollback_key = rollback.create();

    let new_file_id = null;
    let file_id = null
    async.series({
        addFile: function (cb) {
            let o = {
                command: 'add',
                object: _t.main_class_file,
                params: {
                    filename: obj.filename,
                    rollback_key: rollback_key
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(err);
                file_id = res.id;
                cb(null, res);
            });
        },
        addInfoFile: function (cb) {
            let o = {
                command: 'add',
                object: _t.class_file,
                params: {
                    file_id: file_id,
                    [_t.field_parent_link]: obj.id,
                }
            }
            if (obj.description) o.params.description = obj.description
            if (obj.type_sysname) o.params.type_sysname = obj.type_sysname
            _t.api(o, (err, res) => {
                if (err) return cb(err);
                new_file_id = res.id
                // console.log(res, obj, o)
                // debugger
                cb(null, res);
            });
        },
        returnNewFile: function (cb) {
            obj.file_id = new_file_id
            _t.getFiles(obj, function(err, res){
                if (err) return cb(err);
                cb(null, res);
            })
        }
    }, function (err, res) {
        if (err) {
            rollback.rollback({rollback_key:rollback_key,user:_t.user}, function (err2) {
                return cb(err, err2);
            });
        }
        res.returnNewFile.sessid = obj.id
        return cb(null, res.returnNewFile);
    })
};


// Model.prototype.uploadFile = function (obj, cb) {
//     async.series({
//         uploadFile: cb => {
//             debugger
//             File.prototype.uploadFile(obj, (res) => {
//                 console.log(res, obj)
//                 debugger
//                 cb(null, res)
//             });
//         }
//     }, (err, res) => {
//         debugger
//         res.uploadFile.returnNewFile.sessid = obj.id
//         cb(null, res)
//     })
// }


// Model.prototype.uploadFile = function (obj, cb) {
//     if (arguments.length == 1) {
//         cb = arguments[0];
//         obj = {};
//     }
//     if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
//     if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
//     var _t = this;
//     // if (!obj.filename) return cb(new MyError('Не передан filename'));
//     // if (!obj.id) return cb(new MyError('Не передан id'));
//     // if (!obj.description) return cb(new MyError('Не передан description'));
//     // if (!obj.type_sysname) return cb(new MyError('Не передан type_sysname'));
//     var rollback_key = rollback.create();
//
//     let new_file_id = null;
//     let file_id = null
//     async.series({
//         addFile: function (cb) {
//             let o = {
//                 command: 'add',
//                 object: _t.main_class_file,
//                 params: {
//                     filename: obj.filename,
//                     rollback_key: rollback_key
//                 }
//             };
//             _t.api(o, function (err, res) {
//                 if (err) return cb(err);
//                 file_id = res.id;
//                 cb(null, res);
//             });
//         },
//         addInfoFile: function (cb) {
//             let o = {
//                 command: 'add',
//                 object: _t.class_file,
//                 params: {
//                     file_id: file_id,
//                     [_t.field_parent_link]: obj.id,
//                 }
//             }
//             if (obj.description) o.params.description = obj.description
//             if (obj.type_sysname) o.params.type_sysname = obj.type_sysname
//             _t.api(o, (err, res) => {
//                 if (err) return cb(err);
//                 new_file_id = res.id
//                 cb(null, res);
//             });
//         },
//         returnNewFile: function (cb) {
//             obj.id = new_file_id
//             _t.getFiles(obj, function(err, res){
//                 if (err) return cb(err);
//                 cb(null, res);
//             })
//         }
//     }, function (err, res) {
//         if (err) {
//             rollback.rollback({rollback_key:rollback_key,user:_t.user}, function (err2) {
//                 return cb(err, err2);
//             });
//         }
//         return cb(null, res.returnNewFile);
//     })
// };


module.exports = Model;
