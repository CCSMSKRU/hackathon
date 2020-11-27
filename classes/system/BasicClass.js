/**
 * Created by iig on 28.11.2015.
 */
/**
 * Created by iig on 04.11.2015.
 */
var MyError = require('../../error').MyError;
var UserError = require('../../error').UserError;
var UserOk = require('../../error').UserOk;
var MySQLModel = require('../../models/system/MySQLModel');
var util = require('util');
var async = require('async');
var fs = require('fs');
var moment = require('moment');
var api = require('../../libs/api');
var Guid = require('guid');
var funcs = require('../../libs/functions');
var config = require('../../config');
var ToExcel = require('../../libs/ToExcel.js');
var toFile = require('../../modules/saveToFile').toFile;
var rollback = require('../../modules/rollback');
var DataMigration = require('../../modules/data_migration/index');

var BasicClass = function (obj) {
    var mysqlmodel = MySQLModel.call(this, obj);
    if (mysqlmodel instanceof MyError) return mysqlmodel;
    // this.parent_ids_obj = {};
    var _t = this;
    this.parent_ids = {
        items:[],
        get: function(key, autocreate = true){
            key = key || funcs.guidShort();

            for (var i in _t.parent_ids.items) {
                if (_t.parent_ids.items[i].key === key) return _t.parent_ids.items[i];
            }
            if (!autocreate) return false;
            let new_item = {
                key:key,
                ids_obj:{}
            };
            _t.parent_ids.items.push(new_item);
            return new_item;
        },
        remove:function(key){
            for (var i in _t.parent_ids.items) {
                if (_t.parent_ids.items[i].key === key) _t.parent_ids.items.splice(i,1);
            }
        },
        clear: function () {
            _t.parent_ids.items = [];
        },
        saveToParentObj: (obj, cb)=>{
            var id = obj.id;
            var ids = obj.ids;
            var locked;
            var key = obj.parent_ids_key || obj.key;
            var parent_ids_item = _t.parent_ids.get(key);
            if (!parent_ids_item) return cb(new MyError('Некорректно передан parent_ids_key или key',{obj:obj}));

            async.series({
                // lockCurrent:function(cb){
                //     var o = {
                //         id:id,
                //         timeout:10
                //     };
                //     _t.lock(o, (err, key)=>{
                //         if (err) return cb(err);
                //         // if (typeof locked_ids !== 'object') locked_ids = {};
                //         // locked_ids[id_key] = key;
                //         locked = {
                //             id:id,
                //             key:key
                //         };
                //         cb(null);
                //     });
                // },
                resolve:function(cb){
                    if (parent_ids_item.ids_obj[id]) return cb(null);
                    parent_ids_item.ids_obj[id] = ids;
                    if (!ids.length) return cb(null); // Это корневой элемент
                    // Сохраним остальной массив как отдельные элементы объекта
                    var p = {
                        id:ids[0],
                        ids:ids.slice(1,ids.length),
                        parent_ids_key:parent_ids_item.key
                        // locked_ids:locked_ids
                    };
                    _t.parent_ids.saveToParentObj(p, cb);
                }
            }, (err, res)=>{
                if (!locked) return cb(err, res);
                _t.unlock(locked,(err2)=>{
                    if (err) {
                        return cb(new MyError('Не удалось saveToParentObj',{err:err, params:obj}));
                    }
                    cb(null, res);
                })
            });
        }
    };
    this.parent_relation = {
        items:[],
        get: function(key, autocreate = true){
            key = key || funcs.guidShort();

            for (var i in _t.parent_relation.items) {
                if (_t.parent_relation.items[i].key === key) return _t.parent_relation.items[i];
            }
            if (!autocreate) return false;
            let new_item = {
                key:key,
                ids_obj:{}
            };
            _t.parent_relation.items.push(new_item);
            return new_item;
        },
        remove:function(key){
            for (var i in _t.parent_relation.items) {
                if (_t.parent_relation.items[i].key === key) _t.parent_relation.items.splice(i,1);
            }
        },
        clear: function () {
            _t.parent_relation.items = [];
        }
    };
};
util.inherits(BasicClass, MySQLModel);

BasicClass.prototype.init = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
    var _t = this;

    BasicClass.super_.prototype.init.apply(this, [obj, function (err) {
        // Выполним инициализацию BasicClass
        if (typeof global.class_locks!=='object') global.class_locks = {};
        if (typeof global.class_locks[_t.name]!=='object') global.class_locks[_t.name] = {};
        cb(err);
    }]);
};
BasicClass.prototype.removeOrig = BasicClass.prototype.remove;

BasicClass.prototype.remove = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj}));
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    obj.rollback_key = rollback_key;

    var class_operation;
    async.series({
        remove:function(cb){
            _t.removeOrig(obj, function (err, res) {
                if (err) return cb(new MyError(`Не удалось удалить ${_t.name}.`,{id:id,err:err})); // Could not remove
                cb(null, res);
            });
        },
        removeFromAccessList:function(cb){
            if (obj.doNotClearAccessList) return cb(null);
            var class_operation_ids = [];
            var list_of_access_ids = [];
            async.series({
                getOperationsOfClasses:function(cb){
                    var o = {
                        command:'get',
                        object:'class_operation',
                        params:{
                            param_where:{
                                class_id:_t.class_profile.id
                            },
                            limit:1000000000,
                            collapseData:false
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить операции класса',{o : o, err : err})); // Could not get class_operation
                        for (var i in res) {
                            class_operation_ids.push(res[i].id);
                        }
                        cb(null);
                    });
                },
                getFromAcclist:function(cb){
                    if (!class_operation_ids.length) return cb(null);

                    var o = {
                        command:'get',
                        object:'list_of_access',
                        params:{
                            where:[
                                {
                                    key:'record_id',
                                    val1:id
                                },
                                {
                                    key:'class_operation_id',
                                    type:'in',
                                    val1:class_operation_ids,
                                }
                            ],
                            limit:100000000000,
                            collapseData:false
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить list_of_access',{o : o, err : err})); // Could not get
                        list_of_access_ids = res;
                        cb(null);
                    });

                },
                remove:function(cb){
                    async.eachSeries(list_of_access_ids, function(item, cb){
                        var o = {
                            command:'removeCascade',
                            object:'list_of_access',
                            params:{
                                id:item.id,
                                doNotClearAccessList:true,
                                rollback_key:rollback_key
                            }
                        };
                        _t.api(o, function(err, res){
                            if(err) return cb(new MyError('При попытке удалить записи из list_of_access возникла ош',{err:err, o:o})); // An error occurred while trying to delete entries from list_of_access
                            cb(null);
                        })
                    }, cb);
                }
            }, cb);
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


BasicClass.prototype.addHistory = function (obj, cb) { // Создадим запись в истории
    var _t = this;
    if (typeof cb !== 'function') throw new MyError('В addHistory не передана функция cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не передан obj', {method: 'addHistory'}));
    var id = obj.id || obj.id;
    if (!id) return cb(new MyError('В addHistory не передан id'));
    var record_ = obj.record;
    var desc;

    if (obj.deleted) desc = 'Запись удалена';
    async.series({
        getRecord: function (cb) {
            if (typeof record_=='object') return cb(null);
            _t.getById({id:id,deleted:true}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить данные для записи истории.',{id:id, err:err}));
                record_ = res[0];
                cb(null);
            });
        },
        setHistory: function (cb) {
            var o = {
                command: 'add',
                object: _t.name + '_history_log',
                params: {
                    description:desc || obj.description || obj.desc || '',
                    datetime: funcs.getDateTimeMySQL()
                }
            };

            var excludeCols = ['id','published','deleted','created','updated'];
            for (var i in record_) {
                if (excludeCols.indexOf(i)!==-1) continue;
                o.params[i] = record_[i]
            }
            for (var i in obj) {
                if (typeof obj[i] == 'object') continue;
                o.params[i] = obj[i]
            }
            o.params[_t.name.toLowerCase() + '_id'] = id;

            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось добавить запись в историю.', {
                    err: err,
                    record_id: id,
                    params: o.params
                }));
                cb(null);
            })
        }
    },cb);

};
BasicClass.prototype.export_to_excel = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;

    // Получить данные
    // Сохранить в excel

    var name = (((_t.class_profile.name_ru)? _t.class_profile.name_ru.substr(0,20) : _t.class_profile.name.substr(0,20)) || 'file')+'_'+moment().format('DDMMYYYY_HHmm')+'.xlsx';
    var fileName = 'savedFiles/'+name;
    //var fileName = config.root_public+'reports/' + file_name + '.json';


    var class_fields_profile = obj.class_fields_profile || _t.class_fields_profile;
    var data, data_columns, extra_data;
    var excel;
    var offset = (!isNaN(+obj.start_no))? obj.start_no - 1 : 0;
    async.series({
        getData:function(cb){
            if (obj.data){ // Передан res. При этом collapseData = false в основном запросе на данные. Это нужно чтобы был профайл.
                data_columns = obj.data.data_columns;
                extra_data = obj.data.extra_data;
                data = funcs.jsonToObj(obj.data);
                return cb(null);
            }

            var params = {
                where:obj.where,
                sort:obj.sort,
                offset:offset,
                limit:obj.limit,
                use_cache:false,
                doNotLog:true
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить данные',{params : params, err : err}));
                data_columns = res.data_columns;
                extra_data = res.extra_data;
                data = funcs.jsonToObj(res);

                cb(null);
            });
        },
        toExcel:function(cb){
            excel = new ToExcel({name:name});
            excel.addWorksheet({});
            async.series({
                addColumns:function(cb){
                    var columns = [];
                    for (var i in data_columns) {
                        if (!class_fields_profile[data_columns[i]].visible) {
                            continue;
                        }
                        columns.push({
                            header:class_fields_profile[data_columns[i]].name_ru || class_fields_profile[data_columns[i]].name || data_columns[i],
                            key:data_columns[i]
                        });
                    }

                    columns.forEach(column => {
                        column.width = column.header.length < 12 ? 12 : column.header.length
                    })

                    excel.setColumns({columns:columns});
                    return cb(null);
                },
                addRows:function(cb){
                    var rows = [];
                    for (var i in data) {
                        var row = data[i];
                        var newRow = [];

                        for (var j in row) {
                            var profile = class_fields_profile[j];
                            if (!profile.visible) continue;

                            if(row[j] === true) row[j] = 'Да';
                            if(row[j] === false) row[j] = 'Нет';

                            newRow.push(row[j]);

                        }
                        rows.push(newRow);
                    }
                    excel.worksheet.addRows(rows);
                    return cb(null);
                    // excel.setColumns({columns:columns});
                    // return cb(null);
                },
                save:function(cb){
                    //writeFile
                    excel.writeFile({}, cb)
                }
            }, function(err, res){
                if (err) return cb(err);
                return cb(null, res.save)
            });
        }
    },function (err, res) {
        if (err) return cb(err);
        cb(null, res.toExcel);
    });
};

BasicClass.prototype.export_to_json = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;

    // Получить данные
    // Сохранить в excel

    var name = (((_t.class_profile.name_ru)? _t.class_profile.name_ru.substr(0,20) : _t.class_profile.name.substr(0,20)) || 'file')+'_'+moment().format('DDMMYYYY_HHmm')+'.json';
    var path = './public/savedFiles/';
    // var fileName = './public/savedFiles/'+name;
    //var fileName = config.root_public+'reports/' + file_name + '.json';


    var class_fields_profile = obj.class_fields_profile || _t.class_fields_profile;
    var data, data_columns, extra_data;
    var excel;
    var offset = (!isNaN(+obj.start_no))? obj.start_no - 1 : 0;
    async.series({
        getData:function(cb){
            if (obj.data){ // Передан res. При этом collapseData = false в основном запросе на данные. Это нужно чтобы был профайл.
                data_columns = obj.data.data_columns;
                extra_data = obj.data.extra_data;
                data = Object.values(funcs.jsonToObj(obj.data));
                return cb(null);
            }

            var params = {
                where:obj.where,
                sort:obj.sort,
                offset:offset,
                limit:obj.limit,
                use_cache:false,
                doNotLog:true
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить данные',{params : params, err : err}));
                data_columns = res.data_columns;
                extra_data = res.extra_data;
                // data = funcs.jsonToObj(res);
                data = Object.values(funcs.jsonToObj(res));

                cb(null);
            });
        },
        toFile:function(cb){

            // Запишем в файл
            toFile({fileName: path + name, flags: "w", data: JSON.stringify(data || {}), encoding: 'utf8'}, function (err, name_with_path) {
                if (err) return cb(new UserError('Не удалось сохранить файл.', err));
                cb(null, new UserOk('Ок.',{filename:name,path:'/savedFiles/',name_ru:name}))
            });

        }
    },function (err, res) {
        if (err) return cb(err);
        cb(null, res.toFile);
    });
};

BasicClass.prototype.save_to_json = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;

    // _t.table_name

    // Получить данные
    // Сохранить в excel

    var name = (  (  _t.tableName.substr(0,20) ) || 'file')+'_'+moment().valueOf()+'.json';
    var path = './public/savedFiles/' + _t.tableName + '/';
    // var fileName = './public/savedFiles/'+name;
    //var fileName = config.root_public+'reports/' + file_name + '.json';


    var class_fields_profile = obj.class_fields_profile || _t.class_fields_profile;
    var data, data_columns, extra_data;
    var excel;
    var offset = (!isNaN(+obj.start_no))? obj.start_no - 1 : 0;
    async.series({
        getData:function(cb){
            if (obj.data){ // Передан res. При этом collapseData = false в основном запросе на данные. Это нужно чтобы был профайл.
                data_columns = obj.data.data_columns;
                extra_data = obj.data.extra_data;
                data = Object.values(funcs.jsonToObj(obj.data));
                return cb(null);
            }

            var params = {
                where:obj.where,
                sort:obj.sort,
                offset:offset,
                limit:obj.limit,
                use_cache:false,
                doNotLog:true
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить данные',{params : params, err : err}));
                data_columns = res.data_columns;
                extra_data = res.extra_data;
                // data = funcs.jsonToObj(res);
                data = Object.values(funcs.jsonToObj(res));

                cb(null);
            });
        },
        makeDir: async function(cb){
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path)
            }
            cb(null)
        },
        toFile:function(cb){

            // if (_t.tableName == 'add_field_tangibles_route') {
            //     debugger
            // }
            let full_path = path + name;
            full_path.replace('/','')
            full_path.replace('\\','')
            toFile({fileName: full_path, flags: "w", data: JSON.stringify(data || {}), encoding: 'utf8'}, function (err, name_with_path) {
                if (err) return cb(new UserError('Не удалось сохранить файл.', err));
                cb(null, new UserOk('Ок.',{filename:full_path,path:'/savedFiles/',name_ru:name}))
            });
        }
    },function (err, res) {
        if (err) return cb(err);
        cb(null);
    });
};


BasicClass.prototype.lock = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('В метод не передан id'));
    var key = obj.key || obj.lock_key || Guid.create().value;
    obj.timestart = obj.timestart || new moment();
    var locktime = obj.locktime || 10000;
    if (global.class_locks[_t.name][id]) {
        if (global.class_locks[_t.name][id].key != key){

            var diff = moment().diff(obj.timestart);
            if (diff > locktime){

                return cb(new UserError('Запись уже заблокирована другим процессом. Более 10 сек (lock)',{obj:obj, name:_t.name}));
            }
            setTimeout(function () {
                console.log('LOCK+>',_t.name, id, key);
                _t.lock(obj, cb);
            },obj.timeout || 500);
            return;
        }
    }
    global.class_locks[_t.name][id] = {
        key:key,
        timestart:obj.timestart
    };
    return cb(null, key);
};
BasicClass.prototype.unlock = function (obj, cb) {
    if (typeof cb!=='function') cb = function (err, res) {
        console.log('unlock--'+ _t.name +'--'+ obj.id +'-->',err, res);
    };
    if (typeof obj!=='object') return cb(new MyError('В метод не передан объект'));
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('В метод не передан id'));
    var key = obj.key || obj.lock_key;


    if (!global.class_locks[_t.name][id]) return cb(null);
    if (global.class_locks[_t.name][id].key!==key) {
        return cb(new MyError('Запись не разблокирована. Неверный ключ.',{key:key}));
    }
    global.class_locks[_t.name][id] = false;
    return cb(null);
};
BasicClass.prototype.checkLock = function (id) {
    return !!global.class_locks[this.name][id];
};
BasicClass.prototype.getTree = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    // if (!_t.getTreeByAnotherKey && _t.class_profile.server_parent_table[0].toLowerCase() !== _t.name.toLowerCase()){
    //     return cb(new MyError('Данная сущность не ссылается сама на себе. Метод не может быть реализован.',{name:_t.name, class_profile:_t.class_profile}));
    // }
    var id = obj.id;
    var ids = obj.ids || [];
    var load_all_top = obj.load_all_top;
    // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj}));
    var tree = [];
    var child_tree = obj.child_tree;
    var essence;

    var need_to_load_ids = obj.need_to_load_ids || [];
    // var ids = obj.ids || [];
    var tree_index;
    var tree_ids = obj.tree_ids || [];
    var errors = [];
    var info = [];

    if (!_t.client_object){
        info.push('client_object не указан. Часть настроек может быть у клиентского объекта, а не класса. Если нужно, укажите client_object при вызове getTree');
    }

    // var _class = obj._class || _t.name;
    // var _client_object = obj._client_object || _t._client_object;


    var self_childs;
    var childs_classes_childs;


    async.series({
        // limitOnlyIdsByListAccess:function(cb){
        //     if (!obj.only_ids) return cb(null);
        //     // Если доступ по списку, то обрежем only_ids в соответствии
        //     var params = {
        //         where:[
        //             {
        //                 key:'id',
        //                 type:'in',
        //                 val1:obj.only_ids
        //             }
        //         ],
        //         columns:['id'],
        //         collapseData:false
        //     };
        //     _t.get(params, function (err, res) {
        //         if (err) return cb(new MyError('Не удалось получить данные для ограничения only_ids списком доступа',{params : params, err : err}));
        //         obj.only_ids = [];
        //         for (var i in res) {
        //             obj.only_ids.push(res[i].id);
        //         }
        //         cb(null);
        //     });
        // },
        getTop:function(cb){
            if (id || ids.length) return cb(null);
            if (!_t.class_fields_profile.is_top) return cb(null, new MyError('Не передан id. Определить верхний уровень не возможно, так как у таблицы не предусмотрено поле is_top'));
            // var o = {
            //     command:'get',
            //     object:_class,
            //     client_object:_client_object,
            //     params:{
            //         param_where:{
            //             is_top:true
            //         },
            //         columns:['id', 'is_top'],
            //         collapseData:false
            //     }
            // };
            //
            // _t.api(o, (err, res)=>{
            //     if (err) return cb(new MyError('Не удалось получить is_top',{o : o, err : err}));
            //     if (!res.length) return cb(new MyError('Не передан id. Определить верхний уровень не возможно так как не у одной записи не стоит признак is_top'));
            //     if (res.length > 1) return cb(new MyError('Не передан id. Определить верхний уровень не возможно так как признак is_top указан у нескольких записей',{class:_class,res:res}));
            //     id = res[0].id;
            //     cb(null);
            // });
            var params = {
                param_where:{
                    is_top:true
                },
                columns:['id', 'is_top'],
                collapseData:false,
                doNotLog:true
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить is_top',{params : params, err : err}));
                if (res.length > 1) return cb(new MyError('Не передан id. Определить верхний уровень не возможно так как признак is_top указан у нескольких записей',{class:_t.name,res:res}));
                if (!res.length) return cb(null);
                id = res[0].id;
                cb(null);
            });
        },
        getAllIfNoID: cb => {
            if ((id || ids.length) && !load_all_top) return cb(null);
            var params = {
                columns:['id'],
                collapseData:false,
                limit:10000000000,
                doNotLog:true
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить все записи класса',{params : params, err : err}));
                res.forEach(one => {
                    ids.push(one.id);
                });
                cb(null);
            });

        },
        checkIds:function(cb){
            if (!isNaN(+id)) ids.push(id);
            if (!ids.length) return cb(null);
            if (!ids.length) return cb(new MyError('Не передан id или ids',{obj:obj})); // Not passed to id or ids
            // Если доступ по списку, то обрежем в соответствии
            var params = {
                where:[
                    {
                        key:'id',
                        type:'in',
                        val1:ids
                    }
                ],
                columns:['id'],
                collapseData:false,
                doNotLog:true
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить данные для ограничения only_ids списком доступа',{params : params, err : err}));
                ids = [];
                for (var i in res) {
                    ids.push(res[i].id);
                }
                cb(null);
            });
        },
        checkIds2:function(cb){
            if (!obj.only_ids) return cb(null); //
            if (!obj.only_ids.length) return cb(null); //
            // Если доступ по списку, то обрежем в соответствии
            var params = {
                where:[
                    {
                        key:'id',
                        type:'in',
                        val1:obj.only_ids
                    }
                ],
                columns:['id'],
                collapseData:false,
                doNotLog:true
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить данные для ограничения only_ids списком доступа',{params : params, err : err}));
                obj.only_ids = [];
                for (var i in res) {
                    obj.only_ids.push(res[i].id);
                }
                cb(null);
            });
        },
        getTreeForEach:function(cb){
            if (!ids.length) return cb(null);
            if (!ids.length) return cb(new UserError('noToastr',{msg:'ID по которым требуется построить список не попадает в список "доступных по списку"',ids:ids, obj:obj, _t:_t})); // Not passed to id or ids
            // if (!ids.length) return cb(new MyError('Не передан id или ids',{obj:obj})); // Not passed to id or ids
            async.eachSeries(ids, function(one_tree_id, cb){

                if (tree_ids.indexOf(one_tree_id) !== -1 && !child_tree) return cb(null);
                // console.log('sdss dasd', one_tree_id);
                async.series({
                    onlyIDs:function(cb){
                        if (!obj.only_ids) return cb(null);
                        async.eachSeries(obj.only_ids, function(id_item, cb){
                            if (need_to_load_ids.indexOf(id_item) !== -1) return cb(null);
                            _t.getParentIds({id:id_item}, function(err, res){
                                if (err) return cb(err);
                                need_to_load_ids.push(id_item);
                                for (var i in res.ids) {
                                    if (need_to_load_ids.indexOf(res.ids[i]) !== -1)continue;
                                    need_to_load_ids.push(res.ids[i]);
                                }
                                cb(null);
                            })
                        }, cb);
                    },
                    get:function(cb){
                        // console.log(need_to_load_ids);
                        // if (need_to_load_ids.indexOf(one_tree_id) === -1) return cb(null);
                        _t.getById({id:one_tree_id}, function (err, res) {
                            if (err) {
                                return cb(new MyError('Не удалось получить сущность.',{id:one_tree_id,err:err}));
                            }
                            essence = {...res[0]};
                            essence._object = _t.name;
                            essence._client_object =  _t.client_object;
                            essence._content_client_object =  _t.class_profile.child_client_object;
                            cb(null);
                        });
                    },
                    getSelfChilds:function(cb){
                        if (obj.doNotLoadChild) return cb(null);
                        if (!essence) return cb(null);
                        if (!_t.class_profile.hierarchical_table) return cb(null);

                        async.series({
                            getChilds: cb => {
                                var params = {
                                    // param_where:{
                                    //     parent_id:essence.id
                                    // },
                                    where:[
                                        {
                                            key:obj.getTree_parent_key || _t.getTree_parent_key || 'parent_id',
                                            val1:essence.id
                                        }

                                    ],
                                    sort:{
                                        columns:['name'],
                                        directions:['ASC']
                                    },
                                    limit:1000000000,
                                    collapseData:false,
                                    doNotLog:true
                                };
                                if (obj.where){
                                    for (var i in obj.where) {
                                        params.where.push(obj.where[i]);
                                    }
                                }
                                if (_t.getTree_where){
                                    for (var i in _t.getTree_where) {
                                        params.where.push(_t.getTree_where[i]);
                                    }
                                }
                                _t.get(params, function (err, res) {
                                    if (err) return cb(new MyError('Не удалось получить детей сущности',{params : params, err : err}));
                                    res = res.map(one => {
                                        return {...one, _object:_t.name, _client_object: _t.client_object, _content_client_object :_t.class_profile.child_client_object}
                                    });
                                    // res.forEach(one_ => {
                                    //     one_._object = _t.name;
                                    //     one_._client_object =  _t.client_object;
                                    // });
                                    self_childs = res;
                                    cb(null);
                                });
                            },
                            getChildChilds:function(cb){
                                if (!self_childs) return cb(null);
                                async.eachSeries(self_childs, function(item, cb){
                                    var params = {
                                        // param_where:{
                                        //     parent_id:item.id
                                        // },
                                        where:[
                                            {
                                                key:obj.getTree_parent_key || _t.getTree_parent_key || 'parent_id',
                                                val1:item.id
                                            }
                                        ],
                                        columns:['id','name'],
                                        limit:1000000000,
                                        // countOnly:true,
                                        // sort:{
                                        //     columns:['name'],
                                        //     directions:['ASC']
                                        // },
                                        collapseData:false,
                                        doNotLog:true
                                    };
                                    _t.get(params, function (err, res) {
                                        if (err) return cb(new MyError('Не удалось получить детей детей сущности',{params : params, err : err}));
                                        // if
                                        // item.children = (res.count)? [] : false;
                                        res = res.map(one => {
                                            return {...one, _object:_t.name, _client_object: _t.client_object, _content_client_object :_t.class_profile.child_client_object}
                                        });
                                        // res.forEach(one_ => {
                                        //     one_._object = _t.name;
                                        //     one_._client_object =  _t.client_object;
                                        // });
                                        item.children = res && res.length ? res : null;
                                        cb(null);
                                    });
                                }, cb);
                            }
                        }, cb);
                    },
                    getChildsChildClass: cb => { // Дочерние классы
                        if (obj.doNotLoadChild) return cb(null);
                        if (!essence) return cb(null);
                        if (!_t.class_profile.child_class) return cb(null);
                        var child_class_text = _t.class_profile.child_class.split('.');
                        var child_class_name = child_class_text[0].toLowerCase();
                        var child_class_co_name = child_class_text[1]? child_class_text[1].toLowerCase() : false;
                        if (child_class_name === _t.name.toLowerCase()){
                            var err_ = new MyError(`Для класса (клиентского объекта) ${_t.class_profile.name} поле child_class указывает сам на себя.`,{class_profile: _t.class_profile});
                            console.log('ERROR getTree',err_);
                            errors.push(err_);
                            return cb(null);
                        }
                        essence._child_class =  _t.class_profile.child_class;
                        essence._child_class_name =  child_class_name;
                        essence._child_class_co_name =  child_class_co_name;


                        var child_class;
                        var parent_key;
                        async.series({
                            getProfile: cb => {
                                var o = {
                                    command:'_getClass',
                                    object:child_class_name,
                                    client_object:child_class_co_name,
                                    params:{}
                                };
                                _t.api(o, (err, res)=>{
                                    if (err) {
                                        var err_ = new MyError('Не удалось получить профайл дочернего класса',{class_profile: _t.class_profile, o : o, err : err});
                                        console.log('ERROR getTree',err_);
                                        errors.push(err_);
                                        return cb(null);
                                    }
                                    child_class = res;
                                    return cb(null);
                                });
                            },
                            getChilds: cb => {
                                if (!child_class) return cb(null);

                                var parent_index = child_class.class_profile.server_parent_table?
                                    child_class.class_profile.server_parent_table.indexOf(_t.class_profile.class.toLowerCase()) : -1;
                                if (parent_index === -1){
                                    var err_ = new MyError('У дочернего класса, родительский не найден в server_parent_table',{class_profile: _t.class_profile, child_class_profile : child_class.class_profile});
                                    console.log('ERROR getTree',err_);
                                    errors.push(err_);
                                    return cb(null);
                                }
                                parent_key = child_class.getTree_parent_key || child_class.class_profile.server_parent_key[parent_index];
                                var o = {
                                    command:'get',
                                    object: child_class.name,
                                    client_object: child_class.client_object,
                                    params:{
                                        where:[
                                            {
                                                key: parent_key,
                                                val1: essence.id
                                            }

                                        ],

                                        limit:1000000000,
                                        collapseData:false,
                                        doNotLog:true
                                    }
                                };



                                if (child_class.getTree_where){
                                    for (var i in child_class.getTree_where) {
                                        o.params.where.push(child_class.getTree_where[i]);
                                    }
                                }
                                _t.api(o, (err, res)=>{
                                    if (err) return cb(new MyError('Не удалось получить детей сущности',{o : o, err : err}));
                                    res = res.map(one => {
                                        return {...one, _object:child_class.name, _client_object: child_class.client_object, _content_client_object :child_class.class_profile.child_client_object}
                                    });
                                    // res.forEach(one_ => {
                                    //     one_._object = child_class.name;
                                    //     one_._client_object = child_class.client_object;
                                    // });
                                    childs_classes_childs = res;
                                    cb(null);
                                });
                            },
                            getChildChilds:function(cb){
                                if (!childs_classes_childs) return cb(null);
                                async.eachSeries(childs_classes_childs, function(item, cb){

                                    async.series({
                                        getSelf: cb => {
                                            if (!child_class.hierarchical_table) return cb(null);
                                            var o = {
                                                command:'get',
                                                object: child_class.name,
                                                client_object: child_class.client_object,
                                                params:{
                                                    where:[
                                                        {
                                                            key:parent_key,
                                                            val1:item.id
                                                        }
                                                    ],
                                                    columns:['id','name'],
                                                    limit:1000000000,
                                                    collapseData:false,
                                                    doNotLog:true
                                                }
                                            };
                                            _t.api(o, (err, res)=>{
                                                if (err) return cb(new MyError('Не удалось получить детей детей сущности (иерархической)',{o : o, err : err}));
                                                res = res.map(one => {
                                                    return {...one, _object:child_class.name, _client_object: child_class.client_object, _content_client_object :child_class.class_profile.child_client_object}
                                                });
                                                // res.forEach(one_ => {
                                                //     one_._object = child_class.name;
                                                //     one_._client_object = child_class.client_object;
                                                // });
                                                item.children = res && res.length ? res : null;
                                                cb(null);
                                            });
                                        },
                                        getChildClass: cb => {

                                            if (obj.doNotLoadChild) return cb(null);
                                            if (!item) return cb(null);
                                            if (!child_class.class_profile.child_class) return cb(null);

                                            var child_class_text2 = child_class.class_profile.child_class.split('.');
                                            var child_class_name2 = child_class_text2[0].toLowerCase();
                                            var child_class_co_name2 = child_class_text2[1]? child_class_text2[1].toLowerCase() : false;
                                            if (child_class_name2 === child_class.name.toLowerCase()){
                                                var err_ = new MyError(`Для класса (клиентского объекта) ${child_class.class_profile.name} поле child_class указывает сам на себя. (уже child_class)`,{class_profile: child_class.class_profile});
                                                console.log('ERROR getTree',err_);
                                                errors.push(err_);
                                                return cb(null);
                                            }

                                            item._child_class =  child_class.class_profile.child_class;
                                            item._child_class_name =  child_class_name2;
                                            item._child_class_co_name =  child_class_co_name2;


                                            var child_class2;
                                            async.series({
                                                getProfileChild: cb => {
                                                    var o = {
                                                        command:'_getClass',
                                                        object:child_class_name2,
                                                        client_object:child_class_co_name2,
                                                        params:{}
                                                    };
                                                    _t.api(o, (err, res)=>{
                                                        if (err) {
                                                            var err_ = new MyError('Не удалось получить профайл дочернего класса2',{class_profile: child_class.class_profile, o : o, err : err});
                                                            console.log('ERROR getTree',err_);
                                                            errors.push(err_);
                                                            return cb(null);
                                                        }
                                                        child_class2 = res;
                                                        return cb(null);
                                                    });
                                                },
                                                getChilds: cb => {
                                                    if (!child_class2) return cb(null);

                                                    var parent_index = child_class2.class_profile.server_parent_table?
                                                        child_class2.class_profile.server_parent_table.indexOf(child_class.class_profile.class.toLowerCase()) : -1;
                                                    if (parent_index === -1){
                                                        var err_ = new MyError('У дочернего класса, родительский не найден в server_parent_table',{class_profile: child_class.class_profile, child_class_profile : child_class2.class_profile});
                                                        console.log('ERROR getTree',err_);
                                                        errors.push(err_);
                                                        return cb(null);
                                                    }
                                                    parent_key = child_class2.getTree_parent_key || child_class2.class_profile.server_parent_key[parent_index];
                                                    var o = {
                                                        command:'get',
                                                        object: child_class2.name,
                                                        client_object: child_class2.client_object,
                                                        params:{
                                                            where:[
                                                                {
                                                                    key: parent_key,
                                                                    val1: item.id
                                                                }

                                                            ],

                                                            limit:1000000000,
                                                            collapseData:false,
                                                            doNotLog:true
                                                        }
                                                    };



                                                    if (child_class2.getTree_where){
                                                        for (var i in child_class2.getTree_where) {
                                                            o.params.where.push(child_class2.getTree_where[i]);
                                                        }
                                                    }
                                                    _t.api(o, (err, res)=>{
                                                        if (err) return cb(new MyError('Не удалось получить детей сущности',{o : o, err : err}));
                                                        res = res.map(one => {
                                                            return {...one, _object:child_class2.name, _client_object: child_class2.client_object, _content_client_object :child_class2.class_profile.child_client_object}
                                                        });
                                                        // res.forEach(one_ => {
                                                        //     one_._object = child_class2.name;
                                                        //     one_._client_object = child_class2.client_object;
                                                        // });
                                                        item.children = res && res.length ? res : null;
                                                        cb(null);
                                                    });
                                                },
                                            }, cb);
                                        }
                                    }, cb);


                                }, cb);
                            }
                        }, cb);

                    },

                    compileTree:function(cb){
                        if (!essence) return cb(null);


                        var child_tree_index = obj.child_tree_index || 0;
                        // // Перенесем ноды, которые уже сформированы в новое дерево / We will transfer the nodes that are already formed into a new tree
                        // if (child_tree){
                        //     for (var i in child_tree) {
                        //         if (i === child_tree_index) continue;
                        //         tree.push(child_tree[i]);
                        //     }
                        // }


                        essence._id = essence.id;
                        essence.id = essence.id + '_' + (essence._object || '') + '.' + (essence._client_object || '');

                        // 1
                        if (tree_ids.indexOf(essence.id) === -1) tree_ids.push(essence.id);


                        var child_client_object_arr = (essence._content_client_object)? essence._content_client_object.split('.') : [];
                        essence._content_class = child_client_object_arr[0]? child_client_object_arr[0].toLowerCase() : null;
                        essence._content_co = child_client_object_arr[1]? child_client_object_arr[1].toLowerCase() : null;

                        tree.push({
                            id:essence.id,
                            name:essence.name,
                            name_with_id:essence.name_with_id,
                            item:essence,
                            css_classes:(typeof obj.getTreeCSSClassesFunction === 'function')? obj.getTreeCSSClassesFunction(essence) : (typeof _t.getTreeCSSClassesFunction === 'function')? _t.getTreeCSSClassesFunction(essence) : [],
                            text:(typeof _t.getTreeNameFunction === 'function')? _t.getTreeNameFunction(essence) : essence.name,
                            children:[],
                            count:0,
                            expanded:true,
                            state:{
                                opened:true,
                                // selected:!obj.child_tree
                                selected:(typeof obj.selected === 'undefined')? obj.selected : (typeof _t.getTreeSelectedFunction === 'function')? _t.getTreeSelectedFunction(essence) : !obj.child_tree,
                            }
                        });
                        tree_index = tree.length -1;


                        var full_childs = [...(self_childs || []), ...(childs_classes_childs || [])];
                        for (var i in full_childs) {
                            // if (need_to_load_ids.indexOf(childs[i].id) === -1 && need_to_load_ids.indexOf(childs[i].parent_id) === -1) return cb(null);
                            if (obj.only_ids){
                                if (need_to_load_ids.indexOf(full_childs[i].id) === -1) continue;
                            }


                            full_childs[i]._id = full_childs[i].id;
                            full_childs[i].id = full_childs[i].id + '_' + (full_childs[i]._object || '') + '.' + (full_childs[i]._client_object || '');

                            // 2
                            if (tree_ids.indexOf(full_childs[i].id) === -1) tree_ids.push(full_childs[i].id);

                            var child_client_object_arr2 = (full_childs[i]._content_client_object)? full_childs[i]._content_client_object.split('.') : [];
                            full_childs[i]._content_class = child_client_object_arr2[0]? child_client_object_arr2[0].toLowerCase() : null;
                            full_childs[i]._content_co = child_client_object_arr2[1]? child_client_object_arr2[1].toLowerCase() : null;

                            tree[tree_index].children.push({
                                id:full_childs[i].id,
                                name:full_childs[i].name,
                                name_with_id:full_childs[i].name_with_id,
                                item:full_childs[i],
                                css_classes:(typeof obj.getTreeCSSClassesFunction === 'function')? obj.getTreeCSSClassesFunction(full_childs[i]) : (typeof _t.getTreeCSSClassesFunction === 'function')? _t.getTreeCSSClassesFunction(full_childs[i]) : [],
                                text:(typeof _t.getTreeNameFunction === 'function')? _t.getTreeNameFunction(full_childs[i]) : full_childs[i].name,
                                // children:[],
                                children:!!full_childs[i].children,
                                // children:(childs[i].children)? [{
                                //     needToLoad:true
                                // }] : [],
                                needToLoadChilds:!!full_childs[i].children,
                                count:0
                            });
                            tree[tree_index].count++;
                        }

                        if (child_tree){
                            // console.log('child_node', child_tree);

                            for (var i in tree[tree_index].children) {
                                var child_node = tree[tree_index].children[i];
                                if (+child_node.id === +child_tree[child_tree_index].id){
                                    // Если нашли такую ноду (один из детей текущего дерева), то заменяем ее на дочернее дерево, которое загружено более полно
                                    // If we found such a node (one of the children of the current tree), then we replace it with a child tree, which is loaded more fully
                                    tree[tree_index].children[i] = child_tree[child_tree_index];
                                    break;
                                }
                            }
                            var tmp_tree = [];
                            for (var i2 in child_tree) {
                                if (+i2 === +child_tree_index) continue;
                                tmp_tree.push(child_tree[i2]);
                            }
                            for (var i3 in tree) {
                                tmp_tree.push(tree[i3]);
                            }
                            tree = tmp_tree;

                        }



                        cb(null);
                    },
                    getParent:function(cb){
                        if (!essence) return cb(null);
                        if (obj.doNotLoadParent) return cb(null);
                        essence.parent_id = essence[(obj.getTree_parent_key || _t.getTree_parent_key || 'parent_id')];
                        if (!essence.parent_id) return cb(null);
                        var params = {
                            id:essence.parent_id,
                            child_tree:tree,
                            child_tree_index:tree_index,
                            tree_ids:tree_ids,
                            only_ids:obj.only_ids
                        };
                        _t.getTree(params, function(err, res){
                            if (err) return cb(err);
                            tree = res.tree;
                            cb(null);
                        })
                    }
                }, cb);
            }, cb);
        }
    },function (err, res) {
        if (err) return cb(err);
        var resTree = tree;
        if (!obj.child_tree){
            resTree = {
                'core': {
                    'data': tree
                }
            };
        }


        cb(null, new UserOk('noToastr',{tree:resTree, errors, info}));

    });
};

BasicClass.prototype.getTreeChilds = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj}));
    // var params = {
    //     id:id,
    //     doNotLoadParent:true
    // };
    obj.doNotLoadParent = true;
    obj.fromClient = false;

    var _class = obj._class || _t.name;
    var _client_object = obj._client_object || _t._client_object;

    var o = {
        command:'getTree',
        object:_class,
        client_object:_client_object,
        params:obj
    };
    _t.api(o, (err, res)=>{
        if (err) return cb(new MyError('Не удалось получить детей.',{o : o, err : err}));
        return cb(null, new UserOk('noToastr',{tree:res.tree}));
    });

    // _t.getTree(obj, function(err, res){
    //     if (err) return cb(new MyError('Не удалось получить детей.', {err:err, obj:obj}));
    //     return cb(null, new UserOk('noToastr',{tree:res.tree}));
    // })
};

/**
 * Сохранит в parent_obj всю цепочку ids [1,2,3] ==> {3:[2,1],2:[1],1:[]}
 * @param obj
 * @param cb
 * @returns {*}
 */
// var saveToParentObj = (obj, cb)=>{
//     var id = obj.id;
//     var ids = obj.ids;
//     // Залочим для всех ids
//     var locked_ids = obj.locked_ids;
//     var locked;
//     var parent_ids_item = _t.parent_ids.get(obj.parent_ids_key);
//     // if (parent_obj[id]) return cb(null); // Уже есть значение, не нужно сохранять ==> Выходим
//
//     async.series({
//         // lockCurrent:function(cb){
//         //     if (locked_ids) return cb(null);
//         //     async.each(ids, function(id_key, cb){
//         //         // if (_t.checkLock(id_key)) return cb(null);
//         //         var o = {
//         //             id:id_key,
//         //             timeout:10
//         //         };
//         //         _t.lock(o, (err, key)=>{
//         //             if (err) return cb(err);
//         //             if (typeof locked_ids !== 'object') locked_ids = {};
//         //             locked_ids[id_key] = key;
//         //             cb(null);
//         //         });
//         //     }, cb);
//         // },
//         lockCurrent:function(cb){
//             var o = {
//                 id:id,
//                 timeout:10
//             };
//             _t.lock(o, (err, key)=>{
//                 if (err) return cb(err);
//                 // if (typeof locked_ids !== 'object') locked_ids = {};
//                 // locked_ids[id_key] = key;
//                 locked = {
//                     id:id,
//                     key:key
//                 };
//                 cb(null);
//             });
//         },
//         resolve:function(cb){
//             if (parent_ids_item.ids_obj[id]) return cb(null);
//             parent_ids_item.ids_obj[id] = ids;
//             if (!ids.length) return cb(null); // Это корневой элемент
//             // Сохраним остальной массив как отдельные элементы объекта
//             var p = {
//                 id:ids[0],
//                 ids:ids.slice(1,ids.length)
//                 // locked_ids:locked_ids
//             };
//             saveToParentObj(p, cb);
//         }
//     }, (err, res)=>{
//         if (!locked) return cb(err, res);
//         _t.unlock(locked,(err2)=>{
//             if (err) return cb(new MyError('Не удалось saveToParentObj',{err:err, params:obj}));
//             cb(null);
//         })
//         // if (!locked_ids) return cb(err, res);
//         // async.eachSeries(Object.keys(locked_ids), function(id_key, cb){
//         //     _t.unlock({id:id_key,key:locked_ids[id_key]},(err)=>{ // У unlock нет err - игнорим
//         //         cb(null);
//         //     });
//         // }, (err2)=>{  // err2 не используем, так как игнорим ош unlock
//         //     if (err) return cb(new MyError('Не удалось saveToParentObj',{err:err, params:params}));
//         //     cb(null);
//         // });
//     });
//
//
//     // if (parent_obj[id]) return;
//     // parent_obj[id] = ids;
//     // if (!ids.length) {
//     //     return cb(null);
//     // }
//     // var id_ = ids[0];
//     // var ids_ = ids.slice(1,ids.length);
//     // saveToParentObj(p, cb);
// };

BasicClass.prototype.getParentIdsSimple = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    var ids = obj.ids || [];

    var parent_ids_item = _t.parent_ids.get(obj.parent_ids_key);
    var parent_key = obj.parent_key || obj.getTree_parent_key || _t.getTree_parent_key || 'parent_id';
    if (!_t.class_fields_profile[parent_key]) return cb(new MyError('Для данного класса нельзя получить набор родительских id по данному ключу',{parent_key:parent_key, name:_t.name})); // For this class, you can not get a set of parent found_ids for this key

    if (!isNaN(+id)) ids.push(id);
    if (!ids.length) {
        return cb(new MyError('Не передан id или ids (getParentIds)',{obj:obj}));
    } // Not passed to id or ids

    var found_ids = obj.found_ids || [];
    var item;
    async.eachSeries(ids, function(one_id, cb){
        var one_found_ids = obj.one_found_ids || [];
        async.series({
            get:function(cb){
                if (parent_ids_item.ids_obj[one_id]){
                    if (parent_ids_item.ids_obj[one_id][0]) {
                        // Если уже хранится в parent_obj, то можно не запрашивать, пусть и через кэш
                        item = {id:one_id};
                        item[parent_key] = parent_ids_item.ids_obj[one_id][0]; // Первый элемент в объекте - родитель
                        // console.log('ITEM_FROMparent_obj');
                        return cb(null);
                    }
                }
                var params = {
                    param_where:{
                        id:one_id,
                    },
                    columns:['id'],
                    doNotCheckList:obj.doNotCheckList,
                    collapseData:false,
                    doNotLog:true
                };
                params.columns.push(parent_key);
                _t.get(params, function (err, res) {
                    if (err) return cb(new MyError('Не удалось получить ' + (_t.name_ru || _t.name),{id:one_id,err:err}));
                    if (!res.length) return cb(null);
                    item = ((res[0].id !== res[0][parent_key]))?  res[0] : null;
                    cb(null);
                });
            },
            getParent:function(cb){
                if (!item) return cb(null);
                const p_id = +item[parent_key];
                if (!p_id) return cb(null);
                if (one_found_ids.indexOf(p_id) === -1) one_found_ids.push(p_id);
                if (parent_ids_item.ids_obj[p_id]){
                    // Уже находили всю цепочку вверх -> пропустим вызовы getParentIds, а сразу зададим все необходимое из "кеша"(parent_obj)
                    // console.log('parents_FROMparent_obj');
                    one_found_ids = one_found_ids.concat(parent_ids_item.ids_obj[p_id]);
                    var ids_ = [p_id].concat(parent_ids_item.ids_obj[p_id]);
                    return cb(null, {ids:ids_});
                }
                var params = {
                    id:p_id,
                    parent_key:obj.parent_key,
                    parent_ids_key:parent_ids_item.key,
                    one_found_ids:one_found_ids,
                    doNotCheckList:obj.doNotCheckList,
                    from_recursion:true
                };
                _t.getParentIdsSimple(params, cb);
            }
        }, function(err, res){
            if (err) return cb(err);
            if (obj.from_recursion) return cb(err, res);
            // Это конечная точка выполнения поиска родителей для одного id
            for (const i in one_found_ids) {
                if (found_ids.indexOf(one_found_ids[i])===-1) found_ids.push(one_found_ids[i]);
            }
            _t.parent_ids.saveToParentObj({id:one_id, ids:one_found_ids, parent_ids_key:parent_ids_item.key}, cb);
            // cb(null);
        });
    }, (err, res)=>{
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',{ids:found_ids, parent_ids_obj:parent_ids_item.ids_obj}));
    });
};

BasicClass.prototype.getParentIdsSimpleNew = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    var ids = obj.ids || [];

    var parent_ids_item = _t.parent_ids.get(obj.parent_ids_key);
    var parent_relation_item = _t.parent_relation.get(obj.parent_relation_key);
    var parent_key = obj.parent_key || obj.getTree_parent_key || _t.getTree_parent_key || 'parent_id';
    if (!_t.class_fields_profile[parent_key]) return cb(new MyError('Для данного класса нельзя получить набор родительских id по данному ключу',{parent_key:parent_key, name:_t.name})); // For this class, you can not get a set of parent found_ids for this key

    if (!isNaN(+id) && (ids.indexOf(id)===-1)) ids.push(id);
    if (!ids.length && !obj.from_recursion) {
        return cb(new MyError('Не передан id или ids (getParentIds)',{obj:obj}));
    } // Not passed to id or ids

    var found_ids = obj.found_ids || [];

    var one_found_ids = obj.one_found_ids;
    if (!one_found_ids){
        one_found_ids = {};
        for (const i in ids) {
            one_found_ids[ids[i]] = [];
        }
    }
    var ids_ = [];
    async.series({
        getInCache:(cb)=>{

            async.eachSeries(Object.keys(one_found_ids), function(top_id, cb){
                var one_id = one_found_ids[top_id][one_found_ids[top_id].length-1] || top_id; // Последний эл массива или ключ
                var old_p_id = one_id;
                var p_id = parent_relation_item.ids_obj[one_id];
                while (typeof p_id !== 'undefined'){
                    // Есть информация о родителе (из одного из предыдущих запросов)
                    if (p_id === '') { // p_id == '' ===> Родителя нет. Цепочка завершена.
                        // one_found_ids[top_id].push(p_id);
                        _t.parent_ids.saveToParentObj({id:top_id, ids:one_found_ids[top_id], parent_ids_key:parent_ids_item.key}, ()=>{
                            cb(null);
                        });
                        return;
                    }
                    // Вся Цепочка может храниться в кеше и тогда мы просто берем ее
                    if (parent_ids_item.ids_obj[p_id]){
                        one_found_ids[top_id].push(p_id);
                        one_found_ids[top_id] = one_found_ids[top_id].concat(parent_ids_item.ids_obj[p_id]);
                        _t.parent_ids.saveToParentObj({id:top_id, ids:one_found_ids[top_id], parent_ids_key:parent_ids_item.key}, ()=>{
                            return cb(null);
                        });
                        // return cb(null);
                        return;
                    }
                    one_found_ids[top_id].push(p_id);
                    old_p_id = p_id;
                    p_id = parent_relation_item.ids_obj[old_p_id];
                }
                if (ids_.indexOf(old_p_id)===-1) ids_.push(old_p_id);
                return cb(null);

            }, cb);
        },
        get:function(cb){
            if (!ids_.length) return cb(null);
            var params = {
                where:[
                    {
                        key:'id',
                        type:'in',
                        val1:ids_
                    }
                ],
                columns:['id'],
                doNotCheckList:obj.doNotCheckList,
                collapseData:false,
                doNotLog:true,
            };
            params.columns.push(parent_key);
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить ' + (_t.name_ru || _t.name),{err:err, params:params}));
                if (!res.length) {
                    for (const k in ids_) {
                        console.warn('Внимание! запись ссылается на несуществующую.', _t.name, ids_[k]);
                        parent_relation_item.ids_obj[ids_[k]] = ''; // Сделаем концом цепочки
                    }
                    return cb(null);
                }
                var ids2_ = ids_.slice();
                for (const i in res) {
                    if (+res[i][parent_key] <= 0 && res[i][parent_key]!==''){
                        console.warn('Внимание! Некорректное занчение в поле parent_field.', _t.name, {parent_key:parent_key, parent_id:res[i][parent_key]});
                        res[i][parent_key] = ''; // Сделаем концом цепочки
                    }
                    parent_relation_item.ids_obj[res[i].id] = res[i][parent_key];
                    for (var j in ids2_) {
                        if (ids2_[j] == res[i].id){ // Это нужно, чтобы вычислить какие записи не найдены
                            ids2_.splice(j,1);
                            break;
                        }
                    }
                }
                for (const k in ids2_) {
                    if (!ids2_[k]) continue;
                    console.warn('Внимание! запись ссылается на несуществующую.', _t.name, ids2_[k]);
                    parent_relation_item.ids_obj[ids2_[k]] = ''; // Сделаем концом цепочки
                }
                cb(null);
            });
        },
        getParents:function(cb){
            if (!ids_.length) return cb(null);
            var params = {
                parent_key:obj.parent_key,
                parent_ids_key:parent_ids_item.key,
                parent_relation_key:parent_relation_item.key,
                one_found_ids:one_found_ids,
                doNotCheckList:obj.doNotCheckList,
                from_recursion:true
            };
            _t.getParentIdsSimpleNew(params, cb);
        }
    }, function(err, res){
        if (err) return cb(err);
        if (obj.from_recursion) return cb(err, res);
        // Это конечная точка выполнения поиска родителей для одного id
        for (const i in one_found_ids) {
            for (const j in one_found_ids[i]) {
                if (found_ids.indexOf(one_found_ids[i][j])===-1) found_ids.push(one_found_ids[i][j]);
            }
        }
        cb(null, new UserOk('noToastr',{ids:found_ids, parent_ids_obj:parent_ids_item.ids_obj}));
    });

};

BasicClass.prototype.getParentIds = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    var ids = (Array.isArray(obj.ids))? obj.ids.slice() : [];

    var found_ids = [];
    var parent_key = obj.parent_key || obj.getTree_parent_key || _t.getTree_parent_key || 'parent_id';
    if (!_t.class_fields_profile[parent_key]) return cb(new MyError('Для данного класса нельзя получить набор родительских id по данному ключу',{parent_key:parent_key, name:_t.name})); // For this class, you can not get a set of parent found_ids for this key

    var parent_ids_item = _t.parent_ids.get(obj.parent_ids_key); // Создадим
    var parent_relation_item = _t.parent_relation.get(obj.parent_relation_key); // Создадим

    var item;
    if (!isNaN(+id)) ids.push(id);
    if (!ids.length) {
        return cb(new MyError('Не передан id или ids (getParentIds)',{obj:obj}));
    } // Not passed to id or ids

    funcs.splitByPortion({
        data:ids,
        inPortion:2000,
        maxProcess:obj.maxProcess || config.get('maxProcess') || 1
    }, (ids, cb)=>{
        var obj2 = funcs.cloneObj(obj);
        obj2.ids = ids;
        obj2.parent_ids_key = parent_ids_item.key;
        obj2.parent_relation_key = parent_relation_item.key;
        // _t.getParentIdsSimple(obj2, (err, res)=>{
        _t.getParentIdsSimpleNew(obj2, (err, res)=>{
            if (err) return cb(new MyError('Не удалось получить порцию getParentIds',{err:err, obj2:obj2}));
            // Объеденим результаты found_id
            for (var i in res.ids) {
                if (found_ids.indexOf(res.ids[i])===-1) found_ids.push(res.ids[i]);
            }
            cb(null);
        })
    }, (err, res)=>{
        _t.parent_ids.remove(parent_ids_item.key);
        _t.parent_relation.remove(parent_relation_item.key);
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',{ids:found_ids, parent_ids_obj:parent_ids_item.ids_obj}));
    });

};

// var o = {
//     command:'getChildIds',
//     object:'Taxon',
//     params:{
//         id:406758
//     }
// };
// socketQuery(o, function(r){
//     console.log(r);
// });



BasicClass.prototype.getChildIds = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id) && !Array.isArray(id)) return cb(new MyError('Не передан id',{obj:obj}));
    var ids = [];
    var parent_key = obj.parent_key || obj.getTree_parent_key || _t.getTree_parent_key || 'parent_id';
    if (!_t.class_fields_profile[parent_key]) return cb(new MyError('Для данного класса нельзя получить набор дочерних id по данному ключу',{parent_key:parent_key, name:_t.name}));
    var childs;
    async.series({
        getChilds:function(cb){
            var params = {
                // param_where:{},
                where:funcs.cloneObj(obj.where) || [],
                columns:['id'],
                notCount:true,
                limit:1000000000,
                collapseData:false,
                doNotCheckList:obj.doNotCheckList,
                doNotLog:true
            };
            if (obj.columns){
                for (var c in obj.columns) {
                    params.columns.push(obj.columns[c]);
                }
            }
            if (!Array.isArray(id)){
                params.where.push({
                    key:parent_key,
                    val1:id
                });
            }else{
                // for (var i in id) {
                //     params.where.push({
                //         key:parent_key,
                //         group:'parent_keys_OR',
                //         comparisonType:'OR',
                //         val1:id[i]
                //     });
                // }
                params.where.push({
                    key:parent_key,
                    type:'in',
                    val1:id
                });
            }
            params.where.push({
                key:'id',
                type:'!in',
                val1:id
            });
            for (var i in params.where) {
                params.columns.push(params.where[i].key);
            }
            // params.param_where[parent_key] = id;
            // params.columns.push(parent_key);
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить Детей',{params : params, err : err}));
                childs = res;
                cb(null);
            });
        },
        getChildsOfChild:function(cb){
            if (!childs || !childs.length) return cb(null);
            var child_ids = [];
            for (var i in childs) {
                var one_child = childs[i];

                child_ids.push(one_child.id);

                if (obj.count_only_with_where){
                    var corresponds_to_the_condition = true;
                    for (var i in obj.count_only_with_where) {
                        var one_where = obj.count_only_with_where[i];
                        if (one_where.values.indexOf(one_child[one_where.key]) === -1){
                            corresponds_to_the_condition = false;
                            break;
                        }
                    }
                    if (corresponds_to_the_condition) ids.push(one_child.id);
                }else{
                    ids.push(one_child.id);
                }
            }
            var params = {
                id: child_ids,
                parent_key: obj.parent_key,
                where: obj.where,
                columns: obj.columns,
                count_only_with_where: obj.count_only_with_where,
                doNotCheckList:obj.doNotCheckList
            };
            _t.getChildIds(params, function(err, res){
                if (err) return cb(err);
                ids = ids.concat(res.ids);
                cb(null);
            });
        }
    },function (err, res) {
        if (err) return cb(err);
        // console.log('getChildIds', moment().diff(t1), obj.id);
        cb(null, new UserOk('noToastr',{ids:ids}));
    });
};

BasicClass.prototype.setDefault = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj}));
    var is_default_field = obj.is_default_field || 'is_default';
    if (!_t.class_fields_profile[is_default_field]) return cb(new MyError('Класс не имеет поля ' + is_default_field + '.',{name:_t.name}));

    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var old_defaults;
    async.series({
        clearCurrentDefault:function(cb){
            var params = {
                param_where:{
                },
                collapseData:false,
                doNotLog:true
            };
            params.param_where[is_default_field] = true;
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись(и) по умолчанию',{params : params, err : err}));
                async.eachSeries(res, function(item, cb){
                    var params = {
                        id:item.id,
                        rollback_key:rollback_key
                    };
                    params[is_default_field] = false;
                    _t.modify(params, function (err, res) {
                        if (err) return cb(new MyError('Не удалось изменить запись (снять is_default)',{params : params, err : err}));
                        cb(null);
                    });
                }, cb);
            });
        },
        set:function(cb){
            var params = {
                id:id,
                rollback_key:rollback_key
            };
            params[is_default_field] = true;
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить запись (установить is_default)',{params : params, err : err}));
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
            cb(null, new UserOk('Ок'));
        }
    });
};

BasicClass.prototype.getDefault = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var is_default_field = obj.is_default_field || 'is_default';
    if (!_t.class_fields_profile[is_default_field]) return cb(new MyError('Класс не имеет поля ' + is_default_field + '.',{name:_t.name}));

    var params = {
        param_where:{},
        collapseData:false,
        doNotLog:true
    };
    params.param_where[is_default_field] = true;
    _t.get(params, function (err, res) {
        if (err) return cb(new MyError('Не удалось получить запись',{params : params, name:_t.name, err : err}));
        if (!res.length) return cb(new UserError('Запись по умолчанию не обнаружена.',{params : params, name:_t.name, res : res}));
        if (res.length > 1) return cb(new MyError('Слишком много записей по умолчанию.',{params : params, name:_t.name, res : res}));
        cb(null, res[0]);
    });
};

// var o = {
//     command:'getHistory',
//     object:'User',
//     params:{
//         id:1
//     }
// };
// socketQuery(o, (r)=>{});

BasicClass.prototype.getHistory = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id

    var sort_direction_arr = ['DESC','ASC'];
    var sd = String(obj.sort_direction).toUpperCase();
    var sort_direction = (sort_direction_arr.indexOf(sd) !== -1)? sort_direction_arr[sd] : 'ASC';

    var history_data;
    var result_arr = [];

    var formatFuncs = {
        boolean:funcs.parseFriendlyBool
    };
    async.series({
        getData: cb => {

            // "structure": {
            //     "id": {"type": "bigint", "length": "20", "notNull": true, "autoInc": true, "primary_key": true},
            //     "class_id": {"type": "bigint", "length": "20"},
            //     "class_field_id": {"type": "bigint", "length": "20"},
            //     "record_id": {"type": "bigint", "length": "20"},
            //     "hash": {"type": "varchar", "length": "255"},
            //     "operation_type": {"type": "varchar", "length": "255"},
            //     "value": {"type": "text"}
            // }

            var o = {
                command:'get',
                object:`_${_t.tableName}_history`,
                params:{
                    param_where:{
                        record_id:id,
                        class_id:_t.class_profile.id
                    },
                    collapseData:false,
                    doNotLog:true,
                    sort:{
                        columns:['id'],
                        directions:[sort_direction]
                    }
                }
            };
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось получить записи истории',{o : o, err : err}));
                history_data = res;
                cb(null);
            });
        },
        prepare: cb => {
            var arr = [];
            var hash_obj = {};
            var index = 0;
            // Объект нужен для того, чтобы сгрупперовать по hash, а index нужен чтобы сохранить порядок сортировки
            history_data.forEach(rec =>{
                if (!hash_obj[rec.hash]){
                    hash_obj[rec.hash] = {
                        hash:rec.hash,
                        created_by_user_id:rec.created_by_user_id,
                        created_by_user:rec.created_by_user,
                        created:rec.created,
                        index:index,
                        fields:[]
                    };
                    index++;
                }
                hash_obj[rec.hash].fields.push(rec);
            });

            Object.keys(hash_obj).forEach(key =>{
                result_arr.push(hash_obj[key]);
            });
            result_arr = result_arr.sort((a, b)=>{
                if (a.index > b.index) return 1;
                if (a.index < b.index) return -1;
                return 0;
            });
            result_arr.forEach(item =>{
                var index = (sort_direction === 'ASC')? 0 : item.fields.length -1; // Обеспечит то, что не зависимо от сортировки будет взят более ранний элемент
                item.created = item.fields[index].created;
                item.operation_type = item.fields[index].operation_type;
                item.fields.forEach(field => {
                    var profile = _t.class_fields_by_id[field.class_field_id];
                    if (!profile) return;
                    field.name = profile.name;
                    field.column_name = profile.column_name;
                    field.type = profile.type;
                    field.field_length = profile.field_length;
                    field.type_ = (profile.type ==='tinyint' && profile.field_length===1) ? 'boolean' : profile.type;
                    // field.value_orig = field.value;
                    field.value_ru = (typeof formatFuncs[field.type_] === 'function')? formatFuncs[field.type_](field.value) : field.value;
                });
            });
            cb(null);
        }
    },function (err, res) {
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',{data:result_arr}));
    });
};

// var o = {
//     command:'import',
//     object:'For_test',
//     params:{
//         name:'dm_FromExcel'
//     }
// };
// socketQuery(o, (r)=>{});

BasicClass.prototype.import = function (obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    // var path_base = './modules/data_migration/instances/';
    var path = `../../modules/data_migration/instances/${(obj.sub_dir? obj.sub_dir + '/' : '') + (obj.name || _t.name_for_import || 'dm_' + _t.name)}`;
    // var path = `../../modules/data_migration/instances/dm_System_reglament_work.js`;
    var instance_;
    async.series({
        check: cb => {

            try {
                var instance_obj = require(path);
            } catch (e) {
                console.log(e);
                return cb(new UserOk({type:'info', message:'Для этого класса еще не определены параметры импорта.'},{e:e, path:path, dir:__dirname}));
            }
            instance_ = new DataMigration(funcs.cloneObj(instance_obj));
            return cb(null);

        },
        import: cb => {
            // return;
            // var instance_ = require(path);
            instance_.importFromJSON({
                data:{},
                api:_t.api,
                user:_t.user,
                rollback_key:rollback_key
            }, cb)

        }
    },function (err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err);
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            if (!doNotSaveRollback){
                rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:`Import_${_t.name}`, params:obj});
            }
            cb(null, new UserOk('Ок'));
        }
    });
};


BasicClass.prototype.test = function () {
    setInterval(console.log('BasicClass.prototype.test'),80);
};



module.exports = BasicClass;
