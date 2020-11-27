const MyError = require('../../error').MyError
const UserError = require('../../error').UserError
const UserOk = require('../../error').UserOk
const funcs = require('../functions')
const async = require('async')

class RoleModel {
    constructor(obj) {

        this.user = obj.user
        // this.api = this.user.api
        this.role_model = obj.role_model
        this.items = {}
        this.get = {}
    }

    api(obj, cb) {
        this.user.api(obj, cb)
    }

    getObjects(obj, cb) {
        if (arguments.length === 1) {
            cb = arguments[0]
            obj = {}
        }
        var _t = this
        // var id = obj.id;
        // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id

        var organization_id = obj.organization_id
        if (!organization_id) return cb(new MyError('Не передан organization_id', {obj: obj}))

        if (typeof organization_id === 'object' && Array.isArray(organization_id.data)) organization_id = organization_id.data
        var organization_ids = (Array.isArray(organization_id)) ? [...organization_id] : [organization_id]

        if (!organization_ids.length) return cb(null, new UserOk('noToastr', {data: []}))

        let data = []
        var object_ids
        async.series({
            getRel: cb => {
                var o = {
                    command: 'get',
                    object: 'object_relation_organization_r_role',
                    params: {
                        columns: ['id', 'org_r_role_id', 'object_id', 'organization_id'],
                        where: [
                            {
                                key: 'organization_id',
                                type: 'in',
                                val1: organization_ids
                            }
                        ],
                        limit: 10000000,
                        collapseData: false,
                        skipCheckRoleModel: true,
                        use_cache: false
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить объекты', {o: o, err: err}))
                    object_ids = res.map(one => one.object_id)
                    cb(null)
                })

            },
            getReal: cb => {
                // Временная мера, так как object_relation_organization_r_role почему то не удаляется вместе с объектом TODO object_relation_organization_r_role
                if (!object_ids.length) return cb(null)
                var o = {
                    command: 'get',
                    object: 'object_',
                    params: {
                        columns: ['id'],
                        where: [
                            {
                                key: 'id',
                                type: 'in',
                                val1: object_ids
                            }
                        ],
                        limit: 10000000,
                        collapseData: false,
                        skipCheckRoleModel: true,
                        use_cache: false
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить объекты по id', {o: o, err: err}))
                    data = res.map(one => one.id)
                    cb(null)
                })

            }
        }, function(err, res) {
            if (err) return cb(err)
            cb(null, new UserOk('noToastr', {data: data}))
        })
    }

    getGroupsSystem(obj, cb) {
        if (arguments.length === 1) {
            cb = arguments[0]
            obj = {}
        }
        var _t = this
        // var id = obj.id;
        // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id

        if (!obj.object_ids) return cb(new MyError('Не передан object_ids', {obj: obj}))

        let group_system_ids
        async.series({
            getGroupsSystem: cb => {
                let o = {
                    command: 'get',
                    object: 'group_system',
                    params: {
                        columns: ['id'],
                        where: [{
                            key: 'object_id',
                            type: 'in',
                            val1: obj.object_ids
                        }],
                        limit: 10000000,
                        collapseData: false,
                        skipCheckRoleModel: true
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить группы систем', {o: o, err: err}))
                    group_system_ids = res.map(one => one.id)
                    cb(null, group_system_ids)
                })

            },
        }, function(err, res) {
            if (err) return cb(err)
            cb(null, new UserOk('noToastr', {data: res.getGroupsSystem}))
        })
    }

    getSystems(obj, cb) {
        if (arguments.length === 1) {
            cb = arguments[0]
            obj = {}
        }
        var _t = this
        // var id = obj.id;
        // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id

        if (!obj.group_system_ids) return cb(new MyError('Не передан group_system_ids', {obj: obj}))

        let object_system_ids
        async.series({
            getSystems: cb => {
                let o = {
                    command: 'get',
                    object: 'object_system',
                    params: {
                        columns: ['id'],
                        where: [
                            {
                                key: 'group_system_id',
                                type: 'in',
                                val1: obj.group_system_ids
                            }
                        ],
                        limit: 10000000,
                        collapseData: false,
                        skipCheckRoleModel: true
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить системы объектов', {o: o, err: err}))
                    object_system_ids = res.map(one => one.id)
                    cb(null, object_system_ids)
                })

            },
        }, function(err, res) {
            if (err) return cb(err)
            cb(null, new UserOk('noToastr', {data: res.getSystems}))
        })
    }

    getSystemReglamentWorks(obj, cb) {
        if (arguments.length === 1) {
            cb = arguments[0]
            obj = {}
        }
        var _t = this
        // var id = obj.id;
        // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
        if (!obj.system_ids) return cb(new MyError('Не передан system_ids', {obj: obj}))

        let system_reglament_work_ids
        async.series({
            getSystemReglamentWorks: cb => {
                let o = {
                    command: 'get',
                    object: 'system_reglament_work',
                    params: {
                        columns: ['id'],
                        where: [
                            {
                                key: 'object_system_id',
                                type: 'in',
                                val1: obj.system_ids
                            }
                        ],
                        limit: 10000000,
                        collapseData: false,
                        skipCheckRoleModel: true
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить регламентные работы системы', {o: o, err: err}))
                    system_reglament_work_ids = res.map(one => one.id)
                    cb(null, system_reglament_work_ids)
                })

            },
        }, function(err, res) {
            if (err) return cb(err)
            cb(null, new UserOk('noToastr', {data: res.getSystemReglamentWorks}))
        })
    }

    getEquipments(obj, cb) {
        if (arguments.length === 1) {
            cb = arguments[0]
            obj = {}
        }
        var _t = this
        // var id = obj.id;
        // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
        if (!obj.system_ids) return cb(new MyError('Не передан system_ids', {obj: obj}))

        async.series({
            getEquipments: cb => {
                let o = {
                    command: 'get',
                    object: 'equipment',
                    params: {
                        columns: ['id'],
                        where: [
                            {
                                key: 'object_system_id',
                                type: 'in',
                                val1: obj.system_ids
                            }
                        ],
                        limit: 10000000,
                        collapseData: false,
                        skipCheckRoleModel: true
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить оборудование системы', {o: o, err: err}))
                    let equipment_ids = res.map(one => one.id)
                    cb(null, equipment_ids)
                })

            },
        }, function(err, res) {
            if (err) return cb(err)
            cb(null, new UserOk('noToastr', {data: res.getEquipments}))
        })
    }

    getReglamentREquipments(obj, cb) {
        if (arguments.length === 1) {
            cb = arguments[0]
            obj = {}
        }
        var _t = this
        // var id = obj.id;
        // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
        if (!obj.equipment_ids && !obj.object_system_ids) {
            return cb(new MyError('Не передан ' + (obj.equipment_ids ? '' : 'equipment_ids ') + (obj.object_system_ids ? '' : 'object_system_ids '), {obj: obj}))
        }
        async.series({
            getReglamentREquipments: cb => {
                let o = {
                    command: 'get',
                    object: 'reglament_r_equipment',
                    params: {
                        columns: ['id'],
                        where: [],
                        limit: 10000000,
                        collapseData: false,
                        skipCheckRoleModel: true
                    }
                }
                if (obj.equipment_ids) {
                    o.params.columns.push('equipment_id')
                    o.params.where.push({
                        key: 'equipment_id',
                        type: 'in',
                        val1: obj.equipment_ids,
                        comparisonType: 'OR',
                        group: 'equipment_id__and__object_system_id'
                    })
                }
                if (obj.object_system_ids) {
                    o.params.columns.push('object_system_id')
                    o.params.where.push({
                        key: 'object_system_id',
                        type: 'in',
                        val1: obj.object_system_ids,
                        comparisonType: 'OR',
                        group: 'equipment_id__and__object_system_id'
                    })
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить оборудование системы', {o: o, err: err}))
                    let equipment_ids = res.map(one => one.id)
                    cb(null, equipment_ids)
                })

            },
        }, function(err, res) {
            if (err) return cb(err)
            cb(null, new UserOk('noToastr', {data: res.getReglamentREquipments}))
        })
    }

    checkParam(obj, cb) {
        obj = funcs.cloneObj(obj, 10)
        var role_model = this.role_model
        var one_param_key = obj.one_param_key
        var one_param = obj.one_param
        var received_params = obj.received_params
        var checkAccess = obj.checkAccess
        // if (!Array.isArray(one_param)) one_param = [one_param];
        one_param = !Array.isArray(one_param) ? [one_param] : [...one_param]

        var _t = this

        // var user = obj.user
        // if (typeof _t.user.getObjects === 'function' && typeof user.getObjects !== 'function') user.getObjects = _t.user.getObjects

        var flag
        var denies = []
        var accesses = []
        var one_res = []
        async.eachSeries(one_param, (one_method_or_rule, cb) => {
            // console.log(one_param, one_method_or_rule, user.user_data)
            // debugger
            async.series({
                getData: cb => {

                    if (typeof one_method_or_rule === 'function') {
                        var one_method_params = {
                            ...obj,
                            roles: {...obj.roles},
                            role_sysname: obj.role_sysname
                        }
                        const f = one_method_or_rule.bind(this)

                        f(one_method_params, (err, res) => {
                            if (err) return cb(new MyError('Один из методов вернул ош',
                                {
                                    obj: obj,
                                    one_param: one_param,
                                    one_method: one_method_or_rule,
                                    one_method_params: one_method_params,
                                    err: err
                                }))
                            // if (res.data.indexOf(received_params[one_param_key]) === -1) return cb(null, new UserOk('Проверка проведене',{data:{flag:false}}));
                            return cb(null, new UserOk('Запрос данных проведен', {data: res.data}))
                        })
                        // if (typeof role_model.methods[one_method_or_rule]){
                        //     var o = {
                        //         command:role_model.methods[one_method_or_rule],
                        //         object:'User',
                        //         params:{
                        //             role:role
                        //         }
                        //     };
                        //     _t.api(o, (err, res)=>{
                        //         if (err) return cb(new MyError('Один из методов вернул ош',{obj:obj, one_param:one_param, one_method:one_method_or_rule, err:err}));
                        //         return cb(null, new UserOk('Запрос данных проведен', {data:res.data}));
                        //     });
                    } else if (Array.isArray(one_method_or_rule)) {
                        return cb(null, new UserOk('Запрос данных проведен Array', {data: one_method_or_rule}))
                    } else if (typeof one_method_or_rule === 'object') {
                        if (one_method_or_rule.noCheckAccessParam && checkAccess) {
                            return cb(null, new UserOk('noCheckAccessParam', {noCheckAccessParam: true}))
                        }
                        if (!one_method_or_rule.method) {
                            if (one_method_or_rule instanceof UserOk || one_method_or_rule.data) return cb(null, one_method_or_rule)
                            return cb(new MyError('Один из элементов - объект, но нет такого method', {
                                obj: obj,
                                one_param: one_param,
                                one_method: one_method_or_rule
                            }))
                        }
                        if (typeof one_method_or_rule.method !== 'function')
                            return cb(new MyError('Один из элементов - объект, но его method не является наименованием функции из role_model.methods', {
                                obj: obj,
                                one_param: one_param,
                                one_method: one_method_or_rule
                            }))
                        if (!one_method_or_rule.params || typeof one_method_or_rule.params !== 'object') one_method_or_rule.params = {}
                        async.eachSeries(Object.keys(one_method_or_rule.params), (one_in_param_key, cb) => {
                            var o = {
                                ...obj,
                                one_param_key: one_in_param_key,
                                one_param: one_method_or_rule.params[one_in_param_key],
                                getDataOnly: true
                            }
                            this.checkParam(o, (err, res) => {
                                if (err) return cb(new MyError('Ошибка во вложенном checkParam', {o: o, err: err}))
                                // one_method_or_rule.params[one_in_param_key] = res.data; // Присвоим полученные значения
                                one_method_or_rule.params[one_in_param_key] = res // Присвоим полученные значения
                                cb(null)
                            })
                        }, (err, res) => {
                            if (err) return cb(err)

                            var one_method_params = {
                                ...obj,
                                roles: {...obj.roles},
                                role_sysname: obj.role_sysname,
                                ...one_method_or_rule.params
                            }
                            // var f = one_method_or_rule.method
                            var f = one_method_or_rule.method.bind(this)
                            // var f = role_model.methods[one_method_or_rule.method].bind(this.user)
                            // var f = role_model.methods[one_method_or_rule.method]

                            f(one_method_params, (err, res) => {
                                if (err) return cb(new MyError('Один из вложенных методов вернул ош', {
                                    obj: obj,
                                    one_param: one_param,
                                    one_method: one_method_or_rule.method,
                                    one_method_params: one_method_params,
                                    err: err
                                }))
                                return cb(null, new UserOk('Запрос данных проведен', {data: res.data}))

                            })
                        })
                    } else if (one_method_or_rule === 'function') {
                        var one_method_params = {
                            ...obj,
                            roles: {...obj.roles},
                            role_sysname: obj.role_sysname,
                        }
                        // var f = one_method_or_rule.bind(this.user)
                        var f = one_method_or_rule.bind(this)
                        f(one_method_params, (err, res) => {
                            if (err) return cb(new MyError('Метод в ролевой модели имеет ошибку', {
                                err: err,
                                one_method_params: one_method_params
                            }))
                            one_method_or_rule = res.data
                            return cb(null, new UserOk('Ок', {data: res.data}))
                        })
                    } else {
                        // return cb(new MyError('Неизвестный тип параметра', {one_param: one_param, one_method_or_rule:one_method_or_rule, obj: obj}));
                        return cb(null, new UserOk('Запрос данных проведен', {data: [one_method_or_rule]}))
                    }
                }
            }, (err, res) => {
                if (err) return cb(err)

                var data = res.getData.data.map(one => String(one))
                // data = [...one_res, ...data];
                // one_res = data;
                one_res = [...one_res, ...data]
                one_param.data = one_res

                if (obj.getDataOnly) return cb(null)

                flag = (checkAccess) ? (res.getData.noCheckAccessParam ? true : !!data.length) : (data.indexOf(String(received_params[one_param_key])) !== -1)
                if (!flag) {
                    denies.push({
                        flag: flag,
                        role_sysname: obj.role_sysname,
                        one_param: one_param,
                        one_param_key: one_param_key,
                        received_param: received_params[one_param_key],
                        data: res.getData.data
                    })
                    return cb(new UserOk('Проверка проведена. Доступ запрещен', {
                        flag,
                        data: (one_param.data) ? [...one_param.data] : [],
                        denies: [...denies]
                    }))
                }
                accesses.push({
                    flag: flag,
                    role_sysname: obj.role_sysname,
                    one_param: one_param,
                    one_param_key: one_param_key,
                    received_param: received_params[one_param_key],
                    data: res.getData.data
                })
                return cb(null)
            })
        }, (err, res) => {
            if (err) {
                if (err instanceof UserOk) {
                    err.data.denies = [...denies]
                    return cb(null, err)
                }
                return cb(err)
            }
            return cb(null, new UserOk('Проверка проведена.', {
                data: (one_param.data) ? [...one_param.data] : [],
                flag: true,
                accesses: [...accesses]
            }))
        })
    }
}

module.exports = RoleModel


// role_model.checkParam = (obj, cb) => {
//     obj = funcs.cloneObj(obj, 10)
//     // var role_model = this.role_model
//     var one_param_key = obj.one_param_key
//     var one_param = obj.one_param
//     var received_params = obj.received_params
//     var checkAccess = obj.checkAccess
//     // if (!Array.isArray(one_param)) one_param = [one_param];
//     one_param = !Array.isArray(one_param) ? [one_param] : [...one_param]
//
//     var _t = this
//
//     var user = obj.user
//     if (typeof _t.user.getObjects === 'function' && typeof user.getObjects !== 'function') user.getObjects = _t.user.getObjects
//     // var user = funcs.cloneObj(obj.user, 3);
//     // for (var i in obj.user) {
//     //     if (typeof obj.user[i] === 'object')
//     // }
//     // delete obj.user;
//     var flag
//     var denies = []
//     var accesses = []
//     var one_res = []
//     async.eachSeries(one_param, function(one_method_or_rule, cb) {
//         // console.log(one_param, one_method_or_rule, user.user_data)
//         // debugger
//         async.series({
//             getData: cb => {
//                 if (typeof role_model.methods[one_method_or_rule] === 'function') {
//                     // var one_method_params = {...obj};
//                     // var one_method_params = {
//                     //     roles: {...obj.roles},
//                     //     role_sysname: obj.role_sysname
//                     // };
//                     var one_method_params = {
//                         ...obj,
//                         roles: {...obj.roles},
//                         role_sysname: obj.role_sysname
//                     }
//                     // var f = role_model.methods[one_method_or_rule].bind(_t.user);
//                     var f = role_model.methods[one_method_or_rule].bind(user)
//                     // var f = role_model.methods[one_method_or_rule];
//                     f(one_method_params, (err, res) => {
//                         if (err) return cb(new MyError('Один из методов вернул ош',
//                             {
//                                 obj: obj,
//                                 one_param: one_param,
//                                 one_method: one_method_or_rule,
//                                 one_method_params: one_method_params,
//                                 err: err
//                             }))
//                         // if (res.data.indexOf(received_params[one_param_key]) === -1) return cb(null, new UserOk('Проверка проведене',{data:{flag:false}}));
//                         return cb(null, new UserOk('Запрос данных проведен', {data: res.data}))
//                     })
//                     // if (typeof role_model.methods[one_method_or_rule]){
//                     //     var o = {
//                     //         command:role_model.methods[one_method_or_rule],
//                     //         object:'User',
//                     //         params:{
//                     //             role:role
//                     //         }
//                     //     };
//                     //     _t.api(o, (err, res)=>{
//                     //         if (err) return cb(new MyError('Один из методов вернул ош',{obj:obj, one_param:one_param, one_method:one_method_or_rule, err:err}));
//                     //         return cb(null, new UserOk('Запрос данных проведен', {data:res.data}));
//                     //     });
//                 } else if (Array.isArray(one_method_or_rule)) {
//                     return cb(null, new UserOk('Запрос данных проведен Array', {data: one_method_or_rule}))
//                 } else if (typeof one_method_or_rule === 'object') {
//                     if (one_method_or_rule.noCheckAccessParam && checkAccess) {
//                         return cb(null, new UserOk('noCheckAccessParam', {noCheckAccessParam: true}))
//                     }
//                     if (!one_method_or_rule.method) {
//                         if (one_method_or_rule instanceof UserOk || one_method_or_rule.data) return cb(null, one_method_or_rule)
//                         return cb(new MyError('Один из элементов - объект, но нет такого method', {
//                             obj: obj,
//                             one_param: one_param,
//                             one_method: one_method_or_rule
//                         }))
//                     }
//                     if (typeof role_model.methods[one_method_or_rule.method] !== 'function')
//                         return cb(new MyError('Один из элементов - объект, но его method не является наименованием функции из role_model.methods', {
//                             obj: obj,
//                             one_param: one_param,
//                             one_method: one_method_or_rule
//                         }))
//                     if (!one_method_or_rule.params || typeof one_method_or_rule.params !== 'object') one_method_or_rule.params = {}
//                     async.eachSeries(Object.keys(one_method_or_rule.params), function(one_in_param_key, cb) {
//                         var o = {
//                             ...obj,
//                             one_param_key: one_in_param_key,
//                             one_param: one_method_or_rule.params[one_in_param_key],
//                             getDataOnly: true
//                         }
//                         role_model.checkParam(o, (err, res) => {
//                             if (err) return cb(new MyError('Ошибка во вложенном checkParam', {o: o, err: err}))
//                             // one_method_or_rule.params[one_in_param_key] = res.data; // Присвоим полученные значения
//                             one_method_or_rule.params[one_in_param_key] = res // Присвоим полученные значения
//                             cb(null)
//                         })
//                     }, (err, res) => {
//                         if (err) return cb(err)
//
//                         var one_method_params = {
//                             ...obj,
//                             roles: {...obj.roles},
//                             role_sysname: obj.role_sysname,
//                             ...one_method_or_rule.params
//                         }
//                         // var f = role_model.methods[one_method_or_rule.method].bind(_t.user);
//                         var f = role_model.methods[one_method_or_rule.method].bind(user)
//                         // var f = role_model.methods[one_method_or_rule.method];
//                         f(one_method_params, (err, res) => {
//                             if (err) return cb(new MyError('Один из вложенных методов вернул ош', {
//                                 obj: obj,
//                                 one_param: one_param,
//                                 one_method: one_method_or_rule.method,
//                                 one_method_params: one_method_params,
//                                 err: err
//                             }))
//                             return cb(null, new UserOk('Запрос данных проведен', {data: res.data}))
//
//                         })
//                     })
//                 } else if (one_method_or_rule === 'function') {
//                     var one_method_params = {
//                         ...obj,
//                         roles: {...obj.roles},
//                         role_sysname: obj.role_sysname,
//                     }
//                     // var f = one_method_or_rule.bind(_t.user);
//                     var f = one_method_or_rule.bind(user)
//                     // var f = one_method_or_rule;
//                     one_method_or_rule(one_method_params, (err, res) => {
//                         if (err) return cb(new MyError('Метод в ролевой модели имеет ошибку', {
//                             err: err,
//                             one_method_params: one_method_params
//                         }))
//                         one_method_or_rule = res.data
//                         return cb(null, new UserOk('Ок', {data: res.data}))
//                     })
//                 } else {
//                     // return cb(new MyError('Неизвестный тип параметра', {one_param: one_param, one_method_or_rule:one_method_or_rule, obj: obj}));
//                     return cb(null, new UserOk('Запрос данных проведен', {data: [one_method_or_rule]}))
//                 }
//             }
//         }, (err, res) => {
//             if (err) return cb(err)
//
//             var data = res.getData.data.map(one => String(one))
//             // data = [...one_res, ...data];
//             // one_res = data;
//             one_res = [...one_res, ...data]
//             one_param.data = one_res
//
//             if (obj.getDataOnly) return cb(null)
//
//             flag = (checkAccess) ? (res.getData.noCheckAccessParam ? true : !!data.length) : (data.indexOf(String(received_params[one_param_key])) !== -1)
//             if (!flag) {
//                 denies.push({
//                     flag: flag,
//                     role_sysname: obj.role_sysname,
//                     one_param: one_param,
//                     one_param_key: one_param_key,
//                     received_param: received_params[one_param_key],
//                     data: res.getData.data
//                 })
//                 return cb(new UserOk('Проверка проведена. Доступ запрещен', {
//                     flag,
//                     data: (one_param.data) ? [...one_param.data] : [],
//                     denies: [...denies]
//                 }))
//             }
//             accesses.push({
//                 flag: flag,
//                 role_sysname: obj.role_sysname,
//                 one_param: one_param,
//                 one_param_key: one_param_key,
//                 received_param: received_params[one_param_key],
//                 data: res.getData.data
//             })
//             return cb(null)
//         })
//     }, (err, res) => {
//         if (err) {
//             if (err instanceof UserOk) {
//                 err.data.denies = [...denies]
//                 return cb(null, err)
//             }
//             return cb(err)
//         }
//         return cb(null, new UserOk('Проверка проведена.', {
//             data: (one_param.data) ? [...one_param.data] : [],
//             flag: true,
//             accesses: [...accesses]
//         }))
//     })
// }
