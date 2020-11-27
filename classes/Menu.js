/**
 * Created by iig on 29.10.2015.
 */
// var MyError = require('../error').MyError;
// var BasicClass = require('./system/BasicClass');
// var util = require('util');
//
// var Model = function(obj){
//     this.name = obj.name;
//     this.tableName = obj.name.toLowerCase();
//
//     var basicclass = BasicClass.call(this, obj);
//     if (basicclass instanceof MyError) return basicclass;
// };
// util.inherits(Model, BasicClass);
// Model.prototype.getPrototype = Model.prototype.get;


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

Model.prototype.get_menu_tree = function (params, cb) {
    if (typeof cb!=='function') throw new MyError('В метод не передана функция callback');
    if (typeof params!=='object') return cb(new MyError('В метод не переданы params'));
    var _t = this;
    //params.collapseData = false;
    // params.order_by = 'sort_no';
    // params.sort = 'sort_no';
    // params.limit = false;
    // params.param_where = {
    //     is_visible:true
    // };

    var user_id = _t.user.user_data.id;
    var res_get;
    var user_roles_obj_by_roleUserId = {};
    var menu_ids;
    async.series({
        getAccess: cb => {
            if (_t.user.user_data.user_type_sysname === 'ADMIN') return cb(null);
            async.series({
                getRole:function(cb){
                    var o = {
                        command:'get',
                        object:'user_role',
                        params:{
                            param_where:{
                                user_id:user_id
                            },
                            collapseData:false
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить user_role',{o : o, err : err}));
                        res.forEach(one=>{
                            if (!user_roles_obj_by_roleUserId[one.role_user_id])
                                user_roles_obj_by_roleUserId[one.role_user_id] = one;
                        })
                        cb(null);
                    });
                },
                getAccessToMenu: cb => {
                    var o = {
                        command:'get',
                        object:'Access_to_menu',
                        params:{
                            where:[
                                {
                                    key:'user_id',
                                    type:'in',
                                    val1:[...Object.keys(user_roles_obj_by_roleUserId), user_id]
                                }
                            ],
                            collapseData:false
                        }
                    };
                    _t.api(o, (err, res)=>{
                        if (err) return cb(new MyError('Не удалось получить Access_to_menu',{o : o, err : err}));
                        menu_ids = [];
                        res.forEach(one => {
                            menu_ids.push(one.menu_id);
                        });
                        cb(null);
                    });
                }
            }, cb);
        },
        get: cb => {
            var params = {
                where:[
                    {
                        key:'is_visible',
                        val1:true
                    }
                ],
                order_by:'sort_no',
                sort:'sort',
                limit:1000000,
                collapseData:false
            };
            if (menu_ids) {
                if (!menu_ids.length) menu_ids.push('-1'); // Ни одного пункта меню
                params.where.push({
                    key:'id',
                    type:'in',
                    val1:menu_ids
                });
            }
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить меню',{params : params, err : err}));
                res_get = res;
                cb(null);
            });

        }
    }, (err, res)=>{
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',{data:res_get}));
    });

    // _t.get(params, function (err, res) {
    //
    //     // if(user_id == 18){
    //     //
    //     //     for(var i in res.data){
    //     //
    //     //         if(res.data[i][res.data_columns.indexOf('menu_item')] != 'dashboard' && res.data[i][res.data_columns.indexOf('menu_item')] != 'base_data'){
    //     //
    //     //             res.data[i][res.data_columns.indexOf('is_visible')] = false;
    //     //
    //     //         }
    //     //     }
    //     // }
    //
    //     cb(err, res);
    // })
};

Model.prototype.getTreeOLD = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    let  _t = this;
    // var project_id = obj.project_id;
    // var id = obj.id;
    //
    // if (!isNaN(+id)){
    //     _t.getTreePrototype(obj, cb);
    //     return;
    // }

    // if (isNaN(+project_id)) return cb(new MyError('Не передан project_id',{obj:obj})); // Not passed to project_id

    // var parent_ids = [];
    // var plot_ids = [];
    // var only_ids = [];
    // var plots;
    // var tree = {
    //     'core': {
    //         'data': []
    //     }
    // };
    // var all_project_ids = [project_id];
    let types_main_menu = []
    async.series({
        getTypesMainMenu: cb => {
            let params = {
                param_where:{
                    type_id:1
                },
                limit:100000000,
                collapseData:false
            };

            _t.get(params, (err, res) => {
                // console.log(err, res)
                // debugger
                // if (err) return cb(new MyError('Не удалось получить Родительские проекты',{o : o, err : err}));
                // types_main_menu = all_project_ids.concat(res.ids);
                // cb(null);
            });
        }

    }, (err, res) => {
        if (err) return cb(err);
        // var resTree = {
        //     'core': {
        //         'data': tree
        //     }
        // };
        cb(null, new UserOk('noToastr',{tree:tree}));
    });
};



/**
 * Установит доступ к роле, у которой стоит галочка "Роль для выставления"
 * @param obj
 * @param cb
 * @returns {*}
 */
Model.prototype.setAccessToCheckedRole = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    var remove = obj.remove; // Если true, доступ будет удален у этой роли

    var row;
    var role;
    async.series({
        get:function(cb){
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить menu.',{id:id,err:err}));
                row = res[0];
                cb(null);
            });
        },
        getRole:function(cb){
            var o = {
                command:'get',
                object:'user',
                params:{
                    param_where:{
                        role_for_autoaccess:true,
                        user_type_sysname:'USER_ROLE'
                    },
                    collapseData:false
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить роль для выставления доступа',{o : o, err : err})); // Could not
                if (!res.length) return cb(new UserError('Не у одной из ролей не стоит галочка "Роль для выставления".', {o:o}));
                if (res.length > 1) return cb(new UserError('У нескольких ролей стоит галочка "Роль для выставления". Оставьте только одну',{o:o, res:res}));
                role = res[0];
                cb(null);
            });
        },
        setAccess:function(cb){

            var access_row;
            async.series({
                getAccess:function(cb){
                    var o = {
                        command:'get',
                        object:'access_to_menu',
                        params:{
                            param_where:{
                                menu_id:id,
                                user_id:role.id
                            },
                            collapseData:false
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить access_to_menu',{o : o, err : err})); // Could not
                        if (res.length > 1) return cb(new MyError('Слишком много Записей с доступом этому пользователю и этой роли.',{o:o, res:res}));
                        if (!res.length) return cb(null);
                        access_row = res[0];
                        cb(null);
                    });
                },
                add:function(cb){
                    if (access_row || remove) return cb(null);
                    var o = {
                        command:'add',
                        object:'access_to_menu',
                        params:{
                            menu_id:id,
                            user_id:role.id,
                            rollback_key:rollback_key
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось добавить доступ к меню',{o : o, err : err})); // Could not
                        cb(null);
                    });
                },
                remove: cb => {
                    if (!access_row || !remove) return cb(null);
                    var o = {
                        command:'remove',
                        object:'access_to_menu',
                        params:{
                            id:access_row.id,
                            confirm:true,
                            physical: true,
                            rollback_key:rollback_key
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось удалить доступ к меню',{o : o, err : err})); // Could not
                        cb(null);
                    });
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
            cb(null, new UserOk('Ок'));
        }
    });
};


module.exports = Model;
