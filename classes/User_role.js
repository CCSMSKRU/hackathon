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

Model.prototype.getUsers = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var user_id = obj.user_id;
    if (isNaN(+user_id)) return cb(new MyError('Не передан user_id',{obj:obj}));

    var user_role;
    async.series({
        get:function(cb){
            var params = {
                param_where:{
                    user_id:user_id
                },
                collapseData:false
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить user_role',{params : params, err : err}));
                user_role = res;
                cb(null);
            });
        }
    },function (err, res) {
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',{user_role:user_role}));
    });
};

/**
 * Получает на вход набор ролей (sysname), после чего заботится о том, чтобы они были у пользователя
 * Также добавляет Base Access
 * @param obj
 *      user_id, [roles]
 * @param cb
 * @returns {*}
 */

Model.prototype.syncSysRoles = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    let  _t = this;
    // console.log(obj)
    // debugger
    if (isNaN(+obj.user_id)) return cb(new MyError('Не передан user_id',{obj:obj})); // Not passed to user_id
    let organization_relation_user_ids = []
    let types_organization_relation_user = []
    let current_roles = []
    let sync;
    async.series({
        syncSysRoles: cb => {
            async.series({
                // getAll: cb => {
                //     async.series({
                //         getOrganizationRelationUserIds: cb => {
                //             let o = {
                //                 command: 'get',
                //                 object: 'organization_relation_user',
                //                 params: {
                //                     columns: ['id'],
                //                     param_where: {
                //                         user_id: obj.user_id
                //                     },
                //                     collapseData: false
                //                 }
                //             }
                //             _t.api(o, (err, res) => {
                //                 if (err) return cb(new MyError('При получении списка организаций пользователя - произошла ошибка.', {err: err}));
                //                 for (let i in res) organization_relation_user_ids.push(res[i].id)
                //                 cb(null)
                //             })
                //         },
                //         getRelationTypesOrganiizationIds: cb => {
                //             if (!organization_relation_user_ids.length) return cb(null)
                //             let o = {
                //                 command: 'get',
                //                 object: 'user_relation_type_for_organization',
                //                 params: {
                //                     columns: ['id', 'type_for_organization_id', 'all_role'],
                //                     collapseData: false,
                //                     where: [
                //                         {
                //                             key:'organization_relation_user_id',
                //                             type:'in',
                //                             val1:[organization_relation_user_ids]
                //                         }
                //                     ]
                //                 }
                //             }
                //             _t.api(o, (err, res) => {
                //                 if (err) return cb(new MyError('При получении списка типов связи с организацией пользователя - произошла ошибка.', {err: err}));
                //                 for (let i in res) types_organization_relation_user.push(res[i])
                //                 cb(null)
                //             })
                //         },
                //         getRolesTypesOrganization: cb => {
                //
                //             if (types_organization_relation_user.length == 0) return cb(null)
                //             async.each(types_organization_relation_user, (type, cb) => {
                //                 if (type.all_role === true) {
                //                     //TODO здесб мы получаем полный список ролей этгого типа
                //                     let o = {
                //                         command: 'get',
                //                         object: 'role_for_org_type',
                //                         params: {
                //                             collapseData: false,
                //                             columns: ['role_sysname'],
                //                             where: [
                //                                 {key: 'type_for_organization_id', type: '=', val1: type.type_for_organization_id, comparisonType: 'OR', group: 'user_relation_type_for_organization'}
                //                             ]
                //                         }
                //                     }
                //                     _t.api(o, (err, res) => {
                //                         if (err) return cb(new MyError('При получении всего списка ролей типа связи с организацией пользователя - произошла ошибка.', {err: err}));
                //                         for (let i in res) {
                //                             if (current_roles.indexOf(res[i].role_sysname) < 0) {
                //                                 current_roles.push(res[i].role_sysname)
                //                             }
                //                         }
                //                         cb(null)
                //                     })
                //                 } else {
                //                     let o = {
                //                         command: 'get',
                //                         object: 'user_role_in_org_by_type',
                //                         params: {
                //                             collapseData: false,
                //                             columns: ['role_sysname'],
                //                             where: [
                //                                 {key: 'user_relation_type_for_organization_id', type: '=', val1: type.id, comparisonType: 'OR', group: 'user_relation_type_for_organization'}
                //                             ]
                //                         }
                //                     }
                //                     _t.api(o, (err, res) => {
                //                         if (err) return cb(new MyError('При получении списка ролей типа связи с организацией пользователя - произошла ошибка.', {err: err}));
                //                         for (let i in res) current_roles.push(res[i].role_sysname)
                //                         cb(null)
                //                     })
                //                 }
                //             }, cb)
                //         }
                //     }, cb)
                // },
                getUserRoles:cb => {
                    var o = {
                        command:'getRoles',
                        object:'User',
                        params:{
                            user_id:obj.user_id
                        }
                    };
                    _t.api(o, (err, res)=>{
                        if (err) return cb(new MyError('Не удалось получить роли пользователя',{o : o, err : err}));
                        // Object.keys(res.data.roles_obj_byOrganizationId).forEach(key=>{
                        //     var one_company_roles = res.data[key];
                        //     one_company_roles.forEach(one_role => {
                        //         if (current_roles.indexOf(one_role) === -1) current_roles.push(one_role);
                        //     })
                        //
                        // })
                        current_roles = Object.keys(res.data.organization_obj_byRoleSysname);
                        cb(null);
                    });
                },
                sync: cb => {
                    let o = {
                        user_id: obj.user_id,
                        roles: current_roles,
                    };
                    _t.sync(o, (err, res)=>{
                        if (err) return cb(new MyError('Не удалось sync',{o : o, err : err}));
                        sync = res
                        cb(null);
                    });
                }
            }, cb);
        }
    }, (err, res) => {
        // console.log(err, res)
        // debugger
        if (err) return cb(err)
        cb(null, {
            roles: current_roles,
            sync: sync
        });
    })
};

Model.prototype.sync = function (obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    if (obj.fromClient) return cb(new MyError('Запрещено с клиента.'));
    var user_id = obj.user_id;
    if (isNaN(+user_id)) return cb(new MyError('Не передан user_id',{obj:obj})); // Not passed to user_id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    var roles = Array.isArray(obj.roles)? [... obj.roles, 'BASE_ACCESS'] : ['BASE_ACCESS'];

    var business_logic_roles = ['CLEANING', 'COMPANY_ADMIN', 'DISPATCHER', 'COMPANY_EMPLOYEE', 'ENGINEER', 'FACILITY_MANAGER', 'LEAD_ENGINEER', 'TECHNICIAN', 'GENERAL_DIRECTOR', 'SECRETARY', 'RENT_MANAGER', 'RECEPTION', 'SECURITY', 'SUPERADMIN','CUSTOMER'];
    var self_roles_obj = {};
    var exist_roles_obj = [];
    async.series({
        get: cb => {
            var params = {
                where:[
                    {
                        key:'user_id',
                        val1:user_id
                    },
                    {
                        key:'email_role',
                        type:'in',
                        val1:[...business_logic_roles, 'BASE_ACCESS']
                    }
                ],
                columns:['id', 'user_id', 'email_role'],
                collapseData:false
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить роли пользователя',{params : params, err : err}));
                res.forEach(one =>{
                    self_roles_obj[one.email_role] = one;
                });
                cb(null);
            });
        },
        getExist: cb => {
            var o = {
                command:'get',
                object:'user',
                params:{
                    param_where:{
                        user_type_sysname:'USER_ROLE'
                    },
                    columns:['id', 'user_type_sysname','email'],
                    collapseData:false
                }
            };
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось получить все роли',{o : o, err : err}));
                res.forEach(one =>{
                    if (one.email) exist_roles_obj.push(one.email);
                });
                cb(null);
            });
        },
        merge: cb => {
            roles.forEach(role_sysname =>{
                if (business_logic_roles.indexOf(role_sysname) === -1 && role_sysname !== 'BASE_ACCESS') return;
                if (exist_roles_obj.indexOf(role_sysname) === -1) return;
                if (!self_roles_obj[role_sysname]){
                    self_roles_obj[role_sysname] = {
                        toAdd:true,
                        email_role:role_sysname
                    };
                    return;
                }
                if (self_roles_obj[role_sysname].toAdd) return; // Повтор
                self_roles_obj[role_sysname].doNothing = true;
            });
            Object.keys(self_roles_obj).forEach(key=>{
                if (!self_roles_obj[key].toAdd && !self_roles_obj[key].doNothing) self_roles_obj[key].toRemove = true;
            });
            cb(null);
        },
        add: cb => {
            async.eachSeries(self_roles_obj, function(item, cb){
                // console.log(self_roles_obj, item)
                // debugger
                if (!item.toAdd) return cb(null);
                var params = {
                    user_id:user_id,
                    email_role: item.email_role,
                    rollback_key:rollback_key
                };
                _t.add(params, function (err, res) {
                    if (err) return cb(new MyError('Не удалось добавить user_role',{params : params, err : err, item:item}));
                    cb(null);
                });
            }, cb);
        },
        remove: cb => {
            async.eachSeries(self_roles_obj, function(item, cb){
                if (!item.toRemove) return cb(null);
                var params = {
                    id:item.id,
                    confirm: true,
                    physical: true,
                    rollback_key:rollback_key
                };
                _t.remove(params, function (err, res) {
                    if (err) return cb(new MyError('Не удалось удалить user_role',{params : params, err : err}));

                    cb(null);
                });
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



Model.prototype.exampleGet = function (obj, cb) {
    if (arguments.length === 1) {
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
