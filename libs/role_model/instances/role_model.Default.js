/*
 * Complex Cloud Solutions, LLC (ccs.msk.ru)
 * Ivan Goptarev
 * Copyright (c) 2020.
 * Powered by GoCore (go-core.ru)
 */
const RoleModel = require('../RoleModel')
const MyError = require('../../../error').MyError
const UserError = require('../../../error').UserError
const UserOk = require('../../../error').UserOk
const async = require('async')

const funcs = require('../../functions')

class Instance extends RoleModel {
    constructor(obj) {
        super(obj)

        const items = {
            'ANY': {
                Request_work: {
                    'setColumnPosition': true,
                    'getCount': true,
                    'getProfile': true,
                    '_clearCache': true,
                    'get': true, // Работает только если ни у одной из ролей не проставлено. Если запрещаешь для одной то, надо
                    'getById': true,
                    'getComment': true,
                    'getHistory': true,
                    'getForSelect': true,
                    'getForFilterSelect': true,
                    'modify': true,
                    'add': false,
                    'setExecutor': {
                        params: {
                            id: [{
                                method: this.checkRequestWorkStatus,
                                params: {status_sysname: ['CREATED', 'CONFIRM', 'PROCESSIND']}
                            }]
                        }
                    },
                    'reSetExecutor': {
                        params: {
                            id: [{
                                method: this.checkRequestWorkStatus,
                                params: {status_sysname: ['CREATED', 'CONFIRM', 'PROCESSIND']}
                            }]
                        }
                    },
                    'setReturned': false,
                    'setAccepted': false,
                    'setRejected': false,
                    'setProcessing': false,
                    'setSuccessful': false,
                    'setClosed': false,
                    'returnToProcessing': false,
                }
            },
        }

        const get = {
            'ANY': {},
        }

        const executor_model = {
            SUPERADMIN: ['SUPERADMIN']
        }

        this.items = funcs.supplementObj(this.items, items)
        this.get = funcs.supplementObj(this.get, get)
        this.executor_model = funcs.supplementObj(this.executor_model, executor_model)
    }

    getUserSystemReglamentWork(obj, cb) {
        var _t = this
        let user_organizations
        async.series({
            getUserOrganizations: cb => {
                obj.organization_id = Object.values(obj.roles.organization_obj_byRoleSysname[obj.role_sysname])
                cb(null)
            },
            getUserObjects: cb => {
                _t.getObjects(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить organization_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.object_ids = res.data
                    cb(err, res)
                })
            },
            getUserGroupsSystem: cb => {
                _t.getGroupsSystem(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить object_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.group_system_ids = res.data
                    cb(err, res)
                })
            },
            getUserSystems: cb => {
                _t.getSystems(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить group_system_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.system_ids = res.data
                    cb(err, res)
                })
            },
            getUserSystemReglamentWorks: cb => {
                _t.getSystemReglamentWorks(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить system_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    cb(err, res)
                })
            }
        }, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить this.getUserObjectsWithoutParams', {
                obj: obj,
                err: err,
                res: res
            }))
            cb(null, new UserOk('Ок', {data: res.getUserSystemReglamentWorks.data}))
        })

    }

    getUserObjectsWithoutParams(obj, cb) {
        var _t = this
        let user_organizations
        async.series({
            getUserOrganizations: cb => {
                obj.organization_id = Object.values(obj.roles.organization_obj_byRoleSysname[obj.role_sysname])
                cb(null)
            },
            getUserObjects: cb => {
                _t.getObjects(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить organization_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    cb(err, res)
                })
            }
        }, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить this.getUserObjectsWithoutParams', {
                obj: obj,
                err: err,
                res: res
            }))
            cb(null, new UserOk('Ок', {data: res.getUserObjects.data.length ? res.getUserObjects.data : [-1]}))
        })

    }

    getUserGroupSystems(obj, cb) {
        var _t = this
        let user_organizations
        async.series({
            getUserOrganizations: cb => {
                obj.organization_id = Object.values(obj.roles.organization_obj_byRoleSysname[obj.role_sysname])
                cb(null)
            },
            getUserObjects: cb => {
                _t.getObjects(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить organization_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.object_ids = res.data
                    cb(err, res)
                })
            },
            getUserGroupsSystem: cb => {
                if (!obj.object_ids.length) return cb(null, {data: [-1]})
                _t.getGroupsSystem(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить object_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    cb(err, res)
                })
            }
        }, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить this.getUserObjectsWithoutParams', {
                obj: obj,
                err: err,
                res: res
            }))
            cb(null, new UserOk('Ок', {data: res.getUserGroupsSystem.data.length ? res.getUserGroupsSystem.data : [-1]}))
        })

    }

    getUserObjectSystems(obj, cb) {
        var _t = this
        let user_organizations
        async.series({
            getUserOrganizations: cb => {
                obj.organization_id = Object.values(obj.roles.organization_obj_byRoleSysname[obj.role_sysname])
                cb(null)
            },
            getUserObjects: cb => {
                _t.getObjects(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить organization_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.object_ids = res.data
                    cb(err, res)
                })
            },
            getUserGroupsSystem: cb => {
                if (!obj.object_ids.length) {
                    obj.group_system_ids = [-1]
                    return cb(null)
                }
                _t.getGroupsSystem(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить object_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.group_system_ids = res.data
                    cb(err, res)
                })
            },
            getUserSystems: cb => {
                if (!obj.group_system_ids.length) return cb(null, {data: [-1]})
                if (obj.group_system_ids.length == 1 && obj.group_system_ids[0] == -1) return cb(null, {data: [-1]})
                _t.getSystems(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить object_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    cb(err, res)
                })
            }
        }, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить this.getUserObjectsWithoutParams', {
                obj: obj,
                err: err,
                res: res
            }))
            cb(null, new UserOk('Ок', {data: res.getUserSystems.data.length ? res.getUserSystems.data : [-1]}))
            // cb(null, new UserOk('Ок', {data: obj.received_params.object_system_id}));
            // if (obj.received_params.object_system_id) {
            //     let object_system_id = obj.received_params.object_system_id
            //     if (object_system_id.length) {
            //
            //     } else {}
            // }
            //
            // cb(null, new UserOk('Ок', {data: res.getUserSystems.data.length ? res.getUserSystems.data : [-1]}));
        })

    }

    getUserEquipments(obj, cb) {
        var _t = this
        let user_organizations
        async.series({
            getUserOrganizations: cb => {
                obj.organization_id = Object.values(obj.roles.organization_obj_byRoleSysname[obj.role_sysname])
                cb(null)
            },
            getUserObjects: cb => {
                _t.getObjects(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить organization_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.object_ids = res.data
                    cb(err, res)
                })
            },
            getUserGroupsSystem: cb => {
                if (!obj.object_ids.length) {
                    obj.group_system_ids = [-1]
                    return cb(null)
                }
                _t.getGroupsSystem(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить object_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.group_system_ids = res.data
                    cb(err, res)
                })
            },
            getUserSystems: cb => {
                if (!obj.group_system_ids.length) {
                    obj.system_ids = [-1]
                    return cb(null)
                }
                if (obj.group_system_ids.length == 1 && obj.group_system_ids[0] == -1) {
                    obj.system_ids = [-1]
                    return cb(null)
                }
                _t.getSystems(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить group_system_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.system_ids = res.data
                    cb(err, res)
                })
            },
            getUserEquipments: cb => {
                if (!obj.system_ids.length) {
                    return cb(null, {data: [-1]})
                }
                if (obj.system_ids.length == 1 && obj.system_ids[0] == -1) return cb(null, {data: [-1]})
                _t.getEquipments(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить system_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    cb(err, res)
                })
            }
        }, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить GET_USER_EQUIPMENT', {
                obj: obj,
                err: err,
                res: res
            }))
            cb(null, new UserOk('Ок', {data: res.getUserEquipments.data.length ? res.getUserEquipments.data : [-1]}))
        })

    }

    getUserReglamentREquipments(obj, cb) {
        var _t = this
        let user_organizations
        async.series({
            getUserOrganizations: cb => {
                obj.organization_id = Object.values(obj.roles.organization_obj_byRoleSysname[obj.role_sysname])
                cb(null)
            },
            getUserObjects: cb => {
                _t.getObjects(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить organization_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.object_ids = res.data
                    cb(err, res)
                })
            },
            getUserGroupsSystem: cb => {
                _t.getGroupsSystem(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить object_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.group_system_ids = res.data
                    cb(err, res)
                })
            },
            getUserSystems: cb => {
                _t.getSystems(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить group_system_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.system_ids = res.data
                    cb(err, res)
                })
            },
            getUserEquipments: cb => {
                _t.getEquipments(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить system_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    obj.equipment_ids = res.data
                    cb(err, res)
                })
            },
            getUserReglamentsREquipments: cb => {
                obj.object_system_ids = obj.system_ids
                _t.getReglamentREquipments(obj, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить equipment_ids', {
                        obj: obj,
                        err: err,
                        res: res
                    }))
                    cb(err, res)
                })
            },
        }, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить GET_USER_REGLAMENT_R_EQUIPMENT', {
                obj: obj,
                err: err,
                res: res
            }))
            cb(null, new UserOk('Ок', {data: res.getUserReglamentsREquipments.data}))
        })

    }

    checkSelfElseExecute(obj, cb) {
        var _t = this
        // let ids = Array.isArray(obj.received_params.id) ? obj.received_params.id : [obj.received_params.id];
        let id = obj.received_params.id
        var user_id = [String(_t.user.user_data.id)]


        var o = {
            command: 'get',
            object: obj.object,
            params: {
                // columns: ['id', 'created_by_user_id'],
                columns: ['id', 'executor_user_id', 'created_by_user_id', 'status_request_work_sysname'],
                where: [
                    {
                        key: 'id',
                        type: 'in',
                        val1: id
                    }, {
                        key: 'status_request_work_sysname',
                        type: 'in',
                        val1: obj.status_sysname.data
                    }
                ],
                skipCheckRoleModel: true,
                collapseData: false
            }
        }
        var data = []
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            for (let i in res) {
                if (res[i].executor_user_id == user_id && res[i].id == id) {
                    data.push(res[i].id)
                    break
                }
            }
            cb(null, new UserOk('Ок', {data: data}))
        })
    }

    //TANGIBLES START
    checkTangiblesStatus(obj, cb) {
        var _t = this
        var o = {
            command: 'get',
            object: 'Tangibles',
            params: {
                columns: ['id', 'status_type_for_tangibles_sysname'],
                where: [
                    {
                        key: 'id',
                        val1: obj.received_params.tangibles_id
                    },
                    {
                        key: 'status_type_for_tangibles_sysname',
                        type: 'in',
                        val1: obj.status_sysname.data
                    }
                ],
                collapseData: false,
                skipCheckRoleModel: true
            }
        }
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить данное ТМЦ', {o: o, err: err}))
            cb(null, new UserOk('Ок', {data: res.map(r => r.id)}))
        })
    }

    checkTangiblesStatusByRequestTangiblesId(obj, cb) {
        var _t = this
        let request_tangibles
        let check = false
        async.series({
            getRequest: cb => {
                let o = {
                    command: 'getById',
                    object: 'Request_tangible',
                    params: {
                        id: obj.received_params.id
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить запрос ТМЦ', {o: o, err: err}))
                    request_tangibles = res[0]
                    cb(null, res)
                    // obj.group_system_id = res[0].group_system_id
                    // cb(null)
                })
            },
            checkStatusTangibles: cb => {
                let o = {
                    command: 'get',
                    object: 'Tangibles',
                    params: {
                        columns: ['id', 'status_type_for_tangibles_sysname'],
                        where: [
                            {
                                key: 'id',
                                val1: request_tangibles.tangibles_id
                            },
                            {
                                key: 'status_type_for_tangibles_sysname',
                                type: 'in',
                                val1: obj.status_sysname.data
                            }
                        ],
                        collapseData: false,
                        skipCheckRoleModel: true
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить данное ТМЦ', {o: o, err: err}))
                    if (res.length > 0) check = true
                    cb(null, res)
                })
            },
        }, (err, res) => {
            if (err) return cb(err)
            cb(null, new UserOk('Ок', {data: [check ? obj.received_params.id : undefined]}))
        })
    }

    getUserObjectsReturnRequestTangiblesId(obj, cb) {
        var _t = this
        let object_ids = []
        let check = false
        let request_tangibles
        async.series({
            getObjects: cb => {
                _t.getObjects(obj, (err, res) => {
                    if (err) return cb(err)
                    object_ids = res.data
                    cb(null, res)
                })
            },
            getRequest: cb => {
                let o = {
                    command: 'getById',
                    object: 'Request_tangible',
                    params: {
                        id: obj.received_params.id
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить запрос ТМЦ', {o: o, err: err}))
                    request_tangibles = res[0]
                    cb(null, res)
                })
            },
            getTangible: cb => {
                let o = {
                    command: 'getById',
                    object: 'Tangibles',
                    params: {
                        id: request_tangibles.tangibles_id,
                        collapseData: false,
                        columns: ['id', 'object_owner_id']
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить ТМЦ', {o: o, err: err}))
                    if (object_ids.indexOf(res[0].object_owner_id) > -1) check = true
                    cb(null, res)
                })
            }
        }, (err, res) => {
            if (err) return cb(err)
            cb(null, new UserOk('Ок', {data: [check ? obj.received_params.id : undefined]}))
        })
    }

    checkTangiblesStatusByTangiblesId(obj, cb) {
        var _t = this
        var o = {
            command: 'get',
            object: 'Tangibles',
            params: {
                columns: ['id', 'status_type_for_tangibles_sysname'],
                where: [
                    {
                        key: 'id',
                        val1: obj.received_params.id
                    },
                    {
                        key: 'status_type_for_tangibles_sysname',
                        type: 'in',
                        val1: obj.status_sysname.data
                    }
                ],
                collapseData: false,
                skipCheckRoleModel: true
            }
        }
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить ТМЦ', {o: o, err: err}))
            cb(null, new UserOk('Ок', {data: res.map(r => r.id)}))
        })
    }

    getUserObjectsReturnTtangiblesId(obj, cb) {
        var _t = this
        let object_ids = []
        let check = false
        async.series({
            getObjects: cb => {
                _t.getObjects(obj, (err, res) => {
                    if (err) return cb(err)
                    object_ids = res.data
                    cb(null, res)
                })
            },
            getTangible: cb => {
                let o = {
                    command: 'getById',
                    object: 'Tangibles',
                    params: {
                        id: obj.received_params.id,
                        collapseData: false,
                        columns: ['id', 'object_owner_id']
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить ТМЦ', {o: o, err: err}))
                    if (object_ids.indexOf(res[0].object_owner_id) > -1) check = true
                    cb(null, res)
                })
            }
        }, (err, res) => {
            if (err) return cb(err)
            cb(null, new UserOk('Ок', {data: check ? [obj.received_params.id] : []}))
        })
    }

    getUserObjectsReturnTangiblesIdWithoutParams(obj, cb) {
        var _t = this
        // let user_organizations;
        let object_ids = []
        let check = false
        async.series({
            getUserOrganizations: cb => {
                obj.organization_id = Object.values(obj.roles.organization_obj_byRoleSysname[obj.role_sysname])
                cb(null)
            },
            getObjects: cb => {
                _t.getObjects(obj, (err, res) => {
                    if (err) return cb(err)
                    object_ids = res.data
                    cb(null, res)
                })
            },
            getUserObjectsReturnTangiblesId: cb => {
                let o = {
                    command: 'getById',
                    object: 'Tangibles',
                    params: {
                        id: obj.received_params.id,
                        collapseData: false,
                        columns: ['id', 'object_owner_id']
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить ТМЦ', {o: o, err: err}))
                    if (object_ids.indexOf(res[0].object_owner_id) > -1) check = true
                    cb(null, res)
                })
            },
        }, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить this.getUserObjectsReturnTangiblesIdWithoutParams', {
                obj: obj,
                err: err,
                res: res
            }))
            cb(null, new UserOk('Ок', {data: check ? [obj.received_params.id] : []}))
        })

    }

    //проверяет нет ли пользователя в объекте, которому принадлежит ТМЦ
    checkObjectNoUserByTangiblesId(obj, cb) {
        var _t = this
        let object_ids = []
        let check = true // те нету у пользователя объекта, в котором находится  ТМЦ
        async.series({
            getObjects: cb => {
                _t.getObjects(obj, (err, res) => {
                    if (err) return cb(err)
                    object_ids = res.data
                    cb(null, res)
                })
            },
            getTangible: cb => {
                let o = {
                    command: 'getById',
                    object: 'Tangibles',
                    params: {
                        id: obj.received_params.tangibles_id,
                        collapseData: false,
                        columns: ['id', 'object_owner_id']
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить ТМЦ', {o: o, err: err}))
                    if (object_ids.indexOf(res[0].object_owner_id) > -1) check = false // false - те у пользователя всё таки есть объект, которому принадлежит ТМЦ
                    cb(null, res)
                })
            }
        }, (err, res) => {
            if (err) return cb(err)
            if (check) return cb(null, new UserOk('Ок', {data: [obj.received_params.tangibles_id]}))
            if (!check) return cb(null, new UserOk('Ок', {data: []}))
            // cb(null, new UserOk('Ок', {data: [ check ? obj.received_params.id : undefined]}) )
        })
    }

    //TANGIBLES END


    //PPR START
    checkPprRequestWorkStatus(obj, cb) {
        var _t = this
        var o = {
            command: 'get',
            object: 'Ppr',
            params: {
                columns: ['id', 'status_request_sysname'],
                where: [
                    {
                        key: 'id',
                        val1: obj.received_params.id
                    },
                    {
                        key: 'status_request_sysname',
                        type: 'in',
                        val1: obj.status_sysname.data
                    }
                ],
                collapseData: false,
                skipCheckRoleModel: true
            }
        }
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить данную заявку', {o: o, err: err}))
            cb(null, new UserOk('Ок', {data: res.map(r => r.id)}))
        })
    }

    checkExecutorsPpr(obj, cb) {
        var _t = this

        let executor_model = this.executor_model_ppr
        var current_role = obj.role_sysname

        if (!executor_model[current_role] || !executor_model[current_role].length) return cb(null, new UserOk('Ок', {data: []}))

        var user_id = obj.received_params.executor_user_id
        if (!user_id && !obj.checkAccess) return cb(null, new UserOk('Ок', {data: []}))

        var organization_id = obj.received_params.executor_organization_id
        if (!organization_id && !obj.checkAccess) return cb(new MyError('В метод не передан depend_value (organization_id)', {obj: obj}))

        // var filter_values = [String(_t.user.user_data.id)];
        //object_owner_id, object_keeper_id
        var user_ids = []
        var o = {
            command: 'get',
            object: 'user_role_in_org_by_type',
            params: {
                columns: ['id', 'user_relation_type_for_organization_id', 'user_id', 'organization_id', 'all_role', 'role_id', 'role_sysname'],
                where: [
                    {
                        key: 'role_sysname',
                        type: 'in',
                        group: 'ROLE',
                        comparisonType: 'OR',
                        val1: executor_model[current_role]
                    },
                    {
                        key: 'all_role',
                        group: 'ROLE',
                        comparisonType: 'OR',
                        val1: true
                    },


                ],
                skipCheckRoleModel: true,
                collapseData: false
            }
        }
        if (user_id) o.params.where.push({
            key: 'user_id',
            val1: user_id
        })
        if (organization_id) o.params.where.push({
            key: 'organization_id',
            val1: organization_id
        })
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                user_ids.push(one.user_id)
            })
            cb(null, new UserOk('Ок', {data: user_ids}))
        })
    }

    getExecutorsPpr(obj, cb) {
        var _t = this
        // Необходимо получить user_ids тех пользователей роли которых допостимы для назначения переданной роли

        let executor_model = this.executor_model_ppr
        var current_role = obj.role_sysname

        if (!executor_model[current_role] || !executor_model[current_role].length) return cb(null, new UserOk('Ок', {data: [-1]}))
        var organization_id = obj.depend_value
        if (!organization_id) return cb(new MyError('В метод не передан depend_value (organization_id)', {obj: obj}))

        // var filter_values = [String(_t.user.user_data.id)];
        //object_owner_id, object_keeper_id
        var user_ids = []
        var o = {
            command: 'get',
            object: 'user_role_in_org_by_type',
            params: {
                columns: ['id', 'user_relation_type_for_organization_id', 'user_id', 'organization_id', 'all_role', 'role_id', 'role_sysname'],
                where: [
                    {
                        key: 'role_sysname',
                        type: 'in',
                        group: 'ROLE',
                        comparisonType: 'OR',
                        val1: executor_model[current_role]
                    },
                    {
                        key: 'all_role',
                        group: 'ROLE',
                        comparisonType: 'OR',
                        val1: true
                    },
                    {
                        key: 'organization_id',
                        val1: organization_id
                    }
                ],
                skipCheckRoleModel: true,
                collapseData: false
            }
        }
        var data = []
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                user_ids.push(one.user_id)
            })
            if (!user_ids.length) user_ids = [-1]
            cb(null, new UserOk('Ок', {data: user_ids}))
        })
    }

    //PPR END

    getUserOrganizations(obj, cb) {
        var a = Object.values(obj.roles.organization_obj_byRoleSysname[obj.role_sysname])

        // console.log(a)
        // debugger
        return cb(null, new UserOk('Ок', {data: Object.values(obj.roles.organization_obj_byRoleSysname[obj.role_sysname])}))
    }

    getUserObjects(obj, cb) {
        var _t = this
        _t.getObjects(obj, cb)
    }

    getUserOrganizationInUserObjects(obj, cb) {
        var _t = this
        var object_ids
        var organization_ids

        async.series({
            getObjects: cb => {
                var params = {
                    organization_id: Object.values(obj.roles.organization_obj_byRoleSysname[obj.role_sysname])
                }
                _t.getObjects(params, (err, res) => {
                    if (err) return cb(err)
                    object_ids = res.data
                    cb(null)
                })
            },

            getCompaniesInObjects: cb => {
                if (!object_ids || !object_ids.length) return cb(null, new UserOk('Ok', {data: []}))
                var o = {
                    command: 'get',
                    object: 'object_relation_organization_r_role',
                    params: {
                        columns: ['id', 'org_r_role_id', 'object_id', 'organization_id'],
                        where: [
                            {
                                key: 'object_id',
                                type: 'in',
                                val1: object_ids
                            },
                            {
                                key: 'organization_id',
                                type: '!isNull'
                            }
                        ],
                        limit: 10000000,
                        collapseData: false,
                        skipCheckRoleModel: true
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить объекты', {o: o, err: err}))
                    organization_ids = res.map(one => one.organization_id)
                    cb(null)
                })
            }
        }, (err, res) => {
            if (err) return cb(err)
            organization_ids = organization_ids || [-1]
            return cb(null, new UserOk('Ок', {data: organization_ids}))
        })
    }

    checkRequestWorkStatus(obj, cb) {
        var _t = this
        var o = {
            command: 'get',
            object: 'Request_work',
            params: {
                columns: ['id', 'status_request_work_sysname'],
                where: [
                    {
                        key: 'id',
                        val1: obj.received_params.id
                    },
                    {
                        key: 'status_request_work_sysname',
                        type: 'in',
                        val1: obj.status_sysname.data
                    }
                ],
                collapseData: false,
                skipCheckRoleModel: true
            }
        }
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить данную заявку', {o: o, err: err}))
            cb(null, new UserOk('Ок', {data: res.map(r => r.id)}))
        })
    }

    checkRequestWorkType(obj, cb) {
        var _t = this
        var o = {
            command: 'get',
            object: 'Request_work',
            params: {
                columns: ['id', 'type_request_for_request_work_sysname'],
                where: [
                    {
                        key: 'id',
                        val1: obj.received_params.id
                    },
                    {
                        key: 'type_request_for_request_work_sysname',
                        type: 'in',
                        val1: obj.type_sysname.data
                    }
                ],
                collapseData: false,
                skipCheckRoleModel: true
            }
        }
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить данную заявку', {o: o, err: err}))
            cb(null, new UserOk('Ок', {data: res.map(r => r.id)}))
        })
    }

    self(obj, cb) {
        var _t = this

        let ids = Array.isArray(obj.received_params.id) ? obj.received_params.id : [obj.received_params.id]
        var filter_values = [String(_t.user.user_data.id)]
        var o = {
            command: 'get',
            object: obj.object,
            params: {
                columns: ['id', 'created_by_user_id'],
                where: [
                    {
                        key: 'id',
                        type: 'in',
                        val1: ids
                    }
                ],
                skipCheckRoleModel: true,
                collapseData: false
            }
        }
        var data = []
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                if (filter_values.indexOf(String(one['created_by_user_id'])) !== -1) data.push(one.id)
            })
            cb(null, new UserOk('Ок', {data: data}))
        })
    }

    selfRequest(obj, cb) {
        var _t = this

        let ids = Array.isArray(obj.received_params.id) ? obj.received_params.id : [obj.received_params.id]
        var filter_values = [String(_t.user.user_data.id)]
        var o = {
            command: 'get',
            object: obj.object,
            params: {
                columns: ['id', 'created_by_user_id', 'executor_user_id'],
                where: [
                    {
                        key: 'id',
                        type: 'in',
                        group: 'SELF',
                        comparisonType: 'OR',
                        val1: ids
                    }, {key: 'executor_user_id', type: 'in', group: 'SELF', comparisonType: 'OR', val1: ids}
                ],
                skipCheckRoleModel: true,
                collapseData: false
            }
        }
        var data = []
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                if (filter_values.indexOf(String(one['created_by_user_id'])) !== -1 || filter_values.indexOf(String(one['executor_user_id'])) !== -1) data.push(one.id)
            })
            cb(null, new UserOk('Ок', {data: data}))
        })
    }

    selfExecutor(obj, cb) {
        var _t = this

        let ids = Array.isArray(obj.received_params.id) ? obj.received_params.id : [obj.received_params.id]
        var filter_values = [String(_t.user.user_data.id)]

        var o = {
            command: 'get',
            object: obj.object,
            params: {
                // columns: ['id', 'created_by_user_id'],
                columns: ['id', 'executor_user_id'],
                where: [
                    {
                        key: 'id',
                        type: 'in',
                        val1: ids
                    }
                ],
                skipCheckRoleModel: true,
                collapseData: false
            }
        }
        var data = []
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                // if (filter_values.indexOf(String(one['executor_user_id'])) !== -1) data.push(one.id);
                if (filter_values.indexOf(String(one['executor_user_id'])) !== -1) data.push(one.executor_user_id)
            })
            cb(null, new UserOk('Ок', {data: data}))
        })
    }

    selfExecutorPpr(obj, cb) {
        var _t = this

        let ids = Array.isArray(obj.received_params.id) ? obj.received_params.id : [obj.received_params.id]
        var filter_values = [String(_t.user.user_data.id)]

        var o = {
            command: 'get',
            object: obj.object,
            params: {
                // columns: ['id', 'created_by_user_id'],
                columns: ['id', 'executor_id'],
                where: [
                    {
                        key: 'id',
                        type: 'in',
                        val1: ids
                    }
                ],
                skipCheckRoleModel: true,
                collapseData: false
            }
        }
        var data = []
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                // if (filter_values.indexOf(String(one['executor_user_id'])) !== -1) data.push(one.id);
                if (filter_values.indexOf(String(one['executor_id'])) !== -1) data.push(one.id)
            })
            cb(null, new UserOk('Ок', {data: data}))
        })
    }

    selfExecutorReturnRequestWorkId(obj, cb) {
        var _t = this

        let ids = Array.isArray(obj.received_params.id) ? obj.received_params.id : [obj.received_params.id]
        var filter_values = [String(_t.user.user_data.id)]

        var o = {
            command: 'get',
            object: obj.object,
            params: {
                // columns: ['id', 'created_by_user_id'],
                columns: ['id', 'executor_user_id'],
                where: [
                    {
                        key: 'id',
                        type: 'in',
                        val1: ids
                    }
                ],
                skipCheckRoleModel: true,
                collapseData: false
            }
        }
        var data = []
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                // if (filter_values.indexOf(String(one['executor_user_id'])) !== -1) data.push(one.id);
                // if (filter_values.indexOf(String(one['id'])) !== -1) data.push(one.id);
                data.push(one.id)
            })
            cb(null, new UserOk('Ок', {data: data}))
        })
    }

    recField(obj, cb) {
        var _t = this
        var rec

        var filter_values = Object.values(obj.filter_arr.data).map(one => String(one))
        let ids = Array.isArray(obj.received_params.id) ? obj.received_params.id : [obj.received_params.id]
        var data = []
        var o = {
            command: 'get',
            object: obj.object,
            params: {
                columns: ['id', ...obj.rec_field.data],
                where: [
                    {
                        key: 'id',
                        type: 'in',
                        val1: ids
                    }
                ],
                collapseData: false,
                skipCheckRoleModel: true
            }
        }
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                if (filter_values.indexOf(String(one[obj.rec_field.data[0]])) !== -1) data.push(one.id)
            })
            cb(null, new UserOk('Ок', {data: data}))
        })


        // async.series({
        //     getById:cb => {
        //         _t.getById({id:obj.received_params.id}, function (err, res) {
        //             if (err) return cb(new MyError('Не удалось получить .',{id:id,err:err}));
        //             rec = res;
        //             cb(null);
        //         });
        //     },
        //     check:
        // }, cb);
    }

    isSet(obj, cb) {
        var _t = this
        var rec

        let ids = Array.isArray(obj.received_params.id) ? obj.received_params.id : [obj.received_params.id]
        var data = []
        var o = {
            command: 'get',
            object: obj.object,
            params: {
                columns: ['id', ...obj.rec_field.data],
                where: [
                    {
                        key: 'id',
                        type: 'in',
                        val1: ids
                    }
                ],
                collapseData: false,
                skipCheckRoleModel: true
            }
        }
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                if (one[obj.rec_field.data[0]]) data.push(one.id)
            })
            cb(null, new UserOk('Ок', {data: data}))
        })
    }

    userId(obj, cb) {
        var _t = this
        cb(null, new UserOk('Ок', {data: [_t.user.user_data.id]}))
    }

    ownerOrKeeperObject(obj, cb) {
        var _t = this
        // var filter_values = [String(_t.user.user_data.id)];
        //object_owner_id, object_keeper_id
        var ids = []
        var o = {
            command: 'get',
            object: 'tangibles',
            params: {
                columns: ['id', 'object_owner_id', 'object_keeper_id'],
                where: [
                    {
                        key: 'object_owner_id',
                        type: 'in',
                        group: 'OBJECT_ID',
                        comparisonType: 'OR',
                        val1: obj.object_ids.data
                    },
                    {
                        key: 'object_keeper_id',
                        type: 'in',
                        group: 'OBJECT_ID',
                        comparisonType: 'OR',
                        val1: obj.object_ids.data
                    }
                ],
                skipCheckRoleModel: true,
                collapseData: false
            }
        }
        var data = []
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                ids.push(one.id)
            })
            cb(null, new UserOk('Ок', {data: ids}))
        })
    }

    getExecutors(obj, cb) {
        var _t = this
        // Необходимо получить user_ids тех пользователей роли которых допостимы для назначения переданной роли

        let executor_model = this.executor_model
        var current_role = obj.role_sysname

        if (!executor_model[current_role] || !executor_model[current_role].length) return cb(null, new UserOk('Ок', {data: [-1]}))
        var organization_id = obj.depend_value
        if (!organization_id) return cb(new MyError('В метод не передан depend_value (organization_id)', {obj: obj}))

        // var filter_values = [String(_t.user.user_data.id)];
        //object_owner_id, object_keeper_id
        var user_ids = []
        var access_roles_for_type_request_work = []
        let users_roles = {}
        async.series({
            getUsersIds: cb => {
                var o = {
                    command: 'get',
                    object: 'user_role_in_org_by_type',
                    params: {
                        columns: ['id', 'user_relation_type_for_organization_id', 'user_id', 'organization_id', 'all_role', 'role_id', 'role_sysname'],
                        where: [
                            {
                                key: 'role_sysname',
                                type: 'in',
                                group: 'ROLE',
                                comparisonType: 'OR',
                                val1: executor_model[current_role]
                            },
                            {
                                key: 'all_role',
                                group: 'ROLE',
                                comparisonType: 'OR',
                                val1: true
                            },
                            {
                                key: 'organization_id',
                                val1: organization_id
                            }
                        ],
                        skipCheckRoleModel: true,
                        collapseData: false
                    }
                }
                var data = []
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
                    res.forEach(one => {
                        user_ids.push(one.user_id)
                    })
                    if (!user_ids.length) user_ids = [-1]
                    cb(null, new UserOk('Ок', {data: user_ids}))
                })
            },
            filterUserIdsByRole: cb => {
                if (obj.additional_params && obj.additional_params.request_id) {
                    async.series({
                        getTypeRequestWork: cb => {
                            let o = {
                                command: 'get',
                                object: 'request_work',
                                params: {
                                    param_where: {
                                        id: obj.additional_params.request_id
                                    },
                                    collapseData: false,
                                    columns: ['id', 'type_request_for_request_work_id', 'type_request_for_request_work_sysname']
                                }
                            }
                            _t.api(o, (err, res) => {
                                if (err) return cb(new MyError('Не удалось получить тип заявки', {o: o, err: err}))
                                // console.log(res[0].type_request_for_request_work_sysname)
                                access_roles_for_type_request_work = _t.executor_role_type_request_work[res[0].type_request_for_request_work_sysname]
                                cb(null)
                            })
                        },
                        getUsersRoles: cb => {
                            async.eachSeries(user_ids, (user_id, cb) => {
                                let o = {
                                    command: 'getRoles',
                                    object: 'user',
                                    params: {
                                        user_id: user_id
                                    }
                                }
                                _t.api(o, (err, res) => {
                                    if (err) return cb(new MyError('Не улдалось получить роли пользователя', {
                                        o: o,
                                        err: err
                                    }))
                                    users_roles[user_id] = Object.keys(res.data.roles_obj_bySysname)
                                    cb(null)
                                })
                            }, cb)
                            if (!user_ids.length) return cb(null)
                        },
                        checkFindedUsersByRoles: cb => {
                            let buff_user_ids = []
                            for (let i in user_ids) {
                                let user_roles = users_roles[user_ids[i]] //['engin', 'securi] Роли, которые есть у итер. пользователя
                                iter_accesses: for (let j in access_roles_for_type_request_work) {
                                    if (user_roles.indexOf(access_roles_for_type_request_work[j]) >= 0) {
                                        buff_user_ids.push(user_ids[i])
                                        break iter_accesses
                                    }
                                }
                            }
                            user_ids = buff_user_ids
                            cb(null)
                        }
                    }, cb)
                } else {
                    return cb(null)
                }
            }
        }, (err, res) => {
            if (err) return cb(err)
            cb(null, new UserOk('Ок', {data: user_ids.length ? user_ids : [-1]}))
        })


        // executor_role_type_request_work
    }

    checkExecutors(obj, cb) {
        var _t = this
        // Метод аналогичный this.getExecutors, но отличается входными параметрами и форматом ответа
        // Необходимо получить user_ids тех пользователей роли которых допостимы для назначения переданной роли

        let executor_model = this.executor_model
        var current_role = obj.role_sysname

        if (!executor_model[current_role] || !executor_model[current_role].length) return cb(null, new UserOk('Ок', {data: []}))

        var user_id = obj.received_params.executor_user_id
        if (!user_id && !obj.checkAccess) return cb(null, new UserOk('Ок', {data: []}))

        var organization_id = obj.received_params.executor_organization_id
        if (!organization_id && !obj.checkAccess) return cb(new MyError('В метод не передан depend_value (organization_id)', {obj: obj}))

        // var filter_values = [String(_t.user.user_data.id)];
        //object_owner_id, object_keeper_id
        var user_ids = []
        var o = {
            command: 'get',
            object: 'user_role_in_org_by_type',
            params: {
                columns: ['id', 'user_relation_type_for_organization_id', 'user_id', 'organization_id', 'all_role', 'role_id', 'role_sysname'],
                where: [
                    {
                        key: 'role_sysname',
                        type: 'in',
                        group: 'ROLE',
                        comparisonType: 'OR',
                        val1: executor_model[current_role]
                    },
                    {
                        key: 'all_role',
                        group: 'ROLE',
                        comparisonType: 'OR',
                        val1: true
                    },


                ],
                skipCheckRoleModel: true,
                collapseData: false
            }
        }
        if (user_id) o.params.where.push({
            key: 'user_id',
            val1: user_id
        })
        if (organization_id) o.params.where.push({
            key: 'organization_id',
            val1: organization_id
        })
        _t.api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить записи', {o: o, err: err}))
            res.forEach(one => {
                user_ids.push(one.user_id)
            })
            cb(null, new UserOk('Ок', {data: user_ids}))
        })
    }

}


module.exports = Instance
