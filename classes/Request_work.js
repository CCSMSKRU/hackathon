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
var ToExcel = require('../libs/ToExcel.js');
const moment = require("moment");

let EventNotification = require('../modules/handlerNotificationToMail')

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
Model.prototype.removePrototype = Model.prototype.remove;
Model.prototype.getForSelectPrototype = Model.prototype.getForSelect;

Model.prototype.init = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb'); // The method is not passed to cb
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj')); // The method is not passed to obj
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

Model.prototype.add_ = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    let  _t = this;
    let id;
    let new_request_obj = {};
    async.series({
        checkDateStartAndEnd: cb => {
            let date_now = moment().format('YYYY.MM.DD HH:mm:SS')
            let start_plan = obj.start_time_plan ? moment(obj.start_time_plan, 'DD.MM.YYYY HH:mm:SS').format('YYYY.MM.DD HH:mm:SS') : undefined
            let end_plan = obj.end_time_plan ? moment(obj.end_time_plan, 'DD.MM.YYYY HH:mm:SS').format('YYYY.MM.DD HH:mm:SS') : undefined

            if (start_plan && end_plan) {
                if ( start_plan.replace(/[^0-9]/g,'') >  end_plan.replace(/[^0-9]/g,'')  )
                    return cb(new UserError('Дата и время завершения заявки не должна быть раньше даты и времени начала выполнения'))
            }
            // else if (!start_plan && end_plan) {
            //     if ( date_now.replace(/[^0-9]/g,'') >  end_plan.replace(/[^0-9]/g,'')  ) {
            //         return cb(new UserError('Дата и время завершения заявки не должна быть раньше момента создания заявки'))
            //     }
            // } else if (start_plan && !end_plan) {
            //     if ( date_now.replace(/[^0-9]/g,'') >  start_plan.replace(/[^0-9]/g,'')  ) {
            //         return cb(new UserError('Дата и время начала выполнения заявки не должна быть раньше момента создания заявки'))
            //     }
            // }
            cb(null)
        },
        checkRequestFromDispatcher: cb => {
            if (Object.keys(_t.user.roles.roles_obj_byOrganizationId).indexOf(obj.applicant_organization_id) > -1) return cb(null)
            if (Object.keys(_t.user.roles.organization_obj_byRoleSysname).map(role => role.toLowerCase()).indexOf('dispatcher') > -1)  obj.created_dispatcher = true;
            cb(null)
        },
        addProto: cb => {
            _t.addPrototype(obj, (err, res) => {
                if (err) return cb(err);
                id = res.id;
                cb(null);
            });
        },
        getNewRequest: cb => {
            let o = {
                command: 'getById',
                object: 'request_work',
                params: {
                    id: id
                }
            }
            _t.api(o, (err, res) => {
                if (err) return cb(err)
                new_request_obj = res[0]
                cb(null)
                // console.log(res[0]);
            })
        },
        pushNotification: cb => {
            let n = new EventNotification({
                object: 'request_work',
                object_id: id,
                event: {
                    name: 'create',
                    type: new_request_obj.type_request_for_request_work_sysname
                }
            }, res => {})
            cb(null)
        },
        setHistory: cb => {
            async.parallel({
                setHistoryStatus: cb => {
                    let o = {
                        command: 'add',
                        object: 'log_status_change_request_work',
                        params: {
                            request_work_id: id,
                            status_request_work_for_request_work_id: obj.status_request_work_id
                        }
                    }
                    _t.api(o, (err, res) => {
                        if (err) return cb(err)
                        cb(err)
                    })
                },
                // setHistoryRequest: cb => {
                //     let o = {
                //         command: 'add',
                //         object: 'log_change_request_work',
                //     }
                //     o.params = new_request_obj;
                //     o.params.request_work_id = o.params.id;
                //     delete o.params.id;
                //     _t.api(o, (err, res) => {
                //         if (err) return cb(err)
                //         cb(err)
                //     })
                // }
            },(err, res) => {
                cb(err);
            })
        }
    }, (err, res) => {
        if (err) return cb(err)
        cb(null, new UserOk('noToastr', {data: { id: id }}));
        // cb
    });
};

Model.prototype.modify = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    // console.log(obj)


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

Model.prototype.modify_ = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj}));

    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    let class_profile = null;
    let class_profile_fields = [];

    // console.log(_t, obj);


    if (obj.fromClient && (obj.status_request_work_id || obj.status_request_work_id_sysname || obj.status_request_work)){
        return cb(new UserError('noAccess',{msg:'Статус не может быть изменен'}));
    }

    var prev_state;
    async.series({
        getClassFieldsProfile: cb => {
            for (let i in _t.class_fields_profile)
                if (!_t.class_fields_profile[i].is_virtual)
                    class_profile_fields.push(_t.class_fields_profile[i].column_name)
            cb(null)
            // let o = {
            //     command: 'get',
            //     object: 'class_fields_profile',
            //     params: {
            //         where: [
            //             {key: 'class_id', type: '=', val1: class_profile.id},
            //             {key: 'is_virtual', type: '=', val1: false}
            //         ],
            //         collapseData: false
            //     }
            // }
            // _t.api(o, (err, res) => {
            //     if (err) return cb(new MyError('Неудалось получить classProfileFields', {'err': err}))
            //     class_profile_fields = res.map(el => { return el.column_name} );
            //     cb(null)
            // });
        },
        getForLog:cb => {
            _t.getById({id:id,skipCheckRoleModel:true}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись для сохранения предыдущего состояния.',{id:id,err:err}));
                prev_state = res[0];
                cb(null);
            });
        },
        modify: cb => {
            _t.modifyPrototype(obj, function(err, res){
                return cb(err, res);
            });
        },
        // pushNotification: cb => {
        //     let request_work;
        //     if (obj.status_request_work_id) {
        //         async.series({
        //             getRequest: cb => {
        //                 let o = {
        //                     command: 'getById',
        //                     object: 'request_work',
        //                     params: {
        //                         id: id,
        //                         skipCheckRoleModel:true
        //                     }
        //                 };
        //                 _t.api(o, (err, res) => {
        //                     request_work = res[0];
        //                     if (cb) cb(null, res[0]);
        //                 })
        //             },
        //             pushNotification: cb => {
        //                 let n = new EventNotification({
        //                     object: 'request_work',
        //                     object_id: id,
        //                     event: {
        //                         name: 'change_status',
        //                         status: request_work.status_request_work_sysname,
        //                         type: request_work.type_request_for_request_work_sysname
        //                     }
        //                 }, res => {
        //                     cb(null)
        //                 })
        //             }
        //         }, (err, res) => {
        //             if (err) return cb(err)
        //             cb(null)
        //         })
        //     } else {
        //         cb(null)
        //     }
        //
        // },
        // makeLog: cb => {
        //     var new_rec;
        //     var changes = {};
        //     async.series({
        //         get:cb => {
        //             _t.getById({id:id, skipCheckRoleModel:true}, function (err, res) {
        //                 if (err) return cb(new MyError('Не удалось получить запись.',{id:id,err:err}));
        //                 new_rec = res[0];
        //                 cb(null);
        //             });
        //         },
        //         merge:cb => {
        //             Object.keys(prev_state).forEach(key =>{
        //                 var prev_field = prev_state[key];
        //                 if (prev_field != new_rec[key]) {
        //                     changes[key] = new_rec[key];
        //                 }
        //             });
        //             cb(null);
        //         },
        //         setLog:cb => {
        //             let o = {
        //                 command: 'add',
        //                 object: 'log_change_request_work',
        //                 params: {
        //                     request_work_id: id,
        //                     skipCheckRoleModel:true,
        //                     rollback_key:rollback_key
        //                 }
        //             }
        //             for (let i in changes) {
        //                 o.params[i] = changes[i];
        //             }
        //             o.params.request_work_id = obj.id;
        //             _t.api(o, (err, res) => {
        //                 if (err) return cb(new MyError('Неудалось сохранить лог изменения', {o:o, err: err}));
        //                 cb(null)
        //             });
        //         }
        //     }, cb);
        //
        // },
    }, (err, res) => {
        if (err) {
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            cb(null, res.modify);
        }
    })
}

Model.prototype.remove = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var client_object = _t.client_object || '';

    var coFunction = 'remove_' + client_object;

    if (typeof _t[coFunction] === 'function') {
        _t[coFunction](obj, cb);
    } else {
        if (typeof _t['remove_'] === 'function') {
            _t['remove_'](obj, cb);
        } else {
            _t.removePrototype(obj, cb);
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

Model.prototype.getForSelect_ = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var data;
    let object_id = null;
    async.series({
        addFilter: cb => {
            if (["object_location"].indexOf(obj.column_name) === -1 || !obj.parent_id) return cb(null); // Parent_id - id оборудования
            let o = {
                command: 'getById',
                object: 'object_system',
                params: {
                    id: obj.parent_id
                }
            }
            _t.api(o, (err, res) => {
                obj.default_where = obj.default_where || [];
                obj.default_where.push({
                    key: 'object_id',
                    val1: res[0].object_id
                });
                cb(null)
            })
        },
        getPrototype_: cb => {
            _t.getForSelectPrototype(obj,(err,res)=>{
                if (err) return cb(err);
                data = res;
                cb(null);
            });
        },
    },(err, res) => {
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',data));
        // cb(null, data);
    })
};

Model.prototype.getHistory_ = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj}));

    let history_getData = [];
    let log_change = [];


    var prev = {};
    async.series({
        getData: cb => {
            let o = {
                command: 'get',
                object: 'log_change_request_work',
                params: {
                    param_where:{
                        request_work_id:id
                    },
                    sort:'id',
                    collapseData: false
                }
            };
            if (obj.trackedColumns)
                if (obj.trackedColumns.columns)
                    o.params.columns = obj.trackedColumns.columns
            _t.api(o, (err, res) => {
                if (err) return cb(new MyError('Не удалось получить лог', {err: err}));

                history_getData = res;
                cb(null)
            })
        },

        handlerData: cb => {
            // TODO русские названия полей можно указать в клиентском объекте (name_ru) и использовать его.
            let ru_fields = {
                created: 'Создано',
                created_by_user: 'Пользователем',
                request: 'Запрос',
                object_: 'Объект',
                location: 'Помещение',
                location_description: 'Описание помещения',
                start_time_plan: 'Приступить к',
                end_time_plan: 'Завершить до',
                paid: 'Платная',
                type_request_for_request_work: 'Тип заявки',
                status_request_work: 'Статус заявки',
                timeliness_for_request_work: 'Срочность',
                executor_organization: 'Организация исполнителя',
                executor_user: 'Исполнитель',
                is_archived: 'В архиве'
            };

            let exclude_field = ['id', 'object_id', 'location_id', 'type_request_for_request_work_id',
                'type_request_for_request_work_sysname', 'status_request_work_id',
                'status_request_work_sysname',
                'timeliness_id',
                'applicant_organization_id',
                'applicant_organization',
                // 'is_archived',
                // 'paid',
                'executor_user_id',
                'executor_organization_id',
                'created',
                'created_by_user',
                'request_work_id','updated','deleted','published','created_by_user_id',
                'deleted_by_user_id','deleted_by_user','remove_comment','self_company_id','self_company','ext_company_id','ext_company']

            for (let i in history_getData) {
                let log_item = history_getData[i];
                let log_item_return;
                for (let field_name in log_item) {
                    if (exclude_field.indexOf(field_name) !==  -1) continue;
                    if (log_item[field_name] === "") continue;

                    if (!log_item_return){
                        log_item_return = {
                            created_by_user:log_item.created_by_user,
                            created:log_item.created,
                            log:[]
                        };
                    }

                    // TODO Сделать это преобразование непосредственно перед рендаригнгом. Чтобы всегда иметь оригинальные значения полей
                    if (log_item[field_name] === true) log_item[field_name] = 'Да';
                    if (log_item[field_name] === false) log_item[field_name] = 'Нет';

                    log_item_return.log.push({
                        ru_filed: ru_fields[field_name], // Да
                        field: field_name,
                        value: log_item[field_name] // true
                    })
                }
                if (log_item_return) log_change.push(log_item_return);
                // if (Object.values(log_item_return).length > 0) log_change.push(log_item_return)
            }
            cb(null)
        }
    }, (err, res) => {
        if (err) return cb(err)
        // console.log(log_change)
        cb(null, new UserOk('noToastr',{data:log_change}));
    })

    // _t.api(o, (err, res) => {
    //     // let a = 123;
    //     console.log(res)
    //     if (err) return cb(new MyError('Неудалось получить лог', {'err': err}))
    //     if (res.length == 0) return cb(null) //TODO
    //
    //
    //     // console.log(res)
    //     log_change[0] = {};
    //     for (let i in obj.trackedColumns.columns) {
    //         let col_name = obj.trackedColumns.columns[i];
    //
    //         // console.log(col_name, log_change)
    //         log_change[0][col_name] = {
    //             val: res[0][col_name],
    //             // new: res[0][col_name] === "" ? 0 : 1
    //             new: !(res[0][col_name] === "")
    //         }
    //     }
    //
    //     let last_row
    //     console.log(res)
    //     for (let i in res) {
    //         if (i == 0) {
    //             last_row = funcs.cloneObj(res[0])
    //             continue
    //         }
    //         let current_row = {};
    //         for (let j in obj.trackedColumns.columns) {
    //             let col_name = obj.trackedColumns.columns[j];
    //             current_row[col_name] = {}
    //             if (res[i][col_name] !== "") {
    //                 current_row[col_name].new = 1;
    //                 current_row[col_name].val = res[i][col_name]
    //                 last_row[col_name] = current_row[col_name].val
    //                 if (col_name == 'paid') {
    //                     console.log(last_row)
    //                 }
    //             }
    //             if (res[i][col_name] === "") {
    //                 current_row[col_name].new = 0
    //                 current_row[col_name].val = last_row[col_name]
    //             }
    //
    //         }
    //         log_change.push(current_row)
    //     }
    //     return cb(null, new UserOk('noToastr',{'data':log_change}));
    // })
};


Model.prototype.get_form_my_execute_request_work = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id

    var prototypeRes;
    async.series({
        getProto: cb =>{
            if (!obj.params) {
                obj.params = {
                    where: []
                }
            } else if (!obj.params.where) {
                obj.params.where = []
            }

            obj.params.where.push({key: 'executor_user_id', type: '=', val1: _t.user.user_data.id})
            if (obj.where) obj.where = obj.params.where;

            _t.getPrototype(obj, (err, res)=>{
                if (err) return cb(err);
                prototypeRes = res;
                cb(null)
            });
        }
    },function (err, res) {
        if (err) return cb(err);
        cb(null, prototypeRes);
    });
};

//commentin_tab_tabs_wrapper
// let table_file = 'file_for_equipment';
let table_comment_static = 'request_work_comment';
let name_field_parent_table_on_table_comment_static = 'request_work_id'; // имя поля родителя в таблице комментариев

let table_file_comment_static = 'file_comment_request_work';
let name_field_parent_comment_static = 'request_work_comment_id'; // имя поля рожителя в таблице файлов комментария
// let table_type_files_static = 'file_for_equipment_type'


Model.prototype.getComment = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    let comments = []
    let hash_map_files = {};

    obj.isClient = obj.isClient || false;

    async.series({
        getComment: cb => {
            let o = {
                command: 'get',
                object: table_comment_static,
                params: {
                    where: [{
                        key: name_field_parent_table_on_table_comment_static,
                        type: '=',
                        val1: obj.id
                    }],
                    collapseData: false
                }
            };


            if(obj.isClient){
                o.params.where.push({
                    key: 'visible_client',
                    type: '=',
                    val1: true
                });
            }

            if (obj.comment_id) {
                o.params.where.push({
                    key: 'id',
                    type: '=',
                    val1: obj.comment_id
                })
            } else if (obj.id){
                o.params.where.push({
                    key: name_field_parent_table_on_table_comment_static,
                    type: '=',
                    val1: obj.id
                })
            }

            if (obj.limit) o.params.limit = obj.limit
            if (obj.page_no) o.params.page_no = obj.page_no
            if (obj.columns) o.params.columns = obj.columns
            if (obj.sort) o.params.sort = obj.sort
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить получить доступ к файлам объекта',{o : o, err : err}));
                comments = res
                cb(null, res);
            });
        },
        // isVisibleByRole: cb => {
        //
        //     let client_roles = ['COMPANY_EMPLOYEE','COMPANY_ADMIN'];
        //
        // },
        getFilesComment: cb => {
            let o = {
                command: 'get',
                object: table_file_comment_static,
                params: {
                    where: [],
                    collapseData: false
                }
            }
            if (obj.parent_id) o.params.where.push({key: name_field_parent_table_on_table_comment_static, type: '=', val1: parent_id})
            if (obj.comment_id) o.params.where.push({key: name_field_parent_comment_static, type: '=', val1: obj.comment_id})

            // if (obj.id) o.params.where.push({key: 'id', type: '=', val1: obj.id})




            _t.api(o, (err, res) => {
                if (err) return cb(err);

                for (let i in res) {
                    let comment_id = res[i][name_field_parent_comment_static]
                    let file = res[i];
                    if (!hash_map_files[comment_id]) hash_map_files[comment_id] = []
                    hash_map_files[comment_id].push(file)
                }

                // console.log(hash_map_files)

                for (let i in comments) {
                    if ( hash_map_files[comments[i].id] ) {
                        if (!comments[i].files) comments[i].files = []
                        comments[i].files.push(hash_map_files[comments[i].id])
                        let hs = hash_map_files;
                        let co = comments;
                        let coi = comments[i]
                        // console.log(hs, co, coi)
                    }

                    // comments[i].files.push(hash_map_files[comments[i].id])
                    // comments[i].files.push(hash_map_files[comments[i].id])
                }
                cb(null, res);
            })
        }
    },function (err, res) {
        if (err) return cb(err);


        // for (let i in res.getComment)
        let files_map = {}
        for (let i in res.getFilesComment) {
            // let comment_id =
            if (!files_map[res.getFilesComment[i][name_field_parent_comment_static]]) files_map[res.getFilesComment[i][name_field_parent_comment_static]] = []
            files_map[res.getFilesComment[i][name_field_parent_comment_static]].push(res.getFilesComment[i])
        }

        for (let i in res.getComment) {
            res.getComment[i].files = files_map[res.getComment[i].id];
        }

        // console.log(res);
        cb(null, new UserOk('noToastr',{data:comments}))
    });
};
Model.prototype.setComment = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    let  _t = this;

    if (!!obj.attach_files && !!obj.text) {
        if (!obj.text) return cb(new MyError('В метод не переданы obj.text'));
        if (!obj.attach_files) return cb(new MyError('В метод не переданы obj.attach_files'));
    }
    obj.text = obj.text || '';
    // if (!obj.text) return cb(new MyError('В метод не переданы obj.text'));
    if (!obj.id) return cb(new MyError('В метод не переданы obj.id'));

    let new_comment_id = undefined
    async.series({
        addComment: cb => {
            let o = {
                command: 'add',
                object: table_comment_static,
                params: {
                    [name_field_parent_table_on_table_comment_static] : obj.id,
                    visible_client: obj.visible_client,
                    text: obj.text
                }
            }
            _t.api(o, (err, res) => {
                if (err) return cb(new MyError('Не удалось добавить комментарий', {o:o, err:err}));
                new_comment_id = res.id;
                cb(null);
            })
        },
        addAttachFiles: cb => {
            if (!obj.attach_files) {
                return cb(null)
            }
            if (obj.attach_files.length == 0) {
                return cb(null)
            }

            let promises_arr = []
            for (let i in obj.attach_files) {
                promises_arr.push(
                    new Promise((resolve, reject) => {
                        let o = {
                            command: 'add',
                            object: table_file_comment_static,
                            params: {
                                [name_field_parent_comment_static]: new_comment_id,
                                file_id: obj.attach_files[i].file_id,
                                name: obj.attach_files[i].name
                            }
                        }
                        // console.log(obj.attach_files[i], new_comment_id)
                        _t.api(o, (err, res) => {
                            // console.log(o, err, res)
                            resolve(null)
                        })
                    })
                )
            }
            //TODO надо прописать проверки
            Promise.all(promises_arr).then(function(){
                cb(null)
            });

        },
        pushNotification: cb => {
            if (!obj.visible_client) return cb(null)

            let row
            _t.getById({id:obj.id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись.',{id:obj.id,err:err}));
                row = res[0];
                let n = new EventNotification({
                    object: 'request_work',
                    object_id: obj.id,
                    event: {
                        name: 'setComment',
                        type: row.type_request_for_request_work_sysname
                    },
                    params: {
                        comment: obj.text,
                        user_fio_answer: _t.user.user_data.fio,
                    }
                }, res => {})
                cb(null)

            });
        },
        getNewComment: cb => {
            obj.comment_id = new_comment_id
            _t.getComment(obj, function(err, res){
                if (err) return cb(err);
                // console.log(obj, err, res)

                cb(null, res);
            })
        }
    },function (err, res) {
        if (err) return cb(err);
        // getNewComment
        cb(null, new UserOk('noToastr',{data:res.getNewComment.data}));
        // cb(null, new UserOk('Ок'));
    });

};

// file
Model.prototype.uploadFile = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
    var _t = this;
    var rollback_key = rollback.create();

    let new_file_id = null;
    async.series({
        addFile: function (cb) {
            let o = {
                command: 'add',
                object: 'File',
                params: {
                    filename: obj.filename,
                    rollback_key: rollback_key
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(err);
                file_id = res.id;
                cb(null, res);
            });
        },
        addInfoFile: function (cb) {
            let o = {
                command: 'add',
                object: table_file,
                params: {
                    file_id: file_id,
                    [name_field_parent_table_on_table_comment_static]: obj.id
                }
            }
            if (obj.description) o.params.description = obj.description
            if (obj.type_sysname) o.params.type_sysname = obj.type_sysname
            _t.api(o, (err, res) => {
                if (err) return cb(err);
                new_file_id = res.id
                cb(null, res);
            });
        },
        returnNewFile: function (cb) {
            obj.id = new_file_id
            _t.getFiles(obj, function(err, res){
                if (err) return cb(err);
                cb(null, res);
            })
        }
    }, function (err, res) {
        if (err) {
            rollback.rollback({rollback_key:rollback_key,user:_t.user}, function (err2) {
                return cb(err, err2);
            });
        }
        return cb(null, res.returnNewFile);
    })
};
Model.prototype.removeFile = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
    var _t = this;

    if (!obj.id) return cb(new MyError('Не передан id'));

    async.series({
        removeInfoFile: function (cb) {
            let o = {
                command: 'remove',
                object: table_file,
                params: {
                    id: obj.id,
                }
            }
            _t.api(o, (err, res) => {
                if (err) return cb(err);
                cb(null);
            });
        }
    }, function (err, res) {
        if (err) return cb(new MyError('При удалении файла  произошла ошибка.', err));
        return cb(null,new UserOk('noToastr',{data:[]}));
    })

};
Model.prototype.getFiles = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    if (!obj.parent_id && !obj.id) return cb(new MyError('Не передан id || parent_id'));
    let parent_id = obj.parent_id;
    async.series({
        getFiles: cb => {
            let o = {
                command: 'get',
                object: table_file,
                params: {
                    where: [],
                    collapseData: false
                }
            }
            if (obj.parent_id) o.params.where.push({key: name_field_parent_table_on_table_comment_static, type: '=', val1: parent_id})
            if (obj.id) o.params.where.push({key: 'id', type: '=', val1: obj.id})
            _t.api(o, (err, res) => {
                if (err) return cb(err);
                cb(null, res);
            })
        }
    },function (err, res) {
        if (err) return cb(err);
        for (let i in res) res[i].name = res[i].type ? res[i].type + ':' + (res[i].description ? res[i].description : res[i].file_name_load) : (res[i].description ? res[i].description : res[i].file_name_load);
        // for (let i in res) res[i].name = res[i].type + ':' + res[i].description;
        cb(null, new UserOk('noToastr',{data:res.getFiles}));
    });
};
Model.prototype.getTypes = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    // if (!obj.parent_id) return cb(new MyError('Не передан id'));
    // let parent_id = obj.parent_id;
    async.series({
        getTypes: cb => {
            let o = {
                command: 'get',
                object: table_type_files_static,
                params: {
                    collapseData: false
                }
            }
            _t.api(o, (err, res) => {
                if (err) return cb(err);
                cb(null, res);
            })
        }
    },function (err, res) {
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',{data:res.getTypes}));
    });
}






Model.prototype.getCount = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;

    let res_get
    async.series({
        getPrototype_: cb => {
            _t.getPrototype(obj,(err,res)=>{
                if (err) return cb(err);
                res_get = res;
                cb(null);
            });
        },
    },function (err, res) {
        if (err) return cb(err);
        if (res_get.extra_data) return cb(null, new UserOk('noToastr',{data:res_get.extra_data.count, count: res_get.length}));
        if (!res_get.extra_data) return cb(null, new UserOk('noToastr',{data:res_get.extra_data, count: res_get.length}));
    });
};

Model.prototype.checkAccess = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var operations = obj.operations || [];

    var access_obj = {};
    var errors = [];
    async.series({
        checkAll:cb => {
            async.eachSeries(operations, function(oper, cb){
                var o = {
                    command:oper,
                    object:'Request_work',
                    params:{
                        checkAccess:true,
                        id:id
                    }
                };
                _t.api(o, (err, res)=>{
                    if (err && (err.code !== 11 && err.messages !=='noAccessRole')) {
                        errors.push(new MyError('Не удалось проверить доступ для операции',{o : o, err : err}));
                    }
                    access_obj[oper] = !err;
                    cb(null);
                });

            }, cb);
        }
    },function (err, res) {
        if (err) {
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            // console.log('errors asdsad', errors);
            // cb(null, new UserOk('Ок',{data:{access_obj:access_obj,errors:'ВРЕМЕННО НЕТ ИНФОРМАЦИИ'}}));
            cb(null, new UserOk('Ок',{data:{access_obj:access_obj,errors:errors}}));
        }
    });
};

Model.prototype.setExecutor = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    var executor_organization_id = obj.executor_organization_id;
    var executor_user_id = obj.executor_user_id;
    if (!executor_user_id || !executor_organization_id) return cb(new MyError('Не переданы executor_user_id или executor_organization_id',{obj:obj}));

    var row;
    async.series({
        get:cb => {
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись.',{id:id,err:err}));
                row = res[0];
                cb(null);
            });
        },
        check:function(cb){
            if (['CREATED','CONFIRM','PROCESSIND'].indexOf(row.status_request_work_sysname) === -1) return cb(new UserError('Заявке нельзя назначить исполнителя, проверьте статус',{obj:obj,row:row}));
            return cb(null);
        },
        modify: cb => {
            var params = {
                id:id,
                executor_user_id:executor_user_id,
                executor_organization_id:executor_organization_id,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить заявку',{params : params, err : err}));

                cb(null);
            });

        },
        pushNotification: cb => {
            let n = new EventNotification({
                object: 'request_work',
                object_id: id,
                event: {
                    name: 'setExecutor',
                    type: row.type_request_for_request_work_sysname
                }
            }, res => {})
            cb(null)
        },
    },function (err, res) {
        if (err) {
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'setReturned', params:obj});
            //}
            cb(null, new UserOk('Ок'));
        }
    });
};

Model.prototype.reSetExecutor = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    _t.setExecutor(obj, cb);
};

Model.prototype.getOrganization = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    // var id = obj.id;
    // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var object_ids;
    var organization_ids;
    var organizations = [];
    var is_default_id;
    async.series({
        getIsDefault:cb => {
            var o = {
                command:'get',
                object:'organization_relation_user',
                params:{
                    param_where: {
                        user_id:_t.user.user_data.id,
                        is_default:true
                    },
                    collapseData:false
                }
            };
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось получить дефолтную компанию пользователя',{o : o, err : err}));
                if (!res.length) return cb(null);
                is_default_id = res[0].organization_id;
                cb(null);
            });

        },
        getRel:cb => {
            var o = {
                command:'get',
                object:'object_relation_organization_r_role',
                params:{
                    columns:['id','org_r_role_id','object_id','organization_id'],
                    where:[
                        {
                            key:'organization_id',
                            type:'in',
                            val1:Object.keys(_t.user.roles.roles_obj_byOrganizationId)
                        }
                    ],
                    limit:10000000,
                    collapseData:false
                }
            };
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось получить объекты',{o : o, err : err}));
                object_ids = res.map(one=>one.object_id);
                cb(null);
            });

        },
        getReal: cb => {
            if (!object_ids.length) return cb(null);
            var o = {
                command:'get',
                object:'object_',
                params:{
                    columns:['id'],
                    where:[
                        {
                            key:'id',
                            type:'in',
                            val1:object_ids
                        }
                    ],
                    limit:10000000,
                    collapseData:false
                }
            };
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось получить объекты по id',{o : o, err : err}));
                object_ids = res.map(one=>one.id);
                cb(null);
            });

        },
        getCompaniesInObjects: cb => {
            if (!object_ids || !object_ids.length) return cb(null);
            var o = {
                command:'get',
                object:'object_relation_organization_r_role',
                params:{
                    columns:['id','org_r_role_id','object_id','organization_id'],
                    where:[
                        {
                            key:'object_id',
                            type:'in',
                            val1:object_ids
                        }
                    ],
                    limit:10000000,
                    collapseData:false
                }
            };
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось получить объекты',{o : o, err : err}));
                organization_ids = res.map(one=>one.organization_id);
                cb(null);
            });
        },
        getOrganization: cb => {
            if (!organization_ids) return cb(null);
            var o = {
                command:'get',
                object:'organization',
                params:{
                    where:[
                        {
                            key:'id',
                            type:'in',
                            val1:organization_ids
                        }
                    ],
                    collapseData:false,
                    limit:10000
                }
            };
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось получить организации',{o : o, err : err}));
                res.forEach(one=>{
                    organizations.push({...one, organization_id:one.id, organization:one.name,is_default:!!(one.id === is_default_id)});
                })
                cb(null);
            });

        }
    },function (err, res) {
        if (err) {
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'setReturned', params:obj});
            //}
            cb(null, new UserOk('Ок', {data:organizations}));
        }
    });
};

Model.prototype.setReturned = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    var comment = obj.comment;
    if (!comment) return cb(new UserError('Необходимо указать комментарий для отзыва заявки',{obj:obj}));

    var status_sysname = 'RETURNED';
    async.series({
        setComment: cb => {
            let o = {
                command: 'add',
                object: 'request_work_comment',
                params: {
                    request_work_id: id,
                    text: 'Заявка была отозвана с комментарием:\n"' + comment + '"',
                    rollback_key:rollback_key
                }
            }
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось задать комментарий',{o : o, err : err}));
                cb(null);
            });
        },
        changeStatus: cb => {
            var params = {
                id:id,
                status_request_work_sysname:status_sysname,
                is_archived:true,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить request_work',{params : params, err : err}));

                cb(null);
            });
        },
        pushNotification: cb => {
            let row
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись.',{id:id,err:err}));
                row = res[0];
                let n = new EventNotification({
                    object: 'request_work',
                    object_id: id,
                    event: {
                        name: 'setReturned',
                        type: row.type_request_for_request_work_sysname
                    },
                    params: {
                        comment: comment,
                        user_fio_answer: _t.user.user_data.fio,
                    }
                }, res => {})
                cb(null)

            });
        },
        logStatus: cb => {
            let o = {
                command: 'add',
                object: 'log_status_change_request_work',
                params: {
                    request_work_id: id,
                    status_request_work_for_request_work_sysname: status_sysname,
                    rollback_key:rollback_key
                }
            }
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось записать историю изменения статуса',{o : o, err : err}));
                cb(null);
            });
        },
    },function (err, res) {
        if (err) {
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'setReturned', params:obj});
            //}
            cb(null, new UserOk('Ок'));
        }
    });
};

Model.prototype.setAccepted = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var status_sysname = 'CONFIRM';
    async.series({
        changeStatus: cb => {
            var params = {
                id:id,
                status_request_work_sysname: status_sysname,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить request_work',{params : params, err : err}));

                cb(null);
            });
        },
        logStatus: cb => {
            let o = {
                command: 'add',
                object: 'log_status_change_request_work',
                params: {
                    request_work_id: id,
                    status_request_work_for_request_work_sysname: status_sysname,
                    rollback_key:rollback_key
                }
            }
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось записать историю изменения статуса',{o : o, err : err}));
                cb(null);
            });
        },
        pushNotification: cb => {
            let row
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись.',{id:id,err:err}));
                row = res[0];
                let n = new EventNotification({
                    object: 'request_work',
                    object_id: id,
                    event: {
                        name: 'setAccepted',
                        type: row.type_request_for_request_work_sysname
                    }
                }, res => {})
                cb(null)

            });
        }
    },function (err, res) {
        if (err) {
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

Model.prototype.setRejected = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    var comment = obj.comment;
    if (!comment) return cb(new UserError('Необходимо указать комментарий для отклонения заявки',{obj:obj}));

    var status_sysname = 'DENIED';
    async.series({
        setComment: cb => {
            let o = {
                command: 'add',
                object: 'request_work_comment',
                params: {
                    request_work_id: id,
                    text: 'Заявка была отклонена с комментарием:\n"' + comment + '"',
                    rollback_key:rollback_key
                }
            }
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось задать комментарий',{o : o, err : err}));
                cb(null);
            });
        },
        changeStatus: cb => {
            var params = {
                id:id,
                status_request_work_sysname:status_sysname,
                is_archived:true,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить request_work',{params : params, err : err}));

                cb(null);
            });
        },
        pushNotification: cb => {
            let row
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись.',{id:id,err:err}));
                row = res[0];
                let n = new EventNotification({
                    object: 'request_work',
                    object_id: id,
                    event: {
                        name: 'setRejected',
                        type: row.type_request_for_request_work_sysname
                    },
                    params: {
                        comment: comment,
                        user_fio_answer: _t.user.user_data.fio,
                    }
                }, res => {})
                cb(null)

            });
        },
        logStatus: cb => {
            let o = {
                command: 'add',
                object: 'log_status_change_request_work',
                params: {
                    request_work_id: id,
                    status_request_work_for_request_work_sysname: status_sysname,
                    rollback_key:rollback_key
                }
            }
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось записать историю изменения статуса',{o : o, err : err}));
                cb(null);
            });
        },
    },function (err, res) {
        if (err) {
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'setReturned', params:obj});
            //}
            cb(null, new UserOk('Ок'));
        }
    });
};

Model.prototype.setProcessing = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var status_sysname = 'PROCESSIND';
    var row;
    async.series({
        get:cb => {
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить заявку.',{id:id,err:err}));
                row = res[0];
                cb(null);
            });
        },
        check:cb => {
            if (!row) return cb(new MyError('Нет записи'));
            if (!row.executor_user_id) return cb(new UserError('Необходимо назначить исполнителя.',{row:row}));
            cb(null);
        },
        changeStatus: cb => {
            var params = {
                id:id,
                status_request_work_sysname: status_sysname,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить request_work',{params : params, err : err}));

                cb(null);
            });
        },
        pushNotification: cb => {
            let row
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись.',{id:id,err:err}));
                row = res[0];
                let n = new EventNotification({
                    object: 'request_work',
                    object_id: id,
                    event: {
                        name: 'setProcessing',
                        type: row.type_request_for_request_work_sysname
                    }
                }, res => {})
                cb(null)

            });
        },
        logStatus: cb => {
            let o = {
                command: 'add',
                object: 'log_status_change_request_work',
                params: {
                    request_work_id: id,
                    status_request_work_for_request_work_sysname: status_sysname,
                    rollback_key:rollback_key
                }
            }
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось записать историю изменения статуса',{o : o, err : err}));
                cb(null);
            });
        },
    },function (err, res) {
        if (err) {
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

Model.prototype.setSuccessful = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    var comment = obj.comment;
    if (!comment) return cb(new UserError('Необходимо указать комментарий для закрытия заявки',{obj:obj}));

    var status_sysname = 'SUCCESSFUL';
    async.series({
        setComment: cb => {
            let o = {
                id: id,
                text: 'Заявка выполнена с комментарием:\n"' + comment + '"',
                visible_client: true,
                attach_files: obj.attach_files || []
            };
            _t.setComment(o, (err, res) => {
                if (err) return cb(new MyError('Не удалось задать комментарий',{o : o, err : err}));
                cb(null);
            })
        },
        changeStatus: cb => {
            var params = {
                id:id,
                status_request_work_sysname:status_sysname,
                // YYYY.MM.DD HH:mm:SS
                // YYYY-MM-DD РРЖььЖЫЫ
                // add_field_end_time: moment().format('YYYY-MM-DD HH:mm:SS'),
                add_field_end_time: funcs.getDateTime(),
                request_work_category_id:obj.request_work_category_id,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить request_work',{params : params, err : err}));

                cb(null);
            });
        },
        pushNotification: cb => {
            let row
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись.',{id:id,err:err}));
                row = res[0];
                let n = new EventNotification({
                    object: 'request_work',
                    object_id: id,
                    event: {
                        name: 'setSuccessful',
                        type: row.type_request_for_request_work_sysname
                    },
                    params: {
                        comment: comment,
                        user_fio_answer: _t.user.user_data.fio,
                    }
                }, res => {})
                cb(null)

            });
        },
        logStatus: cb => {
            let o = {
                command: 'add',
                object: 'log_status_change_request_work',
                params: {
                    request_work_id: id,
                    status_request_work_for_request_work_sysname: status_sysname,
                    rollback_key:rollback_key
                }
            }
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось записать историю изменения статуса',{o : o, err : err}));
                cb(null);
            });
        },
    },function (err, res) {
        if (err) {
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'setReturned', params:obj});
            //}
            cb(null, new UserOk('Ок'));
        }
    });
};

Model.prototype.setClosed = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    var comment = obj.comment || '';
    // if (!comment && obj.by_close_photo_necessary) return cb(new UserError('Необходимо указать комментарий для закрытия заявки',{obj:obj}));

    var status_sysname = 'CLOSED';
    async.series({
        // setComment: cb => {
        //
        //     obj.text = obj.comment
        //     _t.setComment(obj, (err, res) => {
        //             if (err) return cb(new MyError('Не удалось задать комментарий',{o : o, err : err}));
        //             cb(null);
        //     })
        //
        // },
        changeStatus: cb => {
            var params = {
                id:id,
                status_request_work_sysname:status_sysname,
                is_archived:true,
                // end_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                end_time: funcs.getDateTime(),
                // request_work_category_id:obj.request_work_category_id,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить request_work',{params : params, err : err}));
                cb(null);
            });
        },
        pushNotification: cb => {
            let row
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись.',{id:id,err:err}));
                row = res[0];
                let n = new EventNotification({
                    object: 'request_work',
                    object_id: id,
                    event: {
                        name: 'setClosed',
                        type: row.type_request_for_request_work_sysname
                    }
                }, res => {})
                cb(null)

            });
        },
        logStatus: cb => {
            let o = {
                command: 'add',
                object: 'log_status_change_request_work',
                params: {
                    request_work_id: id,
                    status_request_work_for_request_work_sysname: status_sysname,
                    rollback_key:rollback_key
                }
            }
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось записать историю изменения статуса',{o : o, err : err}));
                cb(null);
            });
        },
    },function (err, res) {
        if (err) {
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'setReturned', params:obj});
            //}
            cb(null, new UserOk('Ок'));
        }
    });
};

Model.prototype.returnToProcessing = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;
    var comment = obj.comment;
    if (!comment) return cb(new UserError('Необходимо указать обязательный комментарий',{obj:obj}));

    // var status_sysname = 'PROCESSIND';
    var status_sysname = 'CREATED';
    async.series({
        // cancelLastStatus:cb => {
        //     // let o = {
        //     //     command: 'get',
        //     //     object: 'log_status_change_request_work',
        //     //     params: {
        //     //         columns:['id','']
        //     //         param_where:{
        //     //             request_work_id:id
        //     //         },
        //     //         sort:{
        //     //             columns:['id'],
        //     //             directions:['DESC']
        //     //         }
        //     //         collapseData: false
        //     //     }
        //     // }
        //     // _t.api(o, (err, res)=>{
        //     //     if (err) return cb(new MyError('Не удалось получить последний статус',{o : o, err : err}));
        //     //
        //     //     cb(null);
        //     // });
        // },
        setComment: cb => {
            let o = {
                command: 'add',
                object: 'request_work_comment',
                params: {
                    request_work_id: id,
                    text: 'Комментарий оставленный при возврате на исполнение из архива "' + comment + '"',
                    visible_client: true,
                    attach_files: obj.attach_files || [],
                    rollback_key:rollback_key
                }
            }
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось задать комментарий',{o : o, err : err}));
                cb(null);
            });
        },
        changeStatus: cb => {
            var params = {
                id:id,
                is_archived:false,
                status_request_work_sysname:status_sysname,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить request_work',{params : params, err : err}));

                cb(null);
            });
        },
        pushNotification: cb => {
            let row
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить запись.',{id:id,err:err}));
                row = res[0];
                let n = new EventNotification({
                    object: 'request_work',
                    object_id: id,
                    event: {
                        name: 'setReturnToProcessing',
                        type: row.type_request_for_request_work_sysname
                    },
                    params: {
                        comment: comment,
                        user_fio_answer: _t.user.user_data.fio,
                    }
                }, res => {})
                cb(null)

            });
        },
        logStatus: cb => {
            let o = {
                command: 'add',
                object: 'log_status_change_request_work',
                params: {
                    request_work_id: id,
                    status_request_work_for_request_work_sysname: status_sysname,
                    rollback_key:rollback_key
                }
            }
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось записать историю изменения статуса',{o : o, err : err}));
                cb(null);
            });
        },
    },function (err, res) {
        if (err) {
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'setReturned', params:obj});
            //}
            cb(null, new UserOk('Ок'));
        }
    });
};

Model.prototype.addComment_OLD = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var text = obj.text;
    if (!text) return cb(new UserError('Необходимо написать текст комментария',{obj:obj}));

    async.series({
        add:cb => {
            var o = {
                command:'add',
                object:'request_work_comment',
                params:{
                    request_work_id: id,
                    text: text,
                    rollback_key:rollback_key
                }
            };
            _t.api(o, (err, res)=>{
                if (err) return cb(new MyError('Не удалось добавить комментарий',{o : o, err : err}));

                cb(null);
            });
        }
    },function (err, res) {
        if (err) {
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


//////AUTOCLOSEF REQEUST_WORK

Model.prototype.autoClosed = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;


    async.series({
        getTimeAutomaticClosingRequestWork: cb => {},
        getRequestWork: cb => {
            // setClosed
            // let request_work_ids
            async.series({
                getRequestWork: cb => {
                    let o = {
                        where: [{
                            key: 'type_request_for_request_work_sysname',
                            type: 'in',
                            val1: ['administration', 'engineering', 'cleaning', 'security', 'parking', 'visit', 'iotmc', 'elevator']
                        }, {
                            key: 'status_request_work_sysname',
                            type: 'in',
                            val1: ['SUCCESSFUL']
                        }],
                        collapseData: false
                    }
                    _t.getPrototype(o, (err, res) => {
                        //TODO
                    })
                },
                sortRequestWorkByX: cb => {

                }
            })
        }
    })


    // getTimeAutomaticClosingRequestWork(cb) {
    //     const _t = this;
    //
    //     let o = {
    //         command: 'get',
    //         object: 'client_system_setting',
    //         params: {
    //             param_where: {
    //                 sysname: 'AUTOMATICCLOSINGREQUESTWORK'
    //             }
    //         },
    //         collapseData: false
    //     }
    //     api(o, (err, res) => {
    //         if (err) return cb(new MyError('Не удалось получить время автозакрытия заявки ',{err:err}));
    //         _t.X = 120
    //         // _t.X = parseInt(res[0].val1, 10) * 24 * 60 * 60
    //         cb(null)
    //     }, _t.user)
    //
    // }
    // automaticClosingRequestWork(cb) {
    //     const _t = this;
    //     if (!_t.user) return cb('Не создан user от имени которого будет выполняться работа')
    //
    //     let request_works;
    //     let request_works_log;
    //     let data_last_change_status_request = {};
    //
    //     let successful_status_id;
    //     let closed_status_id;
    //     async.series({
    //         getRequestWork: cb => {
    //             async.series({
    //                 getTimeAutomaticClosingRequestWork: cb => {
    //                     if (_t.X) return cb(null)
    //                     _t.getTimeAutomaticClosingRequestWork(res => {
    //                         if (res) return cb(null)
    //                         cb(null)
    //                     })
    //
    //                 },
    //                 getIdBySysname: cb => {
    //                     async.parallel({
    //                         successful: cb => {
    //                             let o = {
    //                                 command: 'get',
    //                                 object: 'status_request_work_for_request_work',
    //                                 params: {
    //                                     param_where: {
    //                                         sysname: 'SUCCESSFUL',
    //                                     },
    //                                     collapseData: false
    //                                 }
    //                             }
    //                             api(o, (err, res) => {
    //                                 if (err) return cb(err)
    //                                 successful_status_id = res[0].id
    //                                 cb(null)
    //                             }, _t.user)
    //                         },
    //                         closed: cb => {
    //                             let o = {
    //                                 command: 'get',
    //                                 object: 'status_request_work_for_request_work',
    //                                 params: {
    //                                     param_where: {
    //                                         sysname: 'CLOSED',
    //                                     },
    //                                     collapseData: false
    //                                 }
    //                             }
    //                             api(o, (err, res) => {
    //                                 if (err) return cb(err)
    //                                 closed_status_id = res[0].id
    //                                 cb(null)
    //                             }, _t.user)
    //                         }
    //                     }, (err, res) => {
    //                         if (err) return cb(err)
    //                         cb(null)
    //                     })
    //                 },
    //                 getRequestWork: cb => {
    //                     let o = {
    //                         command: 'get',
    //                         object: 'request_work',
    //                         params: {
    //                             param_where:{
    //                                 status_request_work_id: successful_status_id
    //                             },
    //                             collapseData: false,
    //                         }
    //                     }
    //                     api(o, (err, res) => {
    //                         if (err) return cb(err)
    //                         console.log(o, err, res)
    //                         request_works = res;
    //                         cb(null)
    //                     }, _t.user)
    //                 },
    //                 getLogRequestWorks: cb => {
    //                     if (request_works.length == 0) {
    //                         request_works_log = []
    //                         return cb(null)
    //                     }
    //
    //                     let o = {
    //                         command: 'get',
    //                         object: 'log_change_request_work',
    //                         params: {
    //                             collapseData: false,
    //                             where: [{key: 'status_request_work_id', type: '=', val1: successful_status_id}]
    //                         }
    //                     }
    //                     for (let i in request_works) o.params.where.push({key: 'request_work_id', type: '=', val1: request_works[i].id, comparisonType: "or", group: "request_work"})
    //                     api(o, (err, res) => {
    //                         if (err) return cb(err)
    //                         console.log(o, err, res, request_works)
    //                         request_works_log = res;
    //
    //                         cb(null)
    //                     }, _t.user)
    //                 },
    //             }, (err, res) => {
    //                 if (err) return cb(err)
    //                 cb(null)
    //             })
    //         },
    //         handlerRequestWork: cb => {
    //             for (let i in request_works_log) {
    //                 let current_request_id = request_works_log[i].request_work_id
    //                 let date_current_request_id = request_works_log[i].created
    //                 let log_current_request_id = request_works_log[i].id
    //
    //                 if (!data_last_change_status_request[current_request_id])
    //                     data_last_change_status_request[current_request_id] = {
    //                         date: date_current_request_id,
    //                         id: log_current_request_id
    //                     }
    //
    //                 if (data_last_change_status_request[current_request_id].id < log_current_request_id) {
    //                     data_last_change_status_request.date = date_current_request_id;
    //                     data_last_change_status_request.id = log_current_request_id;
    //                 }
    //
    //             }
    //             cb(null)
    //         },
    //         setRequestWorks: cb => {
    //             let not_queue = true;
    //             let q = async.queue((task, cb) => {
    //                 async.series({
    //                     setStatus: cb => {
    //                         let o = {
    //                             command: 'modify',
    //                             object: 'request_work',
    //                             params: {
    //                                 id: task.id,
    //                                 status_request_work_id: closed_status_id,
    //                                 is_archived: true
    //                             }
    //                         }
    //                         api(o, (err, res) => {
    //                             if (err) return cb(err)
    //                             cb(null)
    //                         }, _t.user)
    //                     },
    //                     addLogStatus: cb => {
    //                         let o = {
    //                             command: 'add',
    //                             object: 'log_status_change_request_work',
    //                             params: {
    //                                 request_work_id: task.id,
    //                                 status_request_work_for_request_work_id: closed_status_id
    //                             }
    //                         }
    //                         api(o, (err, res) => {
    //                             if (err) return cb(err)
    //                             cb(null)
    //                         }, _t.user)
    //                     }
    //                 }, (err, res) => {
    //                     if (err) return cb(err)
    //                     cb(null)
    //                 })
    //             }, 2);
    //             q.drain = () => { cb(null) };
    //             for (let i in data_last_change_status_request) {
    //                 let unix_time_change = moment(data_last_change_status_request[i].date, 'DD.MM.YYYY HH:mm:ss').unix()
    //                 let unix_time_now = moment().unix();
    //                 let diff = unix_time_now - unix_time_change;
    //                 if (diff > _t.X) {
    //                     not_queue = false
    //                     q.push({id: i}, err => {
    //                         if (err) cb(err)
    //                     });
    //                 }
    //             };
    //             if (not_queue) return cb(null)
    //             if (data_last_change_status_request.length == 0) return cb(null)
    //         }
    //     }, (err, res) => {
    //         if (err) return cb(err)
    //         cb(null)
    //     })
    // }

};

Model.prototype.autoClosedVisitAndParking = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;

}
///////////////////////////////

//Разовый скрипт, который првоеряет все заявки, кторые не архивные и делает их архивными, если позволяет статус (отклонена, закрыта)
Model.prototype.autoArchive = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;

    let request_work_for_archive_ids = []
    let request_work_not_is_archived_ids = []
    async.series({
        getRequestWorkIds: cb => {
            let o = {
                where: [
                    {key: 'is_archived', type: '=', val1: false, comparisonType: 'OR', group: 'group_archive'},
                    {key: 'is_archived', type: '!=', val1: true, comparisonType: 'OR',  group: 'group_archive'}
                ],
                collapseData: false,
                columns: ['id', 'is_archived', 'status_request_work_sysname'],
                limit: 9999999
            }
            _t.getPrototype(o, (err, res) => {
                if (err) return cb(new MyError('Не удалось получить заявки', {err: err, o: o}))
                request_work_for_archive_ids = res.filter(res_i => {
                    return res_i.status_request_work_sysname === 'CLOSED' || res_i.status_request_work_sysname === 'DENIED'
                }).map(res_i => {
                    return res_i.id
                })
                return cb(null)
            })
        },
        formationIdsForArchive: cb => {
            let count = 0
            async.eachSeries(request_work_for_archive_ids, (id, cb) => {
                count++
                let o = {
                    id: id,
                    is_archived: true
                }
                _t.modify(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось архивировать заявку'))
                    return cb(null)
                })
            }, cb)
        }
    }, (err, res) => {
        if (err) return cb(err)
        return cb(null, new UserOk('Ок'));
    })
};



//Выгрузка данных таблицы заявок с комментариями и историей.
Model.prototype.export_to_excel = function (obj, cb) {

    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;

    // Получить данные
    // Сохранить в excel

    var name = (((_t.class_profile.name_ru)? _t.class_profile.name_ru.substr(0,20) : _t.class_profile.name.substr(0,20)) || 'file')+'_'+moment().format('DDMMYYYY_HHmm')+'.xlsx';
    var fileName = 'savedFiles/'+name;
    //var fileName = config.root_public+'reports/' + file_name + '.json';


    var class_fields_profile = obj.class_fields_profile || _t.class_fields_profile;

    //Добавим профайл для виртуального comments_str и history_str

    let cloned_profile_1 = funcs.cloneObj(class_fields_profile.request)
    let cloned_profile_2 = funcs.cloneObj(class_fields_profile.request)

    class_fields_profile.comments_str = cloned_profile_1;
    class_fields_profile.history_str = cloned_profile_2;

    class_fields_profile.comments_str.name = 'Комментарии';
    class_fields_profile.history_str.name = 'История';

    console.log(class_fields_profile);

    var data, data_columns, extra_data;
    var excel;
    var offset = (!isNaN(+obj.start_no))? obj.start_no - 1 : 0;
    async.series({
        getData:function(cb){
            if (obj.data){ // Передан res. При этом collapseData = false в основном запросе на данные. Это нужно чтобы был профайл.
                data_columns = obj.data.data_columns;
                extra_data = obj.data.extra_data;
                data = funcs.jsonToObj(obj.data);
                return cb(null);
            }

            var params = {
                where:obj.where,
                sort:obj.sort,
                offset:offset,
                limit:obj.limit,
                use_cache:false,
                doNotLog:true
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить данные',{params : params, err : err}));

                data_columns = res.data_columns;
                extra_data = res.extra_data;

                data_columns.push('comments_str')
                data_columns.push('history_str')

                data = funcs.jsonToObj(res);

                cb(null);
            });
        },
        getComments: function(cb){

            async.eachSeries(data, (record, cb) => {

                let all_comments_by_record = '';

                let o = {
                    command: 'get',
                    object: 'request_work_comment',
                    params: {
                        where: [{
                            key: 'request_work_id',
                            val1: record.id
                        }],
                        collapseData: false
                    }
                }

                _t.api(o, function(err,res){

                    if(err) return cb(new MyError('Не удалось получить комментарии по заявке.'));

                    for(let i in res){

                        all_comments_by_record += res[i].created_by_user_fio + ': ' + (res[i].text == '' ? 'Прикрепленный документ.' : res[i].text.replace('Дата комментария: ', '').replace('<br>', '')) + ' ;\n';
                    }

                    record.comments_str = all_comments_by_record

                    cb(null)

                })

            },cb);

        },
        getHistory: function(cb){

            async.eachSeries(data, (record, cb) => {

                let all_history_by_record = '';

                let trackedColumns = {
                    columns: [
                        'created',
                        'status_request_work',
                        'executor_organization',
                        'executor_user',
                    ],
                    columns_name_ru: [
                        'Дата',
                        'Статус',
                        'Исполнительная организация',
                        'Исполнитель',
                    ]
                    // columns: ['request', 'paid', 'status_request_work', 'timeliness_for_request_work', 'location_description']
                }

                let o = {
                    command: 'getHistory',
                    object: 'request_work',
                    params: {
                        id: record.id,
                        trackedColumns: trackedColumns,
                        collapseData: false
                    }
                }

                _t.api(o, function(err,res){

                    if(err) return cb(new MyError('Не удалось получить историю по заявке.'));

                    let h_data = res.data.map(function(item) {
                        let text = '';
                        for (let i in item.fields) {
                            if ( trackedColumns.columns.indexOf(item.fields[i].column_name) == -1 ) continue
                            // columns
                            // text += item.fields[i].ru_filed + ': ' + item.fields[i].value + '<br>'
                            text += item.fields[i].name + ': ' + item.fields[i].value_ru + ';'
                        }

                        // text = text.replace('undefined', '')
                        let ret = {
                            created: item.created,
                            created_by_user: item.created_by_user,
                            text: text,
                            visible_client: true,
                        }
                        return ret
                    })


                    for(let i in h_data){

                        all_history_by_record += h_data[i].text + '\n';
                    }

                    record.history_str = all_history_by_record

                    cb(null)

                })

            },cb);

        },
        toExcel:function(cb){
            excel = new ToExcel({name:name});
            excel.addWorksheet({});
            async.series({
                addColumns:function(cb){
                    var columns = [];
                    for (var i in data_columns) {
                        if (!class_fields_profile[data_columns[i]].visible) {
                            continue;
                        }
                        columns.push({
                            header:class_fields_profile[data_columns[i]].name_ru || class_fields_profile[data_columns[i]].name || data_columns[i],
                            key:data_columns[i]
                        });
                    }

                    columns.forEach(column => {
                        column.width = column.header.length < 12 ? 12 : column.header.length
                    })

                    excel.setColumns({columns:columns});
                    return cb(null);
                },
                addRows:function(cb){
                    var rows = [];
                    for (var i in data) {
                        var row = data[i];
                        var newRow = [];

                        for (var j in row) {
                            var profile = class_fields_profile[j];
                            if (!profile.visible) continue;

                            if(row[j] === true) row[j] = 'Да';
                            if(row[j] === false) row[j] = 'Нет';

                            newRow.push(row[j]);

                        }
                        rows.push(newRow);
                    }
                    excel.worksheet.addRows(rows);
                    return cb(null);
                    // excel.setColumns({columns:columns});
                    // return cb(null);
                },
                save:function(cb){
                    //writeFile
                    excel.writeFile({}, cb)
                }
            }, function(err, res){
                if (err) return cb(err);
                return cb(null, res.save)
            });
        }
    },function (err, res) {
        if (err) return cb(err);
        cb(null, res.toExcel);
    });
};


Model.prototype.exampleGet = function (obj, cb) {
    if (arguments.length == 1) {
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
    if (arguments.length == 1) {
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
