/*
 * Complex Cloud Solutions, LLC (ccs.msk.ru)
 * Ivan Goptarev
 * Copyright (c) 2020.
 * Powered by GoCore (go-core.ru)
 */
const RoleModelDefault = require('./role_model.Default')
const MyError = require('../../../error').MyError
const UserError = require('../../../error').UserError
const UserOk = require('../../../error').UserOk
const async = require('async')
const funcs = require('../../functions')

class Instance extends RoleModelDefault{
    constructor(obj) {
        super(obj)

        const items = {

        }
        const get = {}
        const executor_model = {}
        const executor_model_ppr = {}
        const executor_role_type_request_work = {}

        this.items = funcs.supplementObj(this.items, items)
        this.get = funcs.supplementObj(this.get, get)
        this.executor_model = funcs.supplementObj(this.executor_model, executor_model)
        this.executor_model_ppr = funcs.supplementObj(this.executor_model_ppr, executor_model_ppr)
        this.executor_role_type_request_work = funcs.supplementObj(this.executor_role_type_request_work, executor_role_type_request_work)
    }
}

module.exports = Instance
