var MyError = require('../error').MyError;
var UserError = require('../error').UserError;
var UserOk = require('../error').UserOk;
var BasicClass = require('../classes/system/BasicClass');
var util = require('util');
var async = require('async');
var rollback = require('../modules/rollback');


class File {
    uploadFile(obj, cb) {
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
            return cb(null, res.returnNewFile);
        })
    };
    removeFile (obj, cb) {
        if (arguments.length == 1) {
            cb = arguments[0];
            obj = {};
        }
        if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
        if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
        var _t = this;

        if (!obj.file_id) return cb(new MyError('Не передан file_id'));

        async.series({
            removeInfoFile: function (cb) {
                let o = {
                    command: 'remove',
                    object: _t.class_file,
                    params: {
                        id: obj.file_id,
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(err);
                    cb(null);
                });
            }
        }, function (err, res) {
            if (err) return cb(new MyError('При удалении файла ТМЦ произошла ошибка.', err));
            return cb(null,new UserOk('noToastr',{data:[]}));
        })

    };
    getFiles(obj, cb) {
        if (arguments.length == 1) {
            cb = arguments[0];
            obj = {};
        }
        var _t = this;
        if (!obj.id && !obj.file_id) return cb(new MyError('Не передан id'));
        async.series({
            getFiles: cb => {
                let o = {
                    command: 'get',
                    object: _t.class_file,
                    params: {
                        where: [],
                        collapseData: false
                    }
                }
                if (obj.id)  o.params.where.push({key: [_t.field_parent_link], type: '=', val1: obj.id, comparisonType: 'AND'})
                if (obj.file_id) o.params.where.push({key: 'id', type: '=', val1: obj.file_id, comparisonType: 'AND'})
                _t.api(o, (err, res) => {
                    if (err) return cb(err);
                    for (let i in res) res[i].name = res[i].type ? res[i].type + ':' + (res[i].description ? res[i].description : res[i].file_name_load) : (res[i].description ? res[i].description : res[i].file_name_load);
                    cb(null, res);
                })
            }
        },function (err, res) {
            if (err) return cb(err);
            cb(null, new UserOk('noToastr',{data:res.getFiles}));
        });
    };
    getTypes(obj, cb) {
        if (arguments.length == 1) {
            cb = arguments[0];
            obj = {};
        }
        var _t = this;
        // if (!obj.parent_id) return cb(new MyError('Не передан id'));
        // let parent_id = obj.parent_id;
        async.series({
            getTypes: cb => {
                let o = {
                    command: 'get',
                    object: _t.class_type_file,
                    params: {
                        collapseData: false
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(err);
                    cb(null, res);
                })
            }
        },function (err, res) {
            if (err) return cb(err);
            cb(null, new UserOk('noToastr',{data:res.getTypes}));
        });
    }
}

module.exports = File;
