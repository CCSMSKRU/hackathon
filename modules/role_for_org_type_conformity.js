let MyError = require('../error').MyError;
const api = require('../libs/api');
const async = require('async');

const conformity = {
    owner: ['CLEANING', 'COMPANY_ADMIN', 'DISPATCHER', 'COMPANY_EMPLOYEE', 'ENGINEER', 'FACILITY_MANAGER', 'LEAD_ENGINEER', 'TECHNICIAN', 'GENERAL_DIRECTOR', 'SECRETARY', 'RENT_MANAGER', 'RECEPTION', 'SECURITY', 'CUSTOMER', 'LANDLORD'],
    renter: ['CLEANING', 'COMPANY_ADMIN', 'DISPATCHER', 'COMPANY_EMPLOYEE', 'ENGINEER', 'FACILITY_MANAGER', 'LEAD_ENGINEER', 'TECHNICIAN', 'GENERAL_DIRECTOR', 'SECRETARY', 'RENT_MANAGER', 'RECEPTION', 'SECURITY', 'CUSTOMER'],
    service_provider: ['CLEANING', 'COMPANY_ADMIN', 'DISPATCHER', 'COMPANY_EMPLOYEE', 'ENGINEER', 'FACILITY_MANAGER', 'LEAD_ENGINEER', 'TECHNICIAN', 'GENERAL_DIRECTOR', 'SECRETARY', 'RENT_MANAGER', 'RECEPTION', 'SECURITY'],
    super_admin: ['SUPERADMIN']
}

class ConformityRole {
    constructor(user) {
        const _t = this
        _t.conformity_table = conformity
        _t.user = user
    }

    conformity(cb) {
        const _t = this;

        let queries = []
        async.series({
            formationQueryAdd: cb => {

                let type_i = 0
                async.eachSeries(_t.conformity_table, (conformity_table, cb) =>{
                    let type = Object.keys(_t.conformity_table)[type_i]
                    let roles = conformity_table
                    type_i++
                    async.eachSeries(roles, (role, cb) => {
                        let o = {
                            command: 'get',
                            object: 'role_for_org_type',
                            params: {
                                param_where: {
                                    type_for_organization_sysname: type,
                                    role_sysname: role,
                                },
                                collapseData: false
                            }
                        }
                        api(o, (err, res) => {
                            if (err) return cb(new MyError('Не удалось получить сопставление ролей и типа', {o: o, err: err}))
                            if (!res.length) {
                                queries.push({
                                    command: 'add',
                                    object: 'role_for_org_type',
                                    params: {
                                        type_for_organization_sysname: type,
                                        role_sysname: role,
                                    }
                                })
                            }
                            cb(null)
                        }, _t.user)
                    }, cb)
                }, cb)
                // for (let type in _t.conformity_table)
                //     for (let role in _t.conformity_table[type])
                //
                //         queries.push({
                //             command: 'add',
                //             object: 'role_for_org_type',
                //             params: {
                //                 type_for_organization_sysname: type,
                //                 role_sysname: _t.conformity_table[type][role],
                //             }
                //         })
                // cb(null)
            },
            add: cb => {
                async.eachSeries(queries, (query, cb) => {
                    api(query, (err, res) => {
                        if (err) return cb(new MyError('Не удалось довить соответствие: ' + err))
                        cb(null)
                    }, _t.user);
                }, cb);
            }
        }, (err, res) => {
            if (err) return cb(err)
            cb(null)
        })
    }

    init(cb) {
        const _t = this;
        async.series({
            conformity: cb => {
                _t.conformity(res => {
                    if (res) return cb(new MyError('Не удалось настроить соответствие ролей пользователей и типа организаций: ' + res))
                    cb(null)
                })
            }
        }, (err, res) => {
            if (res) return cb(res)
            cb(null)
        })

    }

}
module.exports = ConformityRole;
