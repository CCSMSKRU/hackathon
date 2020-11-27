var MyError = require('../error').MyError
var UserError = require('../error').UserError
var UserOk = require('../error').UserOk
var getCode = require('../libs/getCode')
var async = require('async')
var fs = require('fs')
var funcs = require('./functions')
var moment = require('moment')
var config = require('../config')
var debug = config.get('isDeveloper') || config.get('debug')
var logAccessDenied = require('./logAccessDenied')
var business_logic_roles = [
    'TEST_ROLE',
]
var doNotCheckBusinessAccessCommands = ['checkAccess', 'clearCache']
// module.exports = function (obj, cb, user) {
var api = function(obj, cb, user) {
    // if (obj.object == 'tangibles') {
    //     console.log(obj)
    //     debugger
    // }
    if (typeof cb !== 'function') throw new MyError('The API did not pass the callback function')
    if (typeof obj !== 'object') return cb(new MyError('The API is not passed to obj'))
    obj = funcs.cloneObj(obj)
    obj.params = obj.params || {}
    var _t = this
    if (!user) throw new MyError('API not passed to user')
    let sid = user.sid

    var command, object
    var object_params = obj.object_params || {}
    var params = obj.params || {}
    var paramsConsoleJSON
    var client_object = obj.client_object || params.client_object
    var fromClient = obj.params.fromClient
    //if (client_object) params.client_object = client_object;
    var t1 = moment()
    if (obj.command == '_CLEAR') {
        global.classes = {}
        return cb(null, new UserOk('Cache dropped.'))
    }

    var apiRID = funcs.guidShort() // API Request ID
    var fromClientConsole = (fromClient) ? '==> ' : ''
    var now_time = moment()
    var is_access_important // Определяет был ли дан доступ или требуются доп проверки
    var is_access_by_list // Определяет что доступ выдан но требеется проверить по списку

    var noToastr = params.noToastr
    delete params.noToastr
    var skipCheckRoleModel = (!fromClient) ? params.skipCheckRoleModel : false


    // var checkAccess = (fromClient)? false : params.checkAccess;
    var checkAccess = params.checkAccess

    var skipCheckRoleModelAdmin = (user.authorized && user.user_data.user_type_sysname === 'ADMIN')
    // if (user.authorized && user.user_data.user_type_sysname === 'ADMIN'){
    //     skipCheckRoleModel = true;
    // }

    delete params.checkAccess
    delete params.noToastr

    var accesses = []
    var denies = []

    var _class
    var classes_skip_for_getRoles = ['Dynamic_field_pair']
    var classes_check_role_model = [
        'Request_work',
        'Tangibles',
        'Request_tangible',
        // 'Object_',
        'Group_system',
        'Object_system',
        'System_reglament_work',
        'Equipment',
        'Reglament_r_equipment',
        'Ppr',
        // 'Building'
    ]
    async.series({
        checkArgs: cb => {
            // Проверим аргументы
            command = obj.command
            if (!command) return cb(new MyError('The request does not contain a command'))
            object = obj.object
            if (!object) return cb(new UserError({code: 'noClass'}, {obj: obj}))
            var dot_object = object.replace(/\.\w+/ig, '')
            var dot_client_object = object.replace(/\w+\.*/, '')
            if (dot_client_object) {
                object = dot_object
                client_object = dot_client_object
            }
            object = object.toLowerCase()
            object = object.charAt(0).toUpperCase() + object.substr(1)


            // console.log('\nAPI ==>>\n', command, object, params, fromClient);

            cb(null)
        },
        logInCosole: cb => {
            // log in console all requests

            var excludedParams = ['password']
            var paramsConsole = funcs.cloneObj(params)
            // paramsConsole
            for (var i in excludedParams) {
                delete paramsConsole[excludedParams[i]]
            }
            if (paramsConsole)
                paramsConsoleJSON = JSON.stringify(paramsConsole).substr(0, 5000)
            if (debug) console.info(fromClientConsole + apiRID, ' → ', now_time.format('DD.MM.YYYY HH:mm:ss'), 'API LOG (' + sid + '):', command, object, paramsConsoleJSON)
            if (debug) global.times.log_time += moment().diff(now_time)
            cb(null)
        },
        checkAccess: cb => {
            //checkAccess
            // Если выйдем из функции раньше загрузки доступов пользователя, то доступ разрешен по одной из причин.
            // Если нет, то сменим флаг, чтобы дальнейшие проверки включились
            is_access_important = true
            var doNotCheckCommands = {
                Any: ['_getClass'],
                User: ['login', 'logout', 'forgotPassword']
            }
            var doNotCheckCommandsFromServer = {
                // User_site:['get','add','remove'],
                User: ['get'],
                access_to_operation: ['get']
            }
            // Требует ли команда проверки доступа
            if (doNotCheckCommands.Any.indexOf(command) !== -1) return cb(null)
            if (typeof doNotCheckCommands[object] === 'object') {
                if (doNotCheckCommands[object].indexOf(command) !== -1) return cb(null)
            }
            // Требует ли команда проверки доступа для комманд с сервера
            if (typeof doNotCheckCommandsFromServer[object] === 'object') {
                if (doNotCheckCommandsFromServer[object].indexOf(command) !== -1 && !fromClient) return cb(null)
            }
            // Если требуется -> проверим.
            if (!user.authorized) {
                return cb(new UserError('noAuth'))
            }

            if (!fromClient) return cb(null) // Для авторизованных пользователей, все операции внутри сервера разрешены

            // Разрешим все _sub_table_select_
            // if (command.indexOf('_sub_table_select_') !== -1) return cb(null);
            if (object.indexOf('_sub_table_select_') !== -1) return cb(null)

            if (user.user_data.user_type_sysname === 'ADMIN') return cb(null)
            // if (user.user_data.user_type_sysname === 'SITE') return cb(null);
            // if (user.user_data.email !== 'test') return cb(null);


            // is_access_important = false;

            async.series({
                loadUserAccessList: function(cb) {
                    if (user.access_list && !user.need_reload_access_list) return cb(null) // Уже загружен и не требует перезагрузки
                    // var o = {
                    //     command:'load_access',
                    //     object:'User',
                    //     params:{
                    //         id:user
                    //     }
                    // };
                    // cb(null);
                    user.loadAccess({}, function(err, res) {
                        if (err) {
                            console.log('An error occurred while verifying the accesses.', err)
                            return cb(new UserError('An error occurred while verifying the accesses.', {err: err}))
                        }
                        cb(null)
                    })
                },
                check: function(cb) {
                    if (!user.access_list[object]) {
                        logAccessDenied.log(obj, user, api)
                        return cb(new UserError('noAccess', {obj: obj, msg2: 'Не указан для класса'}))
                    } // Класс не указан - запретить
                    if (user.access_list[object].is_denied) return cb(new UserError('noAccess', {
                        obj: obj,
                        msg2: 'Запрещен галочкой для класса'
                    })) // Запрещен галочкой
                    if (user.access_list[object].is_access) {
                        if (user.access_list[object].is_access_by_list) is_access_by_list = true
                        return cb(null)
                    } // Доступ открыт для всего класса - открыть
                    // if (user.access_list[object].is_access_by_list) {
                    //     return cb(null);
                    // } // Доступ открыт для комманды по списку - открыть

                    if (!user.access_list[object].operations[command]) {
                        logAccessDenied.log(obj, user, api)
                        return cb(new UserError('noAccess', {obj: obj, msg2: 'Не указан для комманды'}))
                    } // Команда не указана - запретить

                    if (user.access_list[object].operations[command].is_denied) return cb(new UserError('noAccess', {
                        obj: obj,
                        msg2: 'Запрещен галочкой для комманды'
                    })) // Запрещен галочкой
                    if (user.access_list[object].operations[command].is_access) {
                        if (user.access_list[object].operations[command].is_access_by_list) is_access_by_list = true
                        return cb(null)
                    } // Доступ открыт для комманды - открыть
                    logAccessDenied.log(obj, user, api)
                    return cb(new UserError('noAccess', {obj: obj, msg2: 'Для операции снята галочка'}))
                }
            }, function(err, res) {
                if (err) { // Доступ закрыт по каким то причинам
                    is_access_important = false
                    return cb(err)
                }
                // Доступ открыт условно (по списку) или безусловно
                cb(null)

            })
        },
        prepareAlias: cb => {
            // Подготовим alias
            // var user_alias = '0';
            var user_alias = sid
            var alias = object + '_-_' + user_alias
            var alias_client_object = client_object || 0
            //if (client_object) alias += '_' + client_object;
            for (var i in object_params) {
                alias += "&" + i + ":" + object_params[i]
            }
            global.classes[alias] = global.classes[alias] || {}
            _class = global.classes[alias][alias_client_object]
            if (_class) {
                //var checkBusy = function () {
                //    if (!_class.is_busy){
                //        console.log('Класс освободился, можно использовать');
                //        return cb(null, _class);
                //    }
                //    setTimeout(function () {
                //        checkBusy();
                //    }, 1000);
                //};
                //checkBusy();
                //if (_class.is_busy){
                //
                //}
                _class.user = user
                return cb(null, _class)
            }
            // Если еще не создан, то создадим.
            var path = './classes/' + object + '.js'
            fs.access(path, function(err) {
                console.log(moment().format('DD.MM.YYYY HH:mm:ss'), err)
                // if (err) return cb(new MyError('Такого объекта(класса) не существует.', object));
                if (err) {
                    getCode({
                        name: 'badClass',
                        params: {object: object, command: command, params: params, user_id: user.user_data.id}
                    }, function(code_err, code_res) {
                        if (code_err) return cb(code_err)
                        return cb(code_res)
                    })
                    return
                }
                var path_alias = funcs.hashCode(path)
                var _Class
                if (!global.requiredClasses[path_alias]) {
                    _Class = require('.' + path)
                    global.requiredClasses[path_alias] = _Class
                } else {
                    _Class = global.requiredClasses[path_alias]
                }

                object_params.alias = alias
                var classInstance = new _Class({
                    name: object,
                    client_object: client_object,
                    params: params,
                    user: user
                })
                if (classInstance instanceof MyError) { // При создании класса произошла ошибка
                    return cb(new MyError('There was an error creating the class', {err: classInstance}))
                }
                if (classInstance instanceof UserError) { // При создании класса произошла ошибка (выдать на клиент)
                    return cb(classInstance)
                }
                if (typeof classInstance.init !== 'function') {
                    return cb(new MyError('There is no init method for the class ' + object))
                }
                classInstance.init(params, function(err) {
                    if (err) return cb(new MyError('An error occurred while initializing the class.', err))
                    classInstance.alias = alias
                    classInstance.alias_client_object = alias_client_object
                    if (object !== 'Table' && object !== 'User'/* && alias_client_object!==0*/) {
                        if (typeof global.classes[alias] !== 'object') global.classes[alias] = {}
                        global.classes[alias][alias_client_object] = classInstance
                    }
                    _class = classInstance
                    cb(null, classInstance)
                })
            })
        },
        loadProfile: cb => {
            if (typeof _class.loadProfile !== 'function') return cb(null, _class)
            _class.loadProfile(params, function(err, res) {
                return cb(err, _class)
            })
        },
        checkAccessByList: cb => {
            // Проверка доступа по спискам для команд не 'get'. Для 'get' отдельный механизм
            if (!is_access_by_list) return cb(null, _class) // Доступ уже был выдан, список проверять не надо
            if (command === 'get') return cb(null, _class) // get - открыть
            if (!obj.params.id && !obj.params.ids) {
                return cb(null, _class) // Команда не предусматривает работу с конкретной записью, список не уместен - пропускаем
            }

            var params = {
                command: command
            }

            _class.getAccessList(params, function(err, res) {
                if (err) return cb(new MyError('Не удалось загрузить список доступных записей. API', {
                    params: params,
                    err: err
                }))
                if (res.list_of_access_ids.indexOf(obj.params.id) === -1) return cb(new UserError('noAccess', {
                    obj: obj,
                    msg2: 'Запрещен по списку'
                })) // Запрещен галочкой
                cb(null, _class)
            })
        },
        getUserRoles: cb => {
            // return cb(null);
            // if (!user.authorized || user.is_sys) return cb(null);
            if (!user.authorized) return cb(null)
            if (classes_skip_for_getRoles.indexOf(object) !== -1 || skipCheckRoleModel) return cb(null)
            // if (classes_skip_for_getRoles.indexOf(object) !== -1) return cb(null);
            user.getRoles({}, function(err, res) {
                if (err) {
                    return cb(new MyError('Не удалось получить роли пользователя.', {err: err}))
                }
                user.roles = res.data
                cb(null)
            })
        },
        checkRoleModel: cb => {
            // return cb(null);
            if (doNotCheckBusinessAccessCommands.indexOf(command) !== -1 || user.is_sys) return cb(null)
            if (!user.authorized) return cb(null)
            if (!user.roleModel || skipCheckRoleModel || skipCheckRoleModelAdmin || classes_check_role_model.indexOf(object) === -1) return cb(null)
            if (!user.roleModel.items) return cb(null)
            var roles = user.roles
            if (!roles) return cb(new MyError('roles is not defined'))

            // Определим альясы комманд, которые подвергаются проверке по ролевой модели
            // if (!user.role_model.aliases){
            //     user.role_model.aliases = [];
            //     Object.keys(user.role_model.items).forEach(role_key =>{
            //         Object.keys(user.role_model.items[role_key]).forEach(object_key =>{
            //             Object.keys(user.role_model.items[role_key][object_key]).forEach(command_key =>{
            //                 var alias = object_key + '_-=-_' + command_key;
            //                 if (user.role_model.aliases.indexOf(alias) === -1) user.role_model.aliases.push(alias);
            //             })
            //         })
            //     })
            // }


            var access_by_role_res = {}
            var access_by_role_obj = {}
            async.series({
                checkHasRole: cb => {
                    if (!roles) return cb(null)
                    for (var sysname in roles.roles_obj_bySysname) {
                        if (business_logic_roles.indexOf(sysname) !== -1) {
                            return cb(null)
                        } // Есть хоть одна роль
                    }
                    return cb(new UserError('Для пользователя не указана ни одна роль.'))
                },
                check: cb_GLOBAL_CHECK => {
                    var sysnames = [...Object.keys(roles.roles_obj_bySysname), 'ANY']
                    async.eachSeries(sysnames, function(role_sysname, cb_EACH) {

                        if (role_sysname === 'ANY' && typeof access_by_role_res.flag !== 'undefined') return cb_EACH(null) // Только если не определено никакой другой ролью

                        // access_by_role_res.flag = (typeof access_by_role_res.flag !== 'undefined')? access_by_role_res.flag : false;


                        // if (typeof user.role_model.items[role_sysname] === 'undefined') return cb_EACH(null); // Для данной роли не определена ролевая модель
                        if (typeof user.roleModel.items[role_sysname] === 'undefined') return cb_EACH(null) // Для данной роли не определена ролевая модель
                        if (user.roleModel.items[role_sysname] === true) {
                            access_by_role_res.flag = true
                            access_by_role_res.role = role_sysname
                            access_by_role_res.msg = 'Разрешен для роли'
                            return cb_GLOBAL_CHECK(null) // Результат найден. Вызовем глобальный коллбек, а eachSeries продолжать не будем.
                        }
                        if (user.roleModel.items[role_sysname] === false) {
                            access_by_role_res.flag = false
                            access_by_role_res.role = role_sysname
                            access_by_role_res.msg = 'Запрещен для роли'
                            return cb_EACH(null)
                        }

                        if (typeof user.roleModel.items[role_sysname][object] === 'undefined') return cb_EACH(null) // Для данного класса не определена ролевая модель
                        if (user.roleModel.items[role_sysname][object] === true) {
                            access_by_role_res.flag = true
                            access_by_role_res.role = role_sysname
                            access_by_role_res.object = object
                            access_by_role_res.msg = 'Разрешен для объекта у роли'
                            return cb_GLOBAL_CHECK(null) // Результат найден. Вызовем глобальный коллбек, а eachSeries продолжать не будем.
                        }
                        if (user.roleModel.items[role_sysname][object] === false) {
                            access_by_role_res.flag = false
                            access_by_role_res.role = role_sysname
                            access_by_role_res.object = object
                            access_by_role_res.msg = 'Запрещен для объекта у роли'
                            return cb_EACH(null)
                        }

                        if (typeof user.roleModel.items[role_sysname][object][command] === 'undefined') return cb_EACH(null) // Для данного класса не определена ролевая модель
                        if (user.roleModel.items[role_sysname][object][command] === true) {
                            access_by_role_res.flag = true
                            access_by_role_res.role = role_sysname
                            access_by_role_res.object = object
                            access_by_role_res.command = command
                            access_by_role_res.msg = 'Разрешен для команды у роли'
                            return cb_GLOBAL_CHECK(null) // Результат найден. Вызовем глобальный коллбек, а eachSeries продолжать не будем.
                        }
                        if (user.roleModel.items[role_sysname][object][command] === false) {
                            access_by_role_res.flag = false
                            access_by_role_res.role = role_sysname
                            access_by_role_res.object = object
                            access_by_role_res.command = command
                            access_by_role_res.msg = 'Запрещен для команды у роли'
                            return cb_EACH(null)
                        }

                        // access_by_role_res.flag = (typeof access_by_role_res.flag !== 'undefined')? access_by_role_res.flag : false;
                        var rule = user.roleModel.items[role_sysname][object][command]
                        if (!rule) return cb_EACH(null) // Этой роли запрещено, пойдем далее.

                        if (rule === true) {
                            access_by_role_res.flag = true
                            access_by_role_res.role = role_sysname
                            access_by_role_res.object = object
                            access_by_role_res.command = command
                            access_by_role_res.msg = 'Разрешен для команды у роли'
                            return cb_GLOBAL_CHECK(null) // Результат найден. Вызовем глобальный коллбек, а eachSeries продолжать не будем.
                        }
                        // Обработаем условия
                        // if (typeof rule !== 'object' || !rule.params) {
                        rule.params = (typeof rule.params === 'object') ? rule.params : {}
                        if (typeof rule !== 'object' || !rule.params) {
                            console.warn('Правило определено не корректно. Должно быть true/false/{}. Или у правила не указан params Доступ для этой рои считается закрытым', command, object, rule)
                            access_by_role_res.msg = 'Правило определено не корректно. Должно быть true/false/{}. Или у правила не указан params Доступ для этой рои считается закрытым'
                            access_by_role_res.role = role_sysname
                            access_by_role_res.rule = rule
                            access_by_role_res.object = object
                            access_by_role_res.command = command
                            access_by_role_res.rule = rule
                            return cb_EACH(null)
                        }

                        async.eachSeries(Object.keys(rule.params), function(one_param_key, cb) {
                            if ((typeof params[one_param_key] === 'undefined' || params[one_param_key] === null) && !checkAccess) {
                                access_by_role_res.flag = false
                                access_by_role_res.role = role_sysname
                                access_by_role_res.one_param_key = one_param_key
                                access_by_role_res.object = object
                                access_by_role_res.command = command
                                access_by_role_res.msg = `Параметр определенный ролевой моделью не передан или null.`
                                return cb_EACH(null) // Запрещено ролью
                            }
                            var one_param = rule.params[one_param_key]
                            var o = {
                                roles: roles,
                                role_sysname: role_sysname,
                                one_param_key: one_param_key,
                                one_param: one_param,
                                command: command,
                                object: object,
                                received_params: params,
                                checkAccess: checkAccess,
                                // user: funcs.cloneObj(user, 5)
                            }
                            user.roleModel.checkParam(o, (err, res) => {
                                if (err) return cb(err, o)
                                accesses = (res.data && res.data.accesses) ? [...accesses, ...res.data.accesses] : accesses
                                denies = (res.data && res.data.denies) ? [...denies, ...res.data.denies] : [...denies]
                                // denies = [...denies, ...access_by_role_res.data.denies];

                                // access_by_role_res = res.data; // flag внутри data
                                access_by_role_res = res // flag внутри data
                                if (access_by_role_res.flag === false) {
                                    access_by_role_res.role = role_sysname
                                    access_by_role_res.object = object
                                    access_by_role_res.command = command
                                    access_by_role_res.o = o
                                    access_by_role_res.msg = 'Не прошли по одному из параметров. Рассмотрим следующую роль'
                                    // Не прошли по одному из параметров. Рассмотрим следующую роль (не cb, а cb_EACH)
                                    return cb_EACH(null) // Запрещено ролью
                                }
                                cb(null) // Пока все ок, проверим следующий параметр
                            })
                        }, (err, res) => {
                            if (err) {
                                return cb(err)
                            }
                            // access_by_role_res = res.data; // flag внутри data
                            access_by_role_obj = {role: role_sysname}
                            if (access_by_role_res.flag === true) {
                                access_by_role_res.role = role_sysname
                                access_by_role_res.object = object
                                access_by_role_res.command = command
                                access_by_role_res.msg = 'Разрешено ролью'
                                return cb_GLOBAL_CHECK(null)
                            } // Результат найден. Вызовем глобальный коллбек, а eachSeries продолжать не будем.
                            cb_EACH(null) // Запрещено ролью
                        })

                    }, cb_GLOBAL_CHECK)
                },
                processFlag: cb => {
                    if (access_by_role_res.flag === true) {
                        if (accesses.length) params.accesses = [...accesses]
                        return cb(null)
                    }
                    // if (typeof access_by_role_res.flag === 'undefined') return cb(null);
                    // if (access_by_role_res.flag instanceof UserError || access_by_role_res.flag instanceof UserOk || access_by_role_res.flag instanceof MyError)
                    //     return cb(access_by_role_res.flag);
                    return cb(new UserError('noAccessRole', {
                        msg2: '',
                        access_by_role_res: access_by_role_res,
                        command: command,
                        object: object,
                        params: params
                    }))

                }
            }, cb)
        },
        do: cb => {
            if (checkAccess) return cb(null, new UserOk('noToastr'))
            // Выполнить действие или вернуть класс
            if (command == '_getClass') return cb(null, _class)
            if (command == '_clearCache') {
                for (var key in global.classes) {
                    if (key.indexOf(object + '_-_') === 0) {
                        global.classesCache[object] = {}
                        if (client_object) delete global.classes[key][client_object]
                        else global.classes[key] = {}
                    }
                }
                return cb(null, new UserOk('The class / client cache has been successfully cleared.'))
            }
            if (command == '_clearCacheAll') {
                for (var key2 in global.classes) {
                    if (key2.indexOf(object) === 0) {
                        global.classesCache[object] = {}
                        global.classes[key2] = {}
                        delete global.classes[key2]
                    }
                }
                return cb(null, new UserOk('Class cache successfully cleared for all client objects.')) //Кеш класса успешно очищен для всех клиентских объектов
            }
            if (command == '_getTimes') {
                return cb(null, new UserOk('See console', {times: global.times}))
            }
            if (typeof _class !== 'object') return cb(new MyError('The class is not an object.'))
            if (typeof _class[command] !== 'function') return cb(new MyError('The class does not have this method.', {
                method: command,
                object: object
            }))
            _class.is_busy = true

            if (fromClient) delete params.doNotCheckList
            if (!is_access_by_list) {
                params.doNotCheckList = true
            } // Доступ выдан на высоком уровне, проверять список не нужно.

            _class[command](params, function(err, res, additionalData) {
                if (err) {
                    console.log(moment().format('DD.MM.YYYY HH:mm:ss'), err)
                }
                delete _class.is_busy
                cb(err, res)
                // cb(err, res, additionalData);
            })
        }
    }, (err, resAll, additionalData) => {

        // Проверить на ошибки
        let res = resAll.do
        var end_time = moment()
        var request_time = end_time.diff(t1)
        if (debug) console.info(fromClientConsole + apiRID, ' ← Time:', request_time, end_time.format('DD.MM.YYYY HH:mm:ss'), 'API LOG END(' + sid + '):', command, object, paramsConsoleJSON)
        if (err) {

            //if (err instanceof UserError && !obj.params.fromServer) {
            if (err instanceof UserOk) {
                getCode({name: 'ok', params: err, user: user}, function(code_err, code_res) {
                    if (code_err) return cb(code_err, request_time)
                    return cb(null, code_res, request_time)
                })
                return
                // return cb(null, getCode('ok', err), request_time);
            }
            // if (checkAccess) err.message = new UserError('noToastrErr',{...err.data});
            // if (checkAccess) err.message = 'noToastrErr';
            if (err instanceof UserError && !!fromClient) {
                getCode({name: err.message, params: err.data, user: user}, function(code_err, code_res) {
                    if (code_err) return cb(code_err, request_time)
                    return cb(null, code_res, request_time)
                })
                return
                // return cb(null, getCode(err.message, err.data), request_time);
            } else {
                //console.log(err.stack);
                getCode({name: (err.code || 'sysError'), user: user}, function(code_err, code_res) {
                    if (code_err) return cb(code_err, request_time)
                    return cb(err, code_res, request_time)
                })
                return
                // return cb(err, getCode(err.code || 'sysError'), request_time);
            }
        }
        // выполнить форматирование результата
        if (res instanceof UserOk) {
            if (debug) {
                res.denies = [...denies]
                res.acccess = [...accesses]
            }
            if (additionalData) {
                getCode({name: 'ok', params: res, user: user}, function(code_err, code_res) {
                    if (code_err) return cb(code_err)
                    return cb(null, code_res, additionalData, request_time)
                })
                return
                // return cb(null, getCode('ok', res), additionalData, request_time);
            }
            getCode({name: 'ok', params: res, user: user}, function(code_err, code_res) {
                if (code_err) return cb(code_err)
                return cb(null, code_res, request_time)
            })
            return
            // return cb(null, getCode('ok', res), request_time);
        }
        if (additionalData) return cb(null, res, additionalData, request_time)
        cb(null, res, request_time)
    })

    // async.waterfall(
    //     [
    //
    //         function (cb) {
    //             // Проверим аргументы
    //             command = obj.command;
    //             if (!command) return cb(new MyError('The request does not contain a command'));
    //             object = obj.object;
    //             if (!object) return cb(new UserError({code:'noClass'},{obj:obj}));
    //             var dot_object = object.replace(/\.\w+/ig,'');
    //             var dot_client_object = object.replace(/\w+\.*/,'');
    //             if (dot_client_object) {
    //                 object = dot_object;
    //                 client_object = dot_client_object;
    //             }
    //             object = object.toLowerCase();
    //             object = object.charAt(0).toUpperCase() + object.substr(1);
    //
    //             // console.log('\nAPI ==>>\n', command, object, params, fromClient);
    //
    //             cb(null);
    //         },
    //         function (cb) {
    //             // log in console all requests
    //
    //             var excludedParams = ['password'];
    //             var paramsConsole = funcs.cloneObj(params);
    //             // paramsConsole
    //             for (var i in excludedParams) {
    //                 delete paramsConsole[excludedParams[i]];
    //             }
    //             if (paramsConsole)
    //             paramsConsoleJSON = JSON.stringify(paramsConsole).substr(0,5000);
    //             console.info(fromClientConsole + apiRID, ' → ', now_time.format('DD.MM.YYYY HH:mm:ss'), 'API LOG (' + sid  + '):' ,command, object, paramsConsoleJSON);
    //             global.times.log_time += moment().diff(now_time);
    //             cb(null);
    //         },
    //         function (cb) {
    //             //checkAccess
    //             // Если выйдем из функции раньше загрузки доступов пользователя, то доступ разрешен по одной из причин.
    //             // Если нет, то сменим флаг, чтобы дальнейшие проверки включились
    //             is_access_important = true;
    //             var doNotCheckCommands = {
    //                 Any:['_getClass'],
    //                 User:['login','logout']
    //             };
    //             var doNotCheckCommandsFromServer = {
    //                 // User_site:['get','add','remove'],
    //                 User:['get'],
    //                 access_to_operation:['get']
    //             };
    //             // Требует ли команда проверки доступа
    //             if (doNotCheckCommands.Any.indexOf(command)!==-1) return cb(null);
    //             if (typeof doNotCheckCommands[object]==='object'){
    //                 if (doNotCheckCommands[object].indexOf(command)!==-1) return cb(null);
    //             }
    //             // Требует ли команда проверки доступа для комманд с сервера
    //             if (typeof doNotCheckCommandsFromServer[object]==='object'){
    //                 if (doNotCheckCommandsFromServer[object].indexOf(command)!==-1 && !fromClient) return cb(null);
    //             }
    //             // Если требуется -> проверим.
    //             if (!user.authorized) {
    //                 return cb(new UserError('noAuth'));
    //             }
    //
    //             if (!fromClient) return cb(null); // Для авторизованных пользователей, все операции внутри сервера разрешены
    //
    //             // Разрешим все _sub_table_select_
    //             // if (command.indexOf('_sub_table_select_') !== -1) return cb(null);
    //             if (object.indexOf('_sub_table_select_') !== -1) return cb(null);
    //
    //             if (user.user_data.user_type_sysname === 'ADMIN') return cb(null);
    //             // if (user.user_data.user_type_sysname === 'SITE') return cb(null);
    //             // if (user.user_data.email !== 'test') return cb(null);
    //
    //
    //             // is_access_important = false;
    //
    //             async.series({
    //                 loadUserAccessList:function(cb){
    //                     if (user.access_list && !user.need_reload_access_list) return cb(null); // Уже загружен и не требует перезагрузки
    //                     // var o = {
    //                     //     command:'load_access',
    //                     //     object:'User',
    //                     //     params:{
    //                     //         id:user
    //                     //     }
    //                     // };
    //                     // cb(null);
    //                     user.loadAccess({}, function(err, res){
    //                         if (err) {
    //                             console.log('An error occurred while verifying the accesses.', err);
    //                             return cb(new UserError('An error occurred while verifying the accesses.',{err:err}));
    //                         }
    //                         cb(null);
    //                     })
    //                 },
    //                 check:function(cb){
    //                     if (!user.access_list[object]) {
    //                         logAccessDenied.log(obj, user, api);
    //                         return cb(new UserError('noAccess',{obj:obj, msg2:'Не указан для класса'}));
    //                     } // Класс не указан - запретить
    //                     if (user.access_list[object].is_denied) return cb(new UserError('noAccess',{obj:obj, msg2:'Запрещен галочкой для класса'})); // Запрещен галочкой
    //                     if (user.access_list[object].is_access) {
    //                         if (user.access_list[object].is_access_by_list) is_access_by_list = true;
    //                         return cb(null);
    //                     } // Доступ открыт для всего класса - открыть
    //                     // if (user.access_list[object].is_access_by_list) {
    //                     //     return cb(null);
    //                     // } // Доступ открыт для комманды по списку - открыть
    //
    //                     if (!user.access_list[object].operations[command]) {
    //                         logAccessDenied.log(obj, user, api);
    //                         return cb(new UserError('noAccess',{obj:obj, msg2:'Не указан для комманды'}));
    //                     } // Команда не указана - запретить
    //
    //                     if (user.access_list[object].operations[command].is_denied) return cb(new UserError('noAccess',{obj:obj, msg2:'Запрещен галочкой для комманды'})); // Запрещен галочкой
    //                     if (user.access_list[object].operations[command].is_access) {
    //                         if (user.access_list[object].operations[command].is_access_by_list) is_access_by_list = true;
    //                         return cb(null);
    //                     } // Доступ открыт для комманды - открыть
    //                     logAccessDenied.log(obj, user, api);
    //                     return cb(new UserError('noAccess',{obj:obj, msg2:'Для операции снята галочка'}));
    //                 }
    //                 // Проверка доступа по списку перенесено ниже, там где инстанс класса уже получен.
    //                 // checkAccessByListOld:function(cb){
    //                 //     return cb(null);
    //                 //     // Проверка доступа по спискам для команд не 'get'. Для 'get' отдельный механизм
    //                 //     if (command === 'get') return cb(null); // get - открыть
    //                 //     if (!obj.params.id && !obj.params.ids) {
    //                 //         return cb(null); // Команда не предусматривает работу с конкретной записью, список не уместен - пропускаем
    //                 //     }
    //                 //
    //                 //     var list_of_access_ids = [];
    //                 //
    //                 //     var o = {
    //                 //         command:'get',
    //                 //         object:'list_of_access',
    //                 //         params:{
    //                 //             columns:['id','user_id','class_operation_id','record_id'],
    //                 //             param_where:{
    //                 //                 is_active:true
    //                 //             },
    //                 //             limit:10000000,
    //                 //             collapseData:false
    //                 //         }
    //                 //     };
    //                 //
    //                 //     if (user.access_list[object].operations[command] && user.access_list[object].operations[command].is_access){
    //                 //         if (!user.access_list[object].operations[command].is_access_by_list) return cb(null);// Доступ разрешен для комманды БЕЗ списка - открыть
    //                 //         // ------
    //                 //         if (!obj.params.id && !obj.params.ids) return cb(new UserError('noAccessByList',{msg:'Вероятно операция работает со многими записями.'}));
    //                 //
    //                 //         o.params.param_where.user_id = user.user_data.id;
    //                 //         o.params.param_where.class_operation_id = user.access_list[object].operations[command].class_operation_id;
    //                 //
    //                 //     } else if (user.access_list[object].is_access){
    //                 //         if (!user.access_list[object].is_access_by_list) return cb(null); // Доступ разрешен для класса БЕЗ списка - открыть
    //                 //         // ------
    //                 //         if (!obj.params.id && !obj.params.ids) return cb(new UserError('noAccessByList',{msg:'Вероятно операция работает со многими записями.'}));
    //                 //
    //                 //         o.params.param_where.user_id = user.user_data.id;
    //                 //         o.params.param_where.class_operation_id = user.access_list[object].class_operation_id;
    //                 //
    //                 //     }else{
    //                 //         return cb(null);
    //                 //     }
    //                 //     // if (user.access_list[object].is_access){
    //                 //     //     if (!user.access_list[object].is_access_by_list) return cb(null); // Доступ разрешен для класса БЕЗ списка - открыть
    //                 //     //     // ------
    //                 //     //     if (!obj.params.id && !obj.params.ids) return cb(new UserError('noAccessByList',{msg:'Вероятно операция работает со многими записями.'}));
    //                 //     //
    //                 //     //     o.params.param_where.user_id = user.user_data.id;
    //                 //     //     o.params.param_where.class_operation_id = user.access_list[object].class_operation_id;
    //                 //     //
    //                 //     // } else if (user.access_list[object].operations[command] && user.access_list[object].operations[command].is_access){
    //                 //     //     if (!user.access_list[object].operations[command].is_access_by_list) return cb(null);// Доступ разрешен для комманды БЕЗ списка - открыть
    //                 //     //     // ------
    //                 //     //     if (!obj.params.id && !obj.params.ids) return cb(new UserError('noAccessByList',{msg:'Вероятно операция работает со многими записями.'}));
    //                 //     //
    //                 //     //     o.params.param_where.user_id = user.user_data.id;
    //                 //     //     o.params.param_where.class_operation_id = user.access_list[object].operations[command].class_operation_id;
    //                 //     //
    //                 //     // }else{
    //                 //     //     return cb(null);
    //                 //     // }
    //                 //
    //                 //     api(o, function (err, res) {
    //                 //         if (err) return cb(new MyError('Не удалось получить list_of_access',{o : o, err : err}));
    //                 //         async.eachSeries(res, function(item, cb){
    //                 //             // получить parent
    //                 //             list_of_access_ids.push(item.record_id);
    //                 //
    //                 //             var o = {
    //                 //                 command:'getChildIds',
    //                 //                 object:object,
    //                 //                 params:{
    //                 //                     id:item.record_id,
    //                 //                     doNotCheckList:true
    //                 //                 }
    //                 //             };
    //                 //
    //                 //             api(o, function(err, res){
    //                 //                 if (err) return cb(err);
    //                 //                 for (var i in res.ids) {
    //                 //                     list_of_access_ids.push(res.ids[i]);
    //                 //                 }
    //                 //                 return cb(null);
    //                 //             }, user);
    //                 //         }, function(err, res){
    //                 //             if (err) return cb(err);
    //                 //             if (list_of_access_ids.indexOf(obj.params.id) === -1) return cb(new UserError('noAccess',{obj:obj, msg2:'Запрещен по списку'})); // Запрещен галочкой
    //                 //             cb(null);
    //                 //         });
    //                 //
    //                 //     }, user);
    //                 // }
    //             }, function(err, res){
    //                 if (err) { // Доступ закрыт по каким то причинам
    //                     is_access_important = false;
    //                     return cb(err);
    //                 }
    //                 // Доступ открыт условно (по списку) или безусловно
    //                 cb (null);
    //
    //             });
    //
    //         },
    //         function (cb) {
    //
    //
    //             // Подготовим alias
    //             var user_alias = '0';
    //             user_alias = sid;
    //             var alias = object + '_-_' + user_alias;
    //             var alias_client_object = client_object || 0;
    //             //if (client_object) alias += '_' + client_object;
    //             for (var i in object_params) {
    //                 alias += "&" + i + ":" + object_params[i];
    //             }
    //             global.classes[alias] = global.classes[alias] || {};
    //             var _class = global.classes[alias][alias_client_object];
    //             if (_class) {
    //                 //var checkBusy = function () {
    //                 //    if (!_class.is_busy){
    //                 //        console.log('Класс освободился, можно использовать');
    //                 //        return cb(null, _class);
    //                 //    }
    //                 //    setTimeout(function () {
    //                 //        checkBusy();
    //                 //    }, 1000);
    //                 //};
    //                 //checkBusy();
    //                 //if (_class.is_busy){
    //                 //
    //                 //}
    //                 _class.user = user;
    //                 return cb(null, _class);
    //             }
    //             // Если еще не создан, то создадим.
    //             var path = './classes/' + object + '.js';
    //             fs.access(path, function (err) {
    //                 // if (err) return cb(new MyError('Такого объекта(класса) не существует.', object));
    //                 if (err) {
    //                     getCode({name:'badClass',params:{object:object, command:command, params:params, user_id:user.user_data.id}}, function(code_err, code_res){
    //                         if (code_err) return cb(code_err);
    //                         return cb(code_res);
    //                     });
    //                     return;
    //                 }
    //                 var path_alias = funcs.hashCode(path);
    //                 var _Class;
    //                 if (!global.requiredClasses[path_alias]){
    //                     _Class = require('.' + path);
    //                     global.requiredClasses[path_alias] = _Class;
    //                 }else{
    //                     _Class = global.requiredClasses[path_alias];
    //                 }
    //
    //                 object_params.alias = alias;
    //                 var classInstance = new _Class({
    //                     name:object,
    //                     client_object:client_object,
    //                     params:params,
    //                     user:user
    //                 });
    //                 if (classInstance instanceof MyError) { // При создании класса произошла ошибка
    //                     return cb(new MyError('There was an error creating the class',{err:classInstance}));
    //                 }
    //                 if (classInstance instanceof UserError) { // При создании класса произошла ошибка (выдать на клиент)
    //                     return cb(classInstance);
    //                 }
    //                 if (typeof classInstance.init !=='function') {
    //                     return cb(new MyError('There is no init method for the class '+ object));
    //                 }
    //                 classInstance.init(params, function (err) {
    //                     if (err) return cb(new MyError('An error occurred while initializing the class.', err));
    //                     classInstance.alias = alias;
    //                     classInstance.alias_client_object = alias_client_object;
    //                     if (object!=='Table' && object!=='User'/* && alias_client_object!==0*/) {
    //                         if (typeof global.classes[alias]!=='object') global.classes[alias] = {};
    //                         global.classes[alias][alias_client_object] = classInstance;
    //                     }
    //                     cb(null, classInstance);
    //                 });
    //             });
    //         },
    //         function(_class, cb){
    //             if (typeof _class.loadProfile !== 'function') return cb(null, _class);
    //             _class.loadProfile(params, function(err, res){
    //                 return cb(err, _class);
    //             });
    //         },
    //         function(_class, cb){
    //             // Проверка доступа по спискам для команд не 'get'. Для 'get' отдельный механизм
    //             if (!is_access_by_list) return cb(null, _class); // Доступ уже был выдан, список проверять не надо
    //             if (command === 'get') return cb(null, _class); // get - открыть
    //             if (!obj.params.id && !obj.params.ids) {
    //                 return cb(null, _class); // Команда не предусматривает работу с конкретной записью, список не уместен - пропускаем
    //             }
    //
    //             var params = {
    //                 command: command
    //             }
    //
    //             _class.getAccessList(params, function (err, res) {
    //                 if (err) return cb(new MyError('Не удалось загрузить список доступных записей. API', {
    //                     params: params,
    //                     err: err
    //                 }));
    //                 if (res.list_of_access_ids.indexOf(obj.params.id) === -1) return cb(new UserError('noAccess', {
    //                     obj: obj,
    //                     msg2: 'Запрещен по списку'
    //                 })); // Запрещен галочкой
    //                 cb(null, _class);
    //             });
    //         },
    //         function (_class, cb) {
    //             // Выполнить действие или вернуть класс
    //             if (command=='_getClass') return cb(null, _class);
    //             if (command=='_clearCache') {
    //                 for (var key in global.classes) {
    //                     if (key.indexOf(object + '_-_')===0){
    //                         global.classesCache[object] = {};
    //                         if (client_object) delete global.classes[key][client_object];
    //                         else global.classes[key] = {};
    //                     }
    //                 }
    //                 return cb(null, new UserOk('The class / client cache has been successfully cleared.'));
    //             }
    //             if (command=='_clearCacheAll') {
    //                 for (var key2 in global.classes) {
    //                     if (key2.indexOf(object)===0){
    //                         global.classesCache[object] = {};
    //                         global.classes[key2] = {};
    //                         delete global.classes[key2];
    //                     }
    //                 }
    //                 return cb(null, new UserOk('Class cache successfully cleared for all client objects.')); //Кеш класса успешно очищен для всех клиентских объектов
    //             }
    //             if (command=='_getTimes') {
    //                 return cb(null, new UserOk('See console',{times:global.times}));
    //             }
    //             if (typeof _class !== 'object') return cb(new MyError('The class is not an object.'));
    //             if (typeof _class[command] !== 'function') return cb(new MyError('The class does not have this method.', {method: command, object:object}));
    //             _class.is_busy = true;
    //
    //             if (fromClient) delete params.doNotCheckList;
    //             if (!is_access_by_list) {
    //                 params.doNotCheckList = true;
    //             } // Доступ выдан на высоком уровне, проверять список не нужно.
    //
    //             _class[command](params, function (err, res, additionalData) {
    //                 if (err){
    //                     console.log(err);
    //                 }
    //                 delete _class.is_busy;
    //                 cb(err, res);
    //                 // cb(err, res, additionalData);
    //             });
    //         }
    //     ], function (err, res, additionalData) {
    //         // Проверить на ошибки
    //         var end_time = moment();
    //         var request_time = end_time.diff(t1);
    //         console.info(fromClientConsole + apiRID, ' ← Time:', request_time, end_time.format('DD.MM.YYYY HH:mm:ss'), 'API LOG END(' + sid  + '):' ,command, object, paramsConsoleJSON);
    //         if (err) {
    //             //if (err instanceof UserError && !obj.params.fromServer) {
    //             if (err instanceof UserOk) {
    //                 getCode({name:'ok',params: err, user:user}, function(code_err, code_res){
    //                     if (code_err) return cb(code_err);
    //                     return cb(null, code_res, request_time);
    //                 });
    //                 return;
    //                 // return cb(null, getCode('ok', err), request_time);
    //             }
    //             if (err instanceof UserError && !!fromClient) {
    //                 getCode({name:err.message, params: err.data, user:user}, function(code_err, code_res){
    //                     if (code_err) return cb(code_err);
    //                     return cb(null, code_res, request_time);
    //                 });
    //                 return;
    //                 // return cb(null, getCode(err.message, err.data), request_time);
    //             } else {
    //                 //console.log(err.stack);
    //                 getCode({name:(err.code || 'sysError'), user:user}, function(code_err, code_res){
    //                     if (code_err) return cb(code_err);
    //                     return cb(err, code_res, request_time);
    //                 });
    //                 return;
    //                 // return cb(err, getCode(err.code || 'sysError'), request_time);
    //             }
    //         }
    //         // выполнить форматирование результата
    //         if (res instanceof UserOk) {
    //             if (additionalData) {
    //                 getCode({name:'ok',params: res, user:user}, function(code_err, code_res){
    //                     if (code_err) return cb(code_err);
    //                     return cb(null, code_res, additionalData, request_time);
    //                 });
    //                 return;
    //                 // return cb(null, getCode('ok', res), additionalData, request_time);
    //             }
    //             getCode({name:'ok',params: res, user:user}, function(code_err, code_res){
    //                 if (code_err) return cb(code_err);
    //                 return cb(null, code_res, request_time);
    //             });
    //             return;
    //             // return cb(null, getCode('ok', res), request_time);
    //         }
    //         if (additionalData) return cb(null, res, additionalData, request_time);
    //         cb(null, res, request_time);
    //     }
    // );
}

module.exports = api
