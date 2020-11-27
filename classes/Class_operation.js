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
var fs = require('fs');

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
Model.prototype.removeCascadePrototype = Model.prototype.removeCascade;
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

Model.prototype.getTreeNameFunction = function(essence){
    return (essence.name === '*')? essence.class : essence.name;
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

Model.prototype.removeCascade = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var client_object = _t.client_object || '';

    var coFunction = 'removeCascade_' + client_object;

    if (typeof _t[coFunction] === 'function') {
        _t[coFunction](obj, cb);
    } else {
        if (typeof _t['removeCascade_'] === 'function') {
            _t['removeCascade_'](obj, cb);
        } else {
            _t.removeCascadePrototype(obj, cb);
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

// var o = {
//     command:'sync',
//     object:'class_operation',
//     params:{}
// };
// socketQuery(o, function(r){
//     console.log(r);
// })
Model.prototype.sync = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var class_operations_obj_by_class_id = {};
    var class_operations_obj_by_class_name = {};
    var class_profile_obj = {};
    var is_top_class_operation;
    var added = 0;
    var modified = 0;
    async.series({
        getAll:function(cb){
            async.series({
                getTop:(cb)=>{
                    var params = {
                        limit:1000000000,
                        collapseData:false,
                        param_where:{
                            is_top:true
                        },
                    };
                    _t.get(params, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить операцию is_top',{params : params, err : err}));
                        if (!res.length) return cb(new MyError('Операция is_top не обнаружена, необходимо создать. Назвать "Operations" и поставить галочку',{params : params, res : res}));
                        if (res.length > 1) return cb(new MyError('Операций is_top слишком много. Оставьте галочку только у одной',{params : params, res : res}));
                        is_top_class_operation = res[0];
                        cb(null);
                    });
                },
                getStars:(cb)=>{
                    var params = {
                        limit:1000000000,
                        collapseData:false,
                        param_where:{
                            name:'*'
                        }
                    };
                    _t.get(params, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить class_operations с name = "*"',{params : params, err : err}));

                        for (var i in res) {
                            class_operations_obj_by_class_name[res[i].class] = res[i];
                            if (!class_operations_obj_by_class_id[res[i].class_id]) {
                                class_operations_obj_by_class_id[res[i].class_id] = {
                                    operations:{}
                                };
                                for (var j in res[i]) {
                                    class_operations_obj_by_class_id[res[i].class_id][j] = res[i][j];
                                }
                            }
                        }
                        cb(null);
                    });
                },
                getOpers:(cb)=>{
                    var params = {
                        limit:1000000000,
                        collapseData:false,
                        where:[
                            {
                                key:'is_top',
                                val1:false
                            },
                            {
                                key:'name',
                                type:'!=',
                                val1:'*'
                            }
                        ]
                    };
                    _t.get(params, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить class_operations (не is_top и не *)', {params: params, err: err}));

                        for (var i in res) {
                            if (res[i].class_id == 196) {
                                console.log('asdemyq');
                            }

                            if (res[i].is_top && is_top_class_operation) return cb(new MyError('Слишком много записей is_top в class_operation', {res: res}));
                            if (res[i].is_top) is_top_class_operation = res[i];
                            if (!class_operations_obj_by_class_id[res[i].class_id]) {
                                console.error('ERROR', 'Нету записи со * для класса! Запустите Sync еще раз', res[i]);
                                continue;
                            }

                            class_operations_obj_by_class_id[res[i].class_id].operations[res[i].name] = res[i];
                            // if (res[i].name !== '*') {
                            //     if (!class_operations_obj_by_class_id[res[i].class_id].operations) class_operations_obj_by_class_id[res[i].class_id].operations = {};
                            //     class_operations_obj_by_class_id[res[i].class_id].operations[res[i].name] = res[i];
                            // }
                        }
                        cb(null);
                    });
                }
            }, cb);
            // var params = {
            //     limit:1000000000,
            //     collapseData:false,
            //     sort:'sort_no' // ОБЯЗАТЕЛЬНО
            // };
            // _t.get(params, function (err, res) {
            //     if (err) return cb(new MyError('Не удалось получить все class_operations',{params : params, err : err}));
            //
            //     for (var i in res) {
            //         if (res[i].class_id == 196){
            //             console.log('asdemyq');
            //         }
            //
            //         if (res[i].is_top && is_top_class_operation) return cb(new MyError('Слишком много записей is_top в class_operation',{res:res}));
            //         if (res[i].is_top) is_top_class_operation = res[i];
            //         class_operations_obj_by_class_name[res[i].class] = res[i];
            //         if (!class_operations_obj_by_class_id[res[i].class_id]) {
            //             class_operations_obj_by_class_id[res[i].class_id] = {
            //                 operations:{}
            //             };
            //             for (var j in res[i]) {
            //                 class_operations_obj_by_class_id[res[i].class_id][j] = res[i][j];
            //             }
            //         }
            //         // if (res[i].name === '*'){
            //         //     for (var j in res[i]) {
            //         //         class_operations_obj_by_class_id[res[i].class_id][j] = res[i][j];
            //         //     }
            //         // }else{
            //         //     // class_operations_obj_by_class_id[res[i].class_id].operations.push(res[i]);
            //         //     if (!class_operations_obj_by_class_id[res[i].class_id].operations ) class_operations_obj_by_class_id[res[i].class_id].operations = {};
            //         //     class_operations_obj_by_class_id[res[i].class_id].operations[res[i].name] = res[i];
            //         // }
            //         if (res[i].name !== '*'){
            //             if (!class_operations_obj_by_class_id[res[i].class_id].operations ) class_operations_obj_by_class_id[res[i].class_id].operations = {};
            //             class_operations_obj_by_class_id[res[i].class_id].operations[res[i].name] = res[i];
            //         }
            //     }
            //     if (!is_top_class_operation) return cb(new UserError('Не указана запись is_top в class_operation'));
            //     cb(null);
            // });
        },
        getClassProfile:function(cb){
            var o = {
                command:'get',
                object:'class_profile',
                params:{
                    limit:100000000,
                    collapseData:false
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить все классы',{o : o, err : err}));
                for (var i in res) {
                    class_profile_obj[res[i].id] = res[i];
                }
                cb(null);
            });
        },

        merge:function(cb){
            for (var i in class_profile_obj) {
                var one_class = class_profile_obj[i];
                if (one_class.name.indexOf('_sub_table_select_')!==-1) continue;
                if (!class_operations_obj_by_class_id[one_class.id]) {
                    class_operations_obj_by_class_id[one_class.id] = {
                        to_add:true,
                        class_id:one_class.id,
                        operations:{}
                    }
                }else{
                    if (one_class.server_parent_table && one_class.name !== one_class.server_parent_table){
                        if (class_operations_obj_by_class_name[one_class.server_parent_table]){
                            var parent_class_id = class_operations_obj_by_class_name[one_class.server_parent_table].class_id;
                            if (parent_class_id){
                                var parent_class_operation = class_operations_obj_by_class_id[parent_class_id];
                                if (class_operations_obj_by_class_id[one_class.id].parent_id !== parent_class_operation.id){
                                    class_operations_obj_by_class_id[one_class.id].to_modify = {
                                        parent_id: parent_class_operation.id
                                    }
                                }

                            }
                        }
                    }
                }
            }
            return cb(null);
        },
        add:function(cb){
            async.eachSeries(class_operations_obj_by_class_id, function(item, cb){
                if (!item.to_add) return cb(null);
                var params = {
                    class_id:item.class_id,
                    name:'*',
                    name_ru:'Все',
                    parent_id:is_top_class_operation.id,
                    sort_no:-10,
                    rollback_key:rollback_key
                };
                _t.add(params, function (err, res) {
                    if (err) return cb(new MyError('Не удалось добавить class_operation',{params : params, err : err}));
                    item.id = res.id;
                    added++;
                    cb(null);
                });
            }, cb);
        },
        getMethods:function(cb){
            async.eachSeries(class_operations_obj_by_class_id, function(item, cb){
                if (!item.class) return cb(null);
                var class_name = item.class;
                class_name = class_name.toLowerCase();
                class_name = class_name.charAt(0).toUpperCase() + class_name.substr(1);
                var file_name = class_name + '.js';

                var excluded_methods = ['example','init','getProfile','get','getForSelect','add','modify','removeCascade','remove','export_to_excel','get_','add_','modify_','removeCascade_','rollback'];
                fs.readFile('./classes/' + file_name, function (err, data) {
                    if (err) {
                        console.log('Не удалось считать файл.', file_name, err);
                        return cb(null);
                    }
                    var array = data.toString().split("\n");
                    for(var i in array) {
                        if (array[i].indexOf('Model.prototype.') === -1) continue;
                        if (array[i].indexOf('//Model.prototype.') !== -1) continue;
                        var method_name = array[i].replace(/(\s|^)Model.prototype./ig,'');
                        method_name = method_name.replace(/\s.*/ig,'');
                        if (!method_name) continue;
                        if (method_name.indexOf('//') !== -1) continue;
                        if (method_name.indexOf('OLD') !== -1) continue;
                        if (method_name.indexOf('Prototype') !== -1) continue;
                        if (excluded_methods.indexOf(method_name) !== -1) continue;
                        if (!item.operations[method_name]){
                            item.operations[method_name] = {
                                to_add:true
                            };
                        }
                    }
                    return cb(null);
                });
            }, cb);
        },
        addMetods:function(cb){
            var methods = ['getProfile','get','getForSelect','getForFilterSelect','add','modify','removeCascade','export_to_excel','getTree','getTreeChilds','getParentIds','getChildIds','getById'];
            async.eachSeries(class_operations_obj_by_class_id, function(class_item, cb){
                if (!class_item.id) return cb(null);
                var sort_no = 1;

                for (var i in methods) {
                    if (!class_item.operations[methods[i]]){
                        class_item.operations[methods[i]] = {
                            to_add:true
                        }
                    }
                }
                async.eachSeries(Object.keys(class_item.operations), function(method_name, cb){
                    var method = class_item.operations[method_name];
                    // if (class_item.operations[method] && !class_item.operations[method].to_add) return cb(null);
                    if (!method.to_add) return cb(null);
                    var params = {
                        class_id:class_item.class_id,
                        name:method_name,
                        name_ru:method_name,
                        parent_id:class_item.id,
                        sort_no:sort_no++,
                        rollback_key:rollback_key
                    };
                    _t.add(params, function (err, res) {
                        if (err) return cb(new MyError('Не удалось добавить class_operation',{params : params, err : err}));
                        added++;
                        cb(null);
                    });
                }, cb);
            }, cb);
        },
        modify:function(cb){
            async.eachSeries(class_operations_obj_by_class_id, function(item, cb){
                if (!item.to_modify) return cb(null);
                var params = {
                    id:item.id,
                    rollback_key:rollback_key
                };
                for (var i in item.to_modify) {
                    params[i] = item.to_modify[i];
                }
                _t.modify(params, function (err, res) {
                    if (err) return cb(new MyError('Не удалось изменить class_operation',{params : params, err : err}));
                    item.id = res.id;
                    modified++;
                    cb(null);
                });
            }, cb);
        },
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
            cb(null, new UserOk('Добавлено ' + added + ' классов. Изменено ' + modified));
        }
    });
};

Model.prototype.getForAccessList = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var class_id = obj.class_id;
    if (isNaN(+class_id)) return cb(new MyError('Не передан class_id',{obj:obj}));
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var sort_arr = {};

    var class_operation;
    async.series({
        get:function(cb){
            var params = {
                param_where:{
                    class_id:class_id
                },
                collapseData:false
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить class_operation',{params : params, err : err}));
                class_operation = res;
                cb(null);
            });
        }

    },function (err, res) {
        if (err) return cb(err, err2);
        cb(null, new UserOk('noToastr',{class_operation:class_operation}));
    });
};

Model.prototype.setToRoles = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var operation_ids = obj.operation_ids;
    if (!Array.isArray(operation_ids)) return cb(new MyError('Не передан operation_ids',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    var remove = obj.remove; // Если true, доступ будет удален у этой роли
    var roles = obj.roles;
    if (!Array.isArray(roles) || !roles.length) return cb(new UserError('Не указана ни одна роль',{obj:obj}));

    var operations;
    var roles_res;
    var err_res;
    var errors = [];
    async.series({
        get:function(cb){
            var params = {
                where:[
                    {
                        key:'id',
                        type:'in',
                        val1:operation_ids
                    }
                ],
                collapseData:false
            };

            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить class_operationS.',{params:params,err:err}));
                operations = res;
                cb(null);
            });
        },
        getRoles:function(cb){
            var o = {
                command:'get',
                object:'user',
                params:{
                    param_where:{
                        user_type_sysname:'USER_ROLE'
                    },
                    where:[
                        {
                            key:'user_type_sysname',
                            val1:'USER_ROLE'
                        },
                        {
                            key:'email',
                            type:'in',
                            val1:roles
                        }
                    ],
                    collapseData:false
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить переданные роли',{o : o, err : err})); // Could not
                if (!res.length) return cb(new UserError('Указанные роли не найдены".', {o:o}));
                if (res.length !== roles.length) errors.push(new UserError('Не все переданные роли найдены в системе',{roles:roles, res:res}));
                roles_res = res;
                cb(null);
            });
        },
        setAccess:function(cb){
            async.eachSeries(roles_res, function(one_role, cb){
                async.eachSeries(operations, function(oper, cb){
                    var o = {
                        command:'modifyIsAccess',
                        object:'access_to_operation',
                        params:{
                            class_operation_id:oper.id,
                            user_id:one_role.id,
                            state:!remove, // Если remove = true, то надо удалить доступ, то есть state = false!
                            rollback_key:rollback_key
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err)  errors.push(new MyError('Не удалось установить доступ',{o : o, err : err}))
                        cb(null);
                    });
                }, cb);

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
            cb(null, (errors.length? new UserOk({type:'info', msg:'Не все прошло гладко, смотри консоль',errors:errors}) : new UserOk('Ок')));
        }
    });
};

Model.prototype.setAllOperationYEStoSUPERADMIN = async function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;

    let needed_operation_for_access_ids = [];
    let class_access_arr = await JSON.parse( await fs.readFileSync('./models/access_for_superadmin.json', {encoding: 'utf-8'}))
    let queries = []

    async.series( {
        getOperations: cb => {
            let full_acces_class_names = []
            class_access_arr.forEach(class_name => {
                if (typeof class_name === 'string') {
                    full_acces_class_names.push(class_name)
                }
            })
            async.series({
                allAccessForClass: cb => {
                    let o = {
                        command: 'get',
                        object: 'class_operation',
                        params: {
                            where: [
                                {key: 'class', type: 'IN', val1: full_acces_class_names},
                            ],
                            collapseData: false,
                            columns: ['id', 'class_id', 'class'],
                            limit: 9999999
                        }
                    }
                    _t.api(o, (err, res) => {
                        if (err) return cb(new MyError('Не удалось получить операции класса', {err: err, o:o}))
                        needed_operation_for_access_ids = [...res.map(operation => operation.id)]
                        cb(null)
                    })
                },
                notAllAccessForClass: cb => {
                    if (class_access_arr.length == 0) return cb(null)
                    async.eachSeries(class_access_arr, (class_item, cb) => {
                        if (typeof class_item !== 'object') return cb(null)
                        async.eachSeries(Object.keys(class_item), (class_name, cb) => {
                            async.eachSeries(class_item[class_name], (operation_name, cb) => {
                                let o = {
                                    command: 'get',
                                    object: 'class_operation',
                                    params: {
                                        where: [
                                            {key: 'class', type: '=', val1: class_name, comparisonType: 'AND', group: 'class_' + class_name + '_' + operation_name},
                                            {key: 'name', type: '=', val1: operation_name, comparisonType: 'AND', group: 'class_' + class_name + '_' + operation_name}
                                        ],
                                        collapseData: false,
                                        columns: ['id', 'class_id', 'class', 'name'],
                                        limit: 9999999
                                    }
                                }
                                _t.api(o, (err, res) => {
                                    if (err) {
                                        return cb(new MyError('Не удалось получить операции класса', {err: err, o:o}))
                                    }
                                    res.forEach(operation => needed_operation_for_access_ids.push(operation.id) )
                                    cb(null)
                                })
                            }, cb)
                        }, cb)
                    }, cb)
                }
            }, cb)
        },
        getAddedOperationsAccess: cb => {
            async.series({
                getAllAddedOperationBefore: cb => {
                    let o = {
                        command: 'get',
                        object: 'access_to_operation',
                        params: {
                            param_where: {
                                firstname: 'SUPERADMIN',
                                is_access: true
                            },
                            collapseData: false,
                            limit: 9999999,
                            columns: ['id', 'class_operation_id', 'user_id', 'firstname', 'is_access']
                        }
                    }
                    _t.api(o, (err, res) => {
                        if (err) return cb(new MyError('Не удалось получить разрешённые операции класса для SUPERADMIN', {err: err, o:o}))
                        operation_access_added_before = res
                        cb(null)
                    })
                },
                comparison: cb => {
                    //формирование массива запросов для создания разрешений на запросы
                    for (let i in needed_operation_for_access_ids) {
                        let flag_has_already = false
                        for (let j in operation_access_added_before) {
                            if (operation_access_added_before[j].class_operation_id == needed_operation_for_access_ids[i]) {
                                flag_has_already = true
                                break
                            }
                        }
                        if (!flag_has_already) queries.push({
                            command: 'add',
                            object: 'access_to_operation',
                            params: {
                                class_operation_id: needed_operation_for_access_ids[i],
                                firstname: 'SUPERADMIN',
                                is_access: true
                            }
                        })
                    }

                    //формирование массива запросов для удаления разрешений на запросы
                    for (let i in operation_access_added_before) {
                        let flag_for_remove = true
                        for (let j in needed_operation_for_access_ids) {
                            if (operation_access_added_before[i].class_operation_id == needed_operation_for_access_ids[j]) {
                                flag_for_remove = false
                                break
                            }
                        }
                        if (flag_for_remove) {
                            queries.push({
                                command: 'remove',
                                object: 'access_to_operation',
                                params: {
                                    id: operation_access_added_before[i].id
                                }
                            })
                        }
                    }

                    cb(null)
                }
            }, cb)
        },
        setOperations: cb => {
            async.eachSeries(queries, (query, cb) => {
                let o = query
                _t.api(o, (err, res) => {
                    if (err) {
                        if (err.message == 'recExist') return cb(null)
                        return cb(new MyError('Не удалось дать/удалить доступ для операции класса', {err: err, o:o}))
                    }
                    cb(null)
                })
            }, cb)
        }
    }, (err, res) => {
        if (err) return cb(err)
        cb(null, new UserOk('Ок'));
    })
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
