/**
 * Created by iig on 29.10.2015.
 */
var MyError = require('../error').MyError
var UserError = require('../error').UserError
var UserOk = require('../error').UserOk
var BasicClass = require('./system/BasicClass')
var util = require('util')
var async = require('async')
var rollback = require('../modules/rollback')
var crypto = require('crypto')
var funcs = require('../libs/functions')
var api = require('../libs/api')
const initRoleModel = require('../libs/role_model').init
// const role_model_funcs = require('../libs/role_model/role_model.functions')
var guid = require('guid')

const generatorPassword = require('generate-password').generate

var admin_users = ['ivantgco@gmail.com', 'alextgco@gmail.com', 'maparilov@gmail.com']

var Model = function(obj) {
    this.name = obj.name
    this.tableName = obj.name.toLowerCase()
    var _t = this

    // this.role_models = {}
    //
    //
    //
    //
    //
    // this.role_model = (role_model && typeof role_model === 'object') ? role_model : {}
    // if (!this.role_model.methods || typeof this.role_model.methods !== 'object') this.role_model.methods = {}
    //
    // this.role_model.checkParam = (obj, cb) => {
    //     obj = funcs.cloneObj(obj, 10)
    //     var role_model = this.role_model
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

    var basicclass = BasicClass.call(this, obj)
    if (basicclass instanceof MyError) return basicclass
}
util.inherits(Model, BasicClass)
Model.prototype.addPrototype = Model.prototype.add
Model.prototype.modifyPrototype = Model.prototype.modify
Model.prototype.removeCascade = Model.prototype.remove
Model.prototype.apiPrototype = Model.prototype.api

Model.prototype.getForSelectPrototype = Model.prototype.getForSelect


// Model.prototype.api2 = function (o, cb, user) { // Почему то обычный api не срабатывает для checkAccess (теряется user)
//     api(o, cb, this);
// };

Model.prototype.apiPrototype = api

Model.prototype.api = function(o, cb) { // Почему то обычный api не срабатывает для checkAccess (теряется user)
    if (this.user.user) {
        this.apiPrototype(o, cb, this.user)
    } else {
        this.apiPrototype(o, cb, this)
    }

}


Model.prototype.init = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this
    Model.super_.prototype.init.apply(this, [obj, function(err) {
        cb(null)
    }])
}


Model.prototype.load = function(sid, cb) {
    if (typeof cb !== 'function') throw new MyError('В User load не передан cb')
    if (typeof sid !== 'string') return cb(new MyError('Не коректно передан sid'))
    var _t = this
    //if (_t.user) {
    //    if (_t.user.sid == sid) return cb(null);
    //    process.exit();
    //}
    _t.sid = sid
    _t.get({
        use_cache: false,
        collapseData: false,
        doNotCheckList: true,
        param_where: {
            sid: sid,
            status_sysname: 'ACTIVE'
        }
    }, function(err, res) {
        if (err) {
            _t.roleModel = undefined
            return cb(err)
        }
        _t.authorized = !!res.length
        _t.user_data = res[0]

        if (_t.sid && !_t.roleModel) {
            // console.log('BEFORE')
            _t.roleModel = initRoleModel({user:_t})
            // console.log('AFTER')
        }


        // if (_t.sid && !_t.role_models[_t.sid]){
        //     _t.role_models[_t.sid] = initRoleModel({user:_t})
        //     console.log('Object.keys(_t.role_models)',Object.keys(_t.role_models))
        //     const m = _t.role_models[_t.sid]
        // }

        // Object.keys(_t.role_model.methods).forEach(key=>{
        //     if (typeof _t.role_model.methods[key] !== "function") return;
        //     _t.role_model.methods[key] = _t.role_model.methods[key].bind(_t);
        // });
        cb(null)
    })
}
Model.prototype.loadOldSiteUser = function(sid, cb) {
    if (typeof cb !== 'function') throw new MyError('В User load не передан cb')
    if (typeof sid !== 'string') return cb(new MyError('Не коректно передан sid'))
    var _t = this
    //if (_t.user) {
    //    if (_t.user.sid == sid) return cb(null);
    //    process.exit();
    //}
    _t.sid = sid

    async.series({
        getMain: function(cb) {
            _t.get({
                collapseData: false,
                param_where: {
                    sid: sid,
                    status_sysname: 'ACTIVE'
                }
            }, function(err, res) {
                if (err) return cb(err)
                _t.authorized = !!res.length
                _t.user_data = res[0]
                console.log('===============LOAD===========', sid, (_t.user_data) ? _t.user_data.email : 'НЕТ ПОЛЬЗОВАТЕЛЯ')
                cb(null)
            })
        },
        getSiteUser: function(cb) {
            // return cb(null);
            if (_t.authorized) return cb(null)
            var user_site
            var o = {
                command: 'get',
                object: 'user_site',
                params: {
                    param_where: {
                        sid: sid
                    },
                    collapseData: false
                }
            }
            _t.api(o, function(err, res) {
                if (err) return cb(new MyError('Не удалось получить user_site по sid', {o: o, err: err}))
                if (res.length > 1) {
                    return cb(new MyError('Слишком много user_site с одним и тем же sid. ' +
                        'Вероятно запущенно две системы типа SITE. Используйте разных пользователей системы.', {
                        o: o,
                        res: res
                    }))
                }
                if (!res.length) return cb(null)
                user_site = res[0]

                // _t.authorized = !!res.length;
                // _t.user_data = res[0];
                // return cb(null);


                var params = {
                    param_where: {
                        id: user_site.user_id
                    },
                    collapseData: false
                }
                _t.get(params, function(err, res) {
                    if (err) return cb(new MyError('Не удалось получить пользователя на основе user_site.', {
                        params: params,
                        err: err
                    }))
                    _t.authorized = !!res.length
                    _t.user_data = res[0]
                    _t.user_data.sid = user_site.sid
                    cb(null)
                })
            })

        }
    }, cb)
}

Model.prototype.loadSysUser = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this
    if (obj.fromClient) return cb(new MyError('Системный пользователь не может быть загружен с клиента.'))
    _t.authorized = true
    _t.is_sys = true
    _t.user_data = {
        sid: 'sysuserSID',
        id: 0
    }
    _t.socket = {
        emit: function(name, params) {
            console.log('Sys_user emit', name, params)
        }
    }
    return cb(null)
}
/**
 * Авторизирует и загружает пользователя типа SITE по параметрe site
 * @param obj
 * @param cb
 * @returns {*}
 */
Model.prototype.loadSiteUser = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this
    var site = obj.site
    if (!site) return cb(new MyError('Не передан параметр site'))
    _t.get({
        collapseData: false,
        param_where: {
            email: site,
            user_type_sysname: 'SITE',
            status_sysname: 'ACTIVE'
        }
    }, function(err, res) {
        if (err) return cb(err)
        if (!res.length) return cb(new MyError('Пользователь не найден'))
        _t.authorized = !!res.length
        _t.user_data = res[0]
        cb(null)
    })
}
Model.prototype.encryptPassword = function(password) {
    var salt = Math.random() + ''
    return {
        hashedPassword: crypto.createHmac('sha1', salt).update(password).digest('hex'),
        salt: salt
    }
}
Model.prototype.checkPassword = function(salt, password, hashedPassword) {
    if (!salt || !password || !hashedPassword) throw new MyError('Не переданы необходимые параметры')
    var pass = crypto.createHmac('sha1', salt).update(password).digest('hex')
    return pass === hashedPassword
}
Model.prototype.add = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'))
    var _t = this
    var password = (obj.fromClient) ? obj.password : funcs.guid()
    if (!password) {
        return cb(new UserError('Please, specify password.'))
    }


    var passObj = _t.encryptPassword(password)
    obj.hashedPassword = passObj.hashedPassword
    obj.salt = passObj.salt
    delete obj.password
    var user_type
    let user_id
    let user
    var addPrototypeRes
    async.series([
        function(cb) {
            // Проверим доступ на добавление пользователей
            if (admin_users.indexOf(_t.user.user_data.email) == -1) return cb(new UserError('You have no permissions to add new user, please, contact administrator alextgco@gmail.com.'))
            cb(null)
        },
        function(cb) {
            // Получим тип пользователя
            var o = {
                command: 'get',
                object: 'user_type',
                params: {
                    param_where: {
                        id: obj.user_type_id
                    },
                    collapseData: false
                }
            }
            _t.api(o, function(err, res) {
                if (err) return err
                if (!res.length) return cb(new MyError('В справочнике user_type нет типа с id  ' + obj.user_type_id))
                user_type = res[0]
                cb(null)
            })
        },
        function(cb) {
            // Выполним проверки
            if (user_type.sysname === 'SITE') {
                obj.firstname = obj.firstname || obj.email
                obj.lastname = password
            }
            cb(null)
        },
        function(cb) {
            // получим ID нужного статуса - WAIT_CONFIRM/ACTIVE

            var status = obj.status_sysname || 'WAIT_CONFIRM'
            // var status = obj.status_sysname || 'ACTIVE';
            var o = {
                command: 'get',
                object: 'user_status',
                params: {
                    where: [{
                        key: 'sysname',
                        val1: status
                    }],
                    collapseData: false,
                    columns: ['id']
                }
            }
            _t.api(o, function(err, res) {
                if (err) return err
                if (typeof res !== 'object') {
                    return cb(new MyError('Произошла ошибка при попытке получить id статуса из справочника user_status. Результат не является объектом'))
                }
                if (!res.length) {
                    return cb(new MyError('В справочнике user_status нет статуса ' + status))
                }
                obj.status_id = res[0].id
                cb(null)
            })
        },
        function(cb) {
            // выполним добавление
            obj.fromClient = false
            obj.email_notification = obj.email
            _t.addPrototype(obj, (err, res) => {
                if (err) return cb(err)
                addPrototypeRes = res
                cb(null)
            })
        },
        function(cb) {
            //отправим уведомление пользователю на почту
            let EventNotification = require('../modules/handlerNotificationToMail')
            let n = new EventNotification({
                object: 'user',
                object_id: addPrototypeRes.id,
                event: {
                    name: 'add_user',
                },
                params: {
                    login: obj.email,
                    password: password,
                    email_notification: obj.email
                }
            }, res => {
            })
            cb(null)
        }
    ], (err, res) => {
        if (err) return cb(err)
        cb(null, addPrototypeRes)
    })

}
Model.prototype.modify = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'))
    var _t = this

    // var password = obj.password;
    var password = (obj.fromClient) ? obj.password : undefined
    var user = _t.user

    var passObj

    var res_modifyPrototype

    if (password) {
        passObj = _t.encryptPassword(password)
        obj.hashedPassword = passObj.hashedPassword
        obj.salt = passObj.salt
        delete obj.password
    }

    async.series([
        function(cb) {
            // удалим login
            delete obj.login
            cb(null)
        },
        function(cb) {
            // Если устанавливается новый пароль то проверим доступ и добавим fromClient = false
            if (!password) return cb(null)
            if (obj.id !== user.user_data.id && admin_users.indexOf(user.user_data.email) == -1) return cb(new UserError('You do not have permission to change the password for this user.')) //У вас нет доступа на изменение пароля для данного пользователя.
            obj.fromClient = false
            cb(null)
        },
        function(cb) {
            // выполним изменения
            _t.modifyPrototype(obj, function(err, res) {
                if (err) return cb(err)
                res_modifyPrototype = res
                cb(null)
            })
        }
    ], function(err, res) {
        if (err) return cb(err)
        cb(null, res_modifyPrototype)
    })

}
Model.prototype.changePassword = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'))
    var _t = this

    var password = obj.password
    var new_password = obj.new_password
    if (!password) return cb(new UserError('Please, specify your current password'))
    if (!new_password) return cb(new UserError('Please, specify new password'))
    var user = _t.user
    var passObj

    // Проверить старый пароль
    // Установить новый пароль

    passObj = _t.encryptPassword(new_password)
    obj.hashedPassword = passObj.hashedPassword
    obj.salt = passObj.salt


    async.series([
        function(cb) {
            // Сверим пароль
            var confirm = _t.checkPassword(user.user_data.salt, password, user.user_data.hashedPassword)
            if (!confirm) return cb(new UserError('Wrong current password.'))
            cb(null)
        },
        function(cb) {
            // выполним изменения
            var params = {
                id: user.user_data.id,
                hashedPassword: passObj.hashedPassword,
                salt: passObj.salt,
                fromClient: false
            }
            _t.modify(params, cb)
        }
    ], function(err) {
        if (err) return cb(err)
        cb(null, new UserOk('Password was successfuly .'))
    })

}
Model.prototype.confirmUser = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'))
    var _t = this
    if (!obj.id) {
        return cb(new MyError('Не передан пользователь.'))
    }
    async.series([
        function(cb) {
            // получим ID нужного статуса - ACTIVE

            var status = 'ACTIVE'
            var o = {
                command: 'get',
                object: 'user_status',
                params: {
                    where: [{
                        key: 'sysname',
                        val1: status
                    }],
                    collapseData: false,
                    columns: ['id']
                }
            }
            _t.api(o, function(err, res) {
                if (err) return err
                if (typeof res !== 'object') {
                    return cb(new MyError('Произошла ошибка при попытке получить id статуса из справочника user_status. Результат не является объектом'))
                }
                if (!res.length) {
                    return cb(new MyError('В справочнике user_status нет статуса ' + status))
                }
                obj.status_id = res[0].id
                cb(null)
            })
        },
        function(cb) {
            // выполним изменение
            var params = {
                id: obj.id,
                status_id: obj.status_id
            }
            _t.modify(params, cb)
        }
    ], function(err, res) {
        if (err) return cb(err)
        cb(null, res[1])
    })

}
Model.prototype.login = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'))
    var _t = this
    // console.log(_t, obj)
    var user = _t.user
    var login = obj.login
    var password = obj.password
    var sid = user.sid
    var rollback_key = obj.rollback_key || rollback.create()
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key
    if (!sid) return cb(new MyError('В метод не передан sid'))
    if (!login || !password) {
        return cb(new UserError('Please, specify login and password.'))
    }
    var data
    async.series([
        function(cb) {
            // Запросим данные по пользователю и сверим пароли
            _t.get({
                collapseData: false,
                // param_where: {
                //     email: login,
                //     status_sysname:'ACTIVE'
                // }
                where: [
                    {
                        key: 'email',
                        val1: login
                    },
                    {
                        key: 'status_sysname',
                        val1: 'ACTIVE'
                    },
                    {
                        key: 'user_type_sysname',
                        type: 'in',
                        val1: ['USER', 'SITE', 'ADMIN']
                    }
                ]
            }, function(err, res) {
                if (err) return cb(err)
                if (!res.length) return cb(new UserError('invalidAuthData'))
                data = res[0]
                cb(null)
            })
        },
        function(cb) {
            // Сверим пароль
            var confirm = _t.checkPassword(data.salt, password, data.hashedPassword)
            if (!confirm) return cb(new UserError('invalidAuthData'))
            cb(null)
            2
        },
        function(cb) {
            // очистить sid для пользователей с таким же сидом (устаревшая инфа)
            async.series({
                getUsersWithSameSid: function(cb) {
                    var params = {
                        columns: ['id', 'sid'],
                        param_where: {
                            sid: sid
                        },
                        collapseData: false
                    }
                    _t.get(params, function(err, res) {
                        if (err) return cb(new MyError('Не удалось получить пользователей с таким же сидом', {
                            params: params,
                            err: err
                        }))
                        async.eachSeries(res, function(item, cb) {
                            var params = {
                                id: item.id,
                                sid: null,
                                rollback_key: rollback_key
                            }
                            _t.modify(params, function(err, res) {
                                if (err) return cb(new MyError('Не удалось сбросить sid пользователя', {
                                    params: params,
                                    err: err
                                }))

                                cb(null)
                            })
                        }, cb)

                    })
                }
            }, cb)
            // async.waterfall([
            //     pool.getConn,
            //     function (conn, cb) {
            //         var sql = "UPDATE user set sid = NULL where sid = '"+ pool.escape(sid) +"'";
            //         conn.query(sql, function (err, res) {
            //             conn.release();
            //             return cb(err, res);
            //         });
            //     }
            // ],cb);
        },
        function(cb) {
            // Запишем sid в базу
            _t.modify({
                id: data.id,
                sid: sid,
                rollback_key: rollback_key
            }, cb)
        }
        // ,
        // function (cb) {
        //     cb(null);
        //
        //     setTimeout(() => {
        //         var o = {
        //             id: data.id,
        //             sid: sid,
        //             rollback_key: rollback_key
        //         };
        //
        //         _t.modify(o , (err, res)=>{
        //             if (err) console.error('Не удалось сохранить лог авторизации',{o:o, err:err});
        //         });
        //     }, 3000);
        //
        // }
    ], function(err) {
        if (err) {
            if (doNotSaveRollback) return cb(err)
            rollback.rollback({obj: obj, rollback_key: rollback_key, user: _t.user}, function(err2) {
                return cb(err, err2)
            })
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            cb(null, new UserOk('Успешная авторизация'))
        }
    })

}
Model.prototype.logout = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'))
    var _t = this
    var user = _t.user
    var sid = user.sid
    var io = global.io

    async.series([
        function(cb) {
            if (!user || !user.user_data) return cb(null)
            _t.modify({
                id: user.user_data.id,
                sid: null,
                user: user
            }, function(err) {
                if (err) return cb(err)
                cb(null, new UserOk('Вы успешно вышли из системы.'))
            })
        },
        function(cb) {
            var clients = io.sockets.clients()
            async.eachSeries(clients, function(client, cb) {
                if (!client.handshake) return cb(null)
                if (client.handshake.session.id != sid) return cb(null)
                loadSession(sid, function(err, session) {
                    if (err) {
                        return cb(new MyError('Во время логаута произошла ошибка', {err: err}))
                    }
                    if (session) {
                        session.destroy(function(err) {
                            if (err) return cb(new MyError('Во время логаута произошла ошибка 2', {err: err}))
                        })
                    } else {
                        cb(null)
                    }
                })
            }, cb)
        }
    ], function(err) {
        if (err) return cb(err)
        cb(null, new UserOk('Вы успешно вышли из системы.'))
        // client.emit("logout");
        // client.disconnect();
    })
}
Model.prototype.forgotPassword = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'))
    var _t = this

    if (!obj.hasOwnProperty('email')) return cb(new MyError('В метод не передам параметр email'))
    let email = obj.email
    let user_id_forgot
    let new_pass

    var user = _t.user
    var sid = user.sid
    var rollback_key = obj.rollback_key || rollback.create()
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key
    if (!sid) return cb(new MyError('В метод не передан sid'))
    async.series({
        //проверяет, есть ли пользовтаель в системе с таким email\login
        checkUser: cb => {
            let o = {
                param_where: {
                    email: email
                },
                collapseData: false,
                columns: ['id', 'email']
            }
            _t.get(o, (err, res) => {
                if (err) return cb(new MyError('Не удалось получить пользователя по указанным параметрам', {
                    err: err,
                    o: o
                }))
                if (res.length === 0) return cb(new UserError('Пользователя с таким email/login не существует'))
                user_id_forgot = res[0].id
                return cb(null)
            })
        },
        generateRandPassword: cb => {
            let new_guid = guid.create()
            let short_guid = new_guid.toString().substr(0, 5)
            let passObj

            new_pass = short_guid

            passObj = _t.encryptPassword(new_pass)

            var params = {
                id: user_id_forgot,
                hashedPassword: passObj.hashedPassword,
                salt: passObj.salt,
                fromClient: false
            }

            _t.modifyPrototype(params, (err, res) => {
                if (err) return cb(new UserError('Не удалось установить новый пароль', {err: err, o: o}))
                return cb(null)
            })

        },
        notificationAboutNewPassword: cb => {
            //отправим уведомление пользователю на почту
            cb(null)
            let EventNotification = require('../modules/handlerNotificationToMail')
            let n = new EventNotification({
                object: 'user',
                object_id: user_id_forgot,
                event: {
                    name: 'set_new_password',
                },
                params: {
                    password: new_pass,
                    email: email
                }
            }, res => {
            })
        }
    }, (err, res) => {
        if (err) {
            cb(err)
        } else {
            cb(null, new UserOk('Новый пароль выслан на почту'))
        }
    })
}

Model.prototype.logoutOldSiteUser = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы параметры'))
    var _t = this
    var user = _t.user
    var sid = user.sid
    var io = global.io
    let userTypeSysname = user.user_data.user_type_sysname
    async.series({
        logoutMain: function(cb) {
            if (userTypeSysname !== 'USER') return cb(null)
            _t.modify({
                id: user.user_data.id,
                sid: null
            }, function(err) {
                if (err) return cb(err)

                //io.sockets.$emit('session:logout',sid);
                global.logout({sid: sid, user: _t.user}, function(err) {
                    var alias = 'User_-_' + sid
                    delete _t.user.user_data
                    delete global.classes[alias]
                    cb(null, new UserOk('Вы успешно вышли из системы.'))
                })

            })
        },
        logoutSITE: function(cb) {

            if (userTypeSysname !== 'SITE') return cb(null)
            // Получим всех по id
            // Удалим записи с sid
            // Если больше нету, вызовем global.logout --- Пока не делаем
            var users_site
            async.series({
                get: function(cb) {
                    var o = {
                        command: 'get',
                        object: 'user_site',
                        params: {
                            param_where: {
                                user_id: user.user_data.id
                            },
                            collapseData: false
                        }
                    }
                    _t.api(o, function(err, res) {
                        if (err) return cb(new MyError('Не удалось получить user_site по user id', {o: o, err: err}))
                        users_site = res
                        cb(null)
                    })
                },
                remove: function(cb) {
                    if (!users_site.length) return cb(null)
                    async.eachSeries(users_site, function(one_site_user, cb) {
                        var o = {
                            command: 'remove',
                            object: 'user_site',
                            params: {
                                id: one_site_user.id,
                                physical: true
                            }
                        }
                        _t.api(o, function(err, res) {
                            if (err) return cb(new MyError('Не удалось удалить sid пользователя сайта', {
                                o: o,
                                err: err
                            }))
                            cb(null)
                        })
                    }, cb)
                }

            }, cb)
        }
    }, cb)


    /*async.series([
        function (cb) {
            _t.modify({
                id:user.user_data.id,
                sid:null,
                user:user
            }, function (err) {
                if (err) return cb(err);
                cb(null, new UserOk('Вы успешно вышли из системы.'));
            });
        },
        function (cb) {
            var clients = io.sockets.clients();
            async.eachSeries(clients, function (client, cb) {
                if (client.handshake.session.id != sid) return cb(null);
                loadSession(sid, function (err, session) {
                    if (err) {
                        return cb(new MyError('Во время логаута произошла ошибка',{err:err}));
                    }
                    if (session) {
                        session.destroy(function (err) {
                            if (err) return cb(new MyError('Во время логаута произошла ошибка 2',{err:err}));
                        });
                    }else{
                        cb(null);
                    }
                });
            }, cb);
        }
    ], function (err) {
        if (err) return cb(err);
        cb(null, new UserOk('Вы успешно вышли из системы.'));
        client.emit("logout");
        client.disconnect();
    });*/
}

// var o = {
//     command:'toggleConsoleLog',
//     object:'User',
//     params:{
//     }
// };
// socketQuery(o, function(r){
//     console.log(r);
// });
Model.prototype.toggleConsoleLog = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    if (['ivantgco@gmail.com', 'alextgco@gmail.com'].indexOf(_t.user.user_data.email) === -1) return cb(new UserError('Запрещено'))

    global.consoleLog = (global.consoleLog) ? false : _t.user.user_data.id
    // Переопределим консоль лог
    if (global.consoleLog) {
        console.log = function() {

            console.logPrototype(arguments)
            _t.user.socket.emit('log', arguments)
        }
    } else {
        console.log = console.logPrototype
    }
    if (global.consoleLog) cb(null, new UserOk('Консоль будет выводится для пользователя ' + global.consoleLog))
    else cb(null, new UserOk('Вывод консоли для пользователя отключен.'))
}

// var o = {
//     command:'load_access',
//     object:'User',
//     params:{
//         id:25
//     }
// };
// socketQuery(o, function(r){
//     console.log(r);
// })

Model.prototype.loadAccess = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    // return cb(null);
    if (!_t.authorized) return cb(new UserError('noAuth'))
    if (obj.fromClient) return cb(new MyError('Запрещено!'))

    var id = _t.user_data.id
    if (isNaN(+id)) return cb(new MyError('Не передан id', {obj: obj}))

    let access_to_operation
    let access_list = {}
    var user_role
    async.series({
        loadFromRoles: function(cb) {
            // return cb(null);
            async.series({
                getRole: function(cb) {
                    var o = {
                        command: 'get',
                        object: 'user_role',
                        params: {
                            param_where: {
                                user_id: id,
                                is_active: true
                            },
                            collapseData: false
                        }
                    }
                    _t.api(o, function(err, res) {
                        if (err) return cb(new MyError('Не удалось получить user_role', {o: o, err: err}))
                        user_role = res
                        cb(null)
                    })
                },
                applyRoles: function(cb) {
                    async.eachSeries(user_role, function(one_user_role, cb) {
                        async.series({
                            getAccesses: function(cb) {

                                var o = {
                                    command: 'get',
                                    object: 'access_to_operation',
                                    params: {
                                        columns: ['id', 'user_id', 'parent_id', 'name', 'class_id', 'class', 'is_access', 'is_access_by_list', 'is_denied', 'class_operation_id', 'server_parent_table', 'server_parent_key'],
                                        param_where: {
                                            user_id: one_user_role.role_user_id
                                        },
                                        limit: 100000000000,
                                        collapseData: false
                                    }
                                }
                                _t.api(o, function(err, res) {
                                    if (err) return cb(new MyError('Не удалось получить access_to_operation', {
                                        o: o,
                                        err: err
                                    }))
                                    access_to_operation = res || []
                                    cb(null)
                                })
                            },
                            compileAccessList: function(cb) {

                                var oper_groups = {}
                                for (var i in access_to_operation) {
                                    let row = access_to_operation[i]
                                    if (row.name !== '*') {
                                        if (!row.parent_id) continue
                                        if (!oper_groups[row.parent_id]) oper_groups[row.parent_id] = []
                                        oper_groups[row.parent_id].push(row)
                                    } else {
                                        row.class = row.class.toLowerCase()
                                        row.class = row.class.charAt(0).toUpperCase() + row.class.substr(1)
                                        // access_list[row.class] = row;
                                        if (!access_list[row.class]) {
                                            access_list[row.class] = row
                                            if (row.is_access) { // Если доступ еще не был выдан, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                                access_list[row.class].access_by_user_id = row.user_id
                                            }
                                            if (row.is_access_by_list) { // Если доступ еще не был выдан ПО СПИСКУ, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                                access_list[row.class].access_by_list_by_user_id = row.user_id
                                            }
                                            if (row.is_denied) { // Если доступ еще не был закрыт, но сейчас будет, укажем пользователя (роль), которым он закрыт
                                                access_list[row.class].denied_by_user_id = row.user_id
                                            }
                                        } else {

                                            if (!access_list[row.class].ids) access_list[row.class].ids = [access_list[row.class].id]
                                            access_list[row.class].ids.push(row.id)

                                            if (!access_list[row.class].is_access && row.is_access) { // Если доступ еще не был выдан, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                                access_list[row.class].access_by_user_id = row.user_id
                                            }
                                            access_list[row.class].is_access = !!(access_list[row.class].is_access || row.is_access)

                                            if (!access_list[row.class].is_access_by_list && row.is_access_by_list) { // Если доступ еще не был выдан ПО СПИСКУ, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                                access_list[row.class].access_by_list_by_user_id = row.user_id
                                            }
                                            access_list[row.class].is_access_by_list = !!(access_list[row.class].is_access_by_list || row.is_access_by_list)

                                            if (!access_list[row.class].is_denied && row.is_denied) { // Если доступ еще не был закрыт, но сейчас будет, укажем пользователя (роль), которым он закрыт
                                                access_list[row.class].denied_by_user_id = row.user_id
                                            }
                                            access_list[row.class].is_denied = !!(access_list[row.class].is_denied || row.is_denied)
                                        }
                                    }
                                }

                                for (var j in access_list) {
                                    access_list[j].operations = access_list[j].operations || {}
                                    // if (!oper_groups[access_list[j].id]) continue;
                                    if (!oper_groups[access_list[j].class_operation_id]) continue
                                    for (var k in oper_groups[access_list[j].class_operation_id]) {
                                        var item = oper_groups[access_list[j].class_operation_id][k]
                                        // access_list[j].operations[item.name] = item;

                                        if (!access_list[j].operations[item.name]) {
                                            access_list[j].operations[item.name] = item

                                            if (item.is_access) { // Если доступ еще не был выдан, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                                access_list[j].operations[item.name].access_by_user_id = item.user_id
                                            }
                                            if (item.is_access_by_list) { // Если доступ еще не был выдан ПО СПИСКУ, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                                access_list[j].operations[item.name].access_by_list_by_user_id = item.user_id
                                            }
                                            if (item.is_denied) { // Если доступ еще не был закрыт, но сейчас будет, укажем пользователя (роль), которым он закрыт
                                                access_list[j].operations[item.name].denied_by_user_id = item.user_id
                                            }
                                        } else {

                                            if (!access_list[j].operations[item.name].ids) access_list[j].operations[item.name].ids = [access_list[j].operations[item.name].id]
                                            access_list[j].operations[item.name].ids.push(item.id)

                                            if (!access_list[j].operations[item.name].is_access && item.is_access) { // Если доступ еще не был выдан, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                                access_list[j].operations[item.name].access_by_user_id = item.user_id
                                            }
                                            access_list[j].operations[item.name].is_access = !!(access_list[j].operations[item.name].is_access || item.is_access)

                                            if (!access_list[j].operations[item.name].is_access_by_list && item.is_access_by_list) { // Если доступ еще не был выдан ПО СПИСКУ, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                                access_list[j].operations[item.name].access_by_list_by_user_id = item.user_id
                                            }
                                            access_list[j].operations[item.name].is_access_by_list = !!(access_list[j].operations[item.name].is_access_by_list || item.is_access_by_list)

                                            if (!access_list[j].operations[item.name].is_denied && item.is_denied) { // Если доступ еще не был закрыт, но сейчас будет, укажем пользователя (роль), которым он закрыт
                                                access_list[j].operations[item.name].denied_by_user_id = item.user_id
                                            }
                                            access_list[j].operations[item.name].is_denied = !!(access_list[j].operations[item.name].is_denied || item.is_denied)
                                        }

                                    }
                                }

                                return cb(null)
                            }
                        }, cb)
                    }, cb)
                }
            }, function(err, res) {
                // console.log('TEST', access_list);
                // async.series({}, cb);
                cb(err)
            })
        },
        loadFromUser: function(cb) {
            async.series({
                getAccesses: function(cb) {

                    var o = {
                        command: 'get',
                        object: 'access_to_operation',
                        params: {
                            // doNotCheckList:true,
                            columns: ['id', 'user_id', 'parent_id', 'name', 'class_id', 'class', 'is_access', 'is_access_by_list', 'is_denied', 'class_operation_id', 'server_parent_table', 'server_parent_key'],
                            param_where: {
                                user_id: id
                            },
                            limit: 100000000000,
                            collapseData: false
                        }
                    }
                    _t.api(o, function(err, res) {
                        if (err) return cb(new MyError('Не удалось получить access_to_operation', {o: o, err: err}))
                        access_to_operation = res || []
                        cb(null)
                    })
                },

                compileAccessList: function(cb) {

                    var oper_groups = {}
                    for (var i in access_to_operation) {
                        let row = access_to_operation[i]
                        if (row.name !== '*') {
                            if (!row.parent_id) continue
                            if (!oper_groups[row.parent_id]) oper_groups[row.parent_id] = []
                            oper_groups[row.parent_id].push(row)
                        } else {
                            row.class = row.class.toLowerCase()
                            row.class = row.class.charAt(0).toUpperCase() + row.class.substr(1)
                            // access_list[row.class] = row;
                            if (!access_list[row.class]) {
                                access_list[row.class] = row
                                if (row.is_access) { // Если доступ еще не был выдан, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                    access_list[row.class].access_by_user_id = row.user_id
                                }
                                if (row.is_access_by_list) { // Если доступ еще не был выдан ПО СПИСКУ, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                    access_list[row.class].access_by_list_by_user_id = row.user_id
                                }
                                if (row.is_denied) { // Если доступ еще не был закрыт, но сейчас будет, укажем пользователя (роль), которым он закрыт
                                    access_list[row.class].denied_by_user_id = row.user_id
                                }
                            } else {

                                if (!access_list[row.class].ids) access_list[row.class].ids = [access_list[row.class].id]
                                access_list[row.class].ids.push(row.id)

                                if (!access_list[row.class].is_access && row.is_access) { // Если доступ еще не был выдан, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                    access_list[row.class].access_by_user_id = row.user_id
                                }
                                access_list[row.class].is_access = !!(access_list[row.class].is_access || row.is_access)

                                if (!access_list[row.class].is_access_by_list && row.is_access_by_list) { // Если доступ еще не был выдан ПО СПИСКУ, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                    access_list[row.class].access_by_list_by_user_id = row.user_id
                                }
                                access_list[row.class].is_access_by_list = !!(access_list[row.class].is_access_by_list || row.is_access_by_list)

                                if (!access_list[row.class].is_denied && row.is_denied) { // Если доступ еще не был закрыт, но сейчас будет, укажем пользователя (роль), которым он закрыт
                                    access_list[row.class].denied_by_user_id = row.user_id
                                }
                                access_list[row.class].is_denied = !!(access_list[row.class].is_denied || row.is_denied)
                            }
                        }
                    }

                    for (var j in access_list) {
                        access_list[j].operations = access_list[j].operations || {}
                        // if (!oper_groups[access_list[j].id]) continue;
                        if (!oper_groups[access_list[j].class_operation_id]) continue
                        for (var k in oper_groups[access_list[j].class_operation_id]) {
                            var item = oper_groups[access_list[j].class_operation_id][k]
                            // access_list[j].operations[item.name] = item;

                            if (!access_list[j].operations[item.name]) {
                                access_list[j].operations[item.name] = item
                                if (item.is_access) { // Если доступ еще не был выдан, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                    access_list[j].operations[item.name].access_by_user_id = item.user_id
                                }
                                if (item.is_access_by_list) { // Если доступ еще не был выдан ПО СПИСКУ, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                    access_list[j].operations[item.name].access_by_list_by_user_id = item.user_id
                                }
                                if (item.is_denied) { // Если доступ еще не был закрыт, но сейчас будет, укажем пользователя (роль), которым он закрыт
                                    access_list[j].operations[item.name].denied_by_user_id = item.user_id
                                }
                            } else {

                                if (!access_list[j].operations[item.name].ids) access_list[j].operations[item.name].ids = [access_list[j].operations[item.name].id]
                                access_list[j].operations[item.name].ids.push(item.id)

                                if (!access_list[j].operations[item.name].is_access && item.is_access) { // Если доступ еще не был выдан, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                    access_list[j].operations[item.name].access_by_user_id = item.user_id
                                }
                                access_list[j].operations[item.name].is_access = !!(access_list[j].operations[item.name].is_access || item.is_access)

                                if (!access_list[j].operations[item.name].is_access_by_list && item.is_access_by_list) { // Если доступ еще не был выдан ПО СПИСКУ, но сейчас будет, укажем пользователя (роль), которым он предоставлен
                                    access_list[j].operations[item.name].access_by_list_by_user_id = item.user_id
                                }
                                access_list[j].operations[item.name].is_access_by_list = !!(access_list[j].operations[item.name].is_access_by_list || item.is_access_by_list)

                                if (!access_list[j].operations[item.name].is_denied && item.is_denied) { // Если доступ еще не был закрыт, но сейчас будет, укажем пользователя (роль), которым он закрыт
                                    access_list[j].operations[item.name].denied_by_user_id = item.user_id
                                }
                                access_list[j].operations[item.name].is_denied = !!(access_list[j].operations[item.name].is_denied || item.is_denied)
                            }

                        }
                    }

                    return cb(null)
                }
            }, function(err, res) {
                return cb(err, res)
            })
        },
        setIsParentList: function(cb) {

            setIsAccessByParentList = function(item) {
                if (!item.server_parent_table) { // Для элемента нет родительского элемента вообще, соответственно доступ не может быть ограничен родительским списком
                    item.is_access_by_parent_list = false
                    return
                }

                if (item.class.toLowerCase() === item.server_parent_table.toLowerCase()) { // Класс сам себе родитель, соответственно доступ не может быть ограничен родительским списком
                    item.is_access_by_parent_list = false
                    return
                }

                item.server_parent_table = item.server_parent_table.toLowerCase()
                item.server_parent_table = item.server_parent_table.charAt(0).toUpperCase() + item.server_parent_table.substr(1)

                var item2 = access_list[item.server_parent_table]
                if (!item2) { // Для элемента нет родительского элемента в списке доступа, соответственно доступ не может быть ограничен родительским списком
                    item.is_access_by_parent_list = false
                    return
                }

                if (typeof item2.is_access_by_parent_list === 'undefined') setIsAccessByParentList(item2) // Установим is_access_by_parent_list сперва для этого (родительского) элемента
                if (item2.is_access_by_list || item2.is_access_by_parent_list) {
                    // item.is_access_by_parent_list = (item2.is_access_by_list)? item2.class : item2.is_access_by_parent_list;
                    item.is_access_by_parent_list = item2.class
                    // console.log('1---', item.is_access_by_parent_list, item.name, item.class);
                    return
                }
                if (item.name === '*') { // Метод вызван на ВСЕ операции класса
                    item.is_access_by_parent_list = false
                    return
                }
                if (item2.is_access) { // Доступ есть на уровне всего родительского класса. Он и определяет по списку или нет
                    // item.is_access_by_parent_list = (item2.is_access_by_list)? item2.class : item2.is_access_by_parent_list;
                    if (item2.is_access_by_list || item2.is_access_by_parent_list) {
                        item.is_access_by_parent_list = item2.class
                    }
                    return
                }
                if (!item2.operations) { // Нет операций
                    item.is_access_by_parent_list = false
                    return
                }
                var item2oper = item2.operations[item.name]
                if (!item2oper) { // Для элемента нет родительского элемента ОПЕРАЦИИ в списке доступа, соответственно доступ не может быть ограничен родительским списком
                    item.is_access_by_parent_list = false
                    return
                }
                // if (typeof item2oper.is_access_by_parent_list === 'undefined'/* && item2oper.class !== item.class*/) {
                if (typeof item2oper.is_access_by_parent_list === 'undefined' && item2oper.name !== item.name) {
                    setIsAccessByParentList(item2oper)
                } // Установим is_access_by_parent_list сперва для этого (родительского) элемента
                if (item2oper.is_access_by_list || item2oper.is_access_by_parent_list) {
                    // item.is_access_by_parent_list = (item2oper.is_access_by_list)? item2oper.class : item2oper.is_access_by_parent_list;
                    item.is_access_by_parent_list = item2oper.class
                    // console.log('2---', item.is_access_by_parent_list, item.name, item.class);
                    return
                }

                item.is_access_by_parent_list = false
                return
            }

            // console.log('ВСЕ ОК');
            for (var i in access_list) {
                var class_ = access_list[i]
                setIsAccessByParentList(class_)
                // console.log(class_.is_access_by_parent_list,'*',class_.class);

                if (!class_.operations) continue
                for (var j in class_.operations) {
                    var one_oper = class_.operations[j]
                    setIsAccessByParentList(one_oper)
                    // console.log(one_oper.is_access_by_parent_list, one_oper.name, one_oper.class);
                }
            }
            cb(null)
        }

    }, function(err, res) {
        if (err) return cb(err)
        _t.access_list = access_list
        _t.need_reload_access_list = false
        cb(null, new UserOk('noToastr'))
    })
}

// var o = {
//     command:'get_me',
//     object:'User'
// };
// socketQuery(o, function(res){
//     console.log(res);
// });
/**
 * Вернет данные конкретного пользователя.
 * @param obj
 * @param cb
 * @returns {*}
 */
Model.prototype.get_me = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this

    var user = {}
    // var o = {
    //     "id": 1,
    //     "firstname": "Иван",
    //     "lastname": "Гоптарев",
    //     "midname": "Иванович",
    //     "email": "ivantgco@gmail.com",
    //     "birthday": "",
    //     "gender_name": "Мужской",
    //     "company_id": 1,
    //     "company_name": "ECOTAX",
    //     "fio": "Иван Иванович Гоптарев",
    //     "image": "/assets/img/default-user.jpg"
    // };
    var columns = ['id', 'firstname', 'lastname', 'midname', 'email', 'birthday', 'gender_name', 'company_id', 'company_name', 'fio', 'image']

    if (!_t.user.authorized) return cb(new UserError('Необходимо авторизироваться в системе.'))
    for (var i in _t.user.user_data) {
        if (columns.indexOf(i) === -1) continue
        user[i] = _t.user.user_data[i]
    }
    if (!obj.getRoles) return cb(null, new UserOk('noToastr', {user: user}))
    async.series({
        getRoles: cb => {
            var o = {
                command: 'get',
                object: 'user_role',
                params: {
                    param_where: {
                        user_id: user.id
                    },
                    collapseData: false
                }
            }
            _t.api(o, (err, res) => {
                if (err) return cb(new MyError('Не удалось получить роли пользователя', {o: o, err: err}))
                user.user_role = res
                user.roles = _t.user.roles
                cb(null)
            })


        }
    }, (err, res) => {
        if (err) return cb(err)
        return cb(null, new UserOk('noToastr', {user: user}))
    })
}

// var o = {
//     command:'test1',
//     object:'User',
//     params:{}
// };
// socketQuery(o, (r)=>{
//     console.log(r);
// })

Model.prototype.getForSelect = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    var client_object = _t.client_object || ''

    var coFunction = 'getForSelect_' + client_object
    if (typeof _t[coFunction] === 'function') {
        _t[coFunction](obj, cb)
    } else {
        if (typeof _t['getForSelect_'] === 'function') {
            _t['getForSelect_'](obj, cb)
        } else {
            _t.getForSelectPrototype(obj, cb)
        }
    }
}

Model.prototype.getForSelect_ = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    var data
    async.series({
        addFilter: function(cb) {
            if (["default_location"].indexOf(obj.column_name) === -1) return cb(null) // Parent_id - id оборудования

            let o = {
                command: 'getByRelationUser',
                object: 'object_',
            }
            _t.api(o, (err, res) => {
                if (err) return cb(new MyError('Не удалось получить список объектов пользователя', {o: o, err: err}))

                // console.log(o, err, res, obj)
                // debugger
                // return cb(null) //ВОТ ЭТ СТЕРЕТЬ
                for (let i in res.data) {
                    obj.default_where.push({
                        key: 'object_id',
                        val1: res.data[i].object_id,
                        comparisonType: "or",
                        group: "object_group"
                    })
                }
                cb(null)
            })

        },
        getPrototype_: function(cb) {
            _t.getForSelectPrototype(obj, (err, res) => {
                if (err) return cb(err)
                data = res
                cb(null)
            })
        }
    }, function(err, res) {
        if (err) return cb(err)
        cb(null, data)
    })
}


Model.prototype.getRoles = function(obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0]
        obj = {}
    }
    if (obj.fromClient) return cb(new MyError('Запрещено с клиента.'))
    var _t = this

    let data
    var roles_obj_byOrganizationId = {}
    var organization_obj_byRoleSysname = {}
    var roles_obj_bySysname = {}
    var user_id = obj.user_id || ((_t.user_data) ? _t.user_data.id : _t.user.user_data.id)
    if (!user_id) {
        return cb(null, new UserOk('noToastr', {
                data:
                    {
                        roles_obj_byOrganizationId: roles_obj_byOrganizationId,
                        organization_obj_byRoleSysname: organization_obj_byRoleSysname,
                        roles_obj_bySysname: roles_obj_bySysname
                    }
            }
        ))
    }
    async.series({
        getRoles: cb => {
            var o = {
                command: 'get',
                object: 'user_role',
                params: {
                    param_where: {
                        user_id
                    },
                    skipCheckRoleModel: true,
                    collapseData: false
                }
            }
            _t.api(o, (err, res) => {
                if (err) return cb(new MyError('Не удалось получить роли пользователя', {o: o, err: err}))
                res.forEach(one => {
                    if (!roles_obj_bySysname[one.email_role]) roles_obj_bySysname[one.email_role] = {
                        id: one.role_user_id,
                        sysname: one.email_role,

                    }
                })
                cb(null)
            })


        },
    }, function(err, res) {
        if (err) return cb(err)
        cb(null, new UserOk('noToastr', {
                data:
                    {
                        roles_obj_byOrganizationId: roles_obj_byOrganizationId,
                        organization_obj_byRoleSysname: organization_obj_byRoleSysname,
                        roles_obj_bySysname: roles_obj_bySysname
                    }
            }
        ))
    })
}


// Model.prototype.getObjects = function(obj, cb) {
//     if (arguments.length === 1) {
//         cb = arguments[0]
//         obj = {}
//     }
//     var _t = this
//     // var id = obj.id;
//     // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
//
//     var organization_id = obj.organization_id
//     if (!organization_id) return cb(new MyError('Не передан organization_id', {obj: obj}))
//
//     if (typeof organization_id === 'object' && Array.isArray(organization_id.data)) organization_id = organization_id.data
//     var organization_ids = (Array.isArray(organization_id)) ? [...organization_id] : [organization_id]
//
//     if (!organization_ids.length) return cb(null, new UserOk('noToastr', {data: []}))
//
//     let data = []
//     var object_ids
//     async.series({
//         getRel: cb => {
//             var o = {
//                 command: 'get',
//                 object: 'object_relation_organization_r_role',
//                 params: {
//                     columns: ['id', 'org_r_role_id', 'object_id', 'organization_id'],
//                     where: [
//                         {
//                             key: 'organization_id',
//                             type: 'in',
//                             val1: organization_ids
//                         }
//                     ],
//                     limit: 10000000,
//                     collapseData: false,
//                     skipCheckRoleModel: true,
//                     use_cache: false
//                 }
//             }
//             _t.api(o, (err, res) => {
//                 if (err) return cb(new MyError('Не удалось получить объекты', {o: o, err: err}))
//                 object_ids = res.map(one => one.object_id)
//                 cb(null)
//             })
//
//         },
//         getReal: cb => {
//             // Временная мера, так как object_relation_organization_r_role почему то не удаляется вместе с объектом TODO object_relation_organization_r_role
//             if (!object_ids.length) return cb(null)
//             var o = {
//                 command: 'get',
//                 object: 'object_',
//                 params: {
//                     columns: ['id'],
//                     where: [
//                         {
//                             key: 'id',
//                             type: 'in',
//                             val1: object_ids
//                         }
//                     ],
//                     limit: 10000000,
//                     collapseData: false,
//                     skipCheckRoleModel: true,
//                     use_cache: false
//                 }
//             }
//             _t.api(o, (err, res) => {
//                 if (err) return cb(new MyError('Не удалось получить объекты по id', {o: o, err: err}))
//                 data = res.map(one => one.id)
//                 cb(null)
//             })
//
//         }
//     }, function(err, res) {
//         if (err) return cb(err)
//         cb(null, new UserOk('noToastr', {data: data}))
//     })
// }
//
// Model.prototype.getGroupsSystem = function(obj, cb) {
//     if (arguments.length === 1) {
//         cb = arguments[0]
//         obj = {}
//     }
//     var _t = this
//     // var id = obj.id;
//     // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
//
//     if (!obj.object_ids) return cb(new MyError('Не передан object_ids', {obj: obj}))
//
//     async.series({
//         getGroupsSystem: cb => {
//             let o = {
//                 command: 'get',
//                 object: 'group_system',
//                 params: {
//                     columns: ['id'],
//                     where: [{
//                         key: 'object_id',
//                         type: 'in',
//                         val1: obj.object_ids
//                     }],
//                     limit: 10000000,
//                     collapseData: false,
//                     skipCheckRoleModel: true
//                 }
//             }
//             _t.api(o, (err, res) => {
//                 if (err) return cb(new MyError('Не удалось получить группы систем', {o: o, err: err}))
//                 group_system_ids = res.map(one => one.id)
//                 cb(null, group_system_ids)
//             })
//
//         },
//     }, function(err, res) {
//         if (err) return cb(err)
//         cb(null, new UserOk('noToastr', {data: res.getGroupsSystem}))
//     })
// }
// Model.prototype.getSystems = function(obj, cb) {
//     if (arguments.length === 1) {
//         cb = arguments[0]
//         obj = {}
//     }
//     var _t = this
//     // var id = obj.id;
//     // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
//
//     if (!obj.group_system_ids) return cb(new MyError('Не передан group_system_ids', {obj: obj}))
//
//     async.series({
//         getSystems: cb => {
//             let o = {
//                 command: 'get',
//                 object: 'object_system',
//                 params: {
//                     columns: ['id'],
//                     where: [
//                         {
//                             key: 'group_system_id',
//                             type: 'in',
//                             val1: obj.group_system_ids
//                         }
//                     ],
//                     limit: 10000000,
//                     collapseData: false,
//                     skipCheckRoleModel: true
//                 }
//             }
//             _t.api(o, (err, res) => {
//                 if (err) return cb(new MyError('Не удалось получить системы объектов', {o: o, err: err}))
//                 object_system_ids = res.map(one => one.id)
//                 cb(null, object_system_ids)
//             })
//
//         },
//     }, function(err, res) {
//         if (err) return cb(err)
//         cb(null, new UserOk('noToastr', {data: res.getSystems}))
//     })
// }
// Model.prototype.getSystemReglamentWorks = function(obj, cb) {
//     if (arguments.length === 1) {
//         cb = arguments[0]
//         obj = {}
//     }
//     var _t = this
//     // var id = obj.id;
//     // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
//     if (!obj.system_ids) return cb(new MyError('Не передан system_ids', {obj: obj}))
//
//     async.series({
//         getSystemReglamentWorks: cb => {
//             let o = {
//                 command: 'get',
//                 object: 'system_reglament_work',
//                 params: {
//                     columns: ['id'],
//                     where: [
//                         {
//                             key: 'object_system_id',
//                             type: 'in',
//                             val1: obj.system_ids
//                         }
//                     ],
//                     limit: 10000000,
//                     collapseData: false,
//                     skipCheckRoleModel: true
//                 }
//             }
//             _t.api(o, (err, res) => {
//                 if (err) return cb(new MyError('Не удалось получить регламентные работы системы', {o: o, err: err}))
//                 system_reglament_work_ids = res.map(one => one.id)
//                 cb(null, system_reglament_work_ids)
//             })
//
//         },
//     }, function(err, res) {
//         if (err) return cb(err)
//         cb(null, new UserOk('noToastr', {data: res.getSystemReglamentWorks}))
//     })
// }
// Model.prototype.getEquipments = function(obj, cb) {
//     if (arguments.length === 1) {
//         cb = arguments[0]
//         obj = {}
//     }
//     var _t = this
//     // var id = obj.id;
//     // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
//     if (!obj.system_ids) return cb(new MyError('Не передан system_ids', {obj: obj}))
//
//     async.series({
//         getEquipments: cb => {
//             let o = {
//                 command: 'get',
//                 object: 'equipment',
//                 params: {
//                     columns: ['id'],
//                     where: [
//                         {
//                             key: 'object_system_id',
//                             type: 'in',
//                             val1: obj.system_ids
//                         }
//                     ],
//                     limit: 10000000,
//                     collapseData: false,
//                     skipCheckRoleModel: true
//                 }
//             }
//             _t.api(o, (err, res) => {
//                 if (err) return cb(new MyError('Не удалось получить оборудование системы', {o: o, err: err}))
//                 let equipment_ids = res.map(one => one.id)
//                 cb(null, equipment_ids)
//             })
//
//         },
//     }, function(err, res) {
//         if (err) return cb(err)
//         cb(null, new UserOk('noToastr', {data: res.getEquipments}))
//     })
// }
//
// Model.prototype.getReglamentREquipments = function(obj, cb) {
//     if (arguments.length === 1) {
//         cb = arguments[0]
//         obj = {}
//     }
//     var _t = this
//     // var id = obj.id;
//     // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
//     if (!obj.equipment_ids && !obj.object_system_ids) {
//         return cb(new MyError('Не передан ' + (obj.equipment_ids ? '' : 'equipment_ids ') + (obj.object_system_ids ? '' : 'object_system_ids '), {obj: obj}))
//     }
//     async.series({
//         getReglamentREquipments: cb => {
//             let o = {
//                 command: 'get',
//                 object: 'reglament_r_equipment',
//                 params: {
//                     columns: ['id'],
//                     where: [],
//                     limit: 10000000,
//                     collapseData: false,
//                     skipCheckRoleModel: true
//                 }
//             }
//             if (obj.equipment_ids) {
//                 o.params.columns.push('equipment_id')
//                 o.params.where.push({
//                     key: 'equipment_id',
//                     type: 'in',
//                     val1: obj.equipment_ids,
//                     comparisonType: 'OR',
//                     group: 'equipment_id__and__object_system_id'
//                 })
//             }
//             if (obj.object_system_ids) {
//                 o.params.columns.push('object_system_id')
//                 o.params.where.push({
//                     key: 'object_system_id',
//                     type: 'in',
//                     val1: obj.object_system_ids,
//                     comparisonType: 'OR',
//                     group: 'equipment_id__and__object_system_id'
//                 })
//             }
//             _t.api(o, (err, res) => {
//                 if (err) return cb(new MyError('Не удалось получить оборудование системы', {o: o, err: err}))
//                 let equipment_ids = res.map(one => one.id)
//                 cb(null, equipment_ids)
//             })
//
//         },
//     }, function(err, res) {
//         if (err) return cb(err)
//         cb(null, new UserOk('noToastr', {data: res.getReglamentREquipments}))
//     })
// }


Model.prototype.generateTempPassword = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    var id = obj.id
    if (isNaN(+id)) return cb(new MyError('Не передан id', {obj: obj}))
    var rollback_key = obj.rollback_key || rollback.create()
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key

    let tempPassword

    async.series({
        generatePassword: function(cb) {
            let new_guid = guid.create()
            let short_guid = new_guid.toString().substr(0, 5)

            tempPassword = short_guid

            cb(null)
        },
        update: function(cb) {
            let o = {
                command: 'modify',
                object: 'user',
                params: {
                    id: obj.id,
                    password: tempPassword,
                    tempPassword: tempPassword
                }
            }

            _t.api(o, function(err, res) {
                if (err) return cb(new UserError('Не удалось установить временный пароль', {o, err}))
                cb(null)

            })
        }

    }, function(err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err)
            rollback.rollback({obj: obj, rollback_key: rollback_key, user: _t.user}, function(err2) {
                return cb(err, err2)
            })
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            cb(null, new UserOk('Ок', {tempPassword}))
        }
    })
}

Model.prototype.setDefaultEmailForNotificationForAllUsers = function(obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this

    let users = []
    async.series({
        getAllUsers: cb => {
            _t.get({
                collapseData: false,
                where: [{
                    key: 'email_notification',
                    type: 'isNull',
                    comparisonType: "or",
                    group: "empty_email_notification"
                }, {
                    key: 'email_notification',
                    type: '=',
                    val1: '',
                    comparisonType: "or",
                    group: "empty_email_notification"
                }]
            }, (err, res) => {
                if (err) return cb(new MyError('Не удалось получить список пользователей', {err: err, obj: o}))
                users = Object.values(res)
                cb(null)
            })
        },
        setValue: cb => {
            if (users.length == 0) return cb(new UserOk)
            async.eachSeries(users, (user, cb) => {
                let o = {
                    id: user.id,
                    email_notification: user.email
                }
                _t.modify(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось изменить email_notification', {err: err, obj: o}))
                    cb(null)
                })
            }, cb)
        }
    }, (err, res) => {
        if (err) return cb(err)
        cb(null, new UserOk('Ок'))
    })
}

Model.prototype.setRandomPasswordAndSendEmail = function(obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this

    var id = obj.id
    if (isNaN(+id)) return cb(new MyError('Не передан id', {obj: obj})) // Not passed to id


    let EventNotification = require('../modules/handlerNotificationToMail')


    let new_password = undefined
    let email = undefined
    let err_send = false
    let row_id = undefined
    async.series({
        createNewPassword: cb => {
            new_password = generatorPassword({
                length: 10,
                numbers: true
            })
            cb(null)
        },
        savePassword: cb => {
            let salt = Math.random() + ''
            let new_password_hash = {
                hashedPassword: crypto.createHmac('sha1', salt).update(new_password).digest('hex'),
                salt: salt
            }

            let o = {
                command: 'modify',
                object: 'user',
                params: {
                    id: id,
                    hashedPassword: new_password_hash.hashedPassword,
                    salt: new_password_hash.salt,
                }
            }
            _t.api(o, (err, res) => {
                if (err) return cb(new MyError('Не удалось изменить пароль пользователя', {err: err, o: o}))
                cb(null)
            })
        },
        savePasswordInTempTable: cb => {
            let is_have = false
            row_id = undefined
            let user = undefined
            async.series({
                checkUserInTableOpenPasswords: cb => {
                    let o = {
                        command: 'get',
                        object: 'user_refactor_password',
                        params: {
                            param_where: {
                                user_id: id
                            },
                            columns: ['id', 'email', 'user_id'],
                            collapseData: false
                        }
                    }
                    _t.api(o, (err, res) => {
                        if (err) return cb(new MyError('Не удалось получит запись из таблицы пользователей с открытыми паролями', {
                            err: err,
                            o: o
                        }))
                        if (res.length > 1) return cb(new MyError('Не может быть больще одной записи', {
                            res: res,
                            o: o
                        }))
                        if (res.length == 1) {
                            is_have = true
                            row_id = res[0].id
                            user = res[0]
                        }
                        cb(null)
                    })
                },
                addOrModify: cb => {
                    if (!is_have && !row_id && !user) {
                        let o = {
                            command: 'add',
                            object: 'user_refactor_password',
                            params: {
                                user_id: id,
                                email: email,
                                password: new_password,
                                send_notification: false,
                                actual: true
                            }
                        }
                        _t.api(o, (err, res) => {
                            if (err) return cb(new MyError('Не удалось добавить запись user_refactor_password', {
                                err: err,
                                o: o
                            }))
                            row_id = res.id
                            cb(null)
                        })
                    } else {
                        let o = {
                            command: 'modify',
                            object: 'user_refactor_password',
                            params: {
                                id: row_id,
                                password: user.new_password_open,
                                send_notification: false,
                                actual: true
                            }
                        }
                        _t.api(o, (err, res) => {
                            if (err) return cb(new MyError('Не удалось изменить запись temp_user_refactor_password', {
                                err: err,
                                o: o
                            }))
                            cb(null)
                        })
                    }
                }
            }, cb)
        },
        sendNotification: cb => {
            async.series({
                getUser: cb => {
                    let o = {
                        param_where: {
                            id: id
                        },
                        collapseData: false,
                        columns: ['id', 'email']
                    }
                    _t.get(o, (err, res) => {
                        if (err) return cb(new MyError('Не удалось получить пользоваеля'))
                        email = res[0].email
                        cb(null)
                    })
                },
                sendNotification: cb => {
                    let n = new EventNotification({
                        object: 'user',
                        object_id: id,
                        event: {
                            name: 'changePassword',
                        },
                        params: {
                            password: new_password,
                            email: email
                        }
                    }, (err, res) => {
                        if (err) err_send = err
                        return cb(null)
                    })
                },
            }, cb)
        },
        modifyUserRefactorPassword: cb => {
            if (err_send) {
                return cb(null)
            } else {
                let o = {
                    command: 'modify',
                    object: 'user_refactor_password',
                    params: {
                        id: row_id,
                        send_notification: true,
                        actual: false
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(new MyError('Не удалось изменить user_refactor_password', {err: err, o: o}))
                    cb(null)
                })
            }
        },
        updateUser: cb => {
            let o = {
                id: id,
            }

            if (err_send) {
                o.send_notification_new_password = false
                o.error_send_notification_new_password = JSON.stringify(err_send)
            } else {
                o.send_notification_new_password = true
            }

            _t.modifyPrototype(o, (err, res) => {
                if (err) return cb(new MyError('не удалось изменить USER', {err: err, o: o}))
                return cb(null)
            })
        }
    }, (err, res) => {
        if (err) return cb(err)
        if (err_send) return cb(new MyError('Не удалось отправить', {err_send: err_send}))
        return cb(null, new UserOk('Ок'))
    })
}


// var o = {
//     command:'syncSysRoles',
//     object:'User',
//     params:{
//     }
// };
// socketQuery(o, r=>{
//     console.log(r);
// });




Model.prototype.getUserSettings = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    var rollback_key = obj.rollback_key || rollback.create()
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key

    let user_settings_filter, user_settings_visible

    async.series({
        getFilters: function(cb){

            let o2 = {
                command: 'get',
                object: 'user_setting_co_filter',
                params: {
                    where: [{
                        key: 'user_id',
                        val1: obj.user_id
                    },{
                        key: 'co_and_class',
                        val1: obj.co_and_class
                    }],
                    collapseData: false
                }
            }

            _t.api(o2, function(err, res){

                if(err) return cb(new MyError('Не удалось получить настройки фильтров', {o:o2, err:err}))

                user_settings_filter = res;

                cb(null)

            })
        },
        getVisible: function(cb){

            let o2 = {
                command: 'get',
                object: 'user_setting_co_visible',
                params: {
                    where: [{
                        key: 'user_id',
                        val1: obj.user_id
                    },{
                        key: 'co_and_class',
                        val1: obj.co_and_class
                    }],
                    collapseData: false
                }
            }

            _t.api(o2, function(err, res){

                if(err) return cb(new MyError('Не удалось получить настройки видимости колонок', {o:o2, err:err}))

                user_settings_visible = res

                cb(null)

            })
        },

    }, function(err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err)
            rollback.rollback({obj: obj, rollback_key: rollback_key, user: _t.user}, function(err2) {
                return cb(err, err2)
            })
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            cb(null, new UserOk('Ок', {user_settings_filter, user_settings_visible}))
        }
    })
}



Model.prototype.syncSysRoles = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    var rollback_key = obj.rollback_key || rollback.create()
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key

    let users
    async.series({
        getAll: cb => {
            var params = {
                limit: 100000,
                collapseData: false
            }
            _t.get(params, function(err, res) {
                if (err) return cb(new MyError('Не удалось получить пользователей', {params: params, err: err}))
                users = res
                cb(null)
            })
        },
        sync: cb => {
            if (!users) return cb(null)
            async.eachSeries(users, function(user, cb) {
                let o = {
                    command: 'syncSysRoles',
                    object: 'user_role',
                    params: {
                        user_id: user.id
                    }
                }
                _t.api(o, (err, res) => {
                    if (err) return cb(err)
                    cb(null)
                })
            }, cb)
        }

    }, function(err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err)
            rollback.rollback({obj: obj, rollback_key: rollback_key, user: _t.user}, function(err2) {
                return cb(err, err2)
            })
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            cb(null, new UserOk('Ок'))
        }
    })
}

Model.prototype.example = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    var id = obj.id
    if (isNaN(+id)) return cb(new MyError('Не передан id', {obj: obj}))
    var rollback_key = obj.rollback_key || rollback.create()
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key

    async.series({}, function(err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err)
            rollback.rollback({obj: obj, rollback_key: rollback_key, user: _t.user}, function(err2) {
                return cb(err, err2)
            })
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            cb(null, new UserOk('Ок'))
        }
    })
}

Model.prototype.exampleGet = function(obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    var id = obj.id
    if (isNaN(+id)) return cb(new MyError('Не передан id', {obj: obj})) // Not passed to id

    let data
    async.series({}, function(err, res) {
        if (err) return cb(err)
        cb(null, new UserOk('noToastr', {data: data}))
    })
}

module.exports = Model
