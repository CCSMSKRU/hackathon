const api = require('../libs/api');
const async = require('async');
const fs = require("fs");
const moment = require("moment");
const year = new Date().getYear() + 1900
const this_day = moment().format('DD.MM.YYYY')
const this_week = moment().isoWeek();

var MyError = require('../error').MyError;
var UserError = require('../error').UserError;
var UserOk = require('../error').UserOk;

// let user
const request_ppr = {
    promisesAddedPPR: [],
    promisesDeletedPPR: [],
    promisesChangedPPR: [],
    _t : this,
    //TODO невыполненне заявки помещать в статус "просрочено"
    //Метод удаляет ппр заявки, регламенты которых были удалены(удаляет конкретную неделю, если она была исключена из регламента)
    //добавляет новые заявки, если такоевые были добавлены в регламент. Так же добавит заявку на кокретную заявку, если в существующем регламенте была добавлена только неделя
    //обновляет данные(описание, название регламента и прочее) в существующей заявке.
    formationQuery: function(user, cb) {
        var user = user;
        let object_ids = []
        async.series({
            loadSysUser: cb => {
                if (user) return cb(null)
                let User = require('../classes/User');
                user = new User({ name:'user' });
                user.loadSysUser(res => {
                    cb(null)
                });
            },
            getObjects: cb => {
                let o = {
                    command: 'get',
                    object: 'object_',
                    params: {
                        collapseData: false,
                        columns: ['id']
                    }
                }
                api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось получить объекты'))
                    object_ids = res.map(item => item.id)
                    cb(null)
                }, user)
            },
            formation: cb => {
                async.eachSeries(object_ids, (object_id, cb) => {
                    let plannedRequestPPR = {}; // запланированные(в регламенте) заявки начиная со следующей недели
                    let plannedRequestPPRNextYear = {}; // запланированные(в регламенте) заявки начиная со следующей недели


                    let createdRequestPPR = {}; // заявки(уже в таблице ppr) начиная со следующей недели

                    let createdRequestPPRNextYear = {}; // заявки на следующий год(уже в таблице ppr) начиная со следующей недели

                    let planned_status;

                    let forRemove = {}; // ппр, которые необходимо удалить из модели PPR
                    let forAdd = {} //сущностей reglament_r_equipment, которые необходимо добавить в PPR
                    let forUpdate = {} // ппр, которые необходимо проверить на актулальность данных (описание и тд) и обновить


                    let forRemoveNextYear = {}; // ппр, которые необходимо удалить из модели PPR
                    let forAddNextYear = {} //сущностей reglament_r_equipment, которые необходимо добавить в PPR
                    let forUpdateNextYear = {} // ппр, которые необходимо проверить на актулальность данных (описание и тд) и обновить



                    let o_remove = [];
                    let o_add = [];
                    let o_update = [];
                    let _t = this
                    async.series({
                        getPlannedPPR: cb => {
                            let o = {
                                command: 'get',
                                object: 'reglament_r_equipment',
                                params: {
                                    where: [
                                        {key: 'object_id', type: '=', val1: object_id},
                                        // {key: 'ext_system_alias', type: 'isNull'},
                                        {key: 'equipment_id', type: 'isNotNull'},
                                        {key: 'is_active', val1: true},
                                    ],
                                    columns: ['weeks',
                                        'id',
                                        'equipment_id',
                                        'system_reglament_work',
                                        'system_reglament_work_description',
                                        'description',
                                        'working_hour',
                                        'system_reglament_work_id',
                                        'equipment_location_id',
                                        'object_id',
                                        'group_system_id',
                                        'object_system_id',
                                        'icon'
                                    ],
                                    limit: 10000000,
                                    collapseData: false
                                }
                            };
                            api(o, (err, res) => {//в ППР можеть быть несколько работ, в зависимости от количества недель
                                if (err) return cb(new MyError('При получении запланированных регламентных работ заявок ппр произошла ошибка.', err));
                                res.forEach((overallPPR, i, resApi) => {
                                    let weeks = overallPPR.weeks.replace(/[^0-9]/g, " ").replace(/  +/g, ' ').split(' ');
                                    weeks.forEach((week, j, weeks) => {

                                        if (! isNaN(parseInt(week, 10)) ) {
                                            if (!plannedRequestPPRNextYear[overallPPR.id]) plannedRequestPPRNextYear[overallPPR.id] = {};
                                            plannedRequestPPRNextYear[overallPPR.id][week] = overallPPR;
                                        }

                                        if (week > this_week) {
                                            if (! isNaN(parseInt(week, 10)) ) {
                                                if (!plannedRequestPPR[overallPPR.id]) plannedRequestPPR[overallPPR.id] = {};
                                                plannedRequestPPR[overallPPR.id][week] = overallPPR;
                                            }
                                        }
                                    })
                                });
                                cb(null);
                            }, user);
                        },
                        getCreatedPPR: cb => {
                            let o = {
                                command: 'get',
                                object: 'ppr',
                                params: {
                                    where: [
                                        {key: 'object_id', type: '=', val1: object_id},
                                        // { key: 'is_active', type: '=',  val1: false},
                                        // { key: 'is_archived', type: '=',  val1: false},
                                        {key: 'start_time_plan', type: '..', val1: '01.01.' + year, val2: '31.12.' + year},
                                        {key: 'week', type: '>', val1: this_week},
                                    ],
                                    columns: ['week',
                                        'id',
                                        'equipment_id',
                                        'system_reglament_work',
                                        'system_reglament_work_description',
                                        'description',
                                        'working_hour',
                                        'system_reglament_work_id',
                                        'equipment_location_id',
                                        'object_id',
                                        'group_system_id',
                                        'object_system_id',
                                        'icon',
                                        'start_time_plan',
                                        'next_year',
                                        'reglament_r_equipment_id'
                                    ],
                                    limit: 10000000,
                                    collapseData: false
                                }
                            };
                            api(o, function (err, resApi) {
                                if (err) return cb(new MyError('При получении созданных заявок ппр произошла ошибка.', err));
                                resApi.forEach((ppr, i, resApi) => {
                                    if(!createdRequestPPR[ppr.reglament_r_equipment_id]) createdRequestPPR[ppr.reglament_r_equipment_id] = {};

                                    createdRequestPPR[ppr.reglament_r_equipment_id][ppr.week] = ppr;
                                    // createdRequestPPR[ppr.reglament_r_equipment_id][ppr.week].forRemove = true;
                                });
                                cb(null);
                            }, user);
                        },
                        getCreatedPPRNextYear: cb => {
                            let o = {
                                command: 'get',
                                object: 'ppr',
                                params: {
                                    where: [
                                        {key: 'object_id', type: '=', val1: object_id},
                                        {key: 'next_year', type: '=', val1: true},
                                        {key: 'start_time_plan', type: '..', val1: '26.12.' + year , val2: '31.12.' + ( + year + 1)},
                                        // {key: 'week', type: '>', val1: this_week},
                                    ],
                                    columns: ['week',
                                        'id',
                                        'equipment_id',
                                        'system_reglament_work',
                                        'system_reglament_work_description',
                                        'description',
                                        'working_hour',
                                        'system_reglament_work_id',
                                        'equipment_location_id',
                                        'object_id',
                                        'group_system_id',
                                        'object_system_id',
                                        'icon',
                                        'start_time_plan',
                                        'next_year',
                                        'reglament_r_equipment_id'
                                    ],
                                    limit: 10000000,
                                    collapseData: false
                                }
                            };
                            api(o, function (err, resApi) {
                                if (err) return cb(new MyError('При получении созданных заявок ппр на следующий год произошла ошибка.', err));
                                resApi.forEach((ppr, i, resApi) => {
                                    if(!createdRequestPPRNextYear[ppr.reglament_r_equipment_id]) createdRequestPPRNextYear[ppr.reglament_r_equipment_id] = {};

                                    createdRequestPPRNextYear[ppr.reglament_r_equipment_id][ppr.week] = ppr;
                                });
                                cb(null);
                            }, user);
                        },
                        getStatusPlanned: cb => {
                            let o = {
                                command: 'get',
                                object: 'status_request_ppr',
                                params: {
                                    param_where: {
                                        sysname: 'planned'
                                    },
                                    collapseData: false
                                }
                            }
                            api(o, (err, res) => {
                                if (err) return cb(new MyError('При получении статуса для ппр заявки произошла ошибка.', err));
                                planned_status = res[0]
                                cb(null)
                            }, user)
                        },
                        formationPPR: cb => {
                            async.series({
                                removePPR: cb => {
                                    async.series({
                                        findPPR: cb => {
                                            for (let reglament_equipment_id in createdRequestPPR) {
                                                if (!plannedRequestPPR[reglament_equipment_id]) {
                                                    forRemove[reglament_equipment_id] = createdRequestPPR[reglament_equipment_id]
                                                    continue
                                                }
                                                for (let num_week in createdRequestPPR[reglament_equipment_id]){
                                                    if (!plannedRequestPPR[reglament_equipment_id][num_week]) {
                                                        if (!forRemove[reglament_equipment_id]) forRemove[reglament_equipment_id] = {}
                                                        forRemove[reglament_equipment_id][num_week] = createdRequestPPR[reglament_equipment_id][num_week]
                                                    }
                                                }
                                            }
                                            cb(null)
                                        },
                                        removePPR: cb => {
                                            let arr_ppr_id = []
                                            for (let reglament_equipment_id in forRemove)
                                                for (let num_week in forRemove[reglament_equipment_id])
                                                    arr_ppr_id.push(forRemove[reglament_equipment_id][num_week].id)
                                            async.eachSeries(arr_ppr_id, (id, cb) => {
                                                let o = {
                                                    command: 'remove',
                                                    object: 'ppr',
                                                    params: {
                                                        id: id
                                                    }
                                                };
                                                // o_remove.push(o)
                                                // return cb(null)
                                                api(o, (err, res) => {
                                                    if (err) return cb(new MyError('При удалении заявки ппр произошла ошибка.', err));
                                                    cb(null)
                                                }, user);
                                            }, cb)
                                        }
                                    }, (err, res) => {
                                        if (err) return cb(new MyError('При удалении заявок ппр произошла ошибка.', err));
                                        cb(null)
                                    })
                                },
                                addPPR: cb => {
                                    async.series({
                                        findPPR: cb => {
                                            for (let reglament_equipment_id in plannedRequestPPR) {
                                                if (!createdRequestPPR[reglament_equipment_id]) {
                                                    forAdd[reglament_equipment_id] = plannedRequestPPR[reglament_equipment_id]
                                                    continue
                                                }
                                                for (let num_week in plannedRequestPPR[reglament_equipment_id]){
                                                    if (!createdRequestPPR[reglament_equipment_id][num_week]) {
                                                        if (!forAdd[reglament_equipment_id])
                                                            forAdd[reglament_equipment_id] = {}
                                                        // forAdd[reglament_equipment_id][num_week] = plannedRequestPPR[reglament_equipment_id][num_week]
                                                        forAdd[reglament_equipment_id][num_week] = Object.assign({week: parseInt(num_week, 10)}, plannedRequestPPR[reglament_equipment_id][num_week])
                                                    }
                                                }
                                            }
                                            cb(null)
                                        },
                                        addPPR: cb => {
                                            let arr_ppr = []
                                            for (let reglament_equipment_id in forAdd)
                                                for (let num_week in forAdd[reglament_equipment_id]) {
                                                    let ppr = Object.assign({week: parseInt(num_week, 10)}, forAdd[reglament_equipment_id][num_week]);
                                                    arr_ppr.push(ppr)
                                                }
                                            async.eachSeries(arr_ppr, (ppr, cb) => {
                                                if (ppr.week > 53) return cb(null)
                                                let o = {
                                                    command: 'add',
                                                    object: 'ppr',
                                                    params: {
                                                        week: ppr.week,
                                                        reglament_r_equipment_id: ppr.id,
                                                        equipment_id: ppr.equipment_id,
                                                        reglament_name: ppr.system_reglament_work,
                                                        reglament_description: ppr.system_reglament_work_description,
                                                        reglament_equipment_description: ppr.description,
                                                        reglament_working_hour: ppr.working_hour,
                                                        reglament_id: ppr.system_reglament_work_id,
                                                        location_id: ppr.equipment_location_id,
                                                        object_id: ppr.object_id,

                                                        status_request_id: planned_status.id,
                                                        group_system_id: ppr.group_system_id,
                                                        object_system_id: ppr.object_system_id,
                                                        icon: ppr.icon,
                                                        is_active: false,
                                                        is_archived: false,

                                                    }
                                                };
                                                // o_add.push(o)
                                                // return cb(null)
                                                api(o, (err, res) => {
                                                    if (err) return cb(new MyError('При добавлении заявки ппр произошла ошибка.', err));
                                                    cb(null)
                                                }, user);
                                            }, cb)
                                        }
                                    }, (err, res) => {
                                        if (err) return cb(new MyError('При добавлении заявок ппр произошла ошибка.', err));
                                        cb(null)
                                    })
                                },
                                updatePPR: cb => {
                                    async.series({
                                        findPPR: cb => {
                                            for (let reglament_equipment_id in createdRequestPPR) {

                                                for (let num_week in createdRequestPPR[reglament_equipment_id]) {
                                                    if (forRemove[reglament_equipment_id])
                                                        if (forRemove[reglament_equipment_id][num_week])
                                                            continue

                                                    let created_ppr = createdRequestPPR[reglament_equipment_id][num_week]
                                                    let reglament_ppr = plannedRequestPPR[reglament_equipment_id][num_week]

                                                    if (created_ppr.reglament_name != reglament_ppr.system_reglament_work ||
                                                        created_ppr.icon != reglament_ppr.icon ||
                                                        created_ppr.reglament_description != reglament_ppr.system_reglament_work_description ||
                                                        created_ppr.reglament_description != reglament_ppr.system_reglament_work_description ||
                                                        created_ppr.reglament_working_hour != reglament_ppr.working_hour ||
                                                        created_ppr.location_id != reglament_ppr.equipment_location_id ||
                                                        created_ppr.object_id != reglament_ppr.object_id ||
                                                        created_ppr.group_system_id != reglament_ppr.group_system_id ||
                                                        created_ppr.object_system_id != reglament_ppr.object_system_id ||
                                                        created_ppr.reglament_equipment_description != reglament_ppr.description) {

                                                        if (!forUpdate[reglament_equipment_id]) forUpdate[reglament_equipment_id] = {}

                                                        forUpdate[reglament_equipment_id][num_week] = {}
                                                        forUpdate[reglament_equipment_id][num_week].id = created_ppr.id

                                                        if (created_ppr.reglament_name != reglament_ppr.system_reglament_work) {
                                                            forUpdate[reglament_equipment_id][num_week].reglament_name = reglament_ppr.system_reglament_work
                                                        }

                                                        if (created_ppr.reglament_description != reglament_ppr.system_reglament_work_description) {
                                                            forUpdate[reglament_equipment_id][num_week].reglament_description = reglament_ppr.system_reglament_work_description
                                                        }

                                                        if (created_ppr.reglament_equipment_description != reglament_ppr.description) {
                                                            forUpdate[reglament_equipment_id][num_week].reglament_equipment_description = reglament_ppr.description
                                                        }


                                                        if (created_ppr.reglament_working_hour != reglament_ppr.working_hour) {
                                                            forUpdate[reglament_equipment_id][num_week].reglament_working_hour = reglament_ppr.working_hour
                                                        }
                                                        if (created_ppr.location_id != reglament_ppr.equipment_location_id) {
                                                            forUpdate[reglament_equipment_id][num_week].location_id = reglament_ppr.equipment_location_id
                                                        }
                                                        if (created_ppr.object_id != reglament_ppr.object_id) {
                                                            forUpdate[reglament_equipment_id][num_week].object_id = reglament_ppr.object_id
                                                        }
                                                        if (created_ppr.group_system_id != reglament_ppr.group_system_id) {
                                                            forUpdate[reglament_equipment_id][num_week].group_system_id = reglament_ppr.group_system_id
                                                        }
                                                        if (created_ppr.object_system_id != reglament_ppr.object_system_id) {
                                                            forUpdate[reglament_equipment_id][num_week].object_system_id = reglament_ppr.object_system_id
                                                        }
                                                    }
                                                }
                                            }
                                            cb(null)
                                        },
                                        updatePPR: cb => {
                                            let arr_ppr = []
                                            for (let reglament_equipment_id in forUpdate)
                                                for (let num_week in forUpdate[reglament_equipment_id])
                                                    arr_ppr.push(forUpdate[reglament_equipment_id][num_week])
                                            async.eachSeries(arr_ppr, (ppr, cb) => {
                                                if (ppr.week > 53) return cb(null)
                                                let o = {
                                                    command: 'modify',
                                                    object: 'ppr',
                                                    params: {}
                                                }
                                                o.params = ppr;
                                                api(o, (err, res) => {
                                                    if (err) return cb(new MyError('При обновлении заявки ппр произошла ошибка.', err));
                                                    cb(null)
                                                }, user);
                                            }, cb)
                                        }
                                    }, (err, res) => {
                                        if (err) return cb(new MyError('При обновлении заявок ппр произошла ошибка.', err));
                                        cb(null)
                                    })
                                }
                            }, (err, res) => {
                                cb(null)
                            })
                        },
                        formationPPRNextYear: cb => {
                            async.series({
                                removePPR: cb => {
                                    async.series({
                                        findPPR: cb => {
                                            for (let reglament_equipment_id in createdRequestPPRNextYear) {
                                                if (!plannedRequestPPRNextYear[reglament_equipment_id]) {
                                                    forRemoveNextYear[reglament_equipment_id] = createdRequestPPRNextYear[reglament_equipment_id]
                                                    continue
                                                }
                                                for (let num_week in createdRequestPPRNextYear[reglament_equipment_id]){
                                                    if (!plannedRequestPPRNextYear[reglament_equipment_id][num_week]) {
                                                        if (!forRemoveNextYear[reglament_equipment_id]) forRemoveNextYear[reglament_equipment_id] = {}
                                                        forRemoveNextYear[reglament_equipment_id][num_week] = createdRequestPPRNextYear[reglament_equipment_id][num_week]
                                                    }
                                                }
                                            }
                                            cb(null)
                                        },
                                        removePPR: cb => {
                                            let arr_ppr_id = []
                                            for (let reglament_equipment_id in forRemoveNextYear)
                                                for (let num_week in forRemoveNextYear[reglament_equipment_id])
                                                    arr_ppr_id.push(forRemoveNextYear[reglament_equipment_id][num_week].id)
                                            async.eachSeries(arr_ppr_id, (id, cb) => {
                                                let o = {
                                                    command: 'remove',
                                                    object: 'ppr',
                                                    params: {
                                                        id: id
                                                    }
                                                };
                                                // o_remove.push(o)
                                                // return cb(null)
                                                api(o, (err, res) => {
                                                    if (err) return cb(new MyError('При удалении заявки ппр произошла ошибка.', err));
                                                    cb(null)
                                                }, user);
                                            }, cb)
                                        }
                                    }, (err, res) => {
                                        if (err) return cb(new MyError('При удалении заявок ппр произошла ошибка.', err));
                                        cb(null)
                                    })
                                },
                                addPPR: cb => {
                                    async.series({
                                        findPPR: cb => {
                                            for (let  reglament_equipment_id in plannedRequestPPRNextYear) { //все регламентные работы
                                                if (!createdRequestPPRNextYear[reglament_equipment_id]) {
                                                    forAddNextYear[reglament_equipment_id] = plannedRequestPPRNextYear[reglament_equipment_id]
                                                    continue
                                                }
                                                for (let num_week in plannedRequestPPRNextYear[reglament_equipment_id]){
                                                    if (!createdRequestPPRNextYear[reglament_equipment_id][num_week]) {
                                                        if (!forAddNextYear[reglament_equipment_id])
                                                            forAddNextYear[reglament_equipment_id] = {}
                                                        // forAdd[reglament_equipment_id][num_week] = plannedRequestPPR[reglament_equipment_id][num_week]
                                                        forAddNextYear[reglament_equipment_id][num_week] = Object.assign({week: parseInt(num_week, 10)}, plannedRequestPPRNextYear[reglament_equipment_id][num_week])
                                                    }
                                                }
                                            }
                                            cb(null)
                                        },
                                        addPPR: cb => {
                                            let arr_ppr = []
                                            for (let reglament_equipment_id in forAddNextYear)
                                                for (let num_week in forAddNextYear[reglament_equipment_id]) {
                                                    let ppr = Object.assign({week: parseInt(num_week, 10)}, forAddNextYear[reglament_equipment_id][num_week]);
                                                    arr_ppr.push(ppr)
                                                }
                                            async.eachSeries(arr_ppr, (ppr, cb) => {
                                                if (ppr.week > 53) return cb(null)
                                                let o = {
                                                    command: 'add',
                                                    object: 'ppr',
                                                    params: {
                                                        year: ( + year + 1),
                                                        week: ppr.week,
                                                        reglament_r_equipment_id: ppr.id,
                                                        equipment_id: ppr.equipment_id,
                                                        reglament_name: ppr.system_reglament_work,
                                                        reglament_description: ppr.system_reglament_work_description,
                                                        reglament_equipment_description: ppr.description,
                                                        reglament_working_hour: ppr.working_hour,
                                                        reglament_id: ppr.system_reglament_work_id,
                                                        location_id: ppr.equipment_location_id,
                                                        object_id: ppr.object_id,

                                                        status_request_id: planned_status.id,
                                                        group_system_id: ppr.group_system_id,
                                                        object_system_id: ppr.object_system_id,

                                                        next_year: true,
                                                        is_active: false,
                                                        is_archived: false,
                                                        icon: ppr.icon
                                                    }
                                                };
                                                // o_add.push(o)
                                                // return cb(null)
                                                api(o, (err, res) => {
                                                    if (err) return cb(new MyError('При добавлении заявки ппр произошла ошибка.', err));
                                                    cb(null)
                                                }, user);
                                            }, cb)
                                        }
                                    }, (err, res) => {
                                        if (err) return cb(new MyError('При добавлении заявок ппр произошла ошибка.', err));
                                        cb(null)
                                    })
                                },
                                updatePPR: cb => {
                                    async.series({
                                        findPPR: cb => {
                                            for (let reglament_equipment_id in createdRequestPPRNextYear) {

                                                for (let num_week in createdRequestPPRNextYear[reglament_equipment_id]) {
                                                    if (forRemoveNextYear[reglament_equipment_id])
                                                        if (forRemoveNextYear[reglament_equipment_id][num_week])
                                                            continue

                                                    let created_ppr = createdRequestPPRNextYear[reglament_equipment_id][num_week]
                                                    let reglament_ppr = plannedRequestPPRNextYear[reglament_equipment_id][num_week]

                                                    if (created_ppr.reglament_name != reglament_ppr.system_reglament_work ||
                                                        created_ppr.reglament_description != reglament_ppr.system_reglament_work_description ||
                                                        created_ppr.icon != reglament_ppr.icon ||
                                                        created_ppr.reglament_working_hour != reglament_ppr.working_hour ||
                                                        created_ppr.location_id != reglament_ppr.equipment_location_id ||
                                                        created_ppr.object_id != reglament_ppr.object_id ||
                                                        created_ppr.group_system_id != reglament_ppr.group_system_id ||
                                                        created_ppr.object_system_id != reglament_ppr.object_system_id ||
                                                        created_ppr.reglament_equipment_description != reglament_ppr.description ) {

                                                        if (!forUpdateNextYear[reglament_equipment_id]) forUpdateNextYear[reglament_equipment_id] = {}

                                                        forUpdateNextYear[reglament_equipment_id][num_week] = {}
                                                        forUpdateNextYear[reglament_equipment_id][num_week].id = created_ppr.id

                                                        if (created_ppr.reglament_name != reglament_ppr.system_reglament_work) {
                                                            forUpdateNextYear[reglament_equipment_id][num_week].reglament_name = reglament_ppr.system_reglament_work
                                                        }

                                                        if (created_ppr.reglament_description != reglament_ppr.system_reglament_work_description) {
                                                            forUpdateNextYear[reglament_equipment_id][num_week].reglament_description = reglament_ppr.system_reglament_work_description
                                                        }

                                                        if (created_ppr.reglament_equipment_description != reglament_ppr.description) {
                                                            forUpdateNextYear[reglament_equipment_id][num_week].reglament_equipment_description = reglament_ppr.description
                                                        }


                                                        if (created_ppr.reglament_working_hour != reglament_ppr.working_hour) {
                                                            forUpdateNextYear[reglament_equipment_id][num_week].reglament_working_hour = reglament_ppr.working_hour
                                                        }
                                                        if (created_ppr.location_id != reglament_ppr.equipment_location_id) {
                                                            forUpdateNextYear[reglament_equipment_id][num_week].location_id = reglament_ppr.equipment_location_id
                                                        }
                                                        if (created_ppr.object_id != reglament_ppr.object_id) {
                                                            forUpdateNextYear[reglament_equipment_id][num_week].object_id = reglament_ppr.object_id
                                                        }
                                                        if (created_ppr.group_system_id != reglament_ppr.group_system_id) {
                                                            forUpdateNextYear[reglament_equipment_id][num_week].group_system_id = reglament_ppr.group_system_id
                                                        }
                                                        if (created_ppr.object_system_id != reglament_ppr.object_system_id) {
                                                            forUpdateNextYear[reglament_equipment_id][num_week].object_system_id = reglament_ppr.object_system_id
                                                        }
                                                    }
                                                }
                                            }
                                            cb(null)
                                        },
                                        updatePPR: cb => {
                                            let arr_ppr = []
                                            for (let reglament_equipment_id in forUpdateNextYear)
                                                for (let num_week in forUpdateNextYear[reglament_equipment_id])
                                                    arr_ppr.push(forUpdateNextYear[reglament_equipment_id][num_week])
                                            async.eachSeries(arr_ppr, (ppr, cb) => {
                                                if (ppr.week > 53) return cb(null)
                                                let o = {
                                                    command: 'modify',
                                                    object: 'ppr',
                                                    params: {}
                                                }
                                                o.params = ppr;
                                                api(o, (err, res) => {
                                                    if (err) return cb(new MyError('При обновлении заявки ппр произошла ошибка.', err));
                                                    cb(null)
                                                }, user);
                                            }, cb)
                                        }
                                    }, (err, res) => {
                                        if (err) return cb(new MyError('При обновлении заявок ппр произошла ошибка.', err));
                                        cb(null)
                                    })
                                }
                            }, (err, res) => {
                                cb(null)
                            })
                        }
                    }, (err, res) => {
                        setTimeout(function () {
                            if (err) return cb(new MyError('При формировании заявок ппр произошла ошибка.', err));
                            cb(null)
                        }, 500)
                    })
                }, cb)
            }
        }, (err, res) => {
            setTimeout(function () {
                if (err) return cb(err)
                cb(null, new UserOk('Ок'));
            },1000);
        })
    },
    formationQueryForObjectId: function(object_id, user, cb) {
        let plannedRequestPPR = {}; // запланированные(в регламенте) заявки начиная со следующей недели
        let plannedRequestPPRNextYear = {}; // запланированные(в регламенте) заявки начиная со следующей недели


        let createdRequestPPR = {}; // заявки(уже в таблице ppr) начиная со следующей недели

        let createdRequestPPRNextYear = {}; // заявки на следующий год(уже в таблице ppr) начиная со следующей недели

        let planned_status;

        let forRemove = {}; // ппр, которые необходимо удалить из модели PPR
        let forAdd = {} //сущностей reglament_r_equipment, которые необходимо добавить в PPR
        let forUpdate = {} // ппр, которые необходимо проверить на актулальность данных (описание и тд) и обновить


        let forRemoveNextYear = {}; // ппр, которые необходимо удалить из модели PPR
        let forAddNextYear = {} //сущностей reglament_r_equipment, которые необходимо добавить в PPR
        let forUpdateNextYear = {} // ппр, которые необходимо проверить на актулальность данных (описание и тд) и обновить



        let o_remove = [];
        let o_add = [];
        let o_update = [];
        let _t = this
        async.series({
            getPlannedPPR: cb => {
                let o = {
                    command: 'get',
                    object: 'reglament_r_equipment',
                    params: {
                        where: [
                            {key: 'object_id', type: '=', val1: object_id},
                            // {key: 'ext_system_alias', type: 'isNull'},
                            {key: 'equipment_id', type: 'isNotNull'},
                            {key: 'is_active', val1: true},
                        ],
                        limit: 10000000,
                        collapseData: false
                    }
                };
                api(o, (err, res) => {//в ППР можеть быть несколько работ, в зависимости от количества недель
                    if (err) return cb(new MyError('При получении запланированных регламентных работ заявок ппр произошла ошибка.', err));
                    res.forEach((overallPPR, i, resApi) => {
                        let weeks = overallPPR.weeks.replace(/[^0-9]/g, " ").replace(/  +/g, ' ').split(' ');
                        weeks.forEach((week, j, weeks) => {

                            if (! isNaN(parseInt(week, 10)) ) {
                                if (!plannedRequestPPRNextYear[overallPPR.id]) plannedRequestPPRNextYear[overallPPR.id] = {};
                                plannedRequestPPRNextYear[overallPPR.id][week] = overallPPR;
                            }

                            if (week > this_week) {
                                if (! isNaN(parseInt(week, 10)) ) {
                                    if (!plannedRequestPPR[overallPPR.id]) plannedRequestPPR[overallPPR.id] = {};
                                    plannedRequestPPR[overallPPR.id][week] = overallPPR;
                                }
                            }
                        })
                    });
                    cb(null);
                }, user);
            },
            getCreatedPPR: cb => {
                let o = {
                    command: 'get',
                    object: 'ppr',
                    params: {
                        where: [
                            {key: 'object_id', type: '=', val1: object_id},
                            // { key: 'is_active', type: '=',  val1: false},
                            // { key: 'is_archived', type: '=',  val1: false},
                            {key: 'start_time_plan', type: '..', val1: '01.01.' + year, val2: '31.12.' + year},
                            {key: 'week', type: '>', val1: this_week},
                        ],
                        limit: 10000000,
                        collapseData: false
                    }
                };
                api(o, function (err, resApi) {
                    if (err) return cb(new MyError('При получении созданных заявок ппр произошла ошибка.', err));
                    resApi.forEach((ppr, i, resApi) => {
                        if(!createdRequestPPR[ppr.reglament_r_equipment_id]) createdRequestPPR[ppr.reglament_r_equipment_id] = {};

                        createdRequestPPR[ppr.reglament_r_equipment_id][ppr.week] = ppr;
                        // createdRequestPPR[ppr.reglament_r_equipment_id][ppr.week].forRemove = true;
                    });
                    cb(null);
                }, user);
            },
            getCreatedPPRNextYear: cb => {
                let o = {
                    command: 'get',
                    object: 'ppr',
                    params: {
                        where: [
                            {key: 'object_id', type: '=', val1: object_id},
                            {key: 'next_year', type: '=', val1: true},
                            {key: 'start_time_plan', type: '..', val1: '26.12.' + year , val2: '31.12.' + ( + year + 1)},
                            // {key: 'week', type: '>', val1: this_week},
                        ],
                        limit: 10000000,
                        collapseData: false
                    }
                };
                api(o, function (err, resApi) {
                    if (err) return cb(new MyError('При получении созданных заявок ппр на следующий год произошла ошибка.', err));
                    resApi.forEach((ppr, i, resApi) => {
                        if(!createdRequestPPRNextYear[ppr.reglament_r_equipment_id]) createdRequestPPRNextYear[ppr.reglament_r_equipment_id] = {};

                        createdRequestPPRNextYear[ppr.reglament_r_equipment_id][ppr.week] = ppr;
                    });
                    cb(null);
                }, user);
            },
            getStatusPlanned: cb => {
                let o = {
                    command: 'get',
                    object: 'status_request_ppr',
                    params: {
                        param_where: {
                            sysname: 'planned'
                        },
                        collapseData: false
                    }
                }
                api(o, (err, res) => {
                    if (err) return cb(new MyError('При получении статуса для ппр заявки произошла ошибка.', err));
                    planned_status = res[0]
                    cb(null)
                }, user)
            },
            formationPPR: cb => {
                async.series({
                    removePPR: cb => {
                        async.series({
                            findPPR: cb => {
                                for (let reglament_equipment_id in createdRequestPPR) {
                                    if (!plannedRequestPPR[reglament_equipment_id]) {
                                        forRemove[reglament_equipment_id] = createdRequestPPR[reglament_equipment_id]
                                        continue
                                    }
                                    for (let num_week in createdRequestPPR[reglament_equipment_id]){
                                        if (!plannedRequestPPR[reglament_equipment_id][num_week]) {
                                            if (!forRemove[reglament_equipment_id]) forRemove[reglament_equipment_id] = {}
                                            forRemove[reglament_equipment_id][num_week] = createdRequestPPR[reglament_equipment_id][num_week]
                                        }
                                    }
                                }
                                cb(null)
                            },
                            removePPR: cb => {
                                let arr_ppr_id = []
                                for (let reglament_equipment_id in forRemove)
                                    for (let num_week in forRemove[reglament_equipment_id])
                                        arr_ppr_id.push(forRemove[reglament_equipment_id][num_week].id)
                                async.each(arr_ppr_id, (id, cb) => {
                                    let o = {
                                        command: 'remove',
                                        object: 'ppr',
                                        params: {
                                            id: id
                                        }
                                    };
                                    // o_remove.push(o)
                                    // return cb(null)
                                    api(o, (err, res) => {
                                        if (err) return cb(new MyError('При удалении заявки ппр произошла ошибка.', err));
                                        cb(null)
                                    }, user);
                                }, cb)
                            }
                        }, (err, res) => {
                            if (err) return cb(new MyError('При удалении заявок ппр произошла ошибка.', err));
                            cb(null)
                        })
                    },
                    addPPR: cb => {
                        async.series({
                            findPPR: cb => {
                                for (let reglament_equipment_id in plannedRequestPPR) {
                                    if (!createdRequestPPR[reglament_equipment_id]) {
                                        forAdd[reglament_equipment_id] = plannedRequestPPR[reglament_equipment_id]
                                        continue
                                    }
                                    for (let num_week in plannedRequestPPR[reglament_equipment_id]){
                                        if (!createdRequestPPR[reglament_equipment_id][num_week]) {
                                            if (!forAdd[reglament_equipment_id])
                                                forAdd[reglament_equipment_id] = {}
                                            // forAdd[reglament_equipment_id][num_week] = plannedRequestPPR[reglament_equipment_id][num_week]
                                            forAdd[reglament_equipment_id][num_week] = Object.assign({week: parseInt(num_week, 10)}, plannedRequestPPR[reglament_equipment_id][num_week])
                                        }
                                    }
                                }
                                cb(null)


                            },
                            addPPR: cb => {
                                let arr_ppr = []
                                for (let reglament_equipment_id in forAdd)
                                    for (let num_week in forAdd[reglament_equipment_id]) {
                                        let ppr = Object.assign({week: parseInt(num_week, 10)}, forAdd[reglament_equipment_id][num_week]);
                                        arr_ppr.push(ppr)
                                    }
                                async.eachSeries(arr_ppr, (ppr, cb) => {
                                    if (ppr.week > 53) return cb(null)
                                    let o = {
                                        command: 'add',
                                        object: 'ppr',
                                        params: {
                                            week: ppr.week,
                                            reglament_r_equipment_id: ppr.id,
                                            equipment_id: ppr.equipment_id,
                                            reglament_name: ppr.system_reglament_work,
                                            reglament_description: ppr.system_reglament_work_description,
                                            reglament_equipment_description: ppr.description,
                                            reglament_working_hour: ppr.working_hour,
                                            reglament_id: ppr.system_reglament_work_id,
                                            location_id: ppr.equipment_location_id,
                                            object_id: ppr.object_id,

                                            status_request_id: planned_status.id,
                                            group_system_id: ppr.group_system_id,
                                            object_system_id: ppr.object_system_id,
                                            icon: ppr.icon,
                                            is_active: false,
                                            is_archived: false,

                                        }
                                    };
                                    // o_add.push(o)
                                    // return cb(null)
                                    api(o, (err, res) => {
                                        if (err) return cb(new MyError('При добавлении заявки ппр произошла ошибка.', err));
                                        cb(null)
                                    }, user);
                                }, cb)
                            }
                        }, (err, res) => {
                            if (err) return cb(new MyError('При добавлении заявок ппр произошла ошибка.', err));
                            cb(null)
                        })
                    },
                    updatePPR: cb => {
                        async.series({
                            findPPR: cb => {
                                for (let reglament_equipment_id in createdRequestPPR) {

                                    for (let num_week in createdRequestPPR[reglament_equipment_id]) {
                                        if (forRemove[reglament_equipment_id])
                                            if (forRemove[reglament_equipment_id][num_week])
                                                continue

                                        let created_ppr = createdRequestPPR[reglament_equipment_id][num_week]
                                        let reglament_ppr = plannedRequestPPR[reglament_equipment_id][num_week]

                                        if (created_ppr.reglament_name != reglament_ppr.system_reglament_work ||
                                            created_ppr.icon != reglament_ppr.icon ||
                                            created_ppr.reglament_description != reglament_ppr.system_reglament_work_description ||
                                            created_ppr.reglament_description != reglament_ppr.system_reglament_work_description ||
                                            created_ppr.reglament_working_hour != reglament_ppr.working_hour ||
                                            created_ppr.location_id != reglament_ppr.equipment_location_id ||
                                            created_ppr.object_id != reglament_ppr.object_id ||
                                            created_ppr.group_system_id != reglament_ppr.group_system_id ||
                                            created_ppr.object_system_id != reglament_ppr.object_system_id ||
                                            created_ppr.reglament_equipment_description != reglament_ppr.description) {

                                            if (!forUpdate[reglament_equipment_id]) forUpdate[reglament_equipment_id] = {}

                                            forUpdate[reglament_equipment_id][num_week] = {}
                                            forUpdate[reglament_equipment_id][num_week].id = created_ppr.id

                                            if (created_ppr.reglament_name != reglament_ppr.system_reglament_work) {
                                                forUpdate[reglament_equipment_id][num_week].reglament_name = reglament_ppr.system_reglament_work
                                            }

                                            if (created_ppr.reglament_description != reglament_ppr.system_reglament_work_description) {
                                                forUpdate[reglament_equipment_id][num_week].reglament_description = reglament_ppr.system_reglament_work_description
                                            }

                                            if (created_ppr.reglament_equipment_description != reglament_ppr.description) {
                                                forUpdate[reglament_equipment_id][num_week].reglament_equipment_description = reglament_ppr.description
                                            }


                                            if (created_ppr.reglament_working_hour != reglament_ppr.working_hour) {
                                                forUpdate[reglament_equipment_id][num_week].reglament_working_hour = reglament_ppr.working_hour
                                            }
                                            if (created_ppr.location_id != reglament_ppr.equipment_location_id) {
                                                forUpdate[reglament_equipment_id][num_week].location_id = reglament_ppr.equipment_location_id
                                            }
                                            if (created_ppr.object_id != reglament_ppr.object_id) {
                                                forUpdate[reglament_equipment_id][num_week].object_id = reglament_ppr.object_id
                                            }
                                            if (created_ppr.group_system_id != reglament_ppr.group_system_id) {
                                                forUpdate[reglament_equipment_id][num_week].group_system_id = reglament_ppr.group_system_id
                                            }
                                            if (created_ppr.object_system_id != reglament_ppr.object_system_id) {
                                                forUpdate[reglament_equipment_id][num_week].object_system_id = reglament_ppr.object_system_id
                                            }
                                        }
                                    }
                                }
                                cb(null)
                            },
                            updatePPR: cb => {
                                let arr_ppr = []
                                for (let reglament_equipment_id in forUpdate)
                                    for (let num_week in forUpdate[reglament_equipment_id])
                                        arr_ppr.push(forUpdate[reglament_equipment_id][num_week])
                                async.each(arr_ppr, (ppr, cb) => {
                                    if (ppr.week > 53) return cb(null)
                                    let o = {
                                        command: 'modify',
                                        object: 'ppr',
                                        params: {}
                                    }
                                    o.params = ppr;
                                    api(o, (err, res) => {
                                        if (err) return cb(new MyError('При обновлении заявки ппр произошла ошибка.', err));
                                        cb(null)
                                    }, user);
                                }, cb)
                            }
                        }, (err, res) => {
                            if (err) return cb(new MyError('При обновлении заявок ппр произошла ошибка.', err));
                            cb(null)
                        })
                    }
                }, (err, res) => {
                    cb(null)
                })
            },
            formationPPRNextYear: cb => {
                async.series({
                    removePPR: cb => {
                        async.series({
                            findPPR: cb => {
                                for (let reglament_equipment_id in createdRequestPPRNextYear) {
                                    if (!plannedRequestPPRNextYear[reglament_equipment_id]) {
                                        forRemoveNextYear[reglament_equipment_id] = createdRequestPPRNextYear[reglament_equipment_id]
                                        continue
                                    }
                                    for (let num_week in createdRequestPPRNextYear[reglament_equipment_id]){
                                        if (!plannedRequestPPRNextYear[reglament_equipment_id][num_week]) {
                                            if (!forRemoveNextYear[reglament_equipment_id]) forRemoveNextYear[reglament_equipment_id] = {}
                                            forRemoveNextYear[reglament_equipment_id][num_week] = createdRequestPPRNextYear[reglament_equipment_id][num_week]
                                        }
                                    }
                                }
                                cb(null)
                            },
                            removePPR: cb => {
                                let arr_ppr_id = []
                                for (let reglament_equipment_id in forRemoveNextYear)
                                    for (let num_week in forRemoveNextYear[reglament_equipment_id])
                                        arr_ppr_id.push(forRemoveNextYear[reglament_equipment_id][num_week].id)
                                async.each(arr_ppr_id, (id, cb) => {
                                    let o = {
                                        command: 'remove',
                                        object: 'ppr',
                                        params: {
                                            id: id
                                        }
                                    };
                                    // o_remove.push(o)
                                    // return cb(null)
                                    api(o, (err, res) => {
                                        if (err) return cb(new MyError('При удалении заявки ппр произошла ошибка.', err));
                                        cb(null)
                                    }, user);
                                }, cb)
                            }
                        }, (err, res) => {
                            if (err) return cb(new MyError('При удалении заявок ппр произошла ошибка.', err));
                            cb(null)
                        })
                    },
                    addPPR: cb => {
                        async.series({
                            findPPR: cb => {
                                for (let  reglament_equipment_id in plannedRequestPPRNextYear) { //все регламентные работы
                                    if (!createdRequestPPRNextYear[reglament_equipment_id]) {
                                        forAddNextYear[reglament_equipment_id] = plannedRequestPPRNextYear[reglament_equipment_id]
                                        continue
                                    }
                                    for (let num_week in plannedRequestPPRNextYear[reglament_equipment_id]){
                                        if (!createdRequestPPRNextYear[reglament_equipment_id][num_week]) {
                                            if (!forAddNextYear[reglament_equipment_id])
                                                forAddNextYear[reglament_equipment_id] = {}
                                            // forAdd[reglament_equipment_id][num_week] = plannedRequestPPR[reglament_equipment_id][num_week]
                                            forAddNextYear[reglament_equipment_id][num_week] = Object.assign({week: parseInt(num_week, 10)}, plannedRequestPPRNextYear[reglament_equipment_id][num_week])
                                        }
                                    }
                                }
                                cb(null)
                            },
                            addPPR: cb => {
                                let arr_ppr = []
                                for (let reglament_equipment_id in forAddNextYear)
                                    for (let num_week in forAddNextYear[reglament_equipment_id]) {
                                        let ppr = Object.assign({week: parseInt(num_week, 10)}, forAddNextYear[reglament_equipment_id][num_week]);
                                        arr_ppr.push(ppr)
                                    }
                                async.eachSeries(arr_ppr, (ppr, cb) => {
                                    if (ppr.week > 53) return cb(null)
                                    let o = {
                                        command: 'add',
                                        object: 'ppr',
                                        params: {
                                            year: ( + year + 1),
                                            week: ppr.week,
                                            reglament_r_equipment_id: ppr.id,
                                            equipment_id: ppr.equipment_id,
                                            reglament_name: ppr.system_reglament_work,
                                            reglament_description: ppr.system_reglament_work_description,
                                            reglament_equipment_description: ppr.description,
                                            reglament_working_hour: ppr.working_hour,
                                            reglament_id: ppr.system_reglament_work_id,
                                            location_id: ppr.equipment_location_id,
                                            object_id: ppr.object_id,

                                            status_request_id: planned_status.id,
                                            group_system_id: ppr.group_system_id,
                                            object_system_id: ppr.object_system_id,

                                            next_year: true,
                                            is_active: false,
                                            is_archived: false,
                                            icon: ppr.icon
                                        }
                                    };
                                    // o_add.push(o)
                                    // return cb(null)
                                    api(o, (err, res) => {
                                        if (err) return cb(new MyError('При добавлении заявки ппр произошла ошибка.', err));
                                        cb(null)
                                    }, user);
                                }, cb)
                            }
                        }, (err, res) => {
                            if (err) return cb(new MyError('При добавлении заявок ппр произошла ошибка.', err));
                            cb(null)
                        })
                    },
                    updatePPR: cb => {
                        async.series({
                            findPPR: cb => {
                                for (let reglament_equipment_id in createdRequestPPRNextYear) {

                                    for (let num_week in createdRequestPPRNextYear[reglament_equipment_id]) {
                                        if (forRemoveNextYear[reglament_equipment_id])
                                            if (forRemoveNextYear[reglament_equipment_id][num_week])
                                                continue

                                        let created_ppr = createdRequestPPRNextYear[reglament_equipment_id][num_week]
                                        let reglament_ppr = plannedRequestPPRNextYear[reglament_equipment_id][num_week]

                                        if (created_ppr.reglament_name != reglament_ppr.system_reglament_work ||
                                            created_ppr.reglament_description != reglament_ppr.system_reglament_work_description ||
                                            created_ppr.icon != reglament_ppr.icon ||
                                            created_ppr.reglament_working_hour != reglament_ppr.working_hour ||
                                            created_ppr.location_id != reglament_ppr.equipment_location_id ||
                                            created_ppr.object_id != reglament_ppr.object_id ||
                                            created_ppr.group_system_id != reglament_ppr.group_system_id ||
                                            created_ppr.object_system_id != reglament_ppr.object_system_id ||
                                            created_ppr.reglament_equipment_description != reglament_ppr.description ) {

                                            if (!forUpdateNextYear[reglament_equipment_id]) forUpdateNextYear[reglament_equipment_id] = {}

                                            forUpdateNextYear[reglament_equipment_id][num_week] = {}
                                            forUpdateNextYear[reglament_equipment_id][num_week].id = created_ppr.id

                                            if (created_ppr.reglament_name != reglament_ppr.system_reglament_work) {
                                                forUpdateNextYear[reglament_equipment_id][num_week].reglament_name = reglament_ppr.system_reglament_work
                                            }

                                            if (created_ppr.reglament_description != reglament_ppr.system_reglament_work_description) {
                                                forUpdateNextYear[reglament_equipment_id][num_week].reglament_description = reglament_ppr.system_reglament_work_description
                                            }

                                            if (created_ppr.reglament_equipment_description != reglament_ppr.description) {
                                                forUpdateNextYear[reglament_equipment_id][num_week].reglament_equipment_description = reglament_ppr.description
                                            }


                                            if (created_ppr.reglament_working_hour != reglament_ppr.working_hour) {
                                                forUpdateNextYear[reglament_equipment_id][num_week].reglament_working_hour = reglament_ppr.working_hour
                                            }
                                            if (created_ppr.location_id != reglament_ppr.equipment_location_id) {
                                                forUpdateNextYear[reglament_equipment_id][num_week].location_id = reglament_ppr.equipment_location_id
                                            }
                                            if (created_ppr.object_id != reglament_ppr.object_id) {
                                                forUpdateNextYear[reglament_equipment_id][num_week].object_id = reglament_ppr.object_id
                                            }
                                            if (created_ppr.group_system_id != reglament_ppr.group_system_id) {
                                                forUpdateNextYear[reglament_equipment_id][num_week].group_system_id = reglament_ppr.group_system_id
                                            }
                                            if (created_ppr.object_system_id != reglament_ppr.object_system_id) {
                                                forUpdateNextYear[reglament_equipment_id][num_week].object_system_id = reglament_ppr.object_system_id
                                            }
                                        }
                                    }
                                }
                                cb(null)
                            },
                            updatePPR: cb => {
                                let arr_ppr = []
                                for (let reglament_equipment_id in forUpdateNextYear)
                                    for (let num_week in forUpdateNextYear[reglament_equipment_id])
                                        arr_ppr.push(forUpdateNextYear[reglament_equipment_id][num_week])
                                async.each(arr_ppr, (ppr, cb) => {
                                    if (ppr.week > 53) return cb(null)
                                    let o = {
                                        command: 'modify',
                                        object: 'ppr',
                                        params: {}
                                    }
                                    o.params = ppr;
                                    api(o, (err, res) => {
                                        if (err) return cb(new MyError('При обновлении заявки ппр произошла ошибка.', err));
                                        cb(null)
                                    }, user);
                                }, cb)
                            }
                        }, (err, res) => {
                            if (err) return cb(new MyError('При обновлении заявок ппр произошла ошибка.', err));
                            cb(null)
                        })
                    }
                }, (err, res) => {
                    cb(null)
                })
            }
        }, (err, res) => {
            if (err) return cb(new MyError('При формировании заявок ппр произошла ошибка.', err));
            cb(null, new UserOk('done!'))
        })
    },

    // EXPIRED
    autoExpiredQuery: (user, cb) => {
        let ppr_for_expired = [];
        let ppr = []
        async.series({
            getPPR: cb => {
                // let
                let o = {
                    command: 'get',
                    object: 'ppr',
                    params: {
                        where: [
                            { key: 'is_active', type: '=', val1: true},
                            { key: 'week', type: '<',  val1: moment().isoWeek()},
                            { key: 'next_year', type: '=', val1: false},
                            { key: 'status_request_sysname', type: '!=', val1: 'EXPIRED'},
                            { key: 'is_archived', type: '=', val1: false}
                        ],
                        collapseData: false,
                        columns: ['id', 'start_time_plan', 'next_year', 'end_time_plan', 'status_request_sysname', 'status_request_id', 'is_active', 'week'],
                        limit: 999999
                    }
                };
                api(o, (err, res) => {
                    if (err) return cb(new MyError('При получении заявок ппр для активации - произошла ошибка.', err));
                    ppr = res;
                    cb(null)
                }, user)
            },
            expiredPPR: cb => {
                for (let i in ppr) {
                    if (moment(ppr[i].end_time_plan, 'DD.MM.YYYY HH:mm:SS').format('YYYY.MM.DD HH:mm:SS').replace(/[^0-9]/gm,'') < moment().format('YYYYMMDDHHmmSS')) {
                        if (ppr[i].status_request_sysname != 'CLOSED' && ppr[i].status_request_sysname != 'SUCCESSFUL') {
                            ppr_for_expired.push(ppr[i])
                        }
                    }
                }
                async.eachSeries(ppr_for_expired, (ppr, cb) => {
                    let o = {
                        command: 'expired',
                        object: 'ppr',
                        params: {
                            id: ppr.id
                        }
                    }
                    api(o, (err, res) => {
                        if (err) return cb(new MyError('Не удалось поместить заявку в статус просрочено.', {err: err, o: o}));
                        cb(null)
                    }, user)
                }, cb)
            }
        }, cb)
    },
    activateQuery: (user, cb) => {
        let ppr_for_activate = [];
        async.series({
            getPPR: cb => {
                let o = {
                    command: 'get',
                    object: 'ppr',
                    params: {
                        where: [
                            { key: 'is_active', type: '=', val1:false},
                            { key: 'week', type: '=',  val1: moment().isoWeek()},
                            { key: 'next_year', type: '=', val1: false},
                            { key: 'status_request_sysname', type: 'in', val1: ['planned']}
                        ],
                        limit: 99999,
                        collapseData: false,
                        columns: ['id', 'next_year', 'is_active', 'week', 'status_request_sysname'],
                    }
                };
                api(o, (err, res) => {
                    if (err) return cb(new MyError('При получении заявок ппр для активации - произошла ошибка.', err));
                    ppr_for_activate = res;
                    cb(null)
                }, user)
            },
            activatePPR: cb => {
                if (ppr_for_activate.length == 0) return cb(null)
                async.eachSeries(ppr_for_activate, (ppr, cb) => {
                    if (ppr.status_request_sysname !== 'planned') return cb(null) //на всякие случай ещё проверка
                    let o = {
                        command: 'modify',
                        object: 'ppr',
                        params: {
                            id: ppr.id,
                            is_active: true,
                            is_archived: false,
                            status_request_sysname: 'planned'
                        }
                    }
                    api(o, (err, res) => {
                        if (err) return cb(new MyError('Не удалось активировать заявку ППР id:' + ppr.id, err));
                        return cb(null)
                    }, user)
                }, cb)
            }
        }, (err, res) => {
            if (err) return cb(err)
            cb(null)
        })
    },
};
module.exports.request_ppr = request_ppr;
