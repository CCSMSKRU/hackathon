const api = require('../libs/api');
const async = require('async');
const moment = require("moment");
// let user


class BJRequestWork {
    constructor(obj, cb) {
        const _t = this;
        _t.user = obj.user
        // _t.init(cb)
        // _t.X = 259200 //количество секунд через которое заявка улетает в "закрытая" из статуса "исполнена" 3 СУТОК
        _t.X = undefined
    }
    getTimeAutomaticClosingRequestWork(cb) {
        const _t = this;

        let o = {
            command: 'get',
            object: 'client_system_setting',
            params: {
                param_where: {
                    sysname: 'AUTOMATICCLOSINGREQUESTWORK'
                }
            },
            collapseData: false
        }
        api(o, (err, res) => {
            if (err) return cb(new MyError('Не удалось получить время автозакрытия заявки ',{err:err}));
            // _t.X = 120
            let value = res.data[0][res.data_columns.indexOf('val1')]
            // res[0].val1 =
            _t.X = parseInt(value, 10) * 24 * 60 * 60
            cb(null)
        }, _t.user)

    }
    automaticClosingRequestWork(cb) {
        const _t = this;
        if (!_t.user) return cb('Не создан user от имени которого будет выполняться работа')

        let request_works;
        let request_works_log;
        let data_last_change_status_request = {};

        let successful_status_id;
        let closed_status_id;
        async.series({
            getRequestWork: cb => {
                async.series({
                    getTimeAutomaticClosingRequestWork: cb => {
                        if (_t.X) return cb(null)
                        _t.getTimeAutomaticClosingRequestWork(res => {
                            if (res) return cb(null)
                            cb(null)
                        })

                    },
                    getIdBySysname: cb => {
                        async.parallel({
                            successful: cb => {
                                let o = {
                                    command: 'get',
                                    object: 'status_request_work_for_request_work',
                                    params: {
                                        param_where: {
                                            sysname: 'SUCCESSFUL',
                                        },
                                        collapseData: false
                                    }
                                }
                                api(o, (err, res) => {
                                    if (err) return cb(err)
                                    successful_status_id = res[0].id
                                    cb(null)
                                }, _t.user)
                            },
                            closed: cb => {
                                let o = {
                                    command: 'get',
                                    object: 'status_request_work_for_request_work',
                                    params: {
                                        param_where: {
                                            sysname: 'CLOSED',
                                        },
                                        collapseData: false
                                    }
                                }
                                api(o, (err, res) => {
                                    if (err) return cb(err)
                                    closed_status_id = res[0].id
                                    cb(null)
                                }, _t.user)
                            }
                        }, (err, res) => {
                            if (err) return cb(err)
                            cb(null)
                        })
                    },
                    getRequestWork: cb => {
                        let o = {
                            command: 'get',
                            object: 'request_work',
                            params: {
                                param_where:{
                                    status_request_work_id: successful_status_id
                                },
                                columns: ['status_request_work_id'],
                                limit: 9999999,
                                collapseData: false,
                            }
                        }
                        api(o, (err, res) => {
                            if (err) return cb(err)
                            request_works = res;
                            cb(null)
                        }, _t.user)
                    },
                    getLogRequestWorks: cb => {
                        if (request_works.length == 0) {
                            request_works_log = []
                            return cb(null)
                        }

                        let o = {
                            command: 'get',
                            object: 'log_status_change_request_work',
                            params: {
                                collapseData: false,
                                where: [{key: 'status_request_work_for_request_work_id', type: '=', val1: successful_status_id}],
                                columns: ['id', 'status_request_work_for_request_work_id', 'request_work_id', 'created']
                            }
                        }
                        for (let i in request_works) o.params.where.push({key: 'request_work_id', type: '=', val1: request_works[i].id, comparisonType: "or", group: "request_work"})
                        api(o, (err, res) => {
                            if (err) return cb(err)
                            request_works_log = res;
                            cb(null)
                        }, _t.user)
                    },
                }, (err, res) => {
                    if (err) return cb(err)
                    cb(null)
                })
            },
            handlerRequestWork: cb => {
                for (let i in request_works_log) {
                    let current_request_id = request_works_log[i].request_work_id
                    let date_current_request_id = request_works_log[i].created
                    let log_current_request_id = request_works_log[i].id

                    if (!data_last_change_status_request[current_request_id])
                        data_last_change_status_request[current_request_id] = {
                            date: date_current_request_id,
                            id: log_current_request_id
                        }

                    if (data_last_change_status_request[current_request_id].id < log_current_request_id) {
                        data_last_change_status_request.date = date_current_request_id;
                        data_last_change_status_request.id = log_current_request_id;
                    }

                }
                cb(null)
            },
            setRequestWorks: cb => {
                let not_queue = true;
                let q = async.queue((task, cb) => {
                    async.series({
                        setStatus: cb => {
                            let o = {
                                command: 'setClosed',
                                object: 'request_work',
                                params: {
                                    id: task.id,
                                }
                            }
                            api(o, (err, res) => {
                                if (err) return cb(err)
                                cb(null)
                            }, _t.user)
                        },
                        // addLogStatus: cb => {
                        //     let o = {
                        //         command: 'add',
                        //         object: 'log_status_change_request_work',
                        //         params: {
                        //             request_work_id: task.id,
                        //             status_request_work_for_request_work_id: closed_status_id
                        //         }
                        //     }
                        //     api(o, (err, res) => {
                        //         if (err) return cb(err)
                        //         cb(null)
                        //     }, _t.user)
                        // }
                    }, (err, res) => {
                        if (err) return cb(err)
                        cb(null)
                    })
                }, 2);
                q.drain = () => { cb(null) };
                for (let i in data_last_change_status_request) {
                    let unix_time_change = moment(data_last_change_status_request[i].date, 'DD.MM.YYYY HH:mm:ss').unix()
                    let unix_time_now = moment().unix();
                    let diff = unix_time_now - unix_time_change;
                    if (diff > _t.X) {
                        not_queue = false
                        q.push({id: i}, err => {
                            if (err) cb(err)
                        });
                    }
                };
                if (not_queue) return cb(null)
                if (data_last_change_status_request.length == 0) return cb(null)
            }
        }, (err, res) => {
            if (err) return cb(err)
            cb(null)
        })
    }

    init(cb) {
        const _t = this;
        async.series({
            getTimeAutomaticClosingRequestWork: cb => {
                if (_t.X) return cb(null)
                _t.getTimeAutomaticClosingRequestWork(cb)
            },
            automaticClosingRequestWork: cb => _t.automaticClosingRequestWork(cb)
        }, cb)
    }
}
module.exports = BJRequestWork;
