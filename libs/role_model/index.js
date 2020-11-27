/*
 * Complex Cloud Solutions, LLC (ccs.msk.ru)
 * Ivan Goptarev
 * Copyright (c) 2020.
 * Powered by GoCore (go-core.ru)
 */

const MyError = require('../../error').MyError
const config = require('../../config')

const role_model_filename = (config.get('role_model_filename') || '').replace(/\.js$/,'')

let instanceRoleModel

if (role_model_filename) {
    try {
        instanceRoleModel = require(`./instances/${role_model_filename}.js`)
    } catch (e) {
        throw new MyError('role_model_filename not found in /libs/role_model/instances/. See config and path', {
            role_model_filename,
            file:`./instances/${role_model_filename}.js`,
            e
        })
    }
} else {
    console.log('role_model_filename not specified in config file. Default Role model are selected')
    instanceRoleModel = require(`./instances/role_model.Default.js`)
}

function init(params = {}){
    if (!params.user) throw new MyError('User not passed in role_model init',{params})
    if (!instanceRoleModel) throw new MyError('instanceRoleModel is not defined',{params})
    return new instanceRoleModel(params)
}


module.exports.init = init
