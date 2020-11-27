/**
 * Created by iig on 29.10.2015.
 */
var MyError = require('../error').MyError;
var UserOk = require('../error').UserOk;
var UserError = require('../error').UserError;
var BasicClass = require('./system/BasicClass');
var util = require('util');
var api = require('../libs/api');
var async = require('async');
var funcs = require('../libs/functions');
var fs = require('fs');
var moment = require('moment');

var rollback = require('../modules/rollback');
var toFile = require('../modules/saveToFile').toFile;
var clear_essence = require('../modules/clear_essence');


var Model = function(obj){
    this.name = obj.name;
    this.tableName = obj.name.toLowerCase();

    var basicclass = BasicClass.call(this, obj);
    if (basicclass instanceof MyError) return basicclass;
};
util.inherits(Model, BasicClass);

Model.prototype.removePrototype = Model.prototype.remove;

Model.prototype.modifyPrototype = Model.prototype.modify;

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
Model.prototype.remove = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var className;
    if (obj.removePrototype) return _t.removePrototype(obj, cb);
    async.series({
        getClassName: function (cb) {
            // Получим имя класса
            _t.getById({
                columns: ['name'],
                id: obj.id
            }, function (err, res) {
                if (err) return cb(new UserError('Не удалось получить имя Класса', err));
                // if (!res.length) return cb(new UserError('Класс не найден'));
                className = res[0].name;
                cb(null);
            })
        },
        dropTable: function (cb) {
            // Запустим drop Table
            var o = {
                command: 'drop',
                object: 'Table',
                params: obj
            };

            o.params.name = className;
            o.params.doNotLoadStructure = true;
            o.params.structure = _t.class_fields_profile;
            _t.api(o, function (err, res) { // Здесь нельзя сократить до cb
                return cb(err, res);
            });
        }
    }, function (err, res) {
        cb(err, res.dropTable);
    });
    //var o = {
    //    command:'drop',
    //    object:'Table',
    //    params:obj
    //};
    //
    //o.params.name = _t.name;
    //_t.api(o, cb);
};
Model.prototype.removeCascade = Model.prototype.remove;

Model.prototype.modify = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'));
    var _t = this;
    _t.modifyPrototype(obj, function (err, resModify) {
        if (!err){
            // получить класс и клиентский объект по id
            if (!obj.id) {
                console.log('\nНемогу очистить кеш. Нет id', obj);
                return cb(null, resModify);
            }
            var params = {
                where:[
                    {
                        key:'id',
                        val1:obj.id
                    }
                ],
                collapseData:false,
                columns:['name']
            };
            _t.get(params, function (err, res) {
                if (err){
                    console.log('\nНемогу очистить кеш.', err);
                    return cb(null, resModify);
                }
                if (typeof res!=='object'){
                    console.log('\nНемогу очистить кеш. Не найдена запись', res);
                    return cb(null, resModify);
                }
                if (!res.length) return cb(null); // Когда удаляем сам класс
                var alias = res[0].name;
                _t.api({
                    command:'_clearCache',
                    object:alias
                }, function (err) {
                    if (err){
                        console.log('\nНемогу очистить кеш.', err);
                    }
                    return cb(null, resModify);
                });
            });
        }else{
            return cb(err, resModify);
        }
    })
};
/**
 * Сихронизировать настройки полей client_object_fields_profile с class_fields_profile(эталон)
 * sync_fields - поля которые нужно синхронизировать
 * @param obj
 * @param cb
 * @returns {*}
 */
Model.prototype.sync_class_CFP_and_COFP = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'));
    var _t = this;
    var sync_fields = obj.sync_fields;
    if (!sync_fields) return cb(null, new UserError('Поля для синхронизации не указаны'));
    if (typeof sync_fields!=='object'){
        sync_fields = sync_fields.split(',');
    }
    // Удалим column_name из списка
    var column_name_index = sync_fields.indexOf('column_name');
    if (column_name_index!==-1) {
        delete sync_fields[column_name_index];
        funcs.clearEmpty(sync_fields);
    }


    var CFP_id, CFP, COFP_id, COFP;
    // Загрузим информацию из CFP по классу class_fields_profile
    // Загрузим информацию из CFP по классу client_object_fields_profile
    // Найдем изменения
    // Обновим CFP по client_object_fields_profile если есть отличия от class_fields_profile
    async.series([
        function (cb) {
            // Загрузим информацию из CFP по классу class_fields_profile
            async.waterfall([
                function (cb) {
                    // Получим id (class_id) class_fields_profile из class_profile
                    var o = {
                        command:'get',
                        object:'class_profile',
                        params:{
                            collapseData:false,
                            columns:['id'],
                            where:[
                                {
                                    key:'name',
                                    val1:'class_fields_profile'
                                }
                            ]
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить class_id для class_fields_profile', err));
                        if (!res.length) return cb(new MyError('В class_profile нет записи для class_fields_profile'));
                        CFP_id = res[0].id;
                        cb(null);
                    })
                },
                pool.getConn,
                function (conn, cb) {
                    var sql = 'SELECT column_name,' + sync_fields.join(',') + ' FROM class_fields_profile WHERE class_id = ' + CFP_id;
                    conn.query(sql, function (err, res) {
                        conn.release();
                        if (err) return cb(new UserError('Некоторые из указаных полей не существуют для class_fields_profile', err));
                        CFP = res;
                        cb(null);
                    })
                }
            ],cb);

        },
        function (cb) {
            // Загрузим информацию из CFP по классу client_object_fields_profile
            async.waterfall([
                function (cb) {
                    // Получим id (class_id) client_object_fields_profile из class_profile
                    var o = {
                        command:'get',
                        object:'class_profile',
                        params:{
                            collapseData:false,
                            columns:['id'],
                            where:[
                                {
                                    key:'name',
                                    val1:'client_object_fields_profile'
                                }
                            ]
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить class_id для client_object_fields_profile', err));
                        if (!res.length) return cb(new MyError('В class_profile нет записи для client_object_fields_profile'));
                        COFP_id = res[0].id;
                        cb(null);
                    })
                },
                pool.getConn,
                function (conn, cb) {
                    var sql = 'SELECT id,column_name,' + sync_fields.join(',') + ' FROM class_fields_profile WHERE class_id = ' + COFP_id;
                    conn.query(sql, function (err, res) {
                        conn.release();
                        if (err) return cb(new MyError('Некоторые из указаных полей не существуют для client_object_fields_profile', err));
                        COFP = res;
                        cb(null);
                    })
                }
            ],cb);

        },
        function (cb) {
            // Найдем изменения
            var toModify = [];
            for (var i in CFP) {
                var Ccol = CFP[i];
                for (var j in COFP) {
                    var COcol = COFP[j];
                    if (Ccol.column_name == COcol.column_name){
                        for (var k in sync_fields) {
                            if (COcol[sync_fields[k]]!==Ccol[sync_fields[k]]){
                                var modyfyObj = {
                                    id:COcol.id
                                };
                                modyfyObj[sync_fields[k]] = Ccol[sync_fields[k]];
                                toModify.push(modyfyObj);
                            }
                        }
                    }
                }
            }
            // Обновим CFP по client_object_fields_profile если есть отличия от class_fields_profile
            async.eachSeries(toModify, function (item, cb) {
                async.waterfall([
                    pool.getConn,
                    function (conn, cb) {
                        conn.update('class_fields_profile', item, function (err) {
                            conn.release();
                            cb(err);
                        });
                    }
                ], cb);
            }, cb);
        }
    ], function (err, res) {
        if (err) return cb(new MyError('Во время синхронизации возникла ошибка', {err:err, res:res}));
        cb(null, UserOk('Синхронизация проведена успешно.'));
    });
};


/**
 * Тоже что и функция выше, только наоборот
 * Сихронизировать настройки полей class_fields_profile с client_object_fields_profile(эталон)
 * sync_fields - поля которые нужно синхронизировать
 * @param obj
 * @param cb
 * @returns {*}
 */
//Model.prototype.sync_class_COFP_and_CFP = function (obj, cb) {
//    if (arguments.length == 1) {
//        cb = arguments[0];
//        obj = {};
//    }
//    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
//    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'));
//    var _t = this;
//    var sync_fields = obj.sync_fields;
//    if (!sync_fields) return cb(null, new UserError('Поля для синхронизации не указаны'));
//    if (typeof sync_fields!=='object'){
//        sync_fields = sync_fields.split(',');
//    }
//    // Удалим column_name из списка
//    var column_name_index = sync_fields.indexOf('column_name');
//    if (column_name_index!==-1) {
//        delete sync_fields[column_name_index];
//        funcs.clearEmpty(sync_fields);
//    }
//
//
//    var CFP_id, CFP, COFP_id, COFP;
//    // Загрузим информацию из CFP по классу class_fields_profile
//    // Загрузим информацию из CFP по классу client_object_fields_profile
//    // Найдем изменения
//    // Обновим CFP по client_object_fields_profile если есть отличия от class_fields_profile
//    async.series([
//        function (cb) {
//            // Загрузим информацию из CFP по классу class_fields_profile
//            async.waterfall([
//                function (cb) {
//                    // Получим id (class_id) class_fields_profile из class_profile
//                    var o = {
//                        command:'get',
//                        object:'class_profile',
//                        params:{
//                            collapseData:false,
//                            columns:['id'],
//                            where:[
//                                {
//                                    key:'name',
//                                    val1:'class_fields_profile'
//                                }
//                            ]
//                        }
//                    };
//                    api(o, function (err, res) {
//                        if (err) return cb(new MyError('Не удалось получить class_id для class_fields_profile', err));
//                        if (!res.length) return cb(new MyError('В class_profile нет записи для class_fields_profile'));
//                        CFP_id = res[0].id;
//                        cb(null);
//                    })
//                },
//                pool.getConn,
//                function (conn, cb) {
//                    var sql = 'SELECT id,column_name,' + sync_fields.join(',') + ' FROM class_fields_profile WHERE class_id = ' + CFP_id;
//                    conn.query(sql, function (err, res) {
//                        conn.release();
//                        if (err) return cb(new UserError('Некоторые из указаных полей не существуют для class_fields_profile', err));
//                        CFP = res;
//                        cb(null);
//                    })
//                }
//            ],cb);
//
//        },
//        function (cb) {
//            // Загрузим информацию из CFP по классу client_object_fields_profile
//            async.waterfall([
//                function (cb) {
//                    // Получим id (class_id) client_object_fields_profile из class_profile
//                    var o = {
//                        command:'get',
//                        object:'class_profile',
//                        params:{
//                            collapseData:false,
//                            columns:['id'],
//                            where:[
//                                {
//                                    key:'name',
//                                    val1:'client_object_fields_profile'
//                                }
//                            ]
//                        }
//                    };
//                    api(o, function (err, res) {
//                        if (err) return cb(new MyError('Не удалось получить class_id для client_object_fields_profile', err));
//                        if (!res.length) return cb(new MyError('В class_profile нет записи для client_object_fields_profile'));
//                        COFP_id = res[0].id;
//                        cb(null);
//                    })
//                },
//                pool.getConn,
//                function (conn, cb) {
//                    var sql = 'SELECT column_name,' + sync_fields.join(',') + ' FROM class_fields_profile WHERE class_id = ' + COFP_id;
//                    conn.query(sql, function (err, res) {
//                        conn.release();
//                        if (err) return cb(new MyError('Некоторые из указаных полей не существуют для client_object_fields_profile', err));
//                        COFP = res;
//                        cb(null);
//                    })
//                }
//            ],cb);
//
//        },
//        function (cb) {
//            // Найдем изменения
//            var toModify = [];
//            for (var i in COFP) {
//                var COcol = COFP[i];
//                for (var j in CFP) {
//                    var Ccol = CFP[j];
//                    if (Ccol.column_name == COcol.column_name){
//                        for (var k in sync_fields) {
//                            if (COcol[sync_fields[k]]!==Ccol[sync_fields[k]]){
//                                var modyfyObj = {
//                                    id:Ccol.id
//                                };
//                                modyfyObj[sync_fields[k]] = COcol[sync_fields[k]];
//                                toModify.push(modyfyObj);
//                            }
//                        }
//                    }
//                }
//            }
//
//            // Обновим COFP по class_fields_profile если есть отличия от client_object_fields_profile
//            async.eachSeries(toModify, function (item, cb) {
//                async.waterfall([
//                    pool.getConn,
//                    function (conn, cb) {
//                        conn.update('class_fields_profile', item, function (err) {
//                            conn.release();
//                            cb(err);
//                        });
//                    }
//                ], cb);
//            }, cb);
//        }
//    ], function (err, res) {
//        if (err) return cb(new MyError('Во время синхронизации возникла ошибка', {err:err, res:res}));
//        cb(null, UserOk('Синхронизация проведена успешно.'));
//    });
//};

/**
 * Возвращает всю информацию о различии в структурах серверов. Для корректной работы требуется загрузить в базу системные таблицы с сервера(target): \
 * class_profile -> class_profile_copy, class_fields_profile -> class_fields_profile_copy,
 * client_object_profile -> client_object_profile_copy, client_object_fields_profile -> client_object_fields_profile_copy, menu -> menu_copy
 * @param obj
 * @param cb
 * @returns {*}
 */
Model.prototype.syncServer = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;

    var class_profile_copy_obj_by_name = {};
    var class_profile_obj_by_name = {};
    var menu_copy_obj_by_name = {};
    var menu_obj_by_name = {};
    var dateTimeMySQL = funcs.getDateTimeMySQL();
    var log_file_str = '';
    var log_file = 'updateServerLog_' + funcs.getDateTime() + '.txt';
    var log_file_path = './log/' + log_file;

    var add_to_log = function(){
        for (var i in arguments) {
            if (typeof arguments[i] === 'object') arguments[i] = JSON.stringify(arguments[i]);
            log_file_str += arguments[i] + ' ';
        }
        log_file_str += '\n';
    }

    var admin_users = ['ivantgco@gmail.com','alextgco@gmail.com']; // Временное решение / Temporary solution
    // / Уже нет необходимости в данной проверке так как система доступов реализована, но пусть будет.
    if (admin_users.indexOf(_t.user.user_data.email) === -1) return cb(new UserError('You have no permissions to update server, please, contact administrator alextgco@gmail.com.'));

    var classes_by_source_id_obj = {};
    var classes_by_source_name_obj = {};
    var classes_by_target_id_obj = {};
    var class_depend_fields = ['class_id','select_class_id','source_class_id'];

    var co_by_source_id_obj = {};
    var co_by_source_name_obj = {};
    var co_by_target_id_obj = {};
    var co_depend_fields = ['client_object_id','target_client_object_id'];
    async.series({
        getSource:function(cb){
            var sql = 'select * from class_profile_copy where deleted is null or deleted > ?';
            pool.getConn(function(err, conn){
                if (err) return cb(new MyError('Can`t get connection',{err:err}));
                conn.query(sql, [dateTimeMySQL], function(err, res){
                    conn.release();
                    if (err) return cb(new MyError('Can`t get class_profile_copy',{err:err}));
                    for (var i in res) {
                        classes_by_source_id_obj[res[i].id] = {
                            source_id:res[i].id,
                            name:res[i].name
                        };
                        classes_by_source_name_obj[res[i].name] = {
                            source_id:res[i].id,
                            name:res[i].name
                        };
                        if (res[i].name.indexOf('_sub_table_select_')!==-1) continue;
                        class_profile_copy_obj_by_name[res[i].name] = {
                            id:res[i].id,
                            name:res[i].name,
                            columns:res[i]
                        };
                    }
                    cb(null);
                });
            })
        },
        getTarget:function(cb){
            var sql = 'select * from class_profile where deleted is null or deleted > ?';
            pool.getConn(function(err, conn){
                if (err) return cb(new MyError('Can`t get connection',{err:err}));
                conn.query(sql, [dateTimeMySQL], function(err, res){
                    conn.release();
                    if (err) return cb(new MyError('Can`t get class_profile',{err:err}));
                    for (var i in res) {
                        var class_obj = classes_by_source_name_obj[res[i].name]
                        if (class_obj){
                            class_obj.target_id = res[i].id;
                            classes_by_target_id_obj[res[i].id] = {
                                target_id:res[i].id,
                                source_id:class_obj.source_id,
                                name:res[i].name
                            }
                            if (classes_by_source_id_obj[class_obj.source_id]) classes_by_source_id_obj[class_obj.source_id].target_id = res[i].id;
                        }
                        if (res[i].name.indexOf('_sub_table_select_')!==-1) continue;
                        class_profile_obj_by_name[res[i].name] =  {
                            id:res[i].id,
                            name:res[i].name,
                            columns:res[i],
                            source_fields:{},
                            fields:{},
                            client_objects:{},
                            source_client_objects:{},
                        };
                    }
                    cb(null);
                });
            })
        },
        mergeClassProfile:function(cb){
            // set to_merge/to_add
            for (var name in class_profile_copy_obj_by_name) {
                var one_class = class_profile_obj_by_name[name];
                if (one_class) {
                    one_class.to_merge = true;
                    one_class.source_id = class_profile_copy_obj_by_name[name].id;
                } else {
                    class_profile_obj_by_name[name] = {
                        name: name,
                        to_add: true,
                        source_class:class_profile_copy_obj_by_name[name],
                        source_client_objects:{}
                    }
                }
            }
            // set to_remove
            // The choice is given to the administrator, delete (because the class is obsolete) or not (since this class was created by the automatic machine during the operation of the prod system)
            // Выбор предоставляется администратору, удалять (так как класс устарел) или нет (так как этот класс был создан автоматом в ходе работы боевой системы)
            for (var i in class_profile_obj_by_name) {
                if (class_profile_obj_by_name[i].to_merge || class_profile_obj_by_name[i].to_add) continue;
                class_profile_obj_by_name[i].to_remove = true;
            }
            // merge
            for (var name2 in class_profile_copy_obj_by_name) {
                var one_class_copy = class_profile_copy_obj_by_name[name2];
                var one_class = class_profile_obj_by_name[name2];
                if (!one_class) continue;
                if (['class_profile','class_fields_profile','client_object_profile','client_object_fields_profile'].indexOf(one_class.name) !== -1) continue;
                if (!one_class.to_merge) continue;

                for (var col1 in one_class.columns) {
                    if (['id','name','created','published','updated'].indexOf(col1) !== -1) continue;
                    if (one_class.columns[col1] !== one_class_copy.columns[col1]){
                        one_class.to_modify = true;

                        if (!one_class.columns_to_modify) one_class.columns_to_modify = {};
                        one_class.columns_to_modify[col1] = {
                            old_val:one_class.columns[col1],
                            new_val:one_class_copy.columns[col1]
                        }
                    }
                }
            }
            cb(null);
        },
        temp:function(cb){
            for (var i in class_profile_obj_by_name) {
                if (class_profile_obj_by_name[i].to_add) console.log('TO_ADD:', i);
                if (class_profile_obj_by_name[i].to_add) add_to_log('TO_ADD:', i);
                if (class_profile_obj_by_name[i].to_remove) console.log('TO_REMOVE:', i);
                if (class_profile_obj_by_name[i].to_remove) add_to_log('TO_REMOVE:', i);
                if (class_profile_obj_by_name[i].to_modify) console.log('TO_MODIFY:', i, class_profile_obj_by_name[i].columns_to_modify);
                if (class_profile_obj_by_name[i].to_modify) add_to_log('TO_MODIFY:', i, class_profile_obj_by_name[i].columns_to_modify);
            }
            console.log('-------------');
            cb(null);
        },
        getSourceAndTargetFields:function(cb){
            async.eachSeries(class_profile_obj_by_name, function(one_class, cb){
                if (!one_class.to_modify && !one_class.to_merge) return cb(null);
                async.series({
                    getSourceFields:function(cb){
                        if (!one_class.source_id) return cb(null);
                        var sql = 'select * from class_fields_profile_copy where (deleted is null or deleted > ?) and class_id = ?';
                        pool.getConn(function(err, conn){
                            if (err) return cb(new MyError('Can`t get connection',{err:err}));
                            conn.query(sql, [dateTimeMySQL, one_class.source_id], function(err, res){
                                conn.release();
                                if (err) return cb(new MyError('Can`t get class_fields_profile_copy',{err:err}));
                                for (var i in res) {
                                    one_class.source_fields[res[i].column_name] = {
                                        id:res[i].id,
                                        column_name:res[i].column_name,
                                        columns:res[i]
                                    };
                                }
                                cb(null);
                            });
                        })
                    },
                    getTargetFields:function(cb){
                        var sql = 'select * from class_fields_profile where (deleted is null or deleted > ?) and class_id = ?';
                        pool.getConn(function(err, conn){
                            if (err) return cb(new MyError('Can`t get connection',{err:err}));
                            conn.query(sql, [dateTimeMySQL, one_class.id], function(err, res){
                                conn.release();
                                if (err) return cb(new MyError('Can`t get class_fields_profile',{err:err}));
                                for (var i in res) {
                                    one_class.fields[res[i].column_name] = {
                                        id:res[i].id,
                                        column_name:res[i].column_name,
                                        columns:res[i]
                                    };
                                }
                                cb(null);
                            });
                        })
                    },
                    mergeClassFieldsProfile:function(cb){
                        // set to_merge/to_add fields
                        for (var source_field_key in one_class.source_fields) {
                            var one_field = one_class.fields[source_field_key];
                            var tmp = class_profile_obj_by_name[0];
                            if (one_field) one_field.to_merge = true;
                            else {
                                one_class.fields[source_field_key] ={
                                    column_name:source_field_key,
                                    to_add:true,
                                    source_column:one_class.source_fields[source_field_key]
                                }
                            }
                        }
                        // set to_remove
                        for (var i in one_class.fields) {
                            if (one_class.fields[i].to_merge || one_class.fields[i].to_add) continue;
                            one_class.fields[i].to_remove = true;
                        }

                        // merge
                        for (var source_field_key2 in one_class.source_fields) {
                            var one_copy_field = one_class.source_fields[source_field_key2];
                            var one_field = one_class.fields[source_field_key2];
                            if (!one_field) continue;
                            if (!one_field.to_merge) continue;
                            for (var col1 in one_field.columns) {
                                if (['id','column_name','created','published','updated'].indexOf(col1) !== -1) continue;
                                var source_adapted_val = one_copy_field.columns[col1];
                                // if (source_adapted_val == 853 && one_field.columns[col1] == 853){
                                //     console.log('asdas',classes_by_source_name_obj);
                                // }
                                if (source_adapted_val && class_depend_fields.indexOf(col1) !== -1){
                                    source_adapted_val = (classes_by_source_id_obj[source_adapted_val])? classes_by_source_id_obj[source_adapted_val].target_id : `Такого класса еще нет на обновляемом сервере. Пока не ставье галочку. (${one_copy_field.columns[col1]})`;
                                }
                                if (source_adapted_val && co_depend_fields.indexOf(col1) !== -1){
                                    source_adapted_val = (co_by_source_id_obj[source_adapted_val])? co_by_source_id_obj[source_adapted_val].target_id : `Такого КЛИЕНТСКОГО ОБЪЕКТА еще нет на обновляемом сервере. Пока не ставье галочку. (${one_copy_field.columns[col1]})`;
                                }
                                // if (one_field.columns[col1] !== one_copy_field.columns[col1]){
                                if (one_field.columns[col1] != source_adapted_val){
                                    one_field.to_modify = true;
                                    one_field.source_id = one_copy_field.id;
                                    if (!one_field.columns_to_modify) one_field.columns_to_modify = {};
                                    one_field.columns_to_modify[col1] = {
                                        old_val:one_field.columns[col1],
                                        // new_val:one_copy_field.columns[col1]
                                        new_val:source_adapted_val
                                    }
                                }
                            }
                        }
                        cb(null);
                    }
                }, cb);
            }, cb);

        },
        temp2:function(cb){
            for (var i in class_profile_obj_by_name) {
                if (!class_profile_obj_by_name[i].to_modify && !class_profile_obj_by_name[i].to_merge) continue;
                for (var j in class_profile_obj_by_name[i].fields) {
                    var one_field = class_profile_obj_by_name[i].fields[j];
                    if (one_field.to_add) console.log('TO_ADD (col):', class_profile_obj_by_name[i].name, one_field.column_name);
                    if (one_field.to_add) add_to_log('TO_ADD (col):', class_profile_obj_by_name[i].name, one_field.column_name);
                    if (one_field.to_remove) console.log('TO_REMOVE (col):', class_profile_obj_by_name[i].name, one_field.column_name);
                    if (one_field.to_remove) add_to_log('TO_REMOVE (col):', class_profile_obj_by_name[i].name, one_field.column_name);
                    if (one_field.to_modify) console.log('TO_MODIFY(col):', class_profile_obj_by_name[i].name, one_field.column_name, one_field.columns_to_modify);
                    if (one_field.to_modify) add_to_log('TO_MODIFY(col):', class_profile_obj_by_name[i].name, one_field.column_name, one_field.columns_to_modify);

                }

            }
            cb(null);
        },
        // Sync client_object
        syncClientObjects:function(cb){
            var fillCOobj = (rec_)=>{
                if (!co_by_source_id_obj[rec_.id]) {
                    co_by_source_id_obj[rec_.id] = {
                        source_id: rec_.id,
                        name: rec_.name
                    };
                    co_by_source_name_obj[rec_.name] = {
                        source_id: rec_.id,
                        name: rec_.name
                    };
                }
            }
            var fillCOobjFinish = (rec_)=>{
                var co_obj = co_by_source_name_obj[rec_.name]
                if (co_obj){
                    co_obj.target_id = rec_.id;
                    co_by_target_id_obj[rec_.id] = {
                        target_id:rec_.id,
                        source_id:co_obj.source_id,
                        name:rec_.name
                    }
                    if (co_by_source_id_obj[co_obj.source_id]) co_by_source_id_obj[co_obj.source_id].target_id = rec_.id;
                }
            }

            async.eachSeries(class_profile_obj_by_name, function(one_class, cb){
                async.series({
                    toAdd:function(cb){
                        if (!one_class.to_add) return cb(null); // this case only for new classes
                        var sql = 'select * from client_object_profile_copy where (deleted is null or deleted > ?) and class_id = ?';
                        pool.getConn(function(err, conn){
                            if (err) return cb(new MyError('Can`t get connection',{err:err}));
                            conn.query(sql, [dateTimeMySQL, one_class.source_class.id], function(err, res){
                                conn.release();
                                if (err) return cb(new MyError('Can`t get client_object_profile_copy',{err:err}));
                                for (var i in res) {
                                    fillCOobj(res[i]);
                                    if (res[i].name.indexOf('_sub_table_select_')!==-1) continue;
                                    one_class.source_client_objects[res[i].name] = {
                                        id:res[i].id,
                                        name:res[i].name,
                                        client_object:res[i]
                                    }
                                }
                                cb(null);
                            });
                        })
                    },
                    toRemove:function(cb){
                        // There is nothing to do here, as client objects are deleted when the class is deleted automatically
                        // Здесь ничего делать не надо, так как клиентские объекты удалятся при удалении класса автоматически
                        return cb(null);
                    },
                    toMerge:function(cb){
                        if (!one_class.to_merge) return cb(null); // this case only for classes to_merge
                        async.series({
                            getCOProfileSource:function(cb){
                                var sql = 'select * from client_object_profile_copy where (deleted is null or deleted > ?) and class_id = ?';
                                pool.getConn(function(err, conn){
                                    if (err) return cb(new MyError('Can`t get connection',{err:err}));
                                    conn.query(sql, [dateTimeMySQL, one_class.source_id], function(err, res){
                                        conn.release();
                                        if (err) return cb(new MyError('Can`t get client_object_profile_copy',{err:err}));
                                        for (var i in res) {
                                            fillCOobj(res[i]);
                                            if (res[i].name.indexOf('_sub_table_select_')!==-1) continue;
                                            one_class.source_client_objects[res[i].name] = {
                                                id:res[i].id,
                                                name:res[i].name,
                                                client_object:res[i]
                                            }
                                        }
                                        cb(null);
                                    });
                                })
                            },
                            getCOProfile:function(cb){
                                var sql = 'select * from client_object_profile where (deleted is null or deleted > ?) and class_id = ?';
                                pool.getConn(function(err, conn){
                                    if (err) return cb(new MyError('Can`t get connection',{err:err}));
                                    conn.query(sql, [dateTimeMySQL, one_class.id], function(err, res){
                                        conn.release();
                                        if (err) return cb(new MyError('Can`t get client_object_profile',{err:err}));
                                        for (var i in res) {
                                            fillCOobjFinish(res[i]);
                                            if (res[i].name.indexOf('_sub_table_select_')!==-1) continue;
                                            one_class.client_objects[res[i].name] = {
                                                id:res[i].id,
                                                name:res[i].name,
                                                client_object:res[i],
                                                source_fields:{},
                                                fields:{}
                                            }
                                        }
                                        cb(null);
                                    });
                                })
                            },
                            mergeCO:function(cb){
                                // set to_merge/to_add
                                for (var co_name in one_class.source_client_objects) {
                                    var one_co = one_class.client_objects[co_name];
                                    if (one_co) {
                                        one_co.to_merge = true;
                                        one_co.source_id = one_class.source_client_objects[co_name].id;
                                    } else {
                                        one_class.client_objects[co_name] = {
                                            name: co_name,
                                            to_add: true,
                                            source_co:one_class.source_client_objects[co_name],
                                            fields:{}
                                        }
                                    }
                                }
                                // set to_remove
                                for (var i in one_class.client_objects) {
                                    if (one_class.client_objects[i].to_merge || one_class.client_objects[i].to_add) continue;
                                    one_class.client_objects[i].to_remove = true;
                                }
                                // merge
                                for (var co_name2 in one_class.source_client_objects) {
                                    var one_co_copy = class_profile_copy_obj_by_name[co_name2];
                                    var one_co = class_profile_obj_by_name[co_name2];
                                    if (!one_co) continue;
                                    if (!one_co.to_merge) continue;

                                    for (var col1 in one_co.columns) {
                                        if (['id','name','created'].indexOf(col1) !== -1) continue;
                                        if (one_co.columns[col1] !== one_co_copy.columns[col1]){
                                            one_co.to_modify = true;

                                            if (!one_co.columns_to_modify) one_co.columns_to_modify = {};
                                            one_co.columns_to_modify[col1] = {
                                                old_val:one_co.columns[col1],
                                                new_val:one_co_copy.columns[col1]
                                            }
                                        }
                                    }
                                }
                                cb(null);
                            }
                        }, cb);
                    },
                    temp:function(cb){
                        console.log('------ClientObjects ' + one_class.name + '-------');
                        for (var i in one_class.client_objects) {
                            if (one_class.client_objects[i].to_add) console.log('TO_ADD (CO):', one_class.name, i);
                            if (one_class.client_objects[i].to_add) add_to_log('TO_ADD (CO):', one_class.name, i);
                            if (one_class.client_objects[i].to_remove) console.log('TO_REMOVE (CO):', one_class.name, i);
                            if (one_class.client_objects[i].to_remove) add_to_log('TO_REMOVE (CO):', one_class.name, i);
                            if (one_class.client_objects[i].to_modify) console.log('TO_MODIFY (CO):', i, one_class.client_objects[i].columns_to_modify);
                            if (one_class.client_objects[i].to_modify) add_to_log('TO_MODIFY (CO):', i, one_class.client_objects[i].columns_to_modify);
                        }
                        console.log('------END  ' + one_class.name + '-------');
                        cb(null);
                    },
                    getSourceAndTargetFieldsCO:function(cb){
                        async.eachSeries(one_class.client_objects, function(one_CO, cb){
                            if (!one_CO.to_modify && !one_CO.to_merge) return cb(null);
                            async.series({
                                getSourceFieldsCO:function(cb){
                                    if (!one_CO.source_id) return cb(null);
                                    var sql = 'select * from client_object_fields_profile_copy where (deleted is null or deleted > ?) and client_object_id = ?';
                                    pool.getConn(function(err, conn){
                                        if (err) return cb(new MyError('Can`t get connection',{err:err}));
                                        conn.query(sql, [dateTimeMySQL, one_CO.source_id], function(err, res){
                                            conn.release();
                                            if (err) return cb(new MyError('Can`t get client_object_fields_profile_copy',{err:err}));
                                            for (var i in res) {
                                                if (res[i].dynamic_field_id) continue;
                                                one_CO.source_fields[res[i].column_name] = {
                                                    id:res[i].id,
                                                    column_name:res[i].column_name,
                                                    columns:res[i]
                                                };
                                            }
                                            cb(null);
                                        });
                                    })
                                },
                                getTargetFieldsCO:function(cb){
                                    var sql = 'select * from client_object_fields_profile where (deleted is null or deleted > ?) and client_object_id = ?';
                                    pool.getConn(function(err, conn){
                                        if (err) return cb(new MyError('Can`t get connection',{err:err}));
                                        conn.query(sql, [dateTimeMySQL, one_CO.id], function(err, res){
                                            conn.release();
                                            if (err) return cb(new MyError('Can`t get client_object_fields_profile',{err:err}));
                                            for (var i in res) {
                                                if (res[i].dynamic_field_id) continue;
                                                one_CO.fields[res[i].column_name] = {
                                                    id:res[i].id,
                                                    column_name:res[i].column_name,
                                                    columns:res[i]
                                                };
                                            }
                                            cb(null);
                                        });
                                    })
                                },
                                mergeClassFieldsProfileCO:function(cb){
                                    // set to_merge/to_add fields
                                    for (var source_field_key in one_CO.source_fields) {
                                        var one_field = one_CO.fields[source_field_key];
                                        if (one_field) one_field.to_merge = true;
                                        else {
                                            one_CO.fields[source_field_key] ={
                                                column_name:source_field_key,
                                                to_add:true,
                                                source_column:one_CO.source_fields[source_field_key]
                                            }
                                        }
                                    }
                                    // set to_remove
                                    for (var i in one_CO.fields) {
                                        if (one_CO.fields[i].to_merge || one_CO.fields[i].to_add) continue;
                                        one_CO.fields[i].to_remove = true;
                                    }

                                    // merge
                                    for (var source_field_key2 in one_CO.source_fields) {
                                        var one_copy_field = one_CO.source_fields[source_field_key2];
                                        var one_field = one_CO.fields[source_field_key2];
                                        if (!one_field) continue;
                                        if (!one_field.to_merge) continue;
                                        for (var col1 in one_field.columns) {
                                            if (['id','column_name','client_object_id','created','class_id'].indexOf(col1) !== -1) continue;
                                            var source_adapted_val = one_copy_field.columns[col1];
                                            if (source_adapted_val && class_depend_fields.indexOf(col1) !== -1){
                                                source_adapted_val = (classes_by_source_id_obj[source_adapted_val])? classes_by_source_id_obj[source_adapted_val].target_id : `Такого класса еще нет на обновляемом сервере. Пока не ставье галочку. (${one_copy_field.columns[col1]})`;
                                            }
                                            if (source_adapted_val && co_depend_fields.indexOf(col1) !== -1){
                                                source_adapted_val = (co_by_source_id_obj[source_adapted_val])? co_by_source_id_obj[source_adapted_val].target_id : `Такого КЛИЕНТСКОГО ОБЪЕКТА еще нет на обновляемом сервере. Пока не ставье галочку. (${one_copy_field.columns[col1]})`;
                                            }
                                            // if (one_field.columns[col1] == 48){
                                            //     console.log('dasjwj');
                                            // }
                                            if (one_field.columns[col1] != source_adapted_val){
                                                one_field.to_modify = true;
                                                one_field.source_id = one_copy_field.id;
                                                if (!one_field.columns_to_modify) one_field.columns_to_modify = {};
                                                one_field.columns_to_modify[col1] = {
                                                    old_val:one_field.columns[col1],
                                                    // new_val:one_copy_field.columns[col1]
                                                    new_val:source_adapted_val
                                                }
                                            }
                                        }
                                    }
                                    cb(null);
                                }
                            }, cb);
                        }, cb);

                    },
                    temp4:function(cb){
                        for (var i in one_class.client_objects) {
                            if (!one_class.client_objects[i].to_modify && !one_class.client_objects[i].to_merge) continue;
                            for (var j in one_class.client_objects[i].fields) {
                                var one_field = one_class.client_objects[i].fields[j];
                                if (one_field.to_add) console.log('TO_ADD CO (col):', one_class.client_objects[i].name, one_field.column_name);
                                if (one_field.to_add) add_to_log('TO_ADD CO (col):', one_class.client_objects[i].name, one_field.column_name);
                                if (one_field.to_remove) console.log('TO_REMOVE CO (col):', one_class.client_objects[i].name, one_field.column_name);
                                if (one_field.to_remove) add_to_log('TO_REMOVE CO (col):', one_class.client_objects[i].name, one_field.column_name);
                                if (one_field.to_modify) console.log('TO_MODIFY CO (col):', one_class.client_objects[i].name, one_field.column_name, one_field.columns_to_modify);
                                if (one_field.to_modify) add_to_log('TO_MODIFY CO (col):', one_class.client_objects[i].name, one_field.column_name, one_field.columns_to_modify);

                            }

                        }
                        cb(null);
                    }
                }, cb);
            }, cb);

        },
        // Sync menu
        getSourceMenu:function(cb){
            var sql = 'select * from menu_copy where deleted is null or deleted > ?';
            pool.getConn(function(err, conn){
                if (err) return cb(new MyError('Can`t get connection',{err:err}));
                conn.query(sql, [dateTimeMySQL], function(err, res){
                    conn.release();
                    if (err) return cb(new MyError('Can`t get menu_copy',{err:err}));
                    for (var i in res) {
                        menu_copy_obj_by_name[res[i].menu_item] = {
                            id:res[i].id,
                            name:res[i].menu_item,
                            columns:res[i]
                        };
                    }
                    cb(null);
                });
            })
        },
        getTargetMenu:function(cb){
            var sql = 'select * from menu where deleted is null or deleted > ?';
            pool.getConn(function(err, conn){
                if (err) return cb(new MyError('Can`t get connection',{err:err}));
                conn.query(sql, [dateTimeMySQL], function(err, res){
                    conn.release();
                    if (err) return cb(new MyError('Can`t get menu',{err:err}));
                    for (var i in res) {
                        menu_obj_by_name[res[i].menu_item] =  {
                            id:res[i].id,
                            name:res[i].menu_item,
                            columns:res[i]
                        };
                    }
                    cb(null);
                });
            })
        },
        mergeMenu:function(cb){
            // set to_merge/to_add
            for (var name in menu_copy_obj_by_name) {
                var one_class = menu_obj_by_name[name];
                if (one_class) {
                    one_class.to_merge = true;
                    one_class.source_id = menu_copy_obj_by_name[name].id;
                } else {
                    menu_obj_by_name[name] = {
                        name: name,
                        to_add: true,
                        source_class:menu_copy_obj_by_name[name],
                        source_client_objects:{}
                    }
                }
            }
            // set to_remove
            // The choice is given to the administrator, delete (because the class is obsolete) or not (since this class was created by the automatic machine during the operation of the prod system)
            // Выбор предоставляется администратору, удалять (так как класс устарел) или нет (так как этот класс был создан автоматом в ходе работы боевой системы)
            for (var i in menu_obj_by_name) {
                if (menu_obj_by_name[i].to_merge || menu_obj_by_name[i].to_add) continue;
                menu_obj_by_name[i].to_remove = true;
            }
            // merge
            for (var name2 in menu_copy_obj_by_name) {
                var one_menu_copy = menu_copy_obj_by_name[name2];
                var one_menu = menu_obj_by_name[name2];
                if (!one_menu) continue;
                if (!one_menu.to_merge) continue;

                for (var col1 in one_menu.columns) {
                    if (['id','menu_item','created','published','updated'].indexOf(col1) !== -1) continue;
                    if (one_menu.columns[col1] !== one_menu_copy.columns[col1]){
                        one_menu.to_modify = true;

                        if (!one_menu.columns_to_modify) one_menu.columns_to_modify = {};
                        one_menu.columns_to_modify[col1] = {
                            old_val:one_menu.columns[col1],
                            new_val:one_menu_copy.columns[col1]
                        }
                    }
                }
            }
            cb(null);
        },
        tempMenu:function(cb){
            console.log('------MENU-------');
            for (var i in menu_obj_by_name) {
                if (menu_obj_by_name[i].to_add) console.log('MENU TO_ADD:', i);
                if (menu_obj_by_name[i].to_add) add_to_log('MENU TO_ADD:', i);
                if (menu_obj_by_name[i].to_remove) console.log('MENU TO_REMOVE:', i);
                if (menu_obj_by_name[i].to_remove) add_to_log('MENU TO_REMOVE:', i);
                if (menu_obj_by_name[i].to_modify) console.log('MENU TO_MODIFY:', i, menu_obj_by_name[i].columns_to_modify);
                if (menu_obj_by_name[i].to_modify) add_to_log('MENU TO_MODIFY:', i, menu_obj_by_name[i].columns_to_modify);
            }
            console.log('-------------');
            cb(null);
        },
        addToFile:function(cb){
            var obj = {fileName: log_file_path, data: log_file_str, error: true, flags:'w'};
            toFile(obj, function(err, res){
                if (err) return cb(new MyError('не удалось записать log',{err:err, obj:obj})); // could not write data to log file
                cb(null);
            });
        }
        //,
        // callUpdateServer:function(cb){
        //     // return cb(null);
        //     _t.updateServer({data:class_profile_obj_by_name,dateTimeMySQL:dateTimeMySQL}, function(err, res){
        //         return cb(err, res);
        //     })
        // }
    },function (err, res) {
        if (err)  return cb(err);
        cb(null, new UserOk('noToastr',{data:class_profile_obj_by_name, menu:menu_obj_by_name, dateTimeMySQL:dateTimeMySQL}));
    });
};

Model.prototype.updateServer = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var data = obj.data;
    if (!data) return cb(new MyError('Не переданa data',{obj:obj})); // Not passed to data
    var dateTimeMySQL = obj.dateTimeMySQL;
    if (!dateTimeMySQL) return cb(new MyError('Не переданa dateTimeMySQL',{obj:obj})); // Not passed to data
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var admin_users = ['ivantgco@gmail.com','alextgco@gmail.com']; // Временное решение / Temporary solution
    if (admin_users.indexOf(_t.user.user_data.email) === -1) return cb(new UserError('You have no permissions to update server, please, contact administrator alextgco@gmail.com.'));

    // var classes_by_source_id_obj = {};
    async.series({
        prepare:function(cb){
            // for (var i in data) {
            //     var source_id = data[i].source_id || ((typeof data[i].source_class === 'object' && data[i].source_class !== null)? data[i].source_class.id : null);
            //     if (!source_id) continue;
            //     classes_by_source_id_obj[source_id] = data[i];
            // }
            cb(null);
        },
        all:function(cb){
            async.eachSeries(data, function(one_class, cb){
                async.series({
                    addClass:function(cb){
                        if (!one_class.to_add || !one_class.checked_) return cb(null);
                        // if (!one_class.to_add) return cb(null);
                        var add_class_err_flag;
                        async.series({
                            getFieldsProfile:function(cb){
                                if (!one_class.source_class.id) return cb(null);
                                var sql = 'select * from class_fields_profile_copy where (deleted is null or deleted > ?) and class_id = ?';
                                pool.getConn(function(err, conn){
                                    if (err) return cb(new MyError('Can`t get connection',{err:err}));
                                    conn.query(sql, [dateTimeMySQL, one_class.source_class.id], function(err, res){
                                        conn.release();
                                        if (err) return cb(new MyError('Can`t get class_fields_profile_copy',{err:err}));
                                        for (var i in res) {
                                            if (!one_class.structure) one_class.structure = {};
                                            if (!one_class.structure[res[i].column_name]) one_class.structure[res[i].column_name] = {};
                                            for (var j in res[i]) {
                                                one_class.structure[res[i].column_name][j] = res[i][j];
                                                if (j === 'field_length') one_class.structure[res[i].column_name]['length'] = one_class.structure[res[i].column_name][j];
                                                // if (j === 'select_class_id' && res[i][j] !== null && res[i][j] !== one_class.source_class.id) { // Подменить select_class_id на id актуального класса (на этом сервере) / Change select_class_id to the id of the current class (on this server)
                                                //     // get class_id from classes_by_source_id_obj than search in data class with same name and get his ID
                                                //     var source_class_id_for_col = res[i][j];
                                                //     var source_class_for_col = classes_by_source_id_obj[source_class_id_for_col];
                                                //     if (!source_class_for_col) {
                                                //         return cb(new MyError('Could not find class in class list from source',{one_class:one_class, source_class_id_for_col:source_class_id_for_col,classes_by_source_id_obj:classes_by_source_id_obj}));
                                                //     } // Не смог найти класс в списке классов с источника
                                                //     var target_class = data[source_class_for_col.name];
                                                //     if (!target_class || !target_class.id){
                                                //         // Класс на который ссылается одна из колонок добавляемого класса пока не существует. Надо сперва добавить его.
                                                //         // The class that is referenced by one of the columns of the class being added does not yet exist. You must first add it.
                                                //         add_class_err_flag = new MyError('Этого класса еще не существует в системе',{target_class:target_class,source_class_name_for_col:source_class_for_col});
                                                //         console.log('ERROR while add class. ');
                                                //         return cb(null);
                                                //     }
                                                //     one_class.structure[res[i].column_name]['select_class_id'] = target_class.id;
                                                // }
                                            }
                                        }
                                        cb(null);
                                    });
                                })
                            },
                            syncWithTableJsonVirtual:function(cb){
                                if (add_class_err_flag) return cb(null);
                                var o = {
                                    command: 'syncWithTableJson',
                                    object: 'Table',
                                    params: {}
                                };

                                o.params.name = one_class.name;
                                o.params.doNotLoadStructure = true;
                                o.params.profile = one_class.source_class.columns;
                                o.params.structure = one_class.structure;
                                _t.api(o, function (err, res) {
                                    if (err) return cb(new MyError('Не удалось syncWithTableJson virtual',{o : o, err : err})); // Could not

                                    cb(null);
                                });
                            }
                        }, cb);
                    },
                    modifyClass:function(cb){
                        // return cb(null);


                        async.series({
                            updateClass:function(cb){
                                if (!one_class.to_modify) return cb(null); // checked проверим ниже

                                var update_obj;
                                for (var i in one_class.columns_to_modify) {
                                    if (!one_class.columns_to_modify[i].checked_) continue;
                                    if (!update_obj) update_obj = {};
                                    update_obj[i] = one_class.columns_to_modify[i].new_val;
                                }
                                if (!update_obj) return cb(null);

                                update_obj.id = one_class.id;
                                pool.getConn(function (err, conn) {
                                    if (err) return cb(new MyError('Can`t get connection', {err: err}));
                                    conn.update('class_profile', update_obj, function (err, res) {
                                        conn.release();
                                        if (err) return cb(new MyError('Can`t update class', {
                                            err: err,
                                            name: one_class.name,
                                            update_obj: update_obj
                                        }));
                                        cb(null);
                                    });
                                });
                            },
                            updateClassFields:function(cb){

                                var updateClassFields_err_flag;
                                var structure = {};
                                var need_update_flag;
                                for (var one_field_key in one_class.fields) {
                                    var one_field = one_class.fields[one_field_key];
                                    if (!one_field.to_add && !one_field.to_remove && !one_field.to_modify){
                                        one_field.columns.length = one_field.columns.field_length;
                                        structure[one_field_key] = one_field.columns;
                                    }

                                    // if ((one_field.to_modify || one_field.to_add) && one_field.checked_){
                                    //     if (one_field.source_column.columns.select_class_id && one_field.source_column.columns.select_class_id !== null){
                                    //         var source_class_id_for_col = one_field.source_column.columns.select_class_id;
                                    //         var source_class_for_col = classes_by_source_id_obj[source_class_id_for_col];
                                    //         if (!source_class_for_col) {
                                    //             return cb(new MyError('Could not find class in class list from source',{one_field: one_field, source_class_id_for_col:source_class_id_for_col,classes_by_source_id_obj:classes_by_source_id_obj, one_field_key:one_field_key, one_class:one_class}));
                                    //         } // Не смог найти класс в списке классов с источника
                                    //         var target_class = data[source_class_for_col.name];
                                    //         if (!target_class || !target_class.id){
                                    //             // Класс на который ссылается одна из колонок добавляемого класса пока не существует. Надо сперва добавить его.
                                    //             // The class that is referenced by one of the columns of the class being added does not yet exist. You must first add it.
                                    //             updateClassFields_err_flag = new MyError('Этого класса еще не существует в системе',{target_class:target_class,source_class_name_for_col:source_class_for_col});
                                    //             console.log('ERROR while updateClassFields. ');
                                    //             return cb(null);
                                    //         }
                                    //         one_field.source_column.columns.select_class_id = target_class.id;
                                    //     }
                                    // }

                                    if (one_field.to_add && one_field.checked_){
                                        need_update_flag = true;
                                        one_field.source_column.columns.length = one_field.source_column.columns.field_length;
                                        structure[one_field_key] = one_field.source_column.columns;
                                        // one_field.columns.length = one_field.columns.field_length;
                                        // structure[one_field_key] = one_field.columns;
                                    }
                                    if (one_field.to_remove && one_field.checked_){
                                        need_update_flag = true;
                                        // Просто не добавляеем в структуру
                                        // one_field.columns.length = one_field.columns.field_length;
                                        // structure[one_field_key] = one_field.columns;
                                    }
                                    if (one_field.to_modify){ // checked проверим ниже

                                        for (var i in one_field.columns_to_modify) {
                                            if (!one_field.columns_to_modify[i].checked_) continue;
                                            need_update_flag = true;
                                            one_field.columns[i] = one_field.columns_to_modify[i].new_val;
                                        }
                                        one_field.columns.length = one_field.columns.field_length;
                                        structure[one_field_key] = one_field.columns;
                                    }
                                }

                                if (!need_update_flag) return cb(null);
                                var o = {
                                    command: 'syncWithTableJson',
                                    object: 'Table',
                                    params: {}
                                };

                                o.params.name = one_class.name;
                                o.params.doNotLoadStructure = true;
                                o.params.profile = one_class.columns;
                                o.params.structure = structure;
                                _t.api(o, function (err, res) {
                                    if (err) return cb(new MyError('Не удалось syncWithTableJson virtual (fields)',{o : o, err : err})); // Could not

                                    cb(null);
                                });
                            }
                        }, cb);
                    },
                    removeClass:function(cb){
                        if (!one_class.to_remove || !one_class.checked_) return cb(null);
                        // return cb(null);
                        var params = {
                            id:one_class.id,
                            confirm:true
                        };

                        _t.remove(params, function(err, res){
                            if (err) return cb(new MyError('could`t remove class',{err:err, params:params, one_class:one_class}));
                            cb(null);
                        });
                    },
                    processCO:function(cb){
                        async.eachSeries(one_class.client_objects, function(one_co, cb){
                            async.series({
                                addCO:function(cb){
                                    if (!one_co.to_add || !one_co.checked_) return cb(null);
                                    // if (!one_co.to_add) return cb(null);
                                    // if (!one_class.to_add) return cb(null);

                                    // добавим запись в client_object_profile
                                    // добавим записи в client_object_fields_profile
                                    async.series({
                                        addCO:function(cb){
                                            var insert_obj = funcs.cloneObj(one_co.source_co.client_object);
                                            delete insert_obj.id;
                                            insert_obj.class_id = one_class.id;
                                            pool.getConn(function (err, conn) {
                                                if (err) return cb(new MyError('Can`t get connection', {err: err}));
                                                conn.insert('client_object_profile', insert_obj, function (err, record_id) {
                                                    conn.release();
                                                    if (err) return cb(new MyError('Can`t insert client_object', {err: err, name: one_co.name, insert_obj: insert_obj}));
                                                    one_co.id = record_id;
                                                    one_co.client_object = funcs.cloneObj(one_co.source_co.client_object);
                                                    one_co.client_object.class_id = one_class.id;
                                                    one_co.source_fields = {};
                                                    cb(null);
                                                });
                                            });
                                        },
                                        addCOFields:function(cb){
                                            var addCOFields_err_flag;
                                            async.series({
                                                getCOFieldsSource:function(cb){
                                                    // Получим поля из source
                                                    if (!one_co.source_co.id) return cb(null);
                                                    var sql = 'select * from client_object_fields_profile_copy where (deleted is null or deleted > ?) and client_object_id = ?';
                                                    pool.getConn(function(err, conn){
                                                        if (err) return cb(new MyError('Can`t get connection',{err:err}));
                                                        conn.query(sql, [dateTimeMySQL, one_co.source_co.id], function(err, res){
                                                            conn.release();
                                                            if (err) return cb(new MyError('Can`t get client_object_fields_profile_copy',{err:err}));
                                                            for (var i in res) {
                                                                // switch (res[i].column_name){
                                                                //     case 'select_class_id':
                                                                //         var source_class_id_for_col = one_co.source_fields.select_class_id;
                                                                //         if (isNaN(+source_class_id_for_col) || source_class_id_for_col === null){
                                                                //             // select_class_id is not setted
                                                                //             break;
                                                                //         }
                                                                //         var source_class_for_col = classes_by_source_id_obj[source_class_id_for_col];
                                                                //         if (!source_class_for_col) {
                                                                //             return cb(new MyError('Could not find class in class list from source2',{one_co: one_co, source_class_id_for_col:source_class_id_for_col,classes_by_source_id_obj:classes_by_source_id_obj}));
                                                                //         } // Не смог найти класс в списке классов с источника
                                                                //         var target_class = data[source_class_for_col.name];
                                                                //         if (!target_class || !target_class.id){
                                                                //             // Класс на который ссылается одна из колонок добавляемого класса пока не существует. Надо сперва добавить его.
                                                                //             // The class that is referenced by one of the columns of the class being added does not yet exist. You must first add it.
                                                                //             addCOFields_err_flag = new MyError('Этого класса еще не существует в системе',{target_class:target_class,source_class_name_for_col:source_class_for_col});
                                                                //             console.log('ERROR while addCOFields. ');
                                                                //             return cb(null);
                                                                //         }
                                                                //         one_co.source_fields.select_class_id = target_class.id;
                                                                //         break;
                                                                //     default:
                                                                //         break;
                                                                // }

                                                                one_co.source_fields[res[i].column_name] = {
                                                                    id:res[i].id,
                                                                    column_name:res[i].column_name,
                                                                    columns:res[i]
                                                                };
                                                                // console.log('asdajrjas@');
                                                            }
                                                            cb(null);
                                                        });
                                                    })
                                                },
                                                addCOF:function(cb){
                                                    if (addCOFields_err_flag) return cb(null);
                                                    async.eachSeries(one_co.source_fields, function(one_co_field_copy, cb){
                                                        var one_co_field = funcs.cloneObj(one_co_field_copy.columns);
                                                        delete one_co_field.id;
                                                        one_co_field.class_id = one_class.id;
                                                        one_co_field.client_object_id = one_co.id;
                                                        pool.getConn(function (err, conn) {
                                                            if (err) return cb(new MyError('Can`t get connection', {err: err}));
                                                            conn.insert('client_object_fields_profile', one_co_field, function (err, record_id) {
                                                                conn.release();
                                                                if (err) return cb(new MyError('Can`t insert client_object_fields_profile', {err: err, name: one_co.name, insert_obj: one_co_field}));
                                                                one_co_field.id = record_id;
                                                                cb(null);
                                                            });
                                                        });
                                                    }, cb);
                                                }
                                            }, cb);

                                        }
                                    }, cb);

                                },
                                modifyCO:function(cb){
                                    async.series({
                                        updateCO:function(cb){
                                            if (!one_co.to_modify) return cb(null); // checked проверим ниже

                                            var update_obj;
                                            for (var i in one_co.columns_to_modify) {
                                                if (!one_co.columns_to_modify[i].checked_) continue;
                                                if (!update_obj) update_obj = {};
                                                update_obj[i] = one_co.columns_to_modify[i].new_val;
                                            }
                                            if (!update_obj) return cb(null);
                                            update_obj = {
                                                id: one_co.id
                                            };
                                            pool.getConn(function (err, conn) {
                                                if (err) return cb(new MyError('Can`t get connection', {err: err}));
                                                conn.update('client_object_profile', update_obj, function (err, res) {
                                                    conn.release();
                                                    if (err) return cb(new MyError('Can`t update client_object_profile', {
                                                        err: err,
                                                        name: one_co.name,
                                                        update_obj: update_obj
                                                    }));
                                                    cb(null);
                                                });
                                            });
                                        },
                                        updateCOFields:function(cb){

                                            async.eachSeries(one_co.fields, function(one_co_field, cb){

                                                // if ((one_co_field.to_modify || one_co_field.to_add) && one_co_field.checked_){
                                                //     if (one_co_field.source_column.columns.select_class_id && one_co_field.source_column.columns.select_class_id !== null){
                                                //         var source_class_id_for_col = one_co_field.source_column.columns.select_class_id;
                                                //         var source_class_for_col = classes_by_source_id_obj[source_class_id_for_col];
                                                //         if (!source_class_for_col) {
                                                //             return cb(new MyError('Could not find class in class list from source3',{one_co_field: one_co_field, source_class_id_for_col:source_class_id_for_col,classes_by_source_id_obj:classes_by_source_id_obj, one_field_key:one_field_key, one_class:one_class}));
                                                //         } // Не смог найти класс в списке классов с источника
                                                //         var target_class = data[source_class_for_col.name];
                                                //         if (!target_class || !target_class.id){
                                                //             // Класс на который ссылается одна из колонок добавляемого класса пока не существует. Надо сперва добавить его.
                                                //             // The class that is referenced by one of the columns of the class being added does not yet exist. You must first add it.
                                                //             updateClassFields_err_flag = new MyError('Этого класса еще не существует в системе',{target_class:target_class,source_class_name_for_col:source_class_for_col});
                                                //             console.log('ERROR while updateCOFields. ');
                                                //             return cb(null);
                                                //         }
                                                //         one_co_field.source_column.columns.select_class_id = target_class.id;
                                                //     }
                                                // }


                                                async.series({
                                                    addCoField:function(cb){
                                                        if (!one_co_field.to_add || !one_co_field.checked_) return cb(null);
                                                        // if (!one_co_field.to_add) return cb(null);

                                                        var insert_obj = funcs.cloneObj(one_co_field.source_column.columns);
                                                        delete insert_obj.id;
                                                        insert_obj.class_id = one_class.id;
                                                        insert_obj.client_object_id = one_co.id;
                                                        pool.getConn(function (err, conn) {
                                                            if (err) return cb(new MyError('Can`t get connection', {err: err}));
                                                            conn.insert('client_object_fields_profile', insert_obj, function (err, record_id) {
                                                                conn.release();
                                                                if (err) {
                                                                    if (err.code === 'ER_DUP_ENTRY') return cb(new MyError('Can`t insert client_object_fields_profile. Вероятно это поле было создано но потом удалено в системе, проверьте БД', {err: err, name: one_co.name, insert_obj: insert_obj}));
                                                                    return cb(new MyError('Can`t insert client_object_fields_profile', {err: err, name: one_co.name, insert_obj: insert_obj}));
                                                                }
                                                                one_co_field.id = record_id;
                                                                cb(null);
                                                            });
                                                        });
                                                    },
                                                    modifyCoField:function(cb){
                                                        if (!one_co_field.to_modify) return cb(null); // checked проверим ниже
                                                        // if (!one_co_field.to_modify) return cb(null);

                                                        var update_obj;
                                                        for (var i in one_co_field.columns_to_modify) {
                                                            if (!one_co_field.columns_to_modify[i].checked_) continue;
                                                            if (!update_obj) update_obj = {};
                                                            // one_co_field.columns[i] = one_co_field.columns_to_modify[i].new_val;
                                                            update_obj[i] = one_co_field.columns_to_modify[i].new_val;
                                                        }
                                                        if (!update_obj) return cb(null);
                                                        update_obj.id = one_co_field.id;
                                                        pool.getConn(function (err, conn) {
                                                            if (err) return cb(new MyError('Can`t get connection', {err: err}));
                                                            conn.update('client_object_fields_profile', update_obj, function (err, res) {
                                                                conn.release();
                                                                if (err) return cb(new MyError('Can`t update client_object_fields_profile', {err: err, name: one_co.name, update_obj: update_obj}));
                                                                cb(null);
                                                            });
                                                        });
                                                    },
                                                    removeCoField:function(cb){
                                                        if (!one_co_field.to_remove || !one_co_field.checked_) return cb(null);
                                                        // if (!one_co_field.to_remove) return cb(null);


                                                        pool.getConn(function (err, conn) {
                                                            if (err) return cb(new MyError('Can`t get connection', {err: err}));
                                                            conn.delete('client_object_fields_profile', {id:one_co_field.id}, function (err, res) {
                                                                conn.release();
                                                                if (err) return cb(new MyError('Can`t delete client_object_fields_profile', {err: err, name: one_co.name, id:one_co_field.id}));
                                                                cb(null);
                                                            });
                                                        });
                                                    }
                                                }, cb);

                                            }, cb);
                                        }
                                    }, cb);
                                },
                                removeCO:function(cb){
                                    if (!one_co.to_remove || !one_co.checked_) return cb(null);

                                    async.series({
                                        removeCOHead:function(cb){
                                            pool.getConn(function (err, conn) {
                                                if (err) return cb(new MyError('Can`t get connection', {err: err}));
                                                conn.delete('client_object_profile', {id:one_co.id}, function (err, res) {
                                                    conn.release();
                                                    if (err) return cb(new MyError('Can`t delete client_object_profile', {err: err, name: one_co.name, id:one_co.id}));
                                                    cb(null);
                                                });
                                            });
                                        },
                                        removeCOfileds:function(cb){
                                            pool.getConn(function (err, conn) {
                                                if (err) return cb(new MyError('Can`t get connection', {err: err}));
                                                conn.delete('client_object_fields_profile', {client_object_id:one_co.id}, function (err, res) {
                                                    conn.release();
                                                    if (err) return cb(new MyError('Can`t delete client_object_fields_profile', {err: err, name: one_co.name, client_object_id:one_co.id}));
                                                    cb(null);
                                                });
                                            });
                                        }
                                    }, cb);
                                }
                            }, cb);
                        }, cb);
                    }
                }, cb);
            }, cb);
        },
        clearEmpty:function(cb){
            async.series({
                clearUnusedCFields:function(cb){
                    var sql = 'DELETE from class_fields_profile WHERE class_id not in (SELECT id from class_profile)';
                    pool.getConn(function(err, conn){
                        if (err) return cb(new MyError('Can`t get connection',{err:err}));
                        conn.query(sql, function(err, res){
                            conn.release();
                            cb(null);
                        });
                    })
                },
                clearUnuseCO:function(cb){
                    var sql = 'DELETE from client_object_profile WHERE class_id not in (SELECT id from class_profile)';
                    pool.getConn(function(err, conn){
                        if (err) return cb(new MyError('Can`t get connection',{err:err}));
                        conn.query(sql, function(err, res){
                            conn.release();
                            cb(null);
                        });
                    })
                },
                clearUnusedCOFields:function(cb){
                    var sql = 'DELETE from client_object_fields_profile WHERE client_object_id not in (SELECT id from client_object_profile)';
                    pool.getConn(function(err, conn){
                        if (err) return cb(new MyError('Can`t get connection',{err:err}));
                        conn.query(sql, function(err, res){
                            conn.release();
                            cb(null);
                        });
                    })
                },
                clearUnusedMenu:function(cb){
                    var sql = 'DELETE from menu WHERE class_id not in (SELECT id from class_profile) and type_id = 2';
                    pool.getConn(function(err, conn){
                        if (err) return cb(new MyError('Can`t get connection',{err:err}));
                        conn.query(sql, function(err, res){
                            conn.release();
                            cb(null);
                        });
                    })
                }
            }, cb);

        },
        syncClassOperation:function(cb){
            var o = {
                command: 'sync',
                object: 'class_operation',
                params: {}
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось sync class_operation',{o : o, err : err}));

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

Model.prototype.syncTableCore = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    if (['ПОДТВЕРЖДАЮ','CONFIRM'].indexOf(obj.confirm) ===-1) {
        return cb(new UserError('needConfirm', {
            message: '',
            title: 'Подтвердите Ваше намерение синхронизировать все системные классы. Напишите "ПОДТВЕРЖДАЮ" или "CONFIRM".',
            key: 1,
            confirmType: 'dialog',
            responseType: 'text'
        }));
    }
    var tables;
    var tables_first = ['class_profile','class_fields_profile','client_object_profile','client_object_fields_profile'];
    async.series({
        readJSON:(cb)=>{
            fs.readFile('./models/system/tablesCore.json', function (err, data) {
                if (err) return cb(new MyError('Не удалось считать структуры системных классов.', {err:err}));
                var tablesJSON = data.toString();
                try {
                    tables = JSON.parse(tablesJSON);
                } catch (e) {
                    return cb(new MyError('Информация по системным классам имеет не верный формат.', {err:err}));
                }
                return cb(null);
            });
        },
        syncFirst:(cb)=>{
            async.eachSeries(tables_first, function(item, cb){
                var o = {
                    command: 'syncWithTableJson',
                    object: 'Table',
                    params: {
                        name: item
                    }
                };
                _t.api(o, (err, res)=>{
                    if (err) return cb(new MyError('Не удалось синхронизировать один из системных классов',{o : o, err : err}));
                    cb(null);
                });
            }, cb);
        },
        syncAll:(cb)=>{
            async.eachSeries(Object.keys(tables), function(key, cb){
                if (tables_first.indexOf(key) !== -1) return cb(null); // Уже синхронизировано
                var o = {
                    command: 'syncWithTableJson',
                    object: 'Table',
                    params: {
                        name: key
                    }
                };
                _t.api(o, (err, res)=>{
                    if (err) return cb(new MyError('Не удалось синхронизировать один из системных классов',{o : o, err : err}));
                    cb(null);
                });
            }, cb);

        }
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


// var o = {
//     command:'getClearSql',
//     object:'Class_profile',
//     params:{
//         class:'group_object'
//     }
// };
// socketQuery(o, (r)=>{});

Model.prototype.getClearSql = function (obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    // var id = obj.id;
    // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    if (!_t.user.authorized || _t.user.user_data.user_type_sysname !== 'ADMIN'){
        return cb(new MyError('Запрещено'));
    }
    var class_ = obj.class;
    if (!class_) return cb(new MyError('Не передан class'));


    var log_file_path = './DB/CLEAR/' + `CLEAR_${class_}_${moment().format('DDMMYYYY_HHmmss')}`;
    let exclude = obj.exclude? {} : false;
    if (exclude) exclude[class_] = obj.exclude.split(',');


    var data;
    async.series({
        get:cb => {
            clear_essence.prepare_script({class:class_, exclude:exclude},(err, res)=>{
                if (err) return cb(err);
                data = res.data;
                console.log(res.data.join('\n'));
                cb(null);
            });
        },
        save: cb => {
            if (!data) return cb(null);
            var obj = {fileName: log_file_path, data: data.join('\n'), error: true, flags:'w'};
            toFile(obj, function(err, res){
                if (err) return cb(new MyError('не удалось записать log',{err:err, obj:obj})); // could not write data to log file
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


Model.prototype.getPrototype = Model.prototype.get;

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


module.exports = Model;


// $(".ctm-name:contains('created_by_user_id')").parents('.field-ctm-holder').remove()
// $('input[data-ctm="sort_no"]').click()
// $('input[data-oper="remove"]').click()
