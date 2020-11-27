var async = require('async')
var MyError = require('../../error/index').MyError
var UserError = require('../../error/index').UserError
var UserOk = require('../../error/index').UserOk

var funcs = require('../../libs/functions')
var Table = require('./Table')
var api = require('../../libs/api')
var rollback = require('../../modules/rollback')
var moment = require('moment')

var config = require('../../config')
var debug = config.get('isDeveloper') || config.get('debug')

/**
 * * Function constructor, creates a standard model for working with tables in Mysql
  * Has standard get / add / modify / remove methods
  * @obj params {}
  * Required parameter is yavl. params.name (contains the name of the class from which the table name is formed in mySQL)
  * table_en Russian name of the table, to form the text of errors.
  ending ending in the error text (object deleted / deleted / deleted) // 'o' 'a' ''
  * required_fields = array of required fields. If these fields are not passed when adding, the add function will return an osh. about it
  * not_insertable = array containing the names of fields that are forbidden to edit. This array is always appended with 'created'
  * this.blob_fields An array of fields that are chained in binary form and require formatting after receipt.
  * this.defaults = Array of objects, default values
 *
 * Функция конструктор, создает стандартную модель для работы с таблицами в Mysql
 * Имеет стандартные методы get/add/modify/remove
 * @obj params {}
 * Обязательным параметром явл. params.name (содержит имя класса из которого формируется имя таблицы в mySQL)
 * table_ru Русское наименование таблицы, для формирования текста ошибок.
 * ending окончание в тексте ошибок (объект удален/удалена/удалено) // 'о' 'а' ''
 * required_fields = массив обязательных полей. Если при добавлении эти поля не переданы, функция add вернет ош. об этом
 * not_insertable = массив содержащий имена полей, запрещенных к редактированию. В этот массив всегда добавляется 'created'
 * this.blob_fields Массив полей которые хронятся в двоичном виде и требуют форматирования после получения.
 * this.defaults = Массив объектов, значения по умолчанию
 * @returns {boolean}
 * @constructor
 */
var MySQLModel = function(obj) {
    if (debug) console.log('creating new MySQLModel ....', obj.name, obj.client_object || 'no_CO')
    var _t = this
    if (typeof obj !== 'object') {
        throw new MyError('Не верно вызвана функция конструктор в MySQLModel.js')
    }
    _t.tableName = obj.name.toLowerCase()
    _t.user = obj.user || {sid: '0'}
    _t.name = obj.name
    _t.data_cache_alias = obj.name + '_' + (obj.client_object || '0') + '_' + _t.user.sid
    _t.client_object = obj.client_object
    _t.cache = {}
    _t.columns = []
    _t.uniqueColumns = []
    _t.required_fields = []
    _t.is_inherit_fields = {} // Все которые нужны в конечном запросе (columns)
    _t.is_inherit_fields_real_value = {} // Только те которые проверяются на значения. Отдельный объект, чтобы был короче цикл
    _t.not_insertable = ['created']
    _t.validation = {}
    _t.init_params = obj.params || {}
    _t.dynamic_field_input_arr = []
    _t.dynamic_field_tables_for_clear_cache = {}
    _t.current_dynamic_field_alias = ''
    _t.dynamic_field_pair = []

    this.validationFormats = {
        notNull: {
            format: '<значение>',
            example: 'строка, число, дата...'
        },
        number: {
            format: '<число>',
            example: '10'
        },
        url: {
            format: '<Протокол>://<адрес>',
            example: 'http://example.ru'
        },
        email: {
            format: '<Имя>@<домен>',
            example: 'user@example.ru'
        }
    }
    this.beforeFunction = {
        get: function(obj, cb) {
            cb(null, null)
        },
        add: function(obj, cb) {
            cb(null, null)
        },
        modify: function(obj, cb) {
            cb(null, null)
        },
        remove: function(obj, cb) {
            cb(null, null)
        }
    }
    this.prepareResult = function(rows, profile) {
        for (var i in rows) {
            // Берем тип данных для этого поля и преобразуем null -> '', 1/0 --> true/false
            if (typeof profile[i] != 'object') continue
            if (rows[i] === 'NULL') rows[i] = null
            if (rows[i] === null && profile[i].type !== 'tinyint') {
                rows[i] = ''
                continue
            }

            if (profile[i].type == 'tinyint' && profile[i].field_length == 1) rows[i] = !!rows[i]
        }
        return rows
    }
    this.getFormatingFunc = function(rows, params) {
        if (!Array.isArray(rows)) {
            var isSingleValue = true
            rows = [rows]
        }
        var formatData = function(field, field_type, profile) {
            var formatFuncName = profile.get_formating || (function() {
                switch (field_type) {
                    case "date":
                        return 'userFriendlyDate'
                        break
                    case "datetime":
                        return 'userFriendlyDateTime'
                        break
                    case "blob":
                    case "mediumblob":
                    case "longblob":
                        return 'parseBlob'
                        break
                    case "tinyint":
                        return (profile.field_length == 1) ? 'parseBool' : null
                        break
                    case "DECIMAL(10, 2)":
                    case "DECIMAL(15, 2)":
                    case "DECIMAL(50, 2)":
                        return 'formatMoney'
                        break
                    case "DECIMAL(3, 2)":
                        return 'formatPercent'
                        break
                    default :
                        return null
                        break
                }
            })()
            if (formatFuncName) {
                if (typeof _t[formatFuncName] == 'function') return _t[formatFuncName](field, {
                    params: params,
                    profile: profile
                })
                if (typeof funcs[formatFuncName] == 'function') return funcs[formatFuncName](field)
            }
            return field
        }
        for (var i in rows) {
            /*if (rows[i].name.indexOf('MySQLvariable')!==-1) {
             delete rows[i];
             continue;
             }*/
            var row = rows[i]
            for (var j in row) {
                if (row[j] === null) row[j] = ''
                var field = row[j]
                if (j.indexOf('MySQLvariable') > -1) {
                    delete rows[i][j]
                    continue
                }
                var profile = _t.class_fields_profile[j]
                if (!profile) continue
                var field_type = profile.type
                rows[i][j] = formatData(field, field_type, profile)
            }
        }
        return (isSingleValue) ? (rows.length) ? rows[0] : [] : rows
    }
    this.setFormatingFunc = function(row) {
        for (var i in row) {
            var field = row[i]
            if (field === null) continue
            var profile = _t.class_fields_profile[i]
            var field_type = profile.type.replace(/\W|[0-9]/ig, '').toLowerCase()
            var formatFuncName = profile.set_formating || (function() {

                switch (field_type) {
                    case "date":
                        return 'getDateMySQL'
                        break
                    case "datetime":
                        return 'getDateTimeMySQL'
                        break
                    case "int":
                    case "bigint":
                    case "decimal":
                        if (field === '') row[i] = null
                        return null
                        break
                    default :
                        return null
                        break
                }
            })()
            if (formatFuncName) {
                if (typeof _t[formatFuncName] == 'function') {
                    row[i] = [formatFuncName](field)
                } else if (typeof funcs[formatFuncName] == 'function') {
                    row[i] = funcs[formatFuncName](field)
                }
            }
        }
        return row
    }
    this.loadDefaultValues = function(obj, cb, additional_params) {

        if (typeof additional_params !== 'object') additional_params = {}
        var standart = additional_params.standart
        var is_virtual = additional_params.is_virtual || true
        if (standart) {
            // загрузим стандартные значения
            for (var i in _t.class_fields_profile) {
                var colProfile = _t.class_fields_profile[i]
                var columnName = colProfile.column_name
                if (typeof colProfile !== 'object') continue
                var colValue = obj[columnName]
                if (typeof colValue === 'undefined' && colProfile.default_value && !colProfile.is_virtual) {
                    obj[columnName] = colProfile.default_value
                }
            }
        }
        if (!is_virtual) return cb(null, obj)
        // Загрузим значения по умолчанию для is_virtual полей
        async.eachSeries(_t.class_fields_profile, function(item, cb) {
            var columnName = item.column_name
            if (typeof item !== 'object') return cb(new MyError('Не удалось получить профайл колонки...', i))
            var colValue = obj[columnName]
            if (typeof colValue === 'undefined' && item.is_virtual && item.default_value) {
                // Загрузим необходимый default
                if (typeof obj[item.keyword] !== 'undefined') return cb(null)
                var o = {
                    command: 'get',
                    object: item.from_table,
                    params: {
                        columns: ['id'],
                        collapseData: false,
                        where: [
                            {
                                key: 'sysname',
                                val1: item.default_value
                            }
                        ]
                    }
                }
                _t.api(o, function(err, res) {

                    if (err || typeof res !== 'object') {
                        console.log('Не удалось получить значение по умолчанию для поля ' + columnName, err, res)
                        return cb(null)
                    }
                    if (!res.length) {
                        console.log('Нет записей в ' + item.from_table + 'с sysname = ' + item.default_value + ' для поля ' + columnName)
                        return cb(null)
                    }
                    obj[item.keyword] = res[0].id
                    cb(null)
                })
            } else if (typeof colValue === 'undefined' && item.default_value) {
                obj[columnName] = item.default_value
                return cb(null)
            } else {
                cb(null)
            }
        }, function(err) {
            return cb(err, obj)
        })
    }
}

MySQLModel.prototype.init = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this
    // Выполним инициализацию MySQLModel

    // var alias =
    async.series([
        function(cb) {
            // Загрузим профайл классов описывающий профайлы всех: class_profile, class_fields_profile, client_object_profile, client_object_fields_profile
            // Load a class profile describing the profiles of all: class_profile, class_fields_profile, client_object_profile, client_object_fields_profile
            if (!global.MySQLModel_profile) {
                global.MySQLModel_profile = {}
            }
            _t.profile_fields = global.MySQLModel_profile.profile_fields
            _t.fields_profile_fields = global.MySQLModel_profile.fields_profile_fields
            _t.co_profile_fields = global.MySQLModel_profile.co_profile_fields
            _t.co_fields_profile_fields = global.MySQLModel_profile.co_fields_profile_fields
            async.series([
                function(cb) {
                    if (typeof _t.profile_fields == 'object') return cb(null) // Уже загружен
                    async.waterfall([
                        pool.getConn,
                        function(conn, cb) {
                            conn.queryValue("SELECT id FROM class_profile WHERE name = 'class_profile'", function(err, value) {
                                conn.release()
                                if (err) return cb(new MyError('Не удалось получить id для class_profile', {err: err}))
                                if (!value) return cb(new MyError("Нет id для class_profile в таблице class_profile"))
                                _t.class_profile_id = global.MySQLModel_profile.class_profile_id = value
                                return cb(null)
                            })
                        },
                        pool.getConn,
                        function(conn, cb) {
                            conn.select("class_fields_profile", '*', {class_id: _t.class_profile_id}, function(err, res) {
                                conn.release()
                                if (err) return cb(new MyError('Не удалось загрузить профиль таблицы.', {
                                    tableName: "class_fields",
                                    err: err
                                }))
                                if (res.length == 0) return cb(new MyError('Нет профиля для этой таблицы..', {tableName: "class_fields"}))
                                _t.profile_fields = {}
                                for (var i in res) {
                                    _t.profile_fields[res[i].column_name] = res[i]
                                }
                                global.MySQLModel_profile.profile_fields = _t.profile_fields
                                cb(null)
                            })
                        }
                    ], cb)
                },
                function(cb) {
                    if (typeof _t.fields_profile_fields == 'object') return cb(null) // Уже загружен
                    async.waterfall([
                        pool.getConn,
                        function(conn, cb) {
                            conn.queryValue("SELECT id FROM class_profile WHERE name = 'class_fields_profile'", function(err, value) {
                                conn.release()
                                if (err) return cb(new MyError('Не удалось получить id для class_profile'))
                                if (!value) return cb(new MyError("Нет id для class_profile в таблице class_profile"))
                                _t.class_profile_fields_id = global.MySQLModel_profile.class_profile_fields_id = value
                                return cb(null)
                            })
                        },
                        pool.getConn,
                        function(conn, cb) {
                            conn.select("class_fields_profile", '*', {class_id: _t.class_profile_fields_id}, function(err, res) {
                                conn.release()
                                if (err) return cb(new MyError('Не удалось загрузить профиль таблицы.', {
                                    tableName: "class_fields_profile",
                                    err: err
                                }))
                                if (res.length == 0) return cb(new MyError('Нет профиля для этой таблицы..', {tableName: "class_fields_profile"}))
                                _t.fields_profile_fields = {}
                                for (var i in res) {
                                    _t.fields_profile_fields[res[i].column_name] = res[i]
                                }
                                global.MySQLModel_profile.fields_profile_fields = _t.fields_profile_fields
                                cb(null)
                            })
                        }
                    ], cb)
                },
                function(cb) {
                    if (typeof _t.co_profile_fields == 'object') return cb(null) // Уже загружен
                    async.waterfall([
                        pool.getConn,
                        function(conn, cb) {
                            conn.queryValue("select id from class_profile where name = 'client_object_profile'", function(err, value) {
                                conn.release()
                                if (err) return cb(new MyError('Не удалось получить id для client_object_profile'))
                                if (!value) return cb(new MyError("Нет id для client_object_profile в таблице class_profile"))
                                _t.co_profile_id = global.MySQLModel_profile.co_profile_id = value
                                return cb(null)
                            })
                        },
                        pool.getConn,
                        function(conn, cb) {
                            conn.select("class_fields_profile", '*', {class_id: _t.co_profile_id}, function(err, res) {
                                conn.release()
                                if (err) return cb(new MyError('Не удалось загрузить профиль таблицы.', {
                                    tableName: "class_fields_profile",
                                    err: err
                                }))
                                if (res.length == 0) return cb(new MyError('Нет профиля для этой таблицы..', {tableName: "class_fields"}))
                                _t.co_profile_fields = {}
                                for (var i in res) {
                                    _t.co_profile_fields[res[i].column_name] = res[i]
                                }
                                global.MySQLModel_profile.co_profile_fields = _t.co_profile_fields
                                cb(null)
                            })
                        }
                    ], cb)
                },
                function(cb) {

                    if (typeof _t.co_fields_profile_fields == 'object') return cb(null) // Уже загружен
                    async.waterfall([
                        pool.getConn,
                        function(conn, cb) {
                            conn.queryValue("SELECT id FROM class_profile WHERE name = 'client_object_fields_profile'", function(err, value) {
                                conn.release()
                                if (err) return cb(new MyError('Не удалось получить id для client_object_fields_profile'))
                                if (!value) return cb(new MyError("Нет id для client_object_fields_profile в таблице class_profile"))
                                _t.co_profile_fields_id = global.MySQLModel_profile.co_profile_fields_id = value
                                return cb(null)
                            })
                        },
                        pool.getConn,
                        function(conn, cb) {
                            //conn.select("client_object_fields_profile",'*', {client_object_id:_t.co_profile_fields_id}, function (err, res) {
                            conn.select("class_fields_profile", '*', {class_id: _t.co_profile_fields_id}, function(err, res) {
                                conn.release()
                                if (err) return cb(new MyError('Не удалось загрузить профиль таблицы.', {
                                    tableName: "co_fields_profile_fields",
                                    err: err
                                }))
                                if (res.length == 0) return cb(new MyError('Нет профиля для этой таблицы..', {tableName: "co_fields_profile_fields"}))
                                _t.co_fields_profile_fields = {}
                                for (var i in res) {
                                    // if (res[i].column_name === 'dynamic_field_id') debugger;
                                    _t.co_fields_profile_fields[res[i].column_name] = res[i]
                                }
                                global.MySQLModel_profile.co_fields_profile_fields = _t.co_fields_profile_fields
                                cb(null)
                            })
                        }
                    ], cb)
                }
            ], cb)
        },
        function(cb) {
            // Проверим существование таблицы / Let's check the existence of a table
            _t.table = new Table({params: {name: _t.tableName, user: _t.user}})
            if (_t.table instanceof MyError) return cb(_t.table)
            // Не будем вызывать функцию init так как нам не нужно загружать структуру из файла. / Do not call the init function, since we do not need to load the structure from the file.
            _t.table.checkExist(function(err, info) {
                if (err) {
                    return cb(err)
                }
                if (!info) {
                    return cb(new MyError('Таблица в базе еще не создана', {table: _t.tableName}))
                }
                cb(null)
            })
        }
        ,
        function(cb) {
            // load profile for current class
            _t.loadProfile(obj, cb)
        }

        // ,
        // function (cb) {
        //     // Загрузим профайл запрашиваемого класса / Load the profile of the requested class
        //     async.waterfall([
        //         pool.getConn,
        //         function (conn, cb) {
        //             // Выполним запрс и запишим результат
        //             conn.select("class_profile", '*', {name: _t.tableName}, function (err, res) {
        //                 conn.release();
        //                 if (err) {
        //                     err.msg = err.message;
        //                     return cb(new MyError('Не удалось загрузить профиль таблицы.', {
        //                         tableName: _t.tableName,
        //                         err: err
        //                     }));
        //                 }
        //                 if (res.length == 0) return cb(new MyError('Нет профиля для этой таблицы..', {tableName: _t.tableName}));
        //                 if (res.length > 1) return cb(new MyError('База содержит более одного профиля.', {
        //                     tableName: _t.tableName,
        //                     res: res
        //                 }));
        //                 _t.class_profile = _t.prepareResult(res[0], _t.profile_fields);
        //                 _t.class_profile.primary_key = _t.class_profile.primary_key || 'id';
        //                 _t.class_profile.prepare_insert = '';
        //                 _t.class_profile.server_parent_table = (_t.class_profile.server_parent_table)? _t.class_profile.server_parent_table.split(',') : [];
        //                 _t.class_profile.server_parent_key = (_t.class_profile.server_parent_key)? _t.class_profile.server_parent_key.split(',') : [];
        //                 // надо проверить, был ли передан parent_id и если был, то получить его deep / It is necessary to check whether parent_id has been passed and if there was, then get it deep
        //                 _t.class_profile.parent_key_index = _t.class_profile.server_parent_table.indexOf(_t.class_profile.name);
        //
        //                 _t.class_profile.main_parent_key = _t.class_profile.server_parent_key[_t.class_profile.parent_key_index];
        //                 cb(null);
        //             });
        //         },
        //         pool.getConn,
        //         function (conn, cb) {
        //             // Обновляем класс профайл на основе профайла клиентского объекта
        //             // Загрузим профайл клиентского объекта
        //             if (!_t.client_object) {
        //                 conn.release();
        //                 return cb(null);
        //             }
        //
        //
        //             //conn.select("client_object_profile",'*', {name:_t.client_object}, function (err, res) {
        //             //    conn.release();
        //             //    if (err) return cb(new MyError('Не удалось загрузить профиль клиентского объекта.',{client_object:_t.client_object, err:err}));
        //             //    //if (res.length == 0) return cb(new MyError('Нет профиля для этого клиентского объекта..',{client_object:_t.client_object}));
        //             //    if (res.length > 1) return cb(new MyError('База содержит более одного профиля.',{client_object:_t.client_object,res:res}));
        //             //    _t.client_object_profile = _t.prepareResult(res[0], _t.co_profile_fields);
        //             //    var excludeCols = ['id','published','deleted','created','updated'/*,'name'*/];
        //             //    for (var i in _t.client_object_profile) {
        //             //        if (excludeCols.indexOf(i)!==-1) continue;
        //             //        _t.class_profile[i] = _t.client_object_profile[i];
        //             //    }
        //             //    cb(null);
        //             //});
        //
        //             var ready_columns = [];
        //             var join_tables = [];
        //             var join_tables_list = [];
        //             var tableName = 'client_object_profile';
        //             var from_table_counter = {};
        //             for (var col in _t.co_profile_fields) {
        //                 var colProfile = _t.co_profile_fields[col];
        //                 if (colProfile.is_virtual && colProfile.concat_fields) continue; // Пропускаем concat_fields
        //                 if (!colProfile.is_virtual) {
        //                     if (ready_columns.indexOf(tableName + '.' + col) === -1) ready_columns.push(tableName + '.' + col);
        //                     continue;
        //                 }
        //                 if (!from_table_counter[colProfile.from_table]) from_table_counter[colProfile.from_table] = 1;
        //                 colProfile.from_table_alias = colProfile.from_table + from_table_counter[colProfile.from_table]++;
        //                 join_tables.push(' LEFT JOIN ' + colProfile.from_table + ' as ' + colProfile.from_table_alias + ' ON ' + tableName + '.' + colProfile.keyword + ' = ' + colProfile.from_table_alias + '.id');
        //                 var c_name_tmp = (colProfile.from_table_alias || colProfile.from_table) + '.' + colProfile.return_column + ' as ' + col;
        //                 if (ready_columns.indexOf(c_name_tmp) === -1) ready_columns.push(c_name_tmp);
        //                 _t.co_profile_fields[col].from_table_alias = colProfile.from_table_alias;
        //             }
        //             var sql = "SELECT " + ready_columns.join(', ') + " FROM " + tableName + join_tables.join('') + ' WHERE ' +
        //                 tableName + ".name = " + pool.escape(_t.client_object) + " AND " + tableName + ".class_id = " + pool.escape(_t.class_profile.id);
        //             //console.log(sql);
        //             //conn.select("client_object_profile",'*', {name:_t.client_object, class_id:_t.class_profile.id}, function (err, res) {
        //             conn.query(sql, function (err, res) {
        //                 conn.release();
        //                 if (err) {
        //                     err.msg = err.message;
        //                     return cb(new MyError('Не удалось загрузить профиль клиентского объекта.', {
        //                         client_object: _t.client_object,
        //                         err: err
        //                     }));
        //                 }
        //                 //if (res.length == 0) return cb(new MyError('Нет профиля для этого клиентского объекта..',{client_object:_t.client_object}));
        //                 if (res.length > 1) return cb(new MyError('База содержит более одного профиля.', {
        //                     client_object: _t.client_object,
        //                     res: res
        //                 }));
        //                 _t.client_object_profile = _t.prepareResult(res[0], _t.co_profile_fields);
        //                 var excludeCols = ['id', 'published', 'deleted', 'created', 'updated'/*,'name'*/];
        //                 for (var i in _t.client_object_profile) {
        //                     if (excludeCols.indexOf(i) !== -1) continue;
        //                     _t.class_profile[i] = _t.client_object_profile[i];
        //                 }
        //                 cb(null);
        //             });
        //         }
        //         //function (conn, cb) {
        //         //    // Обновляем класс профайл на основе профайла клиентского объекта
        //         //    // Загрузим профайл клиентского объекта
        //         //    if (!_t.client_object){
        //         //        conn.release();
        //         //        return cb(null);
        //         //    }
        //         //
        //         //    var ready_columns = [];
        //         //    var join_tables = [];
        //         //    var join_tables_list = [];
        //         //    var tableName = 'client_object_profile';
        //         //    var from_table_counter = {};
        //         //    for (var col in _t.co_fields_profile_fields) {
        //         //        var colProfile = _t.co_fields_profile_fields[col];
        //         //        if (colProfile.is_virtual && colProfile.concat_fields) continue; // Пропускаем concat_fields
        //         //        if (!colProfile.is_virtual) {
        //         //            ready_columns.push(tableName + '.' + col);
        //         //            continue;
        //         //        }
        //         //        if (!from_table_counter[colProfile.from_table]) from_table_counter[colProfile.from_table] = 1;
        //         //        colProfile.from_table_alias = colProfile.from_table + from_table_counter[colProfile.from_table]++;
        //         //        join_tables.push(' LEFT JOIN ' + colProfile.from_table + ' as ' + colProfile.from_table_alias + ' ON ' + tableName + '.' + colProfile.keyword + ' = ' + colProfile.from_table_alias + '.id');
        //         //        ready_columns.push((colProfile.from_table_alias || colProfile.from_table) + '.' + colProfile.return_column + ' as ' + col);
        //         //        _t.co_fields_profile_fields[col].from_table_alias = colProfile.from_table_alias;
        //         //    }
        //         //    var sql = "SELECT " + ready_columns.join(', ') + " FROM " + tableName + join_tables.join('') + ' WHERE ' +
        //         //        tableName +".name = "+ pool.escape(_t.client_object) +" AND "+ tableName +".class_id = " +pool.escape(_t.class_profile.id);
        //         //
        //         //    console.log(sql);
        //         //    //conn.select("client_object_profile",'*', {name:_t.client_object, class_id:_t.class_profile.id}, function (err, res) {
        //         //    conn.query(sql, function (err, res) {
        //         //        conn.release();
        //         //        if (err) return cb(new MyError('Не удалось загрузить профиль клиентского объекта.',{client_object:_t.client_object, err:err}));
        //         //        //if (res.length == 0) return cb(new MyError('Нет профиля для этого клиентского объекта..',{client_object:_t.client_object}));
        //         //        if (res.length > 1) return cb(new MyError('База содержит более одного профиля.',{client_object:_t.client_object,res:res}));
        //         //        _t.client_object_profile = _t.prepareResult(res[0], _t.co_profile_fields);
        //         //        var excludeCols = ['id','published','deleted','created','updated'/*,'name'*/];
        //         //        for (var i in _t.client_object_profile) {
        //         //            if (excludeCols.indexOf(i)!==-1) continue;
        //         //            _t.class_profile[i] = _t.client_object_profile[i];
        //         //        }
        //         //        cb(null);
        //         //    });
        //         //}
        //     ], cb)
        // },
        // function (cb) {
        //     // Загрузим профайл полей запрашиваемого класса / Load the profile of the fields of the requested class
        //     async.waterfall([
        //         pool.getConn,
        //         function (conn, cb) {
        //             // Выполним запрс и запишим результат
        //             var ready_columns = [];
        //             var join_tables = [];
        //             var join_tables_list = [];
        //             var tableName = 'class_fields_profile';
        //             var from_table_counter = {};
        //             for (var col in _t.fields_profile_fields) {
        //                 var colProfile = _t.fields_profile_fields[col];
        //                 if (colProfile.is_virtual && colProfile.concat_fields) continue; // Пропускаем concat_fields
        //                 if (!colProfile.is_virtual) {
        //                     if (ready_columns.indexOf(tableName + '.' + col) === -1) ready_columns.push(tableName + '.' + col);
        //                     continue;
        //                 }
        //                 if (!from_table_counter[colProfile.from_table]) from_table_counter[colProfile.from_table] = 1;
        //                 colProfile.from_table_alias = colProfile.from_table + from_table_counter[colProfile.from_table]++;
        //                 join_tables.push(' LEFT JOIN ' + colProfile.from_table + ' as ' + colProfile.from_table_alias + ' ON ' + tableName + '.' + colProfile.keyword + ' = ' + colProfile.from_table_alias + '.id');
        //                 var c_name_tmp = (colProfile.from_table_alias || colProfile.from_table) + '.' + colProfile.return_column + ' as ' + col;
        //                 if (ready_columns.indexOf(c_name_tmp) === -1) ready_columns.push(c_name_tmp);
        //                 _t.fields_profile_fields[col].from_table_alias = colProfile.from_table_alias;
        //             }
        //             var sql = "SELECT " + ready_columns.join(', ') + " FROM " + tableName + join_tables.join('') + ' WHERE class_id = ' + pool.escape(_t.class_profile.id) + ' ORDER BY sort_no';
        //             console.log(sql);
        //             conn.query(sql, function (err, res) {
        //                 conn.release();
        //                 if (err) {
        //                     err.msg = err.message;
        //                     return cb(new MyError('Не удалось загрузить профиль ПОЛЕЙ таблицы.', {
        //                         tableName: tableName,
        //                         err: err
        //                     }));
        //                 }
        //                 if (res.length == 0) {
        //                     return cb(new MyError('Нет профиля ПОЛЕЙ для этой таблицы..', {tableName: tableName}));
        //                 }
        //                 var class_fields_profile = {};
        //                 for (var i in res) {
        //                     class_fields_profile[res[i].column_name] = _t.prepareResult(res[i], _t.fields_profile_fields);
        //                     if (_t.columns.indexOf(res[i].column_name) === -1) _t.columns.push(res[i].column_name);
        //
        //                     if (class_fields_profile[res[i].column_name].concat_fields) {
        //                         class_fields_profile[res[i].column_name].concat_array = class_fields_profile[res[i].column_name].concat_fields.match(/(\S+|\s+)/ig);
        //                     }
        //                     class_fields_profile[res[i].column_name].lov_return_to_column = class_fields_profile[res[i].column_name].lov_return_to_column || class_fields_profile[res[i].column_name].keyword || '';
        //                 }
        //                 _t.class_fields_profile = class_fields_profile;
        //                 cb(null);
        //             });
        //         },
        //         pool.getConn,
        //         function (conn, cb) {
        //             if (!_t.client_object_profile) {
        //                 conn.release();
        //                 return cb(null);
        //             }
        //
        //             var ready_columns = [];
        //             var join_tables = [];
        //             var join_tables_list = [];
        //             var tableName = 'client_object_fields_profile';
        //             var from_table_counter = {};
        //             var colProfile_aliases = {};
        //             var from_table_counter2 = {};
        //
        //             for (var col in _t.fields_profile_fields) {
        //                 var colProfile = _t.fields_profile_fields[col];
        //                 if (colProfile.is_virtual && colProfile.concat_fields) continue; // Пропускаем concat_fields
        //                 if (!colProfile.is_virtual) {
        //                     if (ready_columns.indexOf(tableName + '.' + col) === -1) ready_columns.push(tableName + '.' + col);
        //                     continue;
        //                 }
        //
        //
        //                 if (!from_table_counter[colProfile.from_table]) from_table_counter[colProfile.from_table] = 1;
        //                 colProfile.from_table_alias = colProfile.from_table + from_table_counter[colProfile.from_table]++;
        //                 join_tables.push(' LEFT JOIN ' + colProfile.from_table + ' as ' + colProfile.from_table_alias + ' ON ' + tableName + '.' + colProfile.keyword + ' = ' + colProfile.from_table_alias + '.id');
        //                 var c_name_tmp = (colProfile.from_table_alias || colProfile.from_table) + '.' + colProfile.return_column + ' as ' + col;
        //                 if (ready_columns.indexOf(c_name_tmp) === -1) ready_columns.push(c_name_tmp);
        //                 _t.fields_profile_fields[col].from_table_alias = colProfile.from_table_alias;
        //
        //                 //---------------------------------------------------------------------------------------------
        //             }
        //             var sql = "SELECT " + ready_columns.join(', ') + " FROM " + tableName + join_tables.join('') + ' WHERE client_object_id = ' + pool.escape(_t.client_object_profile.id) + ' ORDER BY sort_no';
        //             //console.log(sql);
        //             conn.query(sql, function (err, res) {
        //                 conn.release();
        //                 if (err) {
        //                     err.msg = err.message;
        //                     return cb(new MyError('Не удалось загрузить профиль ПОЛЕЙ клиентского объекта.', {
        //                         client_object: _t.client_object,
        //                         err: err
        //                     }));
        //                 }
        //                 var client_object_fields_profile = {};
        //                 for (var i in res) {
        //                     client_object_fields_profile[res[i].column_name] = _t.prepareResult(res[i], _t.fields_profile_fields);
        //                     if (client_object_fields_profile[res[i].column_name].concat_fields) {
        //                         client_object_fields_profile[res[i].column_name].concat_array = client_object_fields_profile[res[i].column_name].concat_fields.match(/(\S+|\s+)/ig);
        //                     }
        //                     client_object_fields_profile[res[i].column_name].lov_return_to_column = client_object_fields_profile[res[i].column_name].lov_return_to_column || client_object_fields_profile[res[i].column_name].keyword || '';
        //                 }
        //                 var excludeCols = [/*'id','published','deleted','created','updated'*/];
        //                 var needReSort;
        //                 for (var i in client_object_fields_profile) {
        //                     if (typeof _t.class_fields_profile[i] === 'object') {
        //                         if (!needReSort && _t.class_fields_profile[i].sort_no !== client_object_fields_profile[i].sort_no) {
        //                             needReSort = true;
        //                         }
        //                     } else {
        //                         needReSort = true;
        //                     }
        //                     if (excludeCols.indexOf(i) !== -1) continue;
        //                     _t.class_fields_profile[i] = client_object_fields_profile[i];
        //                 }
        //                 if (needReSort) { // Пересортируем объект согласно sort_no клиентского объекта
        //                     // Пройтись по class_fields_profile первратить его в массив объектов, отсортировать и выстроить новый объект объектов
        //                     var class_fields_profile_arr = [];
        //                     for (var i in _t.class_fields_profile) {
        //                         class_fields_profile_arr.push(_t.class_fields_profile[i]);
        //                     }
        //                     class_fields_profile_arr = class_fields_profile_arr.sort(function (a, b) {
        //                         if (a.sort_no > b.sort_no) return 1;
        //                         if (a.sort_no < b.sort_no) return -1;
        //                         return 0;
        //                     });
        //                     var new_obj = {};
        //                     for (var j in class_fields_profile_arr) {
        //                         new_obj[class_fields_profile_arr[j].column_name] = class_fields_profile_arr[j];
        //                     }
        //                     _t.class_fields_profile = new_obj;
        //                 }
        //
        //                 _t.client_object_fields_profile = client_object_fields_profile;
        //                 // Переопределим колонки
        //                 _t.columns = [];
        //                 for (var j in _t.class_fields_profile) {
        //                     if (ready_columns.indexOf(_t.class_fields_profile[j].column_name) === -1) _t.columns.push(_t.class_fields_profile[j].column_name);
        //                 }
        //                 cb(null);
        //             });
        //         }
        //     ], cb)
        // },
        // function (cb) {
        //     // Сформируем необходимые поля profile и fields_profile
        //
        //     //------------------ПРОФИЛЬ ТАБЛИЦЫ------------------
        //     _t.table_ru = _t.class_profile.name_ru || _t.class_profile.name || '';
        //     _t.ending = _t.class_profile.ending || ''; // 'о' 'а'
        //     _t.check_published = _t.class_profile.check_published;
        //     _t.auto_publish = _t.class_profile.auto_publish;
        //     _t.distinct = _t.class_profile.distinct; /// Вероятнее всего работает некорректно
        //     _t.use_cache = _t.class_profile.use_cache;
        //
        //     if (_t.class_profile.default_where) {
        //         try {
        //             var old = _t.default_where;
        //             _t.default_where = JSON.parse(_t.class_profile.default_where);
        //             if (!_t.default_where.length) _t.default_where = old;
        //         } catch (e) {
        //             console.log('_t.class_profile.default_where имеет не валидный JSON');
        //         }
        //     }
        //     if (!_t.default_where) _t.default_where = [];
        //
        //
        //     var default_order_by = _t.class_profile.default_order_by;
        //     if (default_order_by) {
        //         var o = default_order_by.match(/\S+/ig);
        //         var columnsTmp = o[0].split(',');
        //         var columns;
        //         for (var i in columnsTmp) {
        //             if (_t.columns.indexOf(columnsTmp[i]) !== -1) {
        //                 if (!columns) columns = [];
        //                 if (columns.indexOf(columnsTmp[i]) === -1) columns.push(columnsTmp[i]);
        //             }
        //         }
        //         if (!columns) columns = (_t.columns.indexOf('sort_no' !== -1)) ? ['sort_no'] : [];
        //         _t.sort = {
        //             columns: columns,
        //             directions: [o[1]]
        //         }
        //     }
        //     for (var i in _t.class_fields_profile) {
        //         var field = _t.class_fields_profile[i];
        //         if (field.required) _t.required_fields.push(i);
        //         if (!field.insertable) _t.not_insertable.push(i);
        //         if (field.validation && i !== 'id') _t.validation[i] = field.validation;
        //     }
        //
        //     _t.loadUnique();
        //     return cb(null);
        // },
        // function(cb)  {
        //     // Загрузим ограничения для dynamic_fields / Load the constraints for dynamic_fields
        //
        //     // Разабъем поля с dynamic_field_id по table_for_filter
        //     // Для каждого запросим данные из соответствующей таблицы.
        //     // Resolve the field with dynamic_field_id by table_for_filter
        //     // For each, we will query the data from the corresponding table.
        //
        //     // Изменить значения queryeble, editable, visible для тех полей, у которых id_from_source не в списке (полученный из таблицы table_for_filter)
        //     // Change the values of queryeble, editable, visible for those fields whose id_from_source is not in the list (obtained from table_for_filter)
        //
        //     if (_t.client_object === 'sample_data_individual'){
        //         console.log('obj', obj);
        //         debugger;
        //     }
        //     var getParenKeyForFilter = function(params, cb){
        //         if (typeof params !== 'object') return cb(new MyError('params is not object',{params:params, cb:cb}));
        //         if (typeof cb !== 'function') return cb(new MyError('cb is not a function',{params:params, cb:cb}));
        //         var parent_key_for_filter  = params.parent_key_for_filter;
        //         var input_key_for_filter  = params.input_key_for_filter;
        //     }
        //
        //     var dynamic_field_pair_ids = [];
        //     for (var i in _t.class_fields_profile) {
        //         var field = _t.class_fields_profile[i];
        //         if (!field.dynamic_field_pair_id) continue;
        //         if (dynamic_field_pair_ids.indexOf(field.dynamic_field_pair_id) === -1) dynamic_field_pair_ids.push(field.dynamic_field_pair_id);
        //     }
        //     if (!dynamic_field_pair_ids.length) return cb(null); // Ни одного динамического поля / None of the dynamic fields
        //
        //     var dynamic_field_pair_obj;
        //     var table_for_filter_obj = {};
        //     async.series({
        //         getDynFieldPair:function(cb){
        //             var o = {
        //                 command:'get',
        //                 object:'dynamic_field_pair',
        //                 params:{
        //                     where:[
        //                         {
        //                             key:'id',
        //                             type:'in',
        //                             val1:dynamic_field_pair_ids
        //                         }
        //                     ],
        //                     limit:10000000,
        //                     collapseData:false
        //                 }
        //             };
        //             _t.api(o, function (err, res) {
        //                 if (err) return cb(new MyError('Не удалось получить dynamic_field_pair',{o : o, err : err})); // Could not get
        //                 for (var i in res) {
        //                     if (!dynamic_field_pair_obj) dynamic_field_pair_obj = {};
        //                     dynamic_field_pair_obj[res[i].id] = res[i];
        //                 }
        //                 cb(null);
        //             });
        //         },
        //         splitByTableForFilter:function(cb){
        //             if (!dynamic_field_pair_obj) return cb(null);
        //
        //             for (var i in _t.class_fields_profile) {
        //                 _t.class_fields_profile[i].dynamic_field_pair = dynamic_field_pair_obj[_t.class_fields_profile[i].dynamic_field_pair_id] || {};
        //                 var field = _t.class_fields_profile[i];
        //                 if (field.dynamic_field_pair.id) {
        //                     if (!table_for_filter_obj[field.dynamic_field_pair.id]) {
        //                         table_for_filter_obj[field.dynamic_field_pair.id] = {
        //                             id:field.dynamic_field_pair.id,
        //                             items:[],
        //                             table_for_filter:field.dynamic_field_pair.table_for_filter,
        //                             parent_key_for_filter:field.dynamic_field_pair.parent_key_for_filter,
        //                             record_key_for_filter:field.dynamic_field_pair.record_key_for_filter,
        //                             records:[]
        //                         };
        //                     }
        //                     table_for_filter_obj[field.dynamic_field_pair.id].items.push(field);
        //                 }
        //             }
        //             return cb(null);
        //         },
        //         getRecordsAndHide:function(cb){
        //             if (!table_for_filter_obj) return cb(null);
        //             async.eachSeries(table_for_filter_obj, function(one_table_for_filter, cb){
        //                 // Запросим значения из соответствующей таблицы
        //                 var o = {
        //                     command:'get',
        //                     object:one_table_for_filter.table_for_filter,
        //                     params:{
        //                         param_where:{},
        //                         limit:1000000,
        //                         collapseData:false
        //                     }
        //                 };
        //                 console.log('obj',obj);
        //                 o.params.param_where[one_table_for_filter.parent_key_for_filter] = 8;
        //                 _t.api(o, function (err, res) {
        //                     if (err) return cb(new MyError('Не удалось получить ' + one_table_for_filter.table_for_filter,{o : o, err : err})); // Could not
        //                     for (var i in res) {
        //                         one_table_for_filter.records.push(res[i][one_table_for_filter.record_key_for_filter]);
        //                     }
        //
        //                     for (var j in one_table_for_filter.items) {
        //                         if (one_table_for_filter.records.indexOf(one_table_for_filter.items[j].id_from_source) !== -1) continue;
        //                         _t.class_fields_profile[one_table_for_filter.items[j].column_name].visible = false;
        //                         // _t.class_fields_profile[one_table_for_filter.items[j].column_name].queryable = false;
        //                         _t.class_fields_profile[one_table_for_filter.items[j].column_name].editable = false;
        //                         _t.class_fields_profile[one_table_for_filter.items[j].column_name].server_editable = false;
        //                         _t.class_fields_profile[one_table_for_filter.items[j].column_name].server_updatable = false;
        //                         _t.class_fields_profile[one_table_for_filter.items[j].column_name].server_insertable = false;
        //                         console.log('=================Hide=========\n',one_table_for_filter.items[j].column_name);
        //                     }
        //
        //                     cb(null);
        //                 });
        //
        //                 // var one_table_for_filter = table_for_filter_obj[table_for_filter_key];
        //                 // for (var i in one_table_for_filter) {
        //                 //     _t.class_fields_profile[one_table_for_filter[i].column_name].visible = false;
        //                 //     console.log('=================Hide=========\n',one_table_for_filter[i].column_name);
        //                 // }
        //
        //             }, cb);
        //         }
        //     }, cb);
        // }
    ], function(err, res) {
        if (err) {
            console.log(err)
        }
        cb(err, res)
    })

}

MySQLModel.prototype.loadProfile = function(params_input, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        params_input = {}
    }
    var _t = this
    if (typeof cb !== 'function') throw new MyError('В метод loadProfile не передан cb')
    if (typeof params_input !== 'object') return cb(new MyError('В метод loadProfile не переданы params_input'))

    // if (_t.profile_loaded) return cb(null);
    if (!_t.need_reload_profile_by_input_key && _t.profile_loaded) return cb(null)
    // if (_t.client_object === 'sample_data_individual'){
    //     debugger;
    // }
    var params = funcs.cloneObj(params_input)


    var alias = ''
    for (var i in _t.dynamic_field_input_arr) {
        if (alias) alias += ','
        alias += _t.dynamic_field_input_arr[i].table + '_' + _t.dynamic_field_input_arr[i].input_key + '=' + params[_t.dynamic_field_input_arr[i].input_key] +
            '-' + params.parent_class___ + '(id)=' + params.parent_id___
    }
    if (_t.current_dynamic_field_alias === alias && _t.profile_loaded) return cb(null) // уже загружен профиль для этих динамических полей / already loaded profile for these dynamic fields


    _t.current_dynamic_field_alias = ''
    _t.dynamic_field_input_arr = []
    // Загрузим / LOad


    async.series({
        loadRequestedClassProfile: function(cb) {
            // Загрузим профайл запрашиваемого класса / Load the profile of the requested class
            async.waterfall([
                pool.getConn,
                function(conn, cb) {
                    // Выполним запрс и запишим результат
                    conn.select("class_profile", '*', {name: _t.tableName}, function(err, res) {
                        conn.release()
                        if (err) {
                            err.msg = err.message
                            return cb(new MyError('Не удалось загрузить профиль таблицы.', {
                                tableName: _t.tableName,
                                err: err
                            }))
                        }
                        if (res.length == 0) return cb(new MyError('Нет профиля для этой таблицы..', {tableName: _t.tableName}))
                        res = res.filter(one => !one.deleted)
                        if (res.length > 1) return cb(new MyError('База содержит более одного профиля.', {
                            tableName: _t.tableName,
                            res: res
                        }))
                        _t.class_profile = _t.prepareResult(res[0], _t.profile_fields)
                        _t.class_profile.primary_key = _t.class_profile.primary_key || 'id'
                        _t.class_profile.prepare_insert = ''
                        _t.class_profile.server_parent_table = (_t.class_profile.server_parent_table) ? _t.class_profile.server_parent_table.replace(/\s/, '').split(',') : []
                        _t.class_profile.server_parent_key = (_t.class_profile.server_parent_key) ? _t.class_profile.server_parent_key.replace(/\s/, '').split(',') : []
                        // надо проверить, был ли передан parent_id и если был, то получить его deep / It is necessary to check whether parent_id has been passed and if there was, then get it deep
                        _t.class_profile.parent_key_index = _t.class_profile.server_parent_table.indexOf(_t.class_profile.name)

                        _t.class_profile.main_parent_key = _t.class_profile.server_parent_key[_t.class_profile.parent_key_index]
                        cb(null)
                    })
                },
                pool.getConn,
                function(conn, cb) {
                    // Обновляем класс профайл на основе профайла клиентского объекта
                    // Загрузим профайл клиентского объекта
                    if (!_t.client_object) {
                        conn.release()
                        return cb(null)
                    }


                    //conn.select("client_object_profile",'*', {name:_t.client_object}, function (err, res) {
                    //    conn.release();
                    //    if (err) return cb(new MyError('Не удалось загрузить профиль клиентского объекта.',{client_object:_t.client_object, err:err}));
                    //    //if (res.length == 0) return cb(new MyError('Нет профиля для этого клиентского объекта..',{client_object:_t.client_object}));
                    //    if (res.length > 1) return cb(new MyError('База содержит более одного профиля.',{client_object:_t.client_object,res:res}));
                    //    _t.client_object_profile = _t.prepareResult(res[0], _t.co_profile_fields);
                    //    var excludeCols = ['id','published','deleted','created','updated'/*,'name'*/];
                    //    for (var i in _t.client_object_profile) {
                    //        if (excludeCols.indexOf(i)!==-1) continue;
                    //        _t.class_profile[i] = _t.client_object_profile[i];
                    //    }
                    //    cb(null);
                    //});

                    var ready_columns = []
                    var join_tables = []
                    var join_tables_list = []
                    var tableName = 'client_object_profile'
                    var from_table_counter = {}
                    for (var col in _t.co_profile_fields) {
                        var colProfile = _t.co_profile_fields[col]
                        if (colProfile.is_virtual && colProfile.concat_fields) continue // Пропускаем concat_fields
                        if (!colProfile.is_virtual) {
                            if (ready_columns.indexOf(tableName + '.' + col) === -1) ready_columns.push(tableName + '.' + col)
                            continue
                        }
                        if (!from_table_counter[colProfile.from_table]) from_table_counter[colProfile.from_table] = 1
                        colProfile.from_table_alias = colProfile.from_table + from_table_counter[colProfile.from_table]++
                        join_tables.push(' LEFT JOIN ' + colProfile.from_table + ' as ' + colProfile.from_table_alias + ' ON ' + tableName + '.' + colProfile.keyword + ' = ' + colProfile.from_table_alias + '.id')
                        var c_name_tmp = (colProfile.from_table_alias || colProfile.from_table) + '.' + colProfile.return_column + ' as ' + col
                        if (ready_columns.indexOf(c_name_tmp) === -1) ready_columns.push(c_name_tmp)
                        _t.co_profile_fields[col].from_table_alias = colProfile.from_table_alias
                    }
                    var sql = "SELECT " + ready_columns.join(', ') + " FROM " + tableName + join_tables.join('') + ' WHERE ' +
                        tableName + ".name = " + pool.escape(_t.client_object) + " AND " + tableName + ".class_id = " + pool.escape(_t.class_profile.id)
                    //console.log(sql);
                    //conn.select("client_object_profile",'*', {name:_t.client_object, class_id:_t.class_profile.id}, function (err, res) {
                    conn.query(sql, function(err, res) {
                        conn.release()
                        if (err) {
                            err.msg = err.message
                            return cb(new MyError('Не удалось загрузить профиль клиентского объекта.', {
                                client_object: _t.client_object,
                                err: err
                            }))
                        }
                        //if (res.length == 0) return cb(new MyError('Нет профиля для этого клиентского объекта..',{client_object:_t.client_object}));
                        res = res.filter(one => !one.deleted)
                        if (res.length > 1) return cb(new MyError('База содержит более одного профиля.', {
                            client_object: _t.client_object,
                            res: res
                        }))
                        _t.client_object_profile = _t.prepareResult(res[0], _t.co_profile_fields)
                        // var excludeCols = ['id', 'published', 'deleted', 'created', 'updated'/*,'name'*/];
                        var excludeCols = ['id', 'published', 'deleted', 'created', 'updated', 'server_parent_table', 'server_parent_key']
                        for (var i in _t.client_object_profile) {
                            if (excludeCols.indexOf(i) !== -1) continue

                            // _t.class_profile[i] = (typeof _t.client_object_profile[i] !=='undefined' || _t.client_object_profile[i] !== null)? _t.client_object_profile[i] : _t.class_profile[i];
                            _t.class_profile[i] = _t.client_object_profile[i]
                        }
                        cb(null)
                    })
                }
            ], cb)
        },
        loadRequestedClassFieldsProfile: function(cb) {
            // Загрузим профайл полей запрашиваемого класса / Load the profile of the fields of the requested class
            async.waterfall([
                pool.getConn,
                function(conn, cb) {
                    // Выполним запрс и запишим результат
                    var ready_columns = []
                    var join_tables = []
                    var join_tables_list = []
                    var tableName = 'class_fields_profile'
                    var from_table_counter = {}
                    for (var col in _t.fields_profile_fields) {
                        var colProfile = _t.fields_profile_fields[col]
                        if (colProfile.is_virtual && colProfile.concat_fields) continue // Пропускаем concat_fields
                        if (!colProfile.is_virtual) {
                            if (ready_columns.indexOf(tableName + '.' + col) === -1) ready_columns.push(tableName + '.' + col)
                            continue
                        }
                        if (!from_table_counter[colProfile.from_table]) from_table_counter[colProfile.from_table] = 1
                        colProfile.from_table_alias = colProfile.from_table + from_table_counter[colProfile.from_table]++
                        join_tables.push(' LEFT JOIN ' + colProfile.from_table + ' as ' + colProfile.from_table_alias + ' ON ' + tableName + '.' + colProfile.keyword + ' = ' + colProfile.from_table_alias + '.id')
                        var c_name_tmp = (colProfile.from_table_alias || colProfile.from_table) + '.' + colProfile.return_column + ' as ' + col
                        if (ready_columns.indexOf(c_name_tmp) === -1) ready_columns.push(c_name_tmp)
                        _t.fields_profile_fields[col].from_table_alias = colProfile.from_table_alias
                    }
                    var sql = "SELECT " + ready_columns.join(', ') + " FROM " + tableName + join_tables.join('') + ' WHERE class_id = ' + pool.escape(_t.class_profile.id) + ' ORDER BY sort_no'
                    // var sql = "SELECT " + ready_columns.join(', ') + " FROM " + tableName + join_tables.join('') + ' WHERE class_id = ' + pool.escape(_t.class_profile.id);
                    // sql += " AND (" + tableName + ".deleted IS NULL OR " + tableName + ".deleted >'" + funcs.getDateTimeMySQL() + "')";
                    // sql += " ORDER BY sort_no";
                    // console.log(sql);
                    conn.query(sql, function(err, res) {
                        conn.release()
                        if (err) {
                            err.msg = err.message
                            return cb(new MyError('Не удалось загрузить профиль ПОЛЕЙ таблицы.', {
                                tableName: tableName,
                                err: err
                            }))
                        }
                        if (res.length == 0) {
                            return cb(new MyError('Нет профиля ПОЛЕЙ для этой таблицы..', {tableName: tableName}))
                        }
                        var class_fields_profile = {}
                        for (var i in res) {
                            class_fields_profile[res[i].column_name] = _t.prepareResult(res[i], _t.fields_profile_fields)
                            if (_t.columns.indexOf(res[i].column_name) === -1) _t.columns.push(res[i].column_name)

                            if (class_fields_profile[res[i].column_name].concat_fields) {
                                if (class_fields_profile[res[i].column_name].concat_fields.indexOf(',') === -1) {
                                    class_fields_profile[res[i].column_name].concat_array = class_fields_profile[res[i].column_name].concat_fields.match(/(\S+|\s+)/ig)
                                } else {
                                    class_fields_profile[res[i].column_name].concat_array = class_fields_profile[res[i].column_name].concat_fields.split(',')
                                }

                            }
                            class_fields_profile[res[i].column_name].lov_return_to_column = class_fields_profile[res[i].column_name].lov_return_to_column || class_fields_profile[res[i].column_name].keyword || ''
                        }
                        _t.class_fields_profile = class_fields_profile
                        cb(null)
                    })
                },
                pool.getConn,
                function(conn, cb) {
                    if (!_t.client_object_profile) {
                        conn.release()
                        return cb(null)
                    }

                    var ready_columns = []
                    var join_tables = []
                    var join_tables_list = []
                    var tableName = 'client_object_fields_profile'
                    var from_table_counter = {}
                    var colProfile_aliases = {}
                    var from_table_counter2 = {}

                    for (var col in _t.fields_profile_fields) {
                        var colProfile = _t.fields_profile_fields[col]
                        if (colProfile.is_virtual && colProfile.concat_fields) continue // Пропускаем concat_fields
                        if (!colProfile.is_virtual) {
                            if (ready_columns.indexOf(tableName + '.' + col) === -1) ready_columns.push(tableName + '.' + col)
                            continue
                        }
                        var join_table = colProfile.join_table || tableName
                        var table_name

                        if (join_table) {
                            if (join_table == tableName) {
                                table_name = join_table
                            } else {
                                if (!from_table_counter2[colProfile.from_table]) from_table_counter2[colProfile.from_table] = 0
                                from_table_counter2[colProfile.from_table]++
                                table_name = (colProfile_aliases[join_table]) ? colProfile_aliases[join_table].from_table_alias : join_table + from_table_counter2[colProfile.from_table]
                            }
                        } else {
                            table_name = tableName
                        }

                        if (!from_table_counter[colProfile.from_table]) from_table_counter[colProfile.from_table] = 1
                        colProfile.from_table_alias = colProfile.from_table + from_table_counter[colProfile.from_table]++
                        // join_tables.push(' LEFT JOIN ' + colProfile.from_table + ' as ' + colProfile.from_table_alias + ' ON ' + tableName + '.' + colProfile.keyword + ' = ' + colProfile.from_table_alias + '.id');
                        join_tables.push(' LEFT JOIN ' + colProfile.from_table + ' as ' + colProfile.from_table_alias + ' ON ' + table_name + '.' + colProfile.keyword + ' = ' + colProfile.from_table_alias + '.id')
                        var c_name_tmp = (colProfile.from_table_alias || colProfile.from_table) + '.' + colProfile.return_column + ' as ' + col
                        if (ready_columns.indexOf(c_name_tmp) === -1) ready_columns.push(c_name_tmp)
                        _t.fields_profile_fields[col].from_table_alias = colProfile.from_table_alias

                        //---------------------------------------------------------------------------------------------
                    }
                    // var sql = "SELECT " + ready_columns.join(', ') + " FROM " + tableName + join_tables.join('') + ' WHERE client_object_id = ' + pool.escape(_t.client_object_profile.id) + ' ORDER BY sort_no';
                    var sql = "SELECT " + ready_columns.join(', ') + " FROM " + tableName + join_tables.join('') + ' WHERE client_object_id = ' + pool.escape(_t.client_object_profile.id)
                    sql += " AND (" + tableName + ".deleted IS NULL OR " + tableName + ".deleted >'" + funcs.getDateTimeMySQL() + "')"
                    sql += " ORDER BY sort_no"
                    //console.log(sql);
                    conn.query(sql, function(err, res) {
                        conn.release()
                        if (err) {
                            err.msg = err.message
                            return cb(new MyError('Не удалось загрузить профиль ПОЛЕЙ клиентского объекта.', {
                                client_object: _t.client_object,
                                err: err
                            }))
                        }
                        var client_object_fields_profile = {}
                        for (var i in res) {
                            client_object_fields_profile[res[i].column_name] = _t.prepareResult(res[i], _t.fields_profile_fields)
                            if (client_object_fields_profile[res[i].column_name].concat_fields) {
                                if (client_object_fields_profile[res[i].column_name].concat_fields.indexOf(',') === -1) {
                                    client_object_fields_profile[res[i].column_name].concat_array = client_object_fields_profile[res[i].column_name].concat_fields.match(/(\S+|\s+)/ig)
                                } else {
                                    client_object_fields_profile[res[i].column_name].concat_array = client_object_fields_profile[res[i].column_name].concat_fields.split(',')
                                }

                            }
                            client_object_fields_profile[res[i].column_name].lov_return_to_column = client_object_fields_profile[res[i].column_name].lov_return_to_column || client_object_fields_profile[res[i].column_name].keyword || ''
                        }
                        var excludeCols = [/*'id','published','deleted','created','updated'*/]
                        // var excludeFieldSettings = ['save_log']; // Определяет, какие поля не будут перезаписаны клиентским объектом
                        var excludeFieldSettings = ['id', 'published', 'deleted', 'created', 'updated', 'save_log'] // Определяет, какие поля не будут перезаписаны клиентским объектом
                        var needReSort
                        for (var i in client_object_fields_profile) {
                            if (typeof _t.class_fields_profile[i] === 'object') {
                                if (!needReSort && _t.class_fields_profile[i].sort_no !== client_object_fields_profile[i].sort_no) {
                                    needReSort = true
                                }
                            } else {
                                needReSort = true
                            }
                            if (excludeCols.indexOf(i) !== -1) continue
                            // _t.class_fields_profile[i] = client_object_fields_profile[i];
                            // if (!_t.class_fields_profile[i]) continue;

                            Object.keys(client_object_fields_profile[i]).forEach(co_key => {

                                // ЕСЛИ Поле только в клиентском объекте
                                if (!_t.class_fields_profile[i]) _t.class_fields_profile[i] = {}

                                _t.class_fields_profile[i][co_key] = (excludeFieldSettings.indexOf(co_key) === -1) ?
                                    client_object_fields_profile[i][co_key]
                                    :
                                    _t.class_fields_profile[i][co_key]
                            })

                        }
                        if (needReSort) { // Пересортируем объект согласно sort_no клиентского объекта
                            // Пройтись по class_fields_profile первратить его в массив объектов, отсортировать и выстроить новый объект объектов
                            var class_fields_profile_arr = []
                            for (var i in _t.class_fields_profile) {
                                class_fields_profile_arr.push(_t.class_fields_profile[i])
                            }
                            class_fields_profile_arr = class_fields_profile_arr.sort(function(a, b) {
                                if (a.sort_no > b.sort_no) return 1
                                if (a.sort_no < b.sort_no) return -1
                                return 0
                            })
                            var new_obj = {}
                            for (var j in class_fields_profile_arr) {
                                new_obj[class_fields_profile_arr[j].column_name] = class_fields_profile_arr[j]
                            }
                            _t.class_fields_profile = new_obj
                        }

                        _t.client_object_fields_profile = {...client_object_fields_profile}
                        // Переопределим колонки
                        _t.columns = []
                        for (var j in _t.class_fields_profile) {
                            if (ready_columns.indexOf(_t.class_fields_profile[j].column_name) === -1) _t.columns.push(_t.class_fields_profile[j].column_name)
                        }
                        cb(null)
                    })
                }
            ], cb)
        },
        prepareRequiredClassFields: function(cb) {
            // Сформируем необходимые поля profile и fields_profile / Form the necessary fields profile and fields_profile
            //------------------ПРОФИЛЬ ТАБЛИЦЫ------------------
            _t.table_ru = _t.class_profile.name_ru || _t.class_profile.name || ''
            _t.ending = _t.class_profile.ending || '' // 'о' 'а'
            _t.check_published = _t.class_profile.check_published
            _t.auto_publish = _t.class_profile.auto_publish
            _t.distinct = _t.class_profile.distinct /// Вероятнее всего работает некорректно
            _t.use_cache = _t.class_profile.use_cache

            if (_t.class_profile.default_where) {
                try {
                    var old = _t.default_where
                    _t.default_where = JSON.parse(_t.class_profile.default_where)
                    if (!_t.default_where.length) _t.default_where = old
                } catch (e) {
                    console.log('_t.class_profile.default_where имеет не валидный JSON')
                }
            }
            if (!_t.default_where) _t.default_where = []


            var default_order_by = _t.class_profile.default_order_by
            if (default_order_by) {
                var o = default_order_by.match(/\S+/ig)
                var columnsTmp = o[0].split(',')
                var columns
                for (var i in columnsTmp) {
                    if (_t.columns.indexOf(columnsTmp[i]) !== -1) {
                        if (!columns) columns = []
                        if (columns.indexOf(columnsTmp[i]) === -1) columns.push(columnsTmp[i])
                    }
                }
                if (!columns) columns = (_t.columns.indexOf('sort_no' !== -1)) ? ['sort_no'] : []
                _t.sort = {
                    columns: columns,
                    directions: [o[1]]
                }
            }
            for (var i in _t.class_fields_profile) {
                var field = _t.class_fields_profile[i]
                if (field.required) _t.required_fields.push(i)
                if (!field.insertable) _t.not_insertable.push(i)
                if (field.is_inherit) {
                    if (!field.dynamic_field_id) {
                        _t.is_inherit_fields[field.column_name] = {
                            alias: field.column_name,
                            value_id_key: field.column_name,
                            real_value_key: field.column_name,
                        }
                        continue
                    }

                    var alias = field.dynamic_field_id
                    if (!_t.is_inherit_fields[alias]) _t.is_inherit_fields[alias] = {alias: alias}

                    if (field.column_name.match(/_value_id$/)) _t.is_inherit_fields[alias].value_id_key = field.column_name
                    if (field.column_name.match(/_real_value$/)) _t.is_inherit_fields[alias].real_value_key = field.column_name

                    // field.is_inherit_real_value = !!(!field.dynamic_field_id || field.column_name.match(/_real_value$/));
                    // field.is_inherit_value_id = !!(!field.dynamic_field_id || field.column_name.match(/_value_id$/));
                    // _t.is_inherit_fields[field.column_name] = field;
                    //
                    // if (field.is_inherit_real_value) _t.is_inherit_fields_real_value[field.column_name] = field;

                }
                if (field.validation && i !== 'id') _t.validation[i] = field.validation
            }

            _t.loadUnique()
            return cb(null)
        },
        loadDynamicFieldsConstraints: function(cb) {
            // Загрузим ограничения для dynamic_fields / Load the constraints for dynamic_fields

            // Разабъем поля с dynamic_field_id по table_for_filter
            // Для каждого запросим данные из соответствующей таблицы.
            // Resolve the field with dynamic_field_id by table_for_filter
            // For each, we will query the data from the corresponding table.

            // Изменить значения queryeble, editable, visible для тех полей, у которых id_from_source не в списке (полученный из таблицы table_for_filter)
            // Change the values of queryeble, editable, visible for those fields whose id_from_source is not in the list (obtained from table_for_filter)

            if (params.parent_class___ && params.parent_id___) {
                var key = _t.class_profile.server_parent_key[_t.class_profile.server_parent_table.indexOf(params.parent_class___)]
                if (key) {
                    params[key] = params[key] || +params.parent_id___
                }
            }
            if (typeof params.where === 'object') {

                // Для таблиц встроенных в формы, parent_key передается через where. Извлечем его
                // For tables embedded in forms, parent_key is passed through where. Extract it
                for (var i in params.where) {
                    if (params.where[i].type && params.where[i].type !== '=') continue
                    params[params.where[i].key] = params[params.where[i].key] || params.where[i].val1 || params.where[i].val
                }
            }


            // var all_record_id_aliases = [];

            // Функция ищет значение родительского ключа (тот ключ, который указан в таблице пар динамических полей).
            // Он ищет его сперва в переданных параметрах, потом в родительской записи, потом поднимается ввер по родительским таблицам пока не найдет
            // The function searches for the value of the parent key (the key that is specified in the dynamic field pairs table).
            // It looks for it first in the passed parameters, then in the parent record, then it rises up on the parent tables until it finds
            var getParenKeyValForFilter = function(obj, cb) {
                if (typeof obj !== 'object') return cb(new MyError('params is not object', {obj: obj, cb: cb}))
                if (typeof cb !== 'function') return cb(new MyError('cb is not a function', {obj: obj, cb: cb}))
                var parent_key_for_filter = obj.parent_key_for_filter
                var input_key_for_filter = obj.input_key_for_filter
                var params = obj.params || {}

                if (params[parent_key_for_filter]) return cb(null, {val: params[parent_key_for_filter]})
                if (!params[input_key_for_filter]) return cb(null, {val: null})

                // Запросим профайл родительской таблицы
                // Запросим родительскую запись
                // Если в ней есть искомый ключ, возвращаем его, иначе вызываем эту же функцию, но уже с новыми параметрами
                // Request the profile of the parent table
                // Request a parent record
                // If it has the required key, return it, otherwise we call the same function, but with new parameters

                var server_parent_key_index = _t.class_profile.server_parent_key.indexOf(input_key_for_filter)
                if (server_parent_key_index === -1) { // Class does not contain server_parent_key = input_key_for_filter
                    return cb(new MyError('Класс не содержит server_parent_key = input_key_for_filter', {
                        server_parent_key: _t.class_profile.server_parent_key,
                        input_key_for_filter: input_key_for_filter
                    }))
                }

                var profile, parent_record
                var val
                async.series({
                    getParentRecord: function(cb) {
                        var o = {
                            command: 'getById',
                            object: _t.class_profile.server_parent_table[server_parent_key_index],
                            params: {
                                id: params[input_key_for_filter]
                            }
                        }
                        _t.api(o, function(err, res) {
                            if (err) return cb(new MyError('Не удалось получить родительскую запись', {
                                o: o,
                                err: err
                            })) // Failed to get the parent record
                            parent_record = res[0]
                            val = parent_record[parent_key_for_filter]
                            cb(null)
                        })

                    },
                    getParentProfile: function(cb) {
                        if (val) return cb(null) // Уже нашли / Found already

                        var o = {
                            command: 'getProfile',
                            object: _t.class_profile.server_parent_table[server_parent_key_index], // Здесь нужно взять родительскую таблицу, от которой у нас есть ключ. То есть не саму себя если иерархическая тбл
                            params: {
                                collapseData: false
                            }
                        }
                        _t.api(o, function(err, res) {
                            if (err) return cb(new MyError('Не удалось получить профайл родительского класса', {
                                o: o,
                                err: err
                            })) // Failed to get the profile of the parent class
                            profile = res.extra_data.object_profile
                            if (!profile.server_parent_key_for_dynamic_fields) {
                                return cb(new MyError('Для данного класса не указан ключ, по кторому искать родительскую таблицу (server_parent_key_for_dynamic_fields). ' +
                                    'Необходимо его указать или прокинуть в этот класс искомое поле (parent_key_for_filter) как виртуальное ' +
                                    '(чтобы не было необходимости лезть в родительские классы.)', {
                                    profile: profile,
                                    obj: obj
                                }))
                                // For this class, there is no key to look for the parent table (server_parent_key_for_dynamic_fields).
                                // It is necessary to specify it or to throw in this class the required field (parent_key_for_filter) as virtual
                                // (so that there is no need to climb into the parent classes.)

                            }
                            var params1 = {
                                parent_key_for_filter: parent_key_for_filter,
                                input_key_for_filter: profile.server_parent_key_for_dynamic_fields,
                                params: parent_record
                            }
                            getParenKeyValForFilter(params1, function(err, res) {
                                if (err) return cb(err)
                                val = +res.val
                                cb(null)
                            })
                        })
                    }
                }, function(err, res) {
                    if (err) return cb(err)
                    if (!val) return cb(new MyError('Не удалось получить значение parent_key по входному ключу', {obj: obj}))
                    return cb(null, {val: val})
                })
            }

            var dynamic_field_pair_ids = []
            for (var i in _t.class_fields_profile) {
                var field = _t.class_fields_profile[i]
                if (!field.dynamic_field_pair_id) continue
                if (dynamic_field_pair_ids.indexOf(field.dynamic_field_pair_id) === -1) dynamic_field_pair_ids.push(field.dynamic_field_pair_id)
            }
            if (!dynamic_field_pair_ids.length) return cb(null) // Ни одного динамического поля / None of the dynamic fields

            var dynamic_field_pair_obj
            var table_for_filter_obj = {}
            async.series({
                getDynFieldPair: function(cb) {
                    var o = {
                        command: 'get',
                        object: 'dynamic_field_pair',
                        params: {
                            doNotCheckList: true,
                            where: [
                                {
                                    key: 'id',
                                    type: 'in',
                                    val1: dynamic_field_pair_ids
                                }
                            ],
                            limit: 10000000,
                            collapseData: false
                        }
                    }
                    _t.api(o, function(err, res) {
                        if (err) return cb(new MyError('Не удалось получить dynamic_field_pair', {o: o, err: err})) // Could not get
                        for (var i in res) {
                            if (!dynamic_field_pair_obj) dynamic_field_pair_obj = {}
                            dynamic_field_pair_obj[res[i].id] = res[i]
                        }
                        cb(null)
                    })
                },
                splitByTableForFilter: function(cb) {
                    if (!dynamic_field_pair_obj) return cb(null)

                    for (var i in _t.class_fields_profile) {
                        _t.class_fields_profile[i].dynamic_field_pair = dynamic_field_pair_obj[_t.class_fields_profile[i].dynamic_field_pair_id] || {}
                        var field = _t.class_fields_profile[i]
                        if (field.dynamic_field_pair.id) {
                            if (!field.dynamic_field_pair.input_key_for_filter) return cb(new MyError('Не указан input_key у dynamic_field_pair'))
                            if (!table_for_filter_obj[field.dynamic_field_pair.id]) {
                                table_for_filter_obj[field.dynamic_field_pair.id] = {
                                    id: field.dynamic_field_pair.id,
                                    items: [],
                                    table_for_filter: field.dynamic_field_pair.table_for_filter,
                                    parent_key_for_filter: field.dynamic_field_pair.parent_key_for_filter,
                                    record_key_for_filter: field.dynamic_field_pair.record_key_for_filter,
                                    input_key_for_filter: field.dynamic_field_pair.input_key_for_filter,
                                    records: []
                                }
                                if (!_t.need_reload_profile_by_input_key) _t.need_reload_profile_by_input_key = true

                                _t.dynamic_field_input_arr.push({
                                    table: field.dynamic_field_pair.table_for_filter,
                                    input_key: field.dynamic_field_pair.input_key_for_filter,
                                    parent_key: field.dynamic_field_pair.parent_key_for_filter,
                                    record_key: field.dynamic_field_pair.record_key_for_filter
                                })
                                if (_t.current_dynamic_field_alias) _t.current_dynamic_field_alias += ','
                                _t.current_dynamic_field_alias += field.dynamic_field_pair.table_for_filter + '_' + field.dynamic_field_pair.input_key_for_filter + '=' + params[field.dynamic_field_pair.input_key_for_filter]
                            }
                            table_for_filter_obj[field.dynamic_field_pair.id].items.push(field)
                        }
                    }

                    return cb(null)
                },
                getRecordsAndHide: function(cb) {
                    if (!table_for_filter_obj) return cb(null)
                    async.eachSeries(table_for_filter_obj, function(one_table_for_filter, cb) {
                        // Запросим значения из соответствующей таблицы
                        async.series({
                            getParentKeyVal: function(cb) {
                                var params1 = {
                                    parent_key_for_filter: one_table_for_filter.parent_key_for_filter,
                                    input_key_for_filter: one_table_for_filter.input_key_for_filter,
                                    params: params
                                }
                                getParenKeyValForFilter(params1, function(err, res) {
                                    if (err) return cb(err)
                                    one_table_for_filter.parent_key_val = +res.val
                                    cb(null)
                                })
                            },
                            getRecords: function(cb) {
                                if (!one_table_for_filter.parent_key_val) return cb(null)
                                var o = {
                                    command: 'get',
                                    object: one_table_for_filter.table_for_filter,
                                    params: {
                                        param_where: {},
                                        limit: 1000000,
                                        collapseData: false
                                    }
                                }

                                o.params.param_where[one_table_for_filter.parent_key_for_filter] = one_table_for_filter.parent_key_val


                                _t.api(o, function(err, res) {
                                    if (err) return cb(new MyError('Не удалось получить ' + one_table_for_filter.table_for_filter, {
                                        o: o,
                                        err: err
                                    })) // Could not
                                    for (var i in res) {
                                        // all_record_id_aliases.push(res[i][one_table_for_filter.table_for_filter + one_table_for_filter.record_key_for_filter]);
                                        one_table_for_filter.records.push(res[i][one_table_for_filter.record_key_for_filter])
                                    }

                                    for (var j in one_table_for_filter.items) {
                                        if (one_table_for_filter.records.indexOf(one_table_for_filter.items[j].id_from_source) !== -1) continue
                                        _t.class_fields_profile[one_table_for_filter.items[j].column_name].visible = false
                                        _t.class_fields_profile[one_table_for_filter.items[j].column_name].queryable = false
                                        _t.class_fields_profile[one_table_for_filter.items[j].column_name].editable = false
                                        _t.class_fields_profile[one_table_for_filter.items[j].column_name].server_editable = false
                                        _t.class_fields_profile[one_table_for_filter.items[j].column_name].server_updatable = false
                                        _t.class_fields_profile[one_table_for_filter.items[j].column_name].server_insertable = false
                                    }
                                    cb(null)
                                })
                            }
                        }, cb)
                    }, cb)
                }
            }, cb)
        },
        loadDynamicfieldTablesForAutoAddDynFields: function(cb) {
            // загрузим данные из таблицы dynamic_field_pair где поле source_class = _t.tableName
            // Это нужно, чтобы при добавлении/изменении/удалении данных в исходной таблице происходила синхронизация соответствующих динамических полей
            // load the data from the dynamic_field_pair table where the field source_class = _t.tableName
            // This requires that when adding / changing / deleting data in the source table, the corresponding dynamic fields are synchronized

            // return cb(null);

            if (['user', 'dynamic_field_pair', 'client_object_profile', 'join_table_keyword'].indexOf(_t.tableName) !== -1) return cb(null)


            var o = {
                command: 'get',
                object: 'dynamic_field_pair',
                params: {
                    doNotCheckList: true,
                    param_where: {
                        source_class_id: _t.class_profile.id
                    },
                    collapseData: false
                }
            }
            _t.api(o, function(err, res) {
                if (err) return cb(new MyError('Не удалось получить dynamic_field_pair', {o: o, err: err})) // Could not get
                _t.dynamic_field_pair = res
                cb(null)
            })
        },
        loadDynamicfieldTablesForClearCache: function(cb) {
            // загрузим данные из таблицы dynamic_field_pair где поле table_for_filter = _t.tableName
            // Это нужно, чтобы при изменении данных в данной таблице (this) чистился кеш и в таблицах которые ее используют
            // load the data from the dynamic_field_pair table where the table_for_filter = _t.tableName field
            // It is necessary, that at change of the data in the given table (this) the cache was cleaned and in tables which use it

            if (['user', 'dynamic_field_pair', 'client_object_profile', 'join_table_keyword'].indexOf(_t.tableName) !== -1) return cb(null)
            var client_object_arr = []
            var class_object_arr = []
            async.series({
                getDynFieldPairByTableForFilter: function(cb) {
                    var o = {
                        command: 'get',
                        object: 'dynamic_field_pair',
                        params: {
                            doNotCheckList: true,
                            param_where: {
                                table_for_filter: _t.tableName
                            },
                            collapseData: false
                        }
                    }
                    _t.api(o, function(err, res) {
                        if (err) {
                            // console.log('_t',_t);
                            return cb(new MyError('Не удалось получить dynamic_field_pair', {o: o, err: err}))
                        } // Could not get
                        for (var i in res) {
                            if (client_object_arr.indexOf(res[i].target_client_object) === -1) client_object_arr.push(res[i].target_client_object)
                        }
                        cb(null)
                    })

                },
                getCO: function(cb) {
                    if (!client_object_arr.length) return cb(null)
                    var o = {
                        command: 'get',
                        object: 'client_object_profile',
                        params: {
                            where: [
                                {
                                    key: 'name',
                                    type: 'in',
                                    val1: client_object_arr
                                }
                            ],
                            collapseData: false
                        }
                    }
                    _t.api(o, function(err, res) {
                        if (err) return cb(new MyError('Не удалось получить client_object_profile', {o: o, err: err})) // Could not get
                        for (var i in res) {
                            var alias = res[i].class + '_-_' + res[i].name
                            _t.dynamic_field_tables_for_clear_cache[alias] = {
                                class: res[i].class,
                                client_object: res[i].name
                            }
                        }
                        cb(null)
                    })
                },
                getDynFieldPairBySourceClass: function(cb) {
                    var pair_obj = {}
                    async.series({
                        getPairs: (cb) => {
                            var o = {
                                command: 'get',
                                object: 'dynamic_field_pair',
                                params: {
                                    columns: ['id', 'target_client_object_id'],
                                    doNotCheckList: true,
                                    param_where: {
                                        source_class_id: _t.class_profile.id
                                    },
                                    collapseData: false
                                }
                            }
                            _t.api(o, function(err, res) {
                                if (err) return cb(new MyError('Не удалось получить dynamic_field_pair 2', {
                                    o: o,
                                    err: err
                                }))
                                for (var i in res) {
                                    pair_obj[res[i].id] = res[i]
                                }
                                cb(null)
                            })
                        },
                        getFieldsFromProfile: (cb) => {
                            var pair_ids = Object.keys(pair_obj)
                            if (!pair_ids.length) return cb(null)

                            var o = {
                                command: 'get',
                                object: 'client_object_fields_profile',
                                params: {
                                    columns: ['from_table', 'dynamic_field_pair_id'],
                                    where: [
                                        {
                                            key: 'dynamic_field_pair_id',
                                            type: 'in',
                                            val1: pair_ids
                                        }
                                    ],
                                    collapseData: false
                                }
                            }
                            _t.api(o, function(err, res) {
                                if (err) {
                                    return cb(new MyError('Не удалось получить dynamic_field_pair 2', {
                                        o: o,
                                        err: err
                                    }))
                                }
                                async.eachSeries(res, function(item, cb) {
                                    var o = {
                                        command: 'addDynFieldTblForClearCache',
                                        object: item.from_table,
                                        params: {
                                            co_id: pair_obj[item.dynamic_field_pair_id].target_client_object_id
                                        }
                                    }
                                    _t.api(o, (err, res) => {
                                        if (err) {
                                            console.error('ERROR, Не удалось добавить таблицу, кеш которой нужно чистить при изменении данной (object)', {
                                                o: o,
                                                err: err
                                            })
                                        }
                                        cb(null)
                                    })

                                }, cb)
                            })
                        }
                    }, cb)


                }
                // getClasses:function(cb){
                //     if (!class_object_arr.length) return cb(null);
                //     var o = {
                //         command:'get',
                //         object:'class_profile',
                //         params:{
                //             where:[
                //                 {
                //                     key:'name',
                //                     type:'in',
                //                     val1:class_object_arr
                //                 }
                //             ],
                //             collapseData:false
                //         }
                //     };
                //     _t.api(o, function (err, res) {
                //         if (err) return cb(new MyError('Не удалось получить client_object_profile',{o : o, err : err})); // Could not get
                //         for (var i in res) {
                //             // var alias = res[i].class + '_-_' + res[i].name;
                //             var alias = res[i].name;
                //             _t.dynamic_field_tables_for_clear_cache[alias] = {
                //                 class:res[i].name
                //             };
                //         }
                //         cb(null);
                //     });
                // }

            }, cb)
        },
        prepareColumnsSorted: cb => {
            _t.columns_sorted = Object.keys(_t.class_fields_profile).map(key => _t.class_fields_profile[key]).sort((a, b) => {
                if (a.sort_no < b.sort_no) return -1
                if (a.sort_no > b.sort_no) return 1
                return 0
            })
            return cb(null)
        },
        prepareHistoryFields: cb => {
            Object.keys(_t.class_fields_profile).forEach(key => {
                if (!_t.class_fields_by_id) _t.class_fields_by_id = {}
                _t.class_fields_by_id[_t.class_fields_profile[key].id] = _t.class_fields_profile[key]
                if (_t.class_fields_profile[key].save_log) {
                    if (!_t.history_fields) _t.history_fields = []
                    _t.history_fields.push(key)
                }
            })
            return cb(null)
        }
    }, function(err, res) {
        if (err) return cb(err)
        // _t.current_dynamic_field_records_alias = all_record_id_aliases.split('');
        _t.class_profile.current_dynamic_field_alias = _t.current_dynamic_field_alias
        _t.profile_loaded = true
        return cb(null, res)
    })


}

MySQLModel.prototype.addDynFieldTblForClearCache = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    if (obj.fromClient) return cb(null)
    if (!obj.co_id) return cb(new MyError('Не передан co_id'))

    var o = {
        command: 'getById',
        object: 'client_object_profile',
        params: {
            id: obj.co_id
        }
    }
    _t.api(o, (err, res) => {
        if (err) console.error('Не удалось получить профайл для метода addDynFieldTblForClearCache', {o: o, err: err})
        var alias = res[0].class + '_-_' + res[0].name
        _t.dynamic_field_tables_for_clear_cache[alias] = {
            class: res[0].class,
            client_object: res[0].name
        }
        cb(null)
    })
}

MySQLModel.prototype.api = function(o, cb) {
    api(o, cb, this.user)
}

MySQLModel.prototype.loadUnique = function() {
    var _t = this
    for (var i in _t.class_fields_profile) {
        var colProfile = _t.class_fields_profile[i]
        var column_name = colProfile.column_name
        if (colProfile.is_unique) { // Запишим уникальные поля
            if (_t.uniqueColumns.indexOf(column_name) == -1) _t.uniqueColumns.push(column_name)
        }
    }
    return _t.uniqueColumns
}

MySQLModel.prototype.getProfile = function(params, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        params = {}
    }
    var _t = this
    if (typeof cb !== 'function') throw new MyError('В метод getProfile не передан cb')
    if (typeof params !== 'object') return cb(new MyError('В метод getProfile не переданы params'))
    var data_columns = []
    var data = []

    var parent_key
    var idx = 0
    for (var i in _t.class_fields_profile) {
        var field_profile = _t.class_fields_profile[i]
        // Соберем дата_колумнс
        if (idx === 0) {
            for (var k in field_profile) {
                data_columns.push(k)
            }

        }
        data[idx] = []
        for (var j in field_profile) {
            if (j == 'parent_key' && field_profile[j]) {
                parent_key = field_profile.column_name
            }
            data[idx].push(field_profile[j])
        }
        idx++
    }
    if (!_t.class_profile) return cb(new MyError('Вероятнее всего класс или клиентский объект удален.'))
    _t.class_profile.parent_key = _t.class_profile.parent_key || parent_key || ''
    _t.class_profile.class = _t.class_profile.class || _t.class_profile.name
    var o = {
        data_columns: data_columns,
        data: data,
        extra_data: {
            object_profile: _t.class_profile
        }
    }
    // return cb(null, o);
    return cb(null, new UserOk('noToastr', o))
}

MySQLModel.prototype.setColumnPosition = function(params, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        params = {}
    }
    var _t = this
    if (typeof cb !== 'function') throw new MyError('В метод setColumnPosition не передан cb')
    if (typeof params !== 'object') return cb(new MyError('В метод setColumnPosition не переданы params'))
    var column = params.column
    var position = +params.position
    if (!column || isNaN(position)) return cb(new MyError('В параметрах должно быть передано: название колонки (column:<строка>) и позиция(position:<число>)'))
    //column = pool.escape(column);
    var table_name = (_t.client_object) ? 'client_object_fields_profile' : 'class_fields_profile'
    var key_alias = (_t.client_object) ? 'client_object_id' : 'class_id'
    var key = (_t.client_object) ? _t.client_object_profile.id : _t.class_profile.id
    var old_sort_no
    async.waterfall([
        pool.getConn,
        function(conn, cb) {
            conn.queryValue('SELECT sort_no FROM ' + table_name + ' WHERE ' + key_alias + ' = ? AND column_name = ?', [key, column], function(err, value) {
                conn.release()
                if (err) return cb(new MyError('Не удалось получить текущую позицию столбца.', err))
                old_sort_no = value || 1
                return cb(null)
            })
        },
        pool.getConn,
        function(conn, cb) {
            conn.query('UPDATE ' + table_name + ' SET sort_no = ? WHERE ' + key_alias + ' = ? AND column_name = ?', [position, key, column], function(err, affected) {
                conn.release()
                if (err) return cb(new MyError('Во время установки позиции колонки возникла ошибка.', err))
                if (!affected) return cb(new UserError('Could`t found column in profile.', {
                    column: column,
                    class_name: _t.name
                }))
                return cb(null)
            })
        },
        pool.getConn,
        function(conn, cb) {
            // сместим остальные столбцы
            var sql = 'UPDATE ' + table_name + ' SET sort_no = sort_no+1 WHERE ' + key_alias + ' = ? AND column_name <> ? AND sort_no >= ? AND sort_no <= ?'
            var values = [key, column, position, old_sort_no]
            if (position > old_sort_no) {
                sql = 'UPDATE ' + table_name + ' SET sort_no = sort_no-1 WHERE ' + key_alias + ' = ? AND column_name <> ? AND sort_no >= ? AND sort_no <= ?'
                var values = [key, column, old_sort_no, position]
            }
            conn.query(sql, values, function(err, affected) {
                conn.release()
                if (err) return cb(new MyError('Во время смещения последующих колонок возникла ошибка.', err))
                return cb(null)
            })
        }
    ], function(err) {
        if (err) return cb(err)
        async.series([
            function(cb) {
                // Очистим кеш для профиля
                var o = {
                    command: '_clearCache',
                    object: (_t.client_object) ? 'client_object_fields_profile' : 'class_fields_profile',
                    params: {}
                }
                _t.api(o, function(err) {
                    if (err) {
                        console.log('\nНемогу очистить кеш профиля.', err)
                    }
                    cb(null)
                })
            },
            function(cb) {
                // Очистим кеш для класса
                var o = {
                    command: '_clearCache',
                    object: _t.name
                }
                if (_t.client_object) o.client_object = _t.client_object
                _t.api(o, function(err) {
                    if (err) {
                        console.log('\nНемогу очистить кеш класса.', err) // cannot clear cache
                    }
                    cb(null)
                })
            }
        ], function(err) {
            return cb(null, new UserOk('Столбец успешно перемещен'))
        })
    })

}

MySQLModel.prototype.checkUnique = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this
    var uniqueColumns = (_t.uniqueColumns.length) ? _t.uniqueColumns : _t.loadUnique()
    var needToCheck = false
    var originalValues
    var countUnigue

    async.series([
        function(cb) {
            // если есть хоть один уникальный столбец в obj
            if (obj.id) {
                for (var i in obj) {
                    if (uniqueColumns.indexOf(i) !== -1) {
                        needToCheck = true
                        break
                    }
                }
            } else {
                for (var i in obj) {
                    if (uniqueColumns.indexOf(i) !== -1) {
                        needToCheck = true
                        if (!originalValues) originalValues = {}
                        originalValues[i] = obj[i]
                    }
                }
            }
            cb(null)
        },
        function(cb) {
            // Запросим текущие знчения уникальных полей
            if (!needToCheck || !uniqueColumns.length || originalValues) return cb(null)
            var o = {
                columns: uniqueColumns,
                where: [
                    {
                        key: 'id',
                        val1: obj.id
                    }
                ],
                checkUnique: false,
                collapseData: false
            }
            _t.get(o, function(err, res) {
                if (err) return cb(new MyError('Не удалось проверить уникальность полей.', err))
                if (!res) return cb(new MyError('Не удалось проверить уникальность полей. Нет записи.'))
                for (var i in res[0]) {
                    if (!originalValues) originalValues = {}
                    originalValues[i] = res[0][i]
                }
                return cb(null)

            })
        },
        function(cb) {
            // Найдем отличия в уникальных полях и найдем проверим только для измнененных
            needToCheck = false
            var where
            for (var i in originalValues) {
                if (!where) where = []
                where.push(
                    {
                        key: i,
                        val1: (typeof obj[i] !== 'undefined') ? obj[i] : originalValues[i],
                        binary: true
                    }
                )
            }
            if (!where) return cb(null)
            var o = {
                where: where
            }
            _t.getCount(o, function(err, res) {
                if (res.count) countUnigue = true
                cb(err)
            })
        }
    ], function(err) {
        if (err) return cb(new MyError('Не удалось проверить уникальность полей.', err)) // Error while check fields unique
        // if (countUnigue) return cb(new UserError('Такая запись уже есть.',{err:err, obj:obj}));
        if (countUnigue) return cb(new UserError('recExist', {err: err, obj: obj}))
        return cb(null)
    })
}

MySQLModel.prototype.getAccessList = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this

    var command = obj.command
    if (!command) return cb(new MyError('В метод не передан command'))

    var list_of_access_ids = []

    var star_class_operation_id
    var command_class_operation_id

    async.series({
        getParentIds: function(cb) {
            // Если класс дочерний, то надо получить id, которыми ограничевается выбором разрешенных родителей
            // Получить список доступа родителя.
            // получить список id у кого родитель из списка выше.
            return cb(null)
        },
        getClassOperationStarId: function(cb) {
            // Надо получить id операции * и запрашиваемой (например get).
            // Это нужно чтобы разрешать запись пользователю, не только по списку конкретной операции (например "get"), но и по списку операции * (звездочка - все операции).
            // И наоборот. Если запрос (get) разрешен доступом типа *, то должны быть доступны записи определенные списком * и списком комманды (например get).


            if (_t.user.access_list && _t.user.access_list[_t.name] && _t.user.access_list[_t.name].is_access && _t.user.access_list[_t.name].is_access_by_list) {
                star_class_operation_id = _t.user.access_list[_t.name].class_operation_id
            } else if (_t.user.access_list && _t.user.access_list[_t.name] && _t.user.access_list[_t.name].is_access) {
                // Имеется доступ к * и он не ограничен списком
                return cb(null)
            }
            if (_t.user.access_list && _t.user.access_list[_t.name] && !_t.user.access_list[_t.name].is_access && _t.user.access_list[_t.name].operations[command]
                && _t.user.access_list[_t.name].operations[command].is_access && _t.user.access_list[_t.name].operations[command].is_access_by_list) {
                // Если есть для конкретной операции.
                command_class_operation_id = _t.user.access_list[_t.name].operations[command].class_operation_id
            } else if (_t.user.access_list && _t.user.access_list[_t.name] && !_t.user.access_list[_t.name].is_access && _t.user.access_list[_t.name].operations[command]
                && _t.user.access_list[_t.name].operations[command].is_access) {
                // Имеется доступ  к command и он не ограничен списком
                return cb(null)
            }
            if (!star_class_operation_id && !command_class_operation_id) return cb(null) // Ни один из доступов не ограничен списком

            if (star_class_operation_id && command_class_operation_id) return cb(null) // Оба class_operation_id имеются, дозапрос не нужен

            var o = {
                command: 'get',
                object: 'class_operation',
                params: {
                    doNotCheckList: true,
                    columns: ['id', 'class_id', 'name'],
                    where: [
                        {
                            key: 'class_id',
                            val1: _t.class_profile.id
                        },
                        {
                            key: 'name',
                            type: 'in',
                            val1: ['*', command]
                        }
                    ],
                    limit: 2,
                    collapseData: false
                }
            }
            _t.api(o, function(err, res) {
                if (err) return cb(new MyError('Не удалось получить id для команд из class_operation', {
                    o: o,
                    err: err
                }))
                for (var i in res) { // Поиск class_operation_id сделан на первый взгляж не оч красиво, зато оптимально. Так к серверу летит только 1 запрос.
                    if (res[i].name === '*') star_class_operation_id = res[i].id
                    if (res[i].name === command) command_class_operation_id = res[i].id
                }
                cb(null)
            })

        },
        getSelfIds: function(cb) {
            var o = {
                command: 'get',
                object: 'list_of_access',
                params: {
                    doNotCheckList: true,
                    columns: ['id', 'user_id', 'class_operation_id', 'record_id'],
                    where: [
                        {
                            key: 'is_active',
                            val1: true
                        },
                        {
                            key: 'user_id',
                            val1: _t.user.user_data.id
                        }
                    ],
                    // param_where:{
                    //     is_active:true
                    // },
                    limit: 10000000,
                    collapseData: false
                }
            }

            var class_operation_ids = []
            if (star_class_operation_id) class_operation_ids.push(star_class_operation_id)
            if (command_class_operation_id) class_operation_ids.push(command_class_operation_id)

            if (!class_operation_ids.length) return cb(null) // Нету таких операций, соответственно и список доступа не может быть определен.

            o.params.where.push({
                key: 'class_operation_id',
                type: 'in',
                val1: class_operation_ids
            })

            _t.api(o, function(err, res) {
                if (err) return cb(new MyError('Не удалось получить list_of_access', {o: o, err: err}))
                if (!res.length) {
                    list_of_access_ids.push(0)
                    return cb(null)
                }
                async.eachSeries(res, function(item, cb) {
                    // получить parent
                    list_of_access_ids.push(item.record_id)

                    async.series({
                        parent: function(cb) {
                            _t.getParentIds({id: item.record_id, doNotCheckList: true}, function(err, res) {
                                if (err) return cb(new MyError('Не удалось getParentIds', {
                                    id: item.record_id,
                                    err: err
                                }))
                                for (var i in res.ids) {
                                    list_of_access_ids.push(res.ids[i])
                                }
                                return cb(null)
                            })
                        },
                        child: function(cb) {
                            _t.getChildIds({id: item.record_id, doNotCheckList: true}, function(err, res) {
                                if (err) return cb(new MyError('Не удалось getChildIds', {
                                    id: item.record_id,
                                    err: err
                                }))
                                for (var i in res.ids) {
                                    list_of_access_ids.push(res.ids[i])
                                }
                                return cb(null)
                            })
                        }
                    }, cb)
                }, cb)

            })
        }
    }, function(err, res) {
        if (err) return cb(err)
        cb(null, {list_of_access_ids: list_of_access_ids})
    })


}

MySQLModel.prototype.getCount = function(params, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        params = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof params !== 'object') return cb(new MyError('В метод не переданы params'))
    var _t = this
    params.countOnly = true
    _t.get(params, cb)
}

var getWhereStr = function(params, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        params = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof params !== 'object') return cb(new MyError('В метод не переданы params'))
    var where = params.where
    if (!Array.isArray(where)) return cb(new MyError('В getWhereStr некорректно передан where', {params: params}))

    var tableName = params.tableName
    var class_fields_profile = params.class_fields_profile
    if (!tableName) return cb(new MyError('В getWhereStr не передан tableName', {params: params}))
    if (typeof class_fields_profile !== 'object') return cb(new MyError('В getWhereStr не передан class_fields_profile', {params: params}))
    var columns = params.columns
    if (!Array.isArray(columns)) return cb(new MyError('В getWhereStr некорректно передан columns', {params: params}))

    var globalWhereStr = ''
    var whereStr = ''
    var old_group = ''
    var old_role_group = ''
    var groupComparisonTypeIsOpen
    var oldComparisonType
    var role_groupIsOpen
    var roleWhereStr = ''

    var ready_columns_by_colName = params.ready_columns_by_colName

    // if (params.tableName == 'request_work'){
    //     console.log('asdasdasd');
    // }
    for (var w_index in where) {
        var one_where = where[w_index]
        if (typeof one_where !== 'object') continue

        //var key = (table_name)? table_name+'.'+one_where.key : one_where.key;
        var columnProfile = class_fields_profile[one_where.key]

        if (!columnProfile) return cb(new MyError('Нет профайла для колонки.', {
            column: one_where.key,
            table: tableName
        }))
        var key
        var fromTable = columnProfile.from_table_alias || columnProfile.from_table
        // if (columnProfile.is_virtual && fromTable) {
        //     // key = fromTable;
        //     key = columnProfile.from_table;
        // } else {
        //     key = one_where.key;
        // } // Я не понял, зачем это добавил и это не корректно!
        key = one_where.key
        if (!key) continue
        // if (!columns.indexOf(key) === -1) continue; // Поле недоступно
        if (!class_fields_profile[key]) continue // Поле недоступно
        one_where.type = String(one_where.type).toUpperCase()
        var available_types = ['=', '>', '<', '<=', '>=', '<>', '!=', 'LIKE', '%LIKE', 'LIKE%', 'IN', 'NOTIN', '!IN', 'BETWEEN', '..', 'ISNULL', 'ISNOTNULL', '!ISNULL']
        var type = (available_types.indexOf(one_where.type) !== -1) ? one_where.type : '='


        var val1 = (typeof one_where.val1) ? one_where.val1 : ''
        var val2 = (typeof one_where.val2) ? one_where.val2 : ''
        one_where.group = one_where.group || one_where.key + '__group'
        var group = one_where.groupTrim || one_where.group.replace(/\.\w+/ig, '')
        var groupComparisonType = one_where.group.replace(/\w+\.*/, '') || 'AND' // EXAMPLE 'group1.OR'
        groupComparisonType = (groupComparisonType.toUpperCase() === 'OR') ? groupComparisonType.toUpperCase() : 'AND'
        // if (groupComparisonType !== 'OR'){
        //    groupComparisonTypeOld = 'AND';
        // }
        // if (groupComparisonType === 'OR' && groupComparisonTypeOld !== 'OR'){
        //    groupComparisonTypeOld = 'OR';
        //    groupComparisonType = 'AND';
        // }
        one_where.comparisonType = String(one_where.comparisonType).toUpperCase()
        var comparisonType = (['OR', 'AND'].indexOf(one_where.comparisonType) !== -1) ? one_where.comparisonType : 'AND'

        var binaryStr = (one_where.binary) ? 'BINARY ' : ''
        var keyString

        var isBinary = (columnProfile.type === 'date' || columnProfile.type === 'datetime')
        keyString = isBinary ? binaryStr + ready_columns_by_colName[key] : ready_columns_by_colName[key]

        if (typeof keyString === 'undefined') { // Если поле еще не было сформатировано в блоке columns, то определим по старинке. Не будет работать для виртуальных полей через несколько таблиц
            if (!columnProfile.is_virtual) {
                if (columnProfile.type === 'date') {
                    //keyString = "DATE_FORMAT(" + tableName + '.' + key + ",'%d.%m.%Y')";
                    keyString = pool.escapeId(tableName) + '.' + pool.escapeId(key)
                } else if (columnProfile.type === 'datetime') {
                    //keyString = "DATE_FORMAT(" + tableName + '.' + key + ",'%d.%m.%Y %H:%i:%s')";
                    keyString = pool.escapeId(tableName) + '.' + pool.escapeId(key)
                } else {
                    keyString = binaryStr + pool.escapeId(tableName) + '.' + pool.escapeId(key)
                }

            } else if (columnProfile.is_virtual && fromTable) {
                keyString = binaryStr + pool.escapeId(fromTable) + '.' + pool.escapeId(columnProfile.return_column)
            } else {
                var concat_array = columnProfile.concat_array
                var str = ''
                for (var i in concat_array) {
                    var fieldKey = concat_array[i]
                    var fieldProfile = class_fields_profile[fieldKey]
                    if (!str) str = 'CONCAT('
                    if (fieldProfile) {
                        str += pool.escapeId(fieldProfile.from_table || tableName) + '.' + pool.escapeId(fieldProfile.return_column || fieldKey) + ','
                    } else {
                        // str += "'" + pool.escape(fieldKey) + "',";
                        str += pool.escape(fieldKey) + ","
                    }
                }
                keyString = binaryStr + str.replace(/,$/, ')')
            }
        }

        if (typeof keyString === 'undefined') continue
        var s = ''
        var val1_new, val2_new
        switch (type) {
            case '=':
            case '>':
            case '<':
            case '<=':
            case '>=':

                val1_new = pool.escape(val1)
                if (columnProfile.type == 'date' || columnProfile.type == 'datetime') val1_new = "str_to_date('" + funcs.getDateTimeMySQL(val1) + "', '%Y-%m-%d %H:%i:%s')"
                if (columnProfile.type === 'tinyint' && columnProfile.field_length === 1 && !val1) {
                    s = '(' + keyString + ' ' + type + ' ' + val1_new + ' OR ' + keyString + ' IS NULL )'
                    break
                }
                if (!val1 && type === '=') {
                    s = '(' + keyString + ' ' + type + ' ' + val1_new + ' OR ' + keyString + ' IS NULL)'
                } else {
                    s = keyString + ' ' + type + ' ' + val1_new
                }


                break
            case '!=':
            case '<>':
                val1_new = pool.escape(val1)
                if (columnProfile.type == 'date' || columnProfile.type == 'datetime') val1_new = "str_to_date('" + funcs.getDateTimeMySQL(val1) + "', '%Y-%m-%d %H:%i:%s')"
                if (columnProfile.type === 'tinyint' && columnProfile.field_length === 1 && !val1) {
                    s = '(' + keyString + ' <> ' + val1_new + ' OR ' + keyString + ' IS NOT NULL )'
                    break
                }

                if (!val1) {
                    s = '(' + keyString + ' <> ' + val1_new + ' OR ' + keyString + ' IS NOT NULL)'
                } else {
                    s = keyString + ' <> ' + val1_new
                }

                break
            case 'LIKE':
                if (columnProfile.type == 'date' || columnProfile.type == 'datetime') keyString = "DATE_FORMAT(" + keyString + ",'%d.%m.%Y %H:%i:%s')"
                s = keyString + ' ' + type + ' ' + pool.escape('%' + val1 + '%')
                break
            case 'LIKE%':
                if (columnProfile.type == 'date' || columnProfile.type == 'datetime') keyString = "DATE_FORMAT(" + keyString + ",'%d.%m.%Y %H:%i:%s')"
                s = keyString + ' LIKE ' + pool.escape(val1 + '%')
                break
            case '%LIKE':
                if (columnProfile.type == 'date' || columnProfile.type == 'datetime') keyString = "DATE_FORMAT(" + keyString + ",'%d.%m.%Y %H:%i:%s')"
                s = keyString + ' LIKE ' + pool.escape('%' + val1)
                break
            case 'IN':
                var values = ''
                // if (typeof val1 !== 'object' && val1) val1 = String(val1).split(',');
                if (typeof val1 !== 'object' && val1) val1 = [val1]
                if (typeof val1 == 'object') {
                    for (var i in val1) {
                        if (one_where.group === 'Access_by_list_SYSTEM') {
                            values += val1[i] + ','
                        } else {
                            values += pool.escape(val1[i]) + ','
                        }

                    }
                } else if (typeof val1 == 'string') {
                    values = pool.escape(val1)
                }

                values = values.replace(/,$/, '')
                s = keyString + ' IN (' + values + ')'
                break
            case 'NOTIN':
            case '!IN':
                var values = ''
                // if (typeof val1 !== 'object' && val1) val1 = String(val1).split(',');
                if (typeof val1 !== 'object' && val1) val1 = [val1]
                if (typeof val1 == 'object') {
                    for (var i in val1) {
                        values += pool.escape(val1[i]) + ','
                    }
                } else if (typeof val1 == 'string') {
                    values = pool.escape(val1)
                }

                values = values.replace(/,$/, '')
                s = (keyString + ' NOT IN (' + values + ')')
                // s = '(' + (keyString + ' NOT IN (' + values + ') or ' + keyString + ' IS NULL)' );
                break
            case 'BETWEEN':
            case '..':
                val1_new = pool.escape(val1)
                val2_new = pool.escape(val2)
                if (columnProfile.type == 'date' || columnProfile.type == 'datetime') {
                    val1_new = "str_to_date('" + funcs.getDateTimeMySQL(val1) + "', '%Y-%m-%d %H:%i:%s')"
                    val2_new = "str_to_date('" + funcs.getDateTimeMySQL(val2) + "', '%Y-%m-%d %H:%i:%s')"
                }
                if (val1 && val2) { // Указаны оба значения. Используем between
                    s = keyString + " BETWEEN " + val1_new + " AND " + val2_new + ""
                } else if (!val2) { // Второе значение не указано. Используем >=
                    s = keyString + " >= " + val1_new
                } else { // Первое значение не указано. Используем <=
                    s = keyString + " <= " + val2_new
                }
                break
            case 'ISNULL':
                s = keyString + " IS NULL "
                break
            case 'ISNOTNULL':
            case '!ISNULL':
                s = keyString + " IS NOT NULL "
                break
            default :
                continue
                break
        }


        // Обернем все в группы по ролям
        var role_group = one_where.role_group || 'NO_ROLE_GROUP'

        // Если роль не сменилась
        // if (old_role_group && old_role_group != role_group || +w_index === where.length -1) {
        if (old_role_group && old_role_group != role_group) {
            globalWhereStr += (globalWhereStr ? ` OR ( ${whereStr} )` : `( ${whereStr} )`)
            if (role_group === 'NO_ROLE_GROUP') globalWhereStr = `( ${globalWhereStr} )`
            whereStr = ''
            old_role_group = role_group
        } else if (!old_role_group) {
            old_role_group = role_group
        }


        if (groupComparisonType === 'OR' && !groupComparisonTypeIsOpen && where.length > 1) {
            s = '(' + s
            groupComparisonTypeIsOpen = true
            oldComparisonType = groupComparisonType
        }

        if (group != old_group && where.length > 1) {
            // if (groupComparisonType === 'AND' && groupComparisonTypeIsOpen) {
            if (oldComparisonType === 'OR' && groupComparisonTypeIsOpen && old_group) {
                whereStr += ')'
                groupComparisonTypeIsOpen = false
            }

            // whereStr = (whereStr) ? whereStr + ') ' + groupComparisonType + ' (' + s : '(' + s;
            // whereStr = (whereStr) ? whereStr + ') ' + groupComparisonType + ' (' + s : s;
            whereStr = (whereStr) ? whereStr + ') ' + groupComparisonType + ' (' + s : s
            // whereStr = (whereStr)? whereStr + ' '+ comparisonType +' ' + s : s;

            old_group = group
            oldComparisonType = comparisonType
        } else {
            whereStr = (whereStr) ? whereStr + ' ' + comparisonType + ' ' + s : s
        }

        // Если это был последний элемент и была открыта группа, закроем ее;
        if (+w_index === where.length - 1) {
            whereStr += (groupComparisonTypeIsOpen ? ')' : '')
            globalWhereStr += (globalWhereStr ? ` ${role_group === 'NO_ROLE_GROUP' ? 'AND' : 'OR'} ( ${whereStr} )` : `( ${whereStr} )`)
            groupComparisonTypeIsOpen = false
        }

    }

    return cb(null, {str: globalWhereStr})

    // if (groupComparisonTypeIsOpen) {
    //     whereStr += ')';
    //     // whereStr = '(' + whereStr + ')';
    //     groupComparisonTypeIsOpen = false;
    // }

    // if (whereStr) whereStr += ')';
    // return cb(null, {str:whereStr});
}

function prepareField(params, cb) {
    var colProfile_aliases = {...params.colProfile_aliases}
    var from_table_counter = {...params.from_table_counter}
    var from_table_counter2 = {...params.from_table_counter2}

    var ready_columns = [...params.ready_columns]
    var ready_column
    // var join_tables = [...params.join_tables];
    var join_tables_obj = {}
    var dyn_fields = {...params.dyn_fields}
    var col = params.col
    var _t = params._t

    var colProfile = _t.class_fields_profile[col]
    var tableName = _t.tableName

    var field_detect // Определяет что тип поля определен и будет обработан в найденом кейсе, а в остальных кейсах - пропускаем
    async.series({
        sample: (cb) => { // Самое обычное поле (не виртуальное)
            if (field_detect) return cb(null)
            if (colProfile.is_virtual) return cb(null)
            field_detect = true

            var s = pool.escapeId(tableName) + '.' + pool.escapeId(col)
            ready_column = s
            if (ready_columns.indexOf(s) === -1) ready_columns.push(s)
            return cb(null)
        },
        concatField: (cb) => { // Виртуальное (просто объединение нескольких - CONCAT
            if (field_detect) return cb(null)
            if (!colProfile.concat_fields) return cb(null)
            field_detect = true

            var concat_array = colProfile.concat_array
            var s = ''
            async.eachSeries(concat_array, function(fieldKey, cb) {
                var fieldProfile = _t.class_fields_profile[fieldKey]
                if (!s) s = 'CONCAT('

                if (!fieldProfile) {
                    s += pool.escape(fieldKey) + ","
                    return cb(null)
                }

                var params2 = {
                    colProfile_aliases,
                    from_table_counter,
                    from_table_counter2,
                    ready_columns: [],
                    // join_tables,
                    // join_tables_obj,
                    dyn_fields,
                    col: fieldKey,
                    _t
                }
                // Это чистая функция.
                prepareField(params2, (err, res) => {
                    if (err) return cb(err)
                    // s += 'IFNULL(' + pool.escapeId(fieldProfile.from_table_alias || fieldProfile.from_table || tableName) + '.' + pool.escapeId(fieldProfile.return_column || fieldKey) + ',\'\'),';
                    // var index = res.ready_columns[0]? res.ready_columns[0].indexOf(' AS ') : null;
                    // s += 'IFNULL(' + (res.ready_columns[0] && index? res.ready_columns[0].substr(0, index) : 'NULL') + ',\'\'),';
                    s += 'IFNULL(' + res.ready_column + ',\'\'),'
                    join_tables_obj = {...join_tables_obj, ...res.join_tables_obj}
                    colProfile_aliases = {...colProfile_aliases, ...res.colProfile_aliases}
                    from_table_counter = {...from_table_counter, ...res.from_table_counter}
                    from_table_counter2 = {...from_table_counter2, ...res.from_table_counter2}
                    // var result = {
                    //     colProfile_aliases,
                    //     from_table_counter,
                    //     from_table_counter2,
                    //     ready_columns,
                    //     ready_column,
                    //     // join_tables,
                    //     join_tables_obj,
                    //     dyn_fields
                    // }

                    // join_tables = (join_tables.length !== res.join_tables.length)? [...join_tables, ...res.join_tables.slice(join_tables.length)] : join_tables;
                    return cb(null)
                })
                // console.log('asd asddjasdna');


            }, err => {
                if (err) return cb(err)
                // s = s.replace(/,$/, ') as ') + pool.escapeId(col);
                ready_column = s.replace(/,$/, ')')
                s = s.replace(/,$/, ') as ') + pool.escapeId(col)
                if (ready_columns.indexOf(s) === -1) ready_columns.push(s)
                return cb(null)
            })
            // for (var i in concat_array) {
            //     var fieldKey = concat_array[i];
            //     var fieldProfile = _t.class_fields_profile[fieldKey];
            //     if (!s) s = 'CONCAT(';
            //     if (fieldProfile) {
            //         s += 'IFNULL(' + pool.escapeId(fieldProfile.from_table_alias || fieldProfile.from_table || tableName) + '.' + pool.escapeId(fieldProfile.return_column || fieldKey) + ',\'\'),';
            //     } else {
            //         // s += "'" + fieldKey + "',";
            //         s += pool.escape(fieldKey) + ",";
            //     }
            // }
            // s = s.replace(/,$/, ') as ') + pool.escapeId(col);
            // if (ready_columns.indexOf(s) === -1) ready_columns.push(s);
            // return cb(null);
        },
        virtualNotDynamic: (cb) => {
            if (field_detect) return cb(null)
            if (colProfile.dynamic_field_id) return cb(null)
            field_detect = true

            var join_table = colProfile.join_table_by_alias || colProfile.join_table

            var keyword_ = colProfile.keyword.replace(/[^a-z0-9_-]/gim, '')
            var from_table_ = colProfile.table_alias || colProfile.from_table
            var colProfile_alias = from_table_ + join_table + keyword_
            if (colProfile_aliases[colProfile_alias]) {
                // var c_name_tmp = pool.escapeId(colProfile_aliases[colProfile_alias].column_table) + '.' + pool.escapeId(colProfile.return_column) + ' as ' + pool.escapeId(col);
                ready_column = pool.escapeId(colProfile_aliases[colProfile_alias].column_table) + '.' + pool.escapeId(colProfile.return_column)
                var c_name_tmp = ready_column + ' as ' + pool.escapeId(col)

                if (ready_columns.indexOf(c_name_tmp) === -1) ready_columns.push(c_name_tmp)
                _t.class_fields_profile[col].from_table_alias = colProfile_aliases[colProfile_alias].from_table_alias
                return cb(null)
            }

            if (!from_table_counter[colProfile.from_table]) from_table_counter[colProfile.from_table] = 0
            from_table_counter[colProfile.from_table]++
            colProfile.from_table_alias = colProfile.from_table + from_table_counter[colProfile.from_table]
            var table_name
            if (join_table) {
                if (join_table == tableName) {
                    table_name = join_table
                } else {
                    if (!from_table_counter2[colProfile.from_table]) from_table_counter2[colProfile.from_table] = 0
                    from_table_counter2[colProfile.from_table]++
                    table_name = (colProfile_aliases[join_table]) ? colProfile_aliases[join_table].from_table_alias : join_table + from_table_counter2[colProfile.from_table]
                }
            } else {
                table_name = tableName
            }

            var join_table_str = ' LEFT JOIN ' + pool.escapeId(colProfile.from_table) + ' as ' + pool.escapeId(colProfile.from_table_alias) + ' ON ('

            var keyword_arr = (colProfile.keyword.indexOf('[') !== -1) ? (function() {
                var keyword_parsed
                try {
                    keyword_parsed = JSON.parse(colProfile.keyword)
                } catch (e) {
                    return cb(MyError('Не валидный JSON в поле keyword', {colProfile: colProfile}))
                }
                if (typeof keyword_parsed !== 'object') return cb(MyError('Поле keyword не является объектом/массивом', {colProfile: colProfile}))
                return keyword_parsed
            })() : [colProfile.keyword]
            // if (colProfile.keyword.indexOf('[') !== -1)

            for (var i in keyword_arr) {
                var keywords = keyword_arr[i].split(':')
                var keyword = keywords[0]
                var ext_keyword = keywords[1] || 'id'
                if (i > 0) join_table_str += ' AND '
                // join_table_str += (isNaN(+keyword))? table_name + '.' + keyword : +keyword;
                if (!isNaN(+keyword)) {
                    join_table_str += +keyword
                } else if (keyword.indexOf('|') === -1) {
                    join_table_str += pool.escapeId(table_name) + '.' + pool.escapeId(keyword)
                } else {
                    var keyword_alias = keyword.replace(/\|/ig, '')
                    if (!_t.join_table_keyword_obj[keyword_alias]) {
                        return cb(new MyError('Для поля указан keyword с подстановкой, однако в таблице join_table_keyword значение отсутствует.', {
                            colProfile: colProfile,
                            keyword_alias: keyword_alias
                        }))
                    }
                    join_table_str += +_t.join_table_keyword_obj[keyword_alias].linked_id
                }
                // join_table_str += (keyword.indexOf('|') === -1)? table_name + '.' + keyword : keyword.replace;
                join_table_str += ' = '
                // join_table_str += (isNaN(+ext_keyword))? colProfile.from_table_alias + '.' + ext_keyword : +ext_keyword;
                if (!isNaN(+ext_keyword)) {
                    join_table_str += +ext_keyword
                } else if (ext_keyword.indexOf('|') === -1) {
                    join_table_str += pool.escapeId(colProfile.from_table_alias) + '.' + pool.escapeId(ext_keyword)
                } else {
                    var ext_keyword_alias = ext_keyword.replace(/\|/ig, '')
                    if (!_t.join_table_keyword_obj[ext_keyword_alias]) {
                        return cb(new MyError('Для поля указан keyword с подстановкой, однако в таблице join_table_keyword значение отсутствует.', {
                            colProfile: colProfile,
                            ext_keyword_alias: ext_keyword_alias
                        }))
                    }
                    join_table_str += +_t.join_table_keyword_obj[ext_keyword_alias].linked_id
                }
            }
            join_table_str += ')'
            join_tables_obj[from_table_ + '|||' + colProfile.column_name] = join_table_str
            // join_tables.push(join_table_str);

            // var c_name_tmp2 = pool.escapeId((colProfile.from_table_alias || colProfile.from_table)) + '.' + pool.escapeId(colProfile.return_column) + ' as ' + pool.escapeId(col);
            ready_column = pool.escapeId((colProfile.from_table_alias || colProfile.from_table)) + '.' + pool.escapeId(colProfile.return_column)
            var c_name_tmp2 = ready_column + ' as ' + pool.escapeId(col)

            if (ready_columns.indexOf(c_name_tmp2) === -1) ready_columns.push(c_name_tmp2)
            _t.class_fields_profile[col].from_table_alias = colProfile.from_table_alias
            colProfile_aliases[colProfile_alias] = {
                column_table: (colProfile.from_table_alias || colProfile.from_table),
                from_table_alias: colProfile.from_table_alias
            }
            return cb(null)
        },
        dynamicField: (cb) => {
            // return cb(null);
            if (field_detect) return cb(null)
            // if (!colProfile.dynamic_field_id) return cb(null);
            if (!colProfile.dynamic_field_id || !colProfile.dynamic_field_pair) return cb(null)
            field_detect = true

            // dyn_table_alias = dyn_table_alias || 'dyn_table_' + funcs.guidShort();
            var alias = '_' + colProfile.dynamic_field_pair_id
            if (!dyn_fields.obj_by_pair[alias]) dyn_fields.obj_by_pair[alias] = {
                dynamic_field_pair_id: colProfile.dynamic_field_pair_id,
                additional_where: colProfile.dynamic_field_pair.additional_where,
                additional_where_ready: {},
                source_class: colProfile.source_class,
                parent_key1: colProfile.class + '_id',
                parent_key2: colProfile.source_class + '_id',
                table_with_value: (colProfile.dynamic_field_pair.table_value_name_prefix || colProfile.source_class) + '_value',
                table_with_value_key: ((colProfile.dynamic_field_pair.table_value_name_prefix || colProfile.source_class) + '_value') + '_id',
                from_source_obj: {},
                one_pair_source_ids: [],
                dyn_table_alias: 'dyn_table_' + alias,
                class: colProfile.class
            }
            if (!dyn_fields.obj_by_pair[alias].from_source_obj[[colProfile.id_from_source]]) dyn_fields.obj_by_pair[alias].from_source_obj[[colProfile.id_from_source]] = {
                id_from_source: colProfile.id_from_source,
                items: []
            }
            if (dyn_fields.obj_by_pair[alias].one_pair_source_ids.indexOf(colProfile.id_from_source) === -1) dyn_fields.obj_by_pair[alias].one_pair_source_ids.push(colProfile.id_from_source)


            colProfile.dyn_table_alias = dyn_fields.obj_by_pair[alias].dyn_table_alias

            // var field_str = pool.escapeId(colProfile.dyn_table_alias) + '.' + pool.escapeId(colProfile.column_name) + ' as ' + pool.escapeId(colProfile.column_name);
            ready_column = pool.escapeId(colProfile.dyn_table_alias) + '.' + pool.escapeId(colProfile.column_name)
            var field_str = ready_column + ' as ' + pool.escapeId(colProfile.column_name)

            if (ready_columns.indexOf(field_str) === -1) ready_columns.push(field_str)

            dyn_fields.items[colProfile.column_name] = colProfile


            return cb(null)
        }
    }, (err, res) => {
        if (err) return cb(err)
        var result = {
            colProfile_aliases,
            from_table_counter,
            from_table_counter2,
            ready_columns,
            ready_column,
            // join_tables,
            join_tables_obj,
            dyn_fields
        }
        return cb(null, result)
    })
}

MySQLModel.prototype.get = function(params, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        params = {}
    }
    if (params.additional_params) {
        console.log(params)
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof params !== 'object') return cb(new MyError('В метод не переданы params'))
    var _t = this
    var doNotLog = params.doNotLog || !debug
    delete params.doNotLog

    var use_cache = (typeof params.use_cache !== 'undefined') ? params.use_cache : _t.use_cache
    if (use_cache) {
        var cacheAlias = _t.data_cache_alias

        cacheAlias += JSON.stringify(params)//.replace(/"|:|\{|\}|\,|\>|\=|\*/ig,'');
        cacheAlias += _t.user.user_data ? ('---' + _t.user.user_data.id) : ''
        // cacheAlias = funcs.hashCode(cacheAlias);
        if (!global.classesCache[_t.name]) global.classesCache[_t.name] = {}
        if (global.classesCache[_t.name][cacheAlias]) {
            if (!doNotLog) console.log('\n========USE_CACHE=======', cacheAlias)
            return cb(null, global.classesCache[_t.name][cacheAlias], global.classesCache[_t.name][cacheAlias + 'additionalData'])
        }
        //if (_t.cache[cacheAlias]) {
        //    console.log('\n========USE_CACHE==================================================\n');
        //    return cb(null, _t.cache[cacheAlias]);
        //}
    }

    var fromClient = params.fromClient
    delete params.fromClient

    var list_of_access_ids = []
    var doNotCheckList = fromClient ? false : params.doNotCheckList
    var skipCheckRoleModel = fromClient ? false : params.skipCheckRoleModel

    var skipCheckRoleModelAdmin = (_t.user.authorized && _t.user.user_data.user_type_sysname === 'ADMIN')
    // if (_t.user.authorized && _t.user.user_data.user_type_sysname === 'ADMIN'){
    //     skipCheckRoleModel = true;
    // }


    // var doNotCheckList = !fromClient;
    var role_model_where = []
    delete params.doNotCheckList
    delete params.skipCheckRoleModel
    // var log = ()=>{
    //     if (doNotLog) return;
    //     console.log.apply( console, ...args );
    // }
    // var o = {
    //     command:'get',
    //     object:'User',
    //     params:{
    //         specColumns:{
    //             u1:'(select login from user where id = 1)'
    //         },
    //         collapseData:false
    //     }
    // };
    // socketQuery(o, function(r){
    //     console.log(r);
    // });

    if (fromClient && params.specColumns) {
        return cb(new MyError('specColumns is not available for client request'))
    }
    if (fromClient && params.groupBy) {
        return cb(new MyError('groupBy is not available for client request'))
    }

    var multi_value_separator = '-|-'
    if (!fromClient && typeof params.multi_value_separator === 'string') {
        multi_value_separator = params.multi_value_separator.replace(/'/ig, '')
    }
    async.waterfall([
        function(cb) {

            for (var i in _t.setFormating) {
                if (typeof funcs[_t.setFormating[i]] == 'function') {
                    if (params[i]) {
                        params[i] = funcs[_t.setFormating[i]](params[i])
                    }
                }
            }
            _t.beforeFunction['get'](params, function(err) {
                if (err) return cb(new MyError('Ошибка выполнения beforeFunction'))
                return cb(null)
            })
        },
        function(cb) {
            // Получить join_table_keyword / get
            return cb(null)
            if (_t.name === 'Join_table_keyword' || _t.name === 'User') return cb(null)
            var o = {
                command: 'get',
                object: 'join_table_keyword',
                params: {
                    doNotCheckList: true,
                    collapseData: false
                }
            }
            _t.api(o, function(err, res) {
                if (err) return cb(new MyError('Не удалось получить join_table_keyword', {o: o, err: err}))
                _t.join_table_keyword_obj = {}
                for (var i in res) {
                    _t.join_table_keyword_obj[res[i].alias] = res[i]
                }
                cb(null)
            })
        },
        function(cb) {
            // Если доступ по списку, то получим списки
            if (!_t.user.user_data) {
                return cb(null) // Пользователь еще не определен. Это запросы на авторизацию или первоначальную загрузку
            }
            if (doNotCheckList || _t.user.user_data.user_type_sysname === 'ADMIN') return cb(null)

            var obj = {
                command: 'get'
            }
            _t.getAccessList(obj, function(err, res) {
                if (err) return cb(new MyError('Не удалось загрузить список доступных записей.', {obj: obj, err: err}))
                list_of_access_ids = res.list_of_access_ids
                cb(null)
            })

            // var o = {
            //     command:'get',
            //     object:'list_of_access',
            //     params:{
            //         columns:['id','user_id','class_operation_id','record_id'],
            //         param_where:{
            //             is_active:true
            //         },
            //         limit:10000000,
            //         collapseData:false
            //     }
            // };
            //
            // if (_t.user.access_list && _t.user.access_list[_t.name] && _t.user.access_list[_t.name].is_access && _t.user.access_list[_t.name].is_access_by_list){
            //     o.params.param_where.user_id = _t.user.user_data.id;
            //     o.params.param_where.class_operation_id = _t.user.access_list[_t.name].class_operation_id;
            //
            // }else if (_t.user.access_list && _t.user.access_list[_t.name] && !_t.user.access_list[_t.name].is_access && _t.user.access_list[_t.name].operations['get']
            //     && _t.user.access_list[_t.name].operations['get'].is_access && _t.user.access_list[_t.name].operations['get'].is_access_by_list){
            //
            //     o.params.param_where.user_id = _t.user.user_data.id;
            //     o.params.param_where.class_operation_id = _t.user.access_list[_t.name].operations['get'].class_operation_id;
            // }else{
            //     return cb(null);
            // }
            //
            // _t.api(o, function (err, res) {
            //     if (err) return cb(new MyError('Не удалось получить list_of_access',{o : o, err : err}));
            //     if (!res.length) {
            //         list_of_access_ids.push(0);
            //         return cb(null);
            //     }
            //     async.eachSeries(res, function(item, cb){
            //         // получить parent
            //         list_of_access_ids.push(item.record_id);
            //
            //         async.series({
            //             parent:function(cb){
            //                 _t.getParentIds({id: item.record_id, doNotCheckList: true}, function(err, res){
            //                     if (err) return cb(err);
            //                     for (var i in res.ids) {
            //                         list_of_access_ids.push(res.ids[i]);
            //                     }
            //                     return cb(null);
            //                 });
            //             },
            //             child:function(cb){
            //                 _t.getChildIds({id: item.record_id, doNotCheckList: true}, function(err, res){
            //                     if (err) return cb(err);
            //                     for (var i in res.ids) {
            //                         list_of_access_ids.push(res.ids[i]);
            //                     }
            //                     return cb(null);
            //                 });
            //             }
            //         }, cb);
            //     }, function(err, res){
            //         if (err) return cb(err);
            //         cb(null);
            //     });
            //
            // });
        },
        function(cb) {
            // Доступ по ролевой модели
            // if (!_t.user.authorized || !_t.user.roleModel || !_t.user.roleModel.get || !_t.user.roles || doNotCheckList || _t.user.user.sid === '0') return cb(null);
            // if (!_t.user.authorized || !_t.user.roleModel || !_t.user.roleModel.get || !_t.user.roles || doNotCheckList) return cb(null);
            if (!_t.user.authorized || !_t.user.roleModel || !_t.user.roleModel.get || !_t.user.roles || skipCheckRoleModel || skipCheckRoleModelAdmin) return cb(null)

            // var c = 0;
            var old_role
            async.eachSeries(Object.keys(_t.user.roles.roles_obj_bySysname), (one_role, cb) => {
                var one_item = (_t.user.roleModel.get[one_role]) ? _t.user.roleModel.get[one_role][_t.name] : false
                if (!one_item) return cb(null)
                if (typeof one_item === 'object' && !Array.isArray(one_item)) {
                    if (!one_item[`${params.class}.${params.client_object}`]
                        || typeof one_item[`${params.class}.${params.client_object}`] !== 'object') {
                        if (one_item['*'] && typeof one_item['*'] === 'object') {
                            one_item = one_item['*']
                        } else {
                            return cb(null)
                        }
                    } else {
                        one_item = one_item[`${params.class}.${params.client_object}`]
                    }

                }
                // var gr_ = funcs.guidShort();
                // if (c < Object.keys(_t.user.roles.roles_obj_bySysname).length -1) gr_ += '.OR';
                // c++;
                // var j = 0;
                if (typeof one_item === 'object' && one_item !== null) one_item = funcs.cloneObj(one_item, 10)
                async.eachSeries(one_item, (one_where, cb) => {
                    if (typeof one_where !== 'object') return cb(null)
                    var group = (one_where.group) ? one_where.group : 'role_model_gr'
                    // group = group + '_' + gr_;
                    group = one_role + '___ISROLE___' + group
                    // group = one_role + group;
                    // group += '.OR';
                    // if (old_role !== one_role){
                    //     group += '.OR';
                    //     old_role = one_role;
                    // }
                    // if (old_role)
                    var one = {
                        key: one_where.key,
                        type: one_where.type,
                        group: group,
                        role_group: one_role,
                        is_role: true,
                        comparisonType: one_where.comparisonType
                    }
                    var val1
                    console.log('one_where.val1', one_where.val1)
                    async.series({
                        prepareVal: cb => {
                            if (typeof one_where.val1 !== 'string' && typeof one_where.val1 !== 'function') {
                                val1 = one_where.val1
                                return cb(null)
                            }
                            // if (one_where.val1[0] !== '$') return cb(null)
                            // var method_name = one_where.val1.substr(1)
                            var method_name = one_where.val1
                            if (typeof method_name !== 'function'){
                                debugger;
                                return cb(new MyError('Метод в ролевой модели не определен', {
                                    method_name: method_name,
                                    one_where,
                                    object: _t.name
                                }))
                            }


                            var one_method_params = {
                                ...params,
                                roles: {..._t.user.roles},
                                role_sysname: one_role,
                            }
                            var f = method_name.bind(_t.user.roleModel)
                            // var f = _t.user.role_model.methods[method_name].bind(_t.user)
                            // var f = _t.user.role_model.methods[method_name];
                            f(one_method_params, (err, res) => {
                                if (err) return cb(new MyError('Метод в ролевой модели вернул ошибку', {
                                    err: err,
                                    method_name: method_name,
                                    object: _t.name
                                }))
                                val1 = res.data
                                cb(null)
                            })
                        },
                        add: cb => {
                            one.val1 = val1
                            role_model_where.push(one)
                            cb(null)
                        }
                    }, cb)
                }, cb)
            }, cb)
        },
        function(cb) { // Новая реализация формирования SQL
            // приведем param_where в вид соответствующий where => key,val1
            var param_where = []
            for (var pkey in params.param_where) {
                var p = params.param_where[pkey]
                if (typeof p === 'string' || typeof p === 'number' || typeof p === 'boolean') {
                    param_where.push({
                        key: pkey,
                        val1: p
                    })
                }
            }
            var where = params.where || _t.where || []
            where = where.concat(param_where)

            where = where.concat(_t.default_where)

            where = where.concat(role_model_where)

            var limit = (isNaN(+params.limit) || params.limit === false) ? 1000 : +params.limit || 1000

            var page_no = (isNaN(+params.page_no)) ? 1 : +params.page_no
            var offset = (isNaN(+params.offset)) ? (limit * (page_no - 1)) : +params.offset || 0
            var distinct = params.distinct || _t.distinct
            if (typeof params.sort == 'string') params.sort = params.sort.trim()
            if (typeof params.sort == 'string') params.sort = {columns: params.sort.split(',')}
            var sort = params.sort || ((_t.sort) ? funcs.cloneObj(_t.sort) : {columns: ['id']})
            if (typeof sort.direction == 'string') sort.directions = sort.direction.split(',')
            var deleted = !!params.deleted

            var published = (typeof params.published !== 'undefined') ? params.published : _t.check_published
            var columns = []

            var resultColumns = (Array.isArray(params.columns)) ? params.columns : _t.columns
            for (var column in  resultColumns) {
                var classFieldsProfile = _t.class_fields_profile[resultColumns[column]]
                if (typeof classFieldsProfile !== 'object') continue
                if (classFieldsProfile.queryable) {
                    if (columns.indexOf(resultColumns[column]) === -1) columns.push(resultColumns[column])
                }
            }
            if (!columns.length) return cb(new MyError('Нет доступных колонок.', {params: params}))


            var sql = ""
            var whereStr = ''

            var ready_columns = []
            var ready_columns_by_colName = {}
            var specColumns = params.specColumns // Объект, где ключ альяс результирующего столбца. specColumns:{pos:'POSITION(\'молоко\' IN product.NAME)'} --> POSITION('молоко' IN product.NAME) AS pos
            var groupBy = (Array.isArray(params.groupBy)) ? (() => {
                var str = ''
                for (var i in params.groupBy) {
                    if (str) str += ','
                    str += pool.escapeId(params.groupBy[i])
                }
                return str
            })() : ((params.groupBy) ? pool.escapeId(params.groupBy) : false) // Массив полей по которым группировать. Используется в связке с specColumns. Пример ccs.vg - Investor_account
            var join_tables
            var join_tables_obj = {}
            var add_join_columns = []
            var from_table_counter = {}
            var from_table_counter2 = {}
            var sortColumnsReady = []
            var colProfile_aliases = {}
            if (columns.indexOf(distinct) === -1) distinct = false
            var tableName = _t.tableName

            if (sort) { // Добавим поля по которым идет сортировка к columns
                if (sort.columns) {
                    for (var i0 in sort.columns) {
                        if (columns.indexOf(sort.columns[i0]) === -1) columns.push(sort.columns[i0])
                    }
                }
            }
            for (const i_ in _t.default_where) { // Добавим поля, которые участвуют в default_where
                if (columns.indexOf(_t.default_where[i_].key) === -1) columns.push(_t.default_where[i_].key)
            }
            for (const i_ in role_model_where) { // Добавим поля, которые участвуют в role_model_where
                if (columns.indexOf(role_model_where[i_].key) === -1) columns.push(role_model_where[i_].key)
            }

            var sqlStart, sqlCount, sqlCountLarge, realSQL
            var result
            var additionalData = {}
            var additional_class_fields_profile = {}
            var dyn_fields = {
                obj_by_pair: {},
                items: {}
            }
            var dyn_table_alias

            async.series({
                addNeededForVirtualFields: cb => {
                    // Получим колонки, которые необходимы для виртуальных
                    // return cb(null);
                    var getColumnsForVirtCol = function(col, class_fields_profile, columns) {
                        var colProfile = class_fields_profile[col]
                        if (!colProfile) return []
                        if (!colProfile.is_virtual) return []
                        // if (!colProfile.join_table && colProfile.from_table) return [col];
                        if (!colProfile.join_table) return []
                        // Получаем нужную колонку
                        var new_col, first
                        for (var i in class_fields_profile) {
                            var oneProfile = class_fields_profile[i]
                            if (oneProfile.from_table === colProfile.join_table) {
                                if (!first) first = oneProfile.column_name // Найден первый вариант, возможно он хорош, а возможно есть и лучше
                                if (columns.indexOf(oneProfile.column_name) !== -1) {
                                    new_col = oneProfile.column_name // Найден и уже есть в columns
                                    break
                                }
                            }
                        }
                        // if (new_col) return [new_col]; // Уже все найдено, можно вернуть.
                        if (!first) return cb(new MyError('Одно из полей ссылается на другую таблицу используя промежуточную, ' +
                            'однако нет ни одного поля, по которому эту таблицу можно подключить.', {
                            colProfile: colProfile,
                            class_fields_profile: class_fields_profile
                        }))// Вообще ничего не найдено, это вероятно ошибка профайла
                        return [...getColumnsForVirtCol(first, class_fields_profile, columns), first]

                    }

                    for (var i in columns) {
                        var col = columns[i]
                        var add_cols = getColumnsForVirtCol(col, _t.class_fields_profile, columns)
                        if (add_cols) add_join_columns = [...add_join_columns, ...add_cols]
                    }
                    // columns = [...columns, ...add_join_columns];

                    cb(null)

                },
                formatFieldList: (cb) => {
                    async.eachSeries(Object.keys(columns), function(col_key, cb) {
                        var col = columns[col_key]
                        if (distinct && col !== distinct) return cb(null)
                        var colProfile = _t.class_fields_profile[col]
                        if (!colProfile) {
                            delete columns[col_key]
                            return cb(null)
                        }

                        var sortIndex = sort.columns.indexOf(col)

                        if (sortIndex !== -1) {
                            sort.directions = (Array.isArray(sort.directions)) ? sort.directions : []
                            sort.directions[sortIndex] = (typeof sort.directions[sortIndex] === 'string') ? sort.directions[sortIndex].toUpperCase() : sort.directions[sortIndex]
                            sortColumnsReady[sortIndex] = pool.escapeId(col) + ' ' + (Array.isArray(sort.directions) ? ((['ASC', 'DESC', ''].indexOf(sort.directions[sortIndex]) !== -1) ? sort.directions[sortIndex] : 'ASC') : 'ASC')
                        }

                        var params = {
                            colProfile_aliases,
                            from_table_counter,
                            from_table_counter2,
                            ready_columns,
                            // join_tables,
                            dyn_fields,
                            col,
                            _t
                        }
                        // Это чистая функция.
                        prepareField(params, (err, res) => {
                            if (err) return cb(err)
                            colProfile_aliases = res.colProfile_aliases
                            from_table_counter = res.from_table_counter
                            from_table_counter2 = res.from_table_counter2
                            ready_columns = res.ready_columns
                            // join_tables = res.join_tables;
                            join_tables_obj = {...join_tables_obj, ...res.join_tables_obj}
                            dyn_fields = res.dyn_fields
                            ready_columns_by_colName[col] = res.ready_column
                            cb(null)
                        })


                    }, cb)
                },
                formatAdditionalJoinList: cb => {
                    async.eachSeries(Object.keys(add_join_columns), function(col_key, cb) {
                        var col = add_join_columns[col_key]

                        var params = {
                            colProfile_aliases,
                            from_table_counter,
                            from_table_counter2,
                            ready_columns,
                            // join_tables,
                            dyn_fields,
                            col,
                            _t
                        }
                        // Это чистая функция.
                        prepareField(params, (err, res) => {
                            if (err) return cb(err)
                            colProfile_aliases = res.colProfile_aliases
                            from_table_counter = res.from_table_counter
                            from_table_counter2 = res.from_table_counter2
                            // join_tables = res.join_tables;
                            join_tables_obj = {...join_tables_obj, ...res.join_tables_obj}
                            dyn_fields = res.dyn_fields
                            ready_columns_by_colName[col] = res.ready_column
                            cb(null)
                        })


                    }, cb)
                },
                prepareJoinTables: cb => {
                    join_tables = []
                    if (!Object.keys(join_tables_obj).length) return cb(null)

                    _t.columns_sorted.forEach(item => {
                        let one_join = join_tables_obj[`${item.table_alias || item.from_table}|||${item.column_name}`]
                        if (one_join) join_tables.push(one_join)
                    })
                    cb(null)
                },
                formatDynTable: (cb) => {
                    // return cb(null);
                    if (!Object.keys(dyn_fields.items).length) return cb(null)

                    async.series({
                        getFullFieldInfo: (cb) => {
                            // Дозапросим данные по трейтам.

                            var types = ['TEXT', 'SHORT_TEXT', 'INTEGER', 'FLOAT', 'SELECT', 'BOOLEAN'] //Определяет последовательность
                            var field_name_obj_by_fieldLevel = {
                                "_real_value_rowId": "id",
                                "_real_value": "value1",
                                "_real_value_rowId2": "id",
                            }

                            async.eachSeries(Object.keys(dyn_fields.obj_by_pair), function(key, cb) {
                                var one_source = dyn_fields.obj_by_pair[key]

                                // Теоретически, может быть подключено несколько пар динПолей в один КО и с одним и тем же классом, тогда и подключений таблиц должно быть несколько
                                one_source.dyn_field_types = {}
                                one_source.select_tables = []
                                one_source.group0_table_alias = 'dyn_t_' + key
                                one_source.group1_table_alias = 'dyn_tr_' + key
                                one_source.group2_table_alias = 'dyn_ttv1_' + key
                                one_source.group3_table_alias = 'dyn_ttv2_' + key
                                one_source.group4_table_alias = 'dyn_ttv3_' + key
                                one_source.group5_table_alias = 'dyn_SELECTS_' + key
                                one_source.source_class_table_alias = 'dyn_tat_' + key
                                one_source.sub_table_name_for_select_key = 'sub_table_name_for_select'
                                one_source.SELECT_real_value_key = 'SELECT_real_value'
                                one_source.group1_sql = 'select '
                                one_source.group2_sql = 'select '
                                one_source.group3_sql = 'select '
                                one_source.group4_sql = 'select '
                                one_source.group5_sql = ''
                                one_source.result_sql = ''
                                one_source.group1_fields = []
                                one_source.group2_fields = []
                                one_source.group3_fields = []
                                one_source.group3_fields_obj = {}
                                one_source.group4_fields = []
                                one_source.group4_fields_obj = {}
                                one_source.group5_fields = []


                                async.series({
                                    getSources: (cb) => {
                                        var o = {
                                            command: 'getPrototype',
                                            object: one_source.source_class,
                                            params: {
                                                where: [
                                                    {
                                                        key: 'id',
                                                        type: 'in',
                                                        val1: one_source.one_pair_source_ids
                                                    }
                                                ],
                                                limit: 1000000000,
                                                collapseData: false
                                            }
                                        }
                                        _t.api(o, (err, res) => {
                                            if (err) return cb(new MyError('Не удалось получить ДопПоля(trait)', {
                                                o: o,
                                                err: err
                                            }))
                                            var data_from_source_obj = {}
                                            for (var i in res) {
                                                data_from_source_obj[res[i].id] = res[i]

                                            }
                                            for (var j in dyn_fields.items) {
                                                dyn_fields.items[j].source_row = data_from_source_obj[dyn_fields.items[j].id_from_source]
                                                dyn_fields.items[j].source_row.trait_type_sysname = dyn_fields.items[j].source_row.trait_type_sysname || dyn_fields.items[j].source_row.type_sysname
                                                one_source.from_source_obj[res[i].id].items.push(dyn_fields.items[j])
                                            }
                                            cb(null)
                                        })
                                    },
                                    getForAdditionalWhere: (cb) => {
                                        if (typeof one_source.additional_where !== 'string') return cb(null)
                                        if (!one_source.additional_where.length) return cb(null)
                                        try {
                                            one_source.additional_where = JSON.parse(one_source.additional_where)
                                        } catch (e) {
                                            one_source.additional_where = {}
                                            return cb(null)
                                        }
                                        if (!typeof one_source.additional_where === 'object') return cb(new MyError('additional_where в dynamic_fields_pair должно быть JSON объектом ',
                                            {
                                                example: '{"taxon_trait_value":[{"key":"taxon_gender_sysname","type":"in","val1":"FEMALE"}]}',
                                                one_pair: one_source
                                            }))
                                        if (!Object.keys(one_source.additional_where).length) return cb(null)
                                        // получить профайл таблицы
                                        // для каждого поля, если оно из другой таблицы, получить условие для этой таблицы. то есть вместо gender_sysname = 'MALE' получить gender_id = '15'
                                        // Для = все просто
                                        // Для in и !in тоже плюс минус
                                        // join_table пока не поддерживается
                                        // Примеры:
                                        // {"taxon_trait_value":[{"key":"taxon_gender_sysname","type":"in","val1":["FEMALE"],"comparisonType":"OR","group":"GENDER"},{"key":"taxon_gender_id","type":"isNull","comparisonType":"OR","group":"GENDER"}]}
                                        // var o = {taxon_trait_value: [{key: 'taxon_gender_sysname', type: 'in', val1: ['FEMALE'], comparisonType:'OR', group:'GENDER'}, {key: 'taxon_gender_id', type: 'isNull', comparisonType:'OR', group:'GENDER'}]};

                                        var additional_where_table_profiles = {}
                                        async.eachSeries(Object.keys(one_source.additional_where), function(key, cb) {
                                            //
                                            async.series({
                                                getProfile: (cb) => {
                                                    if (additional_where_table_profiles[key]) return cb(null)
                                                    var o = {
                                                        command: '_getClass',
                                                        object: key,
                                                        params: {
                                                            collapseData: false
                                                        }
                                                    }
                                                    _t.api(o, (err, res) => {
                                                        if (err) return cb(new MyError('Не удалось получить профайл класса, который участвует в фильтре для dynamic_field_pair', {
                                                            o: o,
                                                            one_pair: one_source,
                                                            err: err
                                                        }))
                                                        additional_where_table_profiles[key] = res

                                                        cb(null)
                                                    })
                                                },
                                                getDataForEachVirtualField: (cb) => {
                                                    async.eachSeries(one_source.additional_where[key], function(item, cb) {
                                                        var where_key = item.key
                                                        var where_val1 = item.val1
                                                        var where_type = (item.type) ? String(item.type).toLowerCase() : '='
                                                        if (!where_key) return cb(new MyError('Одно из условий в additional_where в dynamic_fields_pair имеет не корректный формат.' +
                                                            ' Должны быть ключи key (type и val1 необязательно)', {
                                                            one_where: item,
                                                            one_pair: one_source
                                                        }))
                                                        var colProfile = additional_where_table_profiles[key].class_fields_profile[where_key]
                                                        if (!colProfile) return cb(new MyError('В одном из условий в additional_where в dynamic_fields_pair указан key не существующий для ' +
                                                            'данного класса', {
                                                            one_where: item,
                                                            one_pair: one_source,
                                                            class: key
                                                        }))
                                                        if (!colProfile.is_virtual) {
                                                            if (!one_source.additional_where_ready[key]) one_source.additional_where_ready[key] = []
                                                            one_source.additional_where_ready[key].push({
                                                                key: where_key,
                                                                type: where_type,
                                                                val1: where_val1,
                                                                comparisonType: item.comparisonType,
                                                                group: item.group
                                                            })
                                                            return cb(null)
                                                        } // Это нативное поле и не требует подзапроса к справочнику
                                                        if (colProfile.join_table) return cb(new MyError('additional_where в dynamic_fields_pair не поддерживает поля подключенные через несколько таблиц ' +
                                                            'с помощью join_table', {
                                                            one_where: item,
                                                            one_pair: one_source,
                                                            class: key,
                                                            colProfile: colProfile
                                                        }))
                                                        if (colProfile.keyword.indexOf('[') !== -1) return cb(new MyError('additional_where в dynamic_fields_pair не поддерживает поля со сложным keyword',
                                                            {
                                                                one_where: item,
                                                                one_pair: one_source,
                                                                class: key,
                                                                colProfile: colProfile,
                                                                keyword: colProfile.keyword
                                                            }))

                                                        var o = {
                                                            command: 'get',
                                                            object: colProfile.from_table,
                                                            params: {
                                                                columns: ['id', colProfile.return_column],
                                                                where: [{
                                                                    key: colProfile.return_column,
                                                                    type: (Array.isArray(where_val1)) ? 'in' : '=', // здесь мы запрашиваем те значения, которые будем использовать в основном запросе
                                                                    val1: where_val1
                                                                }],
                                                                limit: 100000000,
                                                                collapseData: false
                                                            }
                                                        }
                                                        _t.api(o, (err, res) => {
                                                            if (err) return cb(new MyError('Не удалось получить значение keyword для одного из условий additional_where в dynamic_fields_pair',
                                                                {
                                                                    o: o,
                                                                    one_where: item,
                                                                    one_pair: one_source,
                                                                    class: key,
                                                                    colProfile: colProfile,
                                                                    err: err
                                                                }))
                                                            if (!res.length) return cb(new MyError('Не найдены результаты: значение keyword для одного из условий additional_where в dynamic_fields_pair',
                                                                {
                                                                    o: o,
                                                                    one_where: item,
                                                                    one_pair: one_source,
                                                                    class: key,
                                                                    colProfile: colProfile,
                                                                    res: res
                                                                }))
                                                            if (!one_source.additional_where_ready[key]) one_source.additional_where_ready[key] = []

                                                            var values = []
                                                            for (var i in res) {
                                                                values.push(res[i]['id'])
                                                            }
                                                            switch (where_type) {
                                                                case '=':
                                                                case 'in':
                                                                    where_type = 'in'
                                                                    break
                                                                case '!=':
                                                                case '<>':
                                                                case '!in':
                                                                case '!notin':
                                                                    where_type = '!in'
                                                                    break
                                                                default:
                                                                    return cb(new MyError('Данный тип для одного из условий additional_where в dynamic_fields_pair пока не поддерживается. Поддержка: ' +
                                                                        '=, !=, <>, in, notin, !in', {
                                                                        where_type: where_type,
                                                                        one_where: item,
                                                                        one_pair: one_source,
                                                                        class: key,
                                                                        colProfile: colProfile
                                                                    }))
                                                            }
                                                            one_source.additional_where_ready[key].push({
                                                                key: colProfile.keyword,
                                                                type: where_type,
                                                                val1: values,
                                                                comparisonType: item.comparisonType,
                                                                group: item.group
                                                            })
                                                            return cb(null)
                                                        })

                                                    }, cb)
                                                }
                                            }, cb)
                                        }, (err, res) => {
                                            if (err) return cb(err)
                                            one_source.additional_where_table_profiles = additional_where_table_profiles
                                            return cb(err, res)
                                        })
                                    },
                                    formatSql: (cb) => {

                                        for (var j in one_source.from_source_obj) {
                                            var dyn_fields_arr = one_source.from_source_obj[j].items
                                            for (var k in dyn_fields_arr) {
                                                // Определим уникальные типы полей и подключаемые таблицы для полей типа SELECT
                                                if (!one_source.dyn_field_types[dyn_fields_arr[k].source_row.trait_type_sysname]) {
                                                    one_source.dyn_field_types[dyn_fields_arr[k].source_row.trait_type_sysname] = dyn_fields_arr[k].source_row.trait_type_sub_table_name
                                                }
                                                if (dyn_fields_arr[k].source_row.sub_table_name_for_select) {
                                                    if (one_source.select_tables.indexOf(dyn_fields_arr[k].source_row.sub_table_name_for_select) === -1)
                                                        one_source.select_tables.push(dyn_fields_arr[k].source_row.sub_table_name_for_select)
                                                }
                                            }

                                        }

                                        for (var j in one_source.from_source_obj) {
                                            var dyn_fields_arr = one_source.from_source_obj[j].items

                                            for (var k in dyn_fields_arr) {

                                                // Зададим field_level который определяет что за поле мы сейчас рассматриваем. Возможно имеет смысл переделать на сохраненное поле.
                                                dyn_fields_arr[k].field_level =
                                                    dyn_fields_arr[k].column_name.match(/_value_id$/) ||
                                                    dyn_fields_arr[k].column_name.match(/_real_value_rowId$/) ||
                                                    dyn_fields_arr[k].column_name.match(/_real_value$/) ||
                                                    dyn_fields_arr[k].column_name.match(/_real_value_rowId2$/)
                                                if (!dyn_fields_arr[k].field_level.length)
                                                    return cb(new MyError('Ошибка, не определен вспомогательный уровень поля, вероятно добавлен новый.', {field: dyn_fields_arr[k]}))
                                                dyn_fields_arr[k].field_level = dyn_fields_arr[k].field_level[0]


                                                // Соберем поля которые надо подставить в результирующий sql на разных уровнях
                                                // Первая группа
                                                one_source.group1_fields.push(
                                                    'GROUP_CONCAT(' + one_source.group1_table_alias + '.' + pool.escapeId(dyn_fields_arr[k].column_name)
                                                    + ' SEPARATOR ' + pool.escape(multi_value_separator) + ') as ' + pool.escapeId(dyn_fields_arr[k].column_name)
                                                )
                                                // Вторая группа
                                                if (dyn_fields_arr[k].field_level === '_value_id') {
                                                    // one_source.group2_fields.push(
                                                    //     pool.escapeId(one_source.group2_table_alias) + '.id' + ' as ' + pool.escape(dyn_fields_arr[k].column_name)
                                                    // );
                                                    one_source.group2_fields.push(
                                                        'IF (' + pool.escapeId(one_source.group2_table_alias) + '.' + pool.escapeId(one_source.parent_key2)
                                                        + ' = ' + pool.escape(dyn_fields_arr[k].id_from_source) + ', ' + one_source.group2_table_alias + '.id'
                                                        + ', NULL) as ' + pool.escape(dyn_fields_arr[k].column_name)
                                                    )
                                                }
                                                // if (['_real_value_rowId','_real_value','_real_value_rowId2'].indexOf(dyn_fields_arr[k].field_level)!==-1){
                                                if (['_real_value_rowId', '_real_value', '_real_value_rowId2'].indexOf(dyn_fields_arr[k].field_level) !== -1) {
                                                    one_source.group2_fields.push(
                                                        'IF (' + pool.escapeId(one_source.group2_table_alias) + '.' + pool.escapeId(one_source.parent_key2)
                                                        + ' = ' + pool.escape(dyn_fields_arr[k].id_from_source) + ', ' + one_source.group2_table_alias + '.' + pool.escapeId(dyn_fields_arr[k].field_level)
                                                        + ', NULL) as ' + pool.escape(dyn_fields_arr[k].column_name)
                                                    )
                                                }
                                                // Третья группа + подготовка Четвертой
                                                for (var tKey in types) { // Это нужно, чтобы были только те sub_table которые нужны и чтобы порядок был такой, как задан в types
                                                    if (one_source.dyn_field_types[types[tKey]]) { // Если есть поля такого типа

                                                        if (!one_source.group3_fields_obj[dyn_fields_arr[k].field_level]) one_source.group3_fields_obj[dyn_fields_arr[k].field_level] = []
                                                        var g3_s = undefined
                                                        switch (dyn_fields_arr[k].field_level) {
                                                            case '_real_value_rowId':
                                                                g3_s = pool.escapeId(one_source.group3_table_alias) + '.' + pool.escapeId(types[tKey] + dyn_fields_arr[k].field_level)
                                                                break
                                                            case '_real_value':
                                                                switch (types[tKey]) {
                                                                    // case 'SELECT':
                                                                    //     break;
                                                                    case 'FLOAT':
                                                                        g3_s = 'CAST(' + pool.escapeId(one_source.group3_table_alias) + '.' + pool.escapeId(types[tKey] + dyn_fields_arr[k].field_level) + ' as char) + 0'
                                                                        break
                                                                    default:
                                                                        g3_s = pool.escapeId(one_source.group3_table_alias) + '.' + pool.escapeId(types[tKey] + dyn_fields_arr[k].field_level)
                                                                        break
                                                                }
                                                                break
                                                            default:
                                                                continue // Других типов полей (_value_id) не нужно
                                                        }

                                                        // if (one_source.group3_fields_obj[dyn_fields_arr[k].field_level].indexOf(g3_s) === -1) { //
                                                        if (one_source.group3_fields_obj[dyn_fields_arr[k].field_level].indexOf(g3_s) === -1) { //
                                                            one_source.group3_fields_obj[dyn_fields_arr[k].field_level].push(g3_s)
                                                        }
                                                        // }
                                                        // Также подготовим для ЧЕТВЕРТОЙ ГРУППЫ
                                                        if (!one_source.group4_fields_obj[types[tKey]]) one_source.group4_fields_obj[types[tKey]] = []
                                                        if (one_source.group4_fields_obj[types[tKey]].indexOf(dyn_fields_arr[k].field_level) === -1) {
                                                            one_source.group4_fields_obj[types[tKey]].push(dyn_fields_arr[k].field_level)
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        var select_val_sql = (one_source.select_tables.length) ? `${one_source.group5_table_alias}.NAME, ` : ''

                                        async.series({
                                            group1_sql: (cb) => {
                                                one_source.group1_sql += '' + pool.escapeId(one_source.group0_table_alias) + '.' + 'id, '
                                                one_source.group1_sql += one_source.group1_fields.join(', ') + " FROM " + pool.escapeId(one_source.class) + ' as ' + pool.escapeId(one_source.group0_table_alias)
                                                cb(null)
                                            },
                                            group2_sql: (cb) => {
                                                one_source.group2_sql += '' + pool.escapeId(one_source.group2_table_alias) + '.' + '*, '
                                                one_source.group2_sql += one_source.group2_fields.join(', ') + " FROM " // as one_source.group2_table_alias
                                                cb(null)
                                            },
                                            group3_sql: (cb) => {


                                                one_source.group3_fields.push(`${pool.escapeId(one_source.group3_table_alias)}.id`)
                                                one_source.group3_fields.push(`${pool.escapeId(one_source.group3_table_alias)}.${pool.escapeId(one_source.parent_key1)}`)
                                                one_source.group3_fields.push(`${pool.escapeId(one_source.group3_table_alias)}.${pool.escapeId(one_source.parent_key2)}`)

                                                var str = ''
                                                for (var g3Key in one_source.group3_fields_obj) {
                                                    if (!one_source.group3_fields_obj[g3Key].length) continue
                                                    if (one_source.group3_fields_obj[g3Key].length === 1 && !select_val_sql) {
                                                        str = one_source.group3_fields_obj + ' as ' + pool.escapeId(g3Key)
                                                    } else {
                                                        var select_val_sql_for_field = (select_val_sql && g3Key === '_real_value') ? select_val_sql : '' // dyn_SELECTS__7. NAME только для _real_value
                                                        str = `COALESCE (${select_val_sql_for_field + one_source.group3_fields_obj[g3Key].join(', ')}) as ${pool.escapeId(g3Key)}`
                                                        // console.log('xasdsadsadasd');
                                                    }

                                                    one_source.group3_fields.push(str)
                                                }
                                                if (select_val_sql) {
                                                    one_source.group3_fields.push(`${pool.escapeId(one_source.group5_table_alias)}.id as _real_value_rowId2`) //`dyn_SELECTS__7`.`id` AS `_real_value_rowId2`
                                                }

                                                one_source.group3_sql += one_source.group3_fields.join(', ') + " FROM " // as one_source.group3_table_alias
                                                cb(null)
                                            },
                                            group4_preapre: (cb) => {
                                                if (!Array.isArray(one_source.additional_where_ready[one_source.table_with_value])) return cb(null)
                                                var p = {
                                                    tableName: one_source.group4_table_alias,
                                                    class_fields_profile: one_source.additional_where_table_profiles[one_source.table_with_value].class_fields_profile,
                                                    columns: one_source.additional_where_table_profiles[one_source.table_with_value].columns,
                                                    where: one_source.additional_where_ready[one_source.table_with_value],
                                                    ready_columns_by_colName: ready_columns_by_colName
                                                }
                                                getWhereStr(p, (err, res) => {
                                                    if (err) return cb(err)
                                                    one_source.group4_where_str = res.str
                                                    return cb(null)
                                                })
                                            },
                                            group4_sql: (cb) => {
                                                // Четвертая группа. Уже не для каждого поля, а для каждого типа полей INT/FLOAT/Text...
                                                one_source.group4_fields.push(`${pool.escapeId(one_source.group4_table_alias)}.id`)
                                                one_source.group4_fields.push(`${pool.escapeId(one_source.group4_table_alias)}.${pool.escapeId(one_source.parent_key1)}`)
                                                one_source.group4_fields.push(`${pool.escapeId(one_source.group4_table_alias)}.${pool.escapeId(one_source.parent_key2)}`)
                                                one_source.group4_fields.push(`${pool.escapeId(one_source.source_class_table_alias)}.${pool.escapeId(one_source.sub_table_name_for_select_key)}`)
                                                // tat.sub_table_name_for_select
                                                // LEFT JOIN taxon_avalible_trait AS tat ON tat.id = ttv.taxon_avalible_trait_id
                                                var str = ''
                                                for (var g4Key in one_source.group4_fields_obj) {
                                                    for (var oneTypeIndex in one_source.group4_fields_obj[g4Key]) {
                                                        var one_field = one_source.group4_fields_obj[g4Key][oneTypeIndex]
                                                        str = pool.escapeId('sub_tbl_' + g4Key) + '.' + pool.escapeId(field_name_obj_by_fieldLevel[one_field]) + ' as ' + pool.escapeId(g4Key + one_field)
                                                        if (one_source.group4_fields.indexOf(str) === -1) one_source.group4_fields.push(str)
                                                    }

                                                }

                                                one_source.group4_sql += `${one_source.group4_fields.join(', ')}  FROM ${pool.escapeId(one_source.table_with_value)} as `
                                                one_source.group4_sql += `${pool.escapeId(one_source.group4_table_alias)}`

                                                one_source.group4_sql += ` LEFT JOIN ${pool.escapeId(one_source.source_class)} as ${pool.escapeId(one_source.source_class_table_alias)} on `
                                                one_source.group4_sql += `${pool.escapeId(one_source.source_class_table_alias)}.id = ${pool.escapeId(one_source.group4_table_alias)}.${pool.escapeId(one_source.parent_key2)}`

                                                let dateTimeMySQL = funcs.getDateTimeMySQL()
                                                for (var tKey in one_source.dyn_field_types) {
                                                    var tbl_alias = 'sub_tbl_' + tKey
                                                    one_source.group4_sql += ` LEFT JOIN ${pool.escapeId(one_source.dyn_field_types[tKey])} as ${pool.escapeId(tbl_alias)} on `
                                                    one_source.group4_sql += `${pool.escapeId(tbl_alias)}.${pool.escapeId(one_source.table_with_value_key)} = ${pool.escapeId(one_source.group4_table_alias)}.id`
                                                    one_source.group4_sql += ` and (${pool.escapeId(tbl_alias)}.deleted IS NULL OR`
                                                    one_source.group4_sql += ` ${pool.escapeId(tbl_alias)}.deleted > ${pool.escape(dateTimeMySQL)})`
                                                }
                                                one_source.group4_sql += ` WHERE (${pool.escapeId(one_source.group4_table_alias)}.deleted IS NULL OR`
                                                one_source.group4_sql += ` ${pool.escapeId(one_source.group4_table_alias)}.deleted > ${pool.escape(dateTimeMySQL)})`
                                                if (one_source.group4_where_str) {
                                                    one_source.group4_sql += ` AND ${one_source.group4_where_str}`
                                                }
                                                cb(null)
                                            },
                                            group5_sql: (cb) => {
                                                // Пятая группа (для полей типа SELECT)
                                                var str2
                                                for (var stKey in one_source.select_tables) {
                                                    str2 = `SELECT id, NAME, ${pool.escape(one_source.select_tables[stKey])} as table_name FROM ${pool.escapeId(one_source.select_tables[stKey])}`
                                                    one_source.group5_fields.push(str2)
                                                }
                                                // Теперь соберем group5_sql. Первый элемент как есть, остальные через UNION ALL
                                                if (one_source.group5_fields.length) {
                                                    one_source.group5_sql += one_source.group5_fields[0]
                                                    one_source.group5_fields.splice(0, 1)
                                                }
                                                // Остальные
                                                for (var gr5Key in one_source.group5_fields) {
                                                    one_source.group5_sql += ` UNION ALL ${one_source.group5_fields[gr5Key]}`
                                                }
                                                cb(null)
                                            },
                                            another: (cb) => {
                                                // Составим общий SQL для одного источника (одной пары)
                                                one_source.result_sql += `LEFT JOIN (`
                                                one_source.result_sql += `${one_source.group1_sql} `
                                                one_source.result_sql += `RIGHT JOIN (`
                                                one_source.result_sql += `${one_source.group2_sql} (`
                                                one_source.result_sql += `${one_source.group3_sql} (`
                                                one_source.result_sql += `${one_source.group4_sql}`
                                                one_source.result_sql += `) ${pool.escapeId(one_source.group3_table_alias)}`
                                                if (select_val_sql) {
                                                    one_source.result_sql += ` LEFT JOIN (`
                                                    one_source.result_sql += `${one_source.group5_sql}`
                                                    one_source.result_sql += `) as ${pool.escapeId(one_source.group5_table_alias)} on (`
                                                    one_source.result_sql += `${pool.escapeId(one_source.group3_table_alias)}.${pool.escapeId(one_source.SELECT_real_value_key)} = `
                                                    one_source.result_sql += `${pool.escapeId(one_source.group5_table_alias)}.id AND `
                                                    one_source.result_sql += `${pool.escapeId(one_source.group3_table_alias)}.${pool.escapeId(one_source.sub_table_name_for_select_key)} = `
                                                    one_source.result_sql += `${pool.escapeId(one_source.group5_table_alias)}.table_name`
                                                    one_source.result_sql += `)`
                                                }
                                                one_source.result_sql += `) ${pool.escapeId(one_source.group2_table_alias)}`
                                                one_source.result_sql += `) as ${pool.escapeId(one_source.group1_table_alias)} on ${pool.escapeId(one_source.group0_table_alias)}.id = `
                                                one_source.result_sql += `${pool.escapeId(one_source.group1_table_alias)}.${pool.escapeId(one_source.parent_key1)} `
                                                one_source.result_sql += `GROUP BY ${pool.escapeId(one_source.group0_table_alias)}.id`
                                                one_source.result_sql += `) as ${pool.escapeId(one_source.dyn_table_alias)} on ${pool.escapeId(one_source.class)}.id = ${pool.escapeId(one_source.dyn_table_alias)}.id`


                                                cb(null)
                                            }
                                        }, cb)
                                    }
                                }, cb)
                            }, cb)
                        },
                        formatSqlOLD: (cb) => {
                            return cb(null)

                            var types = ['TEXT', 'SHORT_TEXT', 'INTEGER', 'FLOAT', 'SELECT', 'BOOLEAN'] //Определяет последовательность
                            var field_name_obj_by_fieldLevel = {
                                "_real_value_rowId": "id",
                                "_real_value": "value1",
                                "_real_value_rowId2": "id",
                            }


                            for (var key in dyn_fields.obj_by_pair) {
                                var one_source = dyn_fields.obj_by_pair[key]


                                // Теоретически, может быть подключено несколько пар динПолей в один КО и с одним и тем же классом, тогда и подключений таблиц должно быть несколько
                                one_source.dyn_field_types = {}
                                one_source.select_tables = []
                                one_source.group0_table_alias = 'dyn_t_' + key
                                one_source.group1_table_alias = 'dyn_tr_' + key
                                one_source.group2_table_alias = 'dyn_ttv1_' + key
                                one_source.group3_table_alias = 'dyn_ttv2_' + key
                                one_source.group4_table_alias = 'dyn_ttv3_' + key
                                one_source.group5_table_alias = 'dyn_SELECTS_' + key
                                one_source.source_class_table_alias = 'dyn_tat_' + key
                                one_source.sub_table_name_for_select_key = 'sub_table_name_for_select'
                                one_source.SELECT_real_value_key = 'SELECT_real_value'
                                one_source.group1_sql = 'select '
                                one_source.group2_sql = 'select '
                                one_source.group3_sql = 'select '
                                one_source.group4_sql = 'select '
                                one_source.group5_sql = ''
                                one_source.result_sql = ''
                                one_source.group1_fields = []
                                one_source.group2_fields = []
                                one_source.group3_fields = []
                                one_source.group3_fields_obj = {}
                                one_source.group4_fields = []
                                one_source.group4_fields_obj = {}
                                one_source.group5_fields = []

                                for (var j in one_source.from_source_obj) {
                                    var dyn_fields_arr = one_source.from_source_obj[j].items
                                    for (var k in dyn_fields_arr) {
                                        // Определим уникальные типы полей и подключаемые таблицы для полей типа SELECT
                                        if (!one_source.dyn_field_types[dyn_fields_arr[k].source_row.trait_type_sysname]) {
                                            one_source.dyn_field_types[dyn_fields_arr[k].source_row.trait_type_sysname] = dyn_fields_arr[k].source_row.trait_type_sub_table_name
                                        }
                                        if (dyn_fields_arr[k].source_row.sub_table_name_for_select) {
                                            if (one_source.select_tables.indexOf(dyn_fields_arr[k].source_row.sub_table_name_for_select) === -1)
                                                one_source.select_tables.push(dyn_fields_arr[k].source_row.sub_table_name_for_select)
                                        }
                                    }

                                }


                                for (var j in one_source.from_source_obj) {
                                    var dyn_fields_arr = one_source.from_source_obj[j].items

                                    for (var k in dyn_fields_arr) {

                                        // Зададим field_level который определяет что за поле мы сейчас рассматриваем. Возможно имеет смысл переделать на сохраненное поле.
                                        dyn_fields_arr[k].field_level =
                                            dyn_fields_arr[k].column_name.match(/_value_id$/) ||
                                            dyn_fields_arr[k].column_name.match(/_real_value_rowId$/) ||
                                            dyn_fields_arr[k].column_name.match(/_real_value$/) ||
                                            dyn_fields_arr[k].column_name.match(/_real_value_rowId2$/)
                                        if (!dyn_fields_arr[k].field_level.length)
                                            return cb(new MyError('Ошибка, не определен вспомогательный уровень поля, вероятно добавлен новый.', {field: dyn_fields_arr[k]}))
                                        dyn_fields_arr[k].field_level = dyn_fields_arr[k].field_level[0]


                                        // Соберем поля которые надо подставить в результирующий sql на разных уровнях
                                        // Первая группа
                                        one_source.group1_fields.push(
                                            'GROUP_CONCAT(' + one_source.group1_table_alias + '.' + pool.escapeId(dyn_fields_arr[k].column_name)
                                            + ' SEPARATOR ' + pool.escape(multi_value_separator) + ') as ' + pool.escapeId(dyn_fields_arr[k].column_name)
                                        )
                                        // Вторая группа
                                        if (dyn_fields_arr[k].field_level === '_value_id') {
                                            // one_source.group2_fields.push(
                                            //     pool.escapeId(one_source.group2_table_alias) + '.id' + ' as ' + pool.escape(dyn_fields_arr[k].column_name)
                                            // );
                                            one_source.group2_fields.push(
                                                'IF (' + pool.escapeId(one_source.group2_table_alias) + '.' + pool.escapeId(one_source.parent_key2)
                                                + ' = ' + pool.escape(dyn_fields_arr[k].id_from_source) + ', ' + one_source.group2_table_alias + '.id'
                                                + ', NULL) as ' + pool.escape(dyn_fields_arr[k].column_name)
                                            )
                                        }
                                        // if (['_real_value_rowId','_real_value','_real_value_rowId2'].indexOf(dyn_fields_arr[k].field_level)!==-1){
                                        if (['_real_value_rowId', '_real_value', '_real_value_rowId2'].indexOf(dyn_fields_arr[k].field_level) !== -1) {
                                            one_source.group2_fields.push(
                                                'IF (' + pool.escapeId(one_source.group2_table_alias) + '.' + pool.escapeId(one_source.parent_key2)
                                                + ' = ' + pool.escape(dyn_fields_arr[k].id_from_source) + ', ' + one_source.group2_table_alias + '.' + pool.escapeId(dyn_fields_arr[k].field_level)
                                                + ', NULL) as ' + pool.escape(dyn_fields_arr[k].column_name)
                                            )
                                        }
                                        // Третья группа + подготовка Четвертой
                                        for (var tKey in types) { // Это нужно, чтобы были только те sub_table которые нужны и чтобы порядок был такой, как задан в types
                                            if (one_source.dyn_field_types[types[tKey]]) { // Если есть поля такого типа

                                                if (!one_source.group3_fields_obj[dyn_fields_arr[k].field_level]) one_source.group3_fields_obj[dyn_fields_arr[k].field_level] = []
                                                var g3_s
                                                switch (dyn_fields_arr[k].field_level) {
                                                    case '_real_value_rowId':
                                                        g3_s = pool.escapeId(one_source.group3_table_alias) + '.' + pool.escapeId(types[tKey] + dyn_fields_arr[k].field_level)
                                                        break
                                                    case '_real_value':
                                                        switch (types[tKey]) {
                                                            case 'SELECT':
                                                                break
                                                            case 'FLOAT':
                                                                g3_s = 'CAST(' + pool.escapeId(one_source.group3_table_alias) + '.' + pool.escapeId(types[tKey] + dyn_fields_arr[k].field_level) + ' as char) + 0'
                                                                break
                                                            default:
                                                                g3_s = pool.escapeId(one_source.group3_table_alias) + '.' + pool.escapeId(types[tKey] + dyn_fields_arr[k].field_level)
                                                                break
                                                        }
                                                        break
                                                    default:
                                                        continue // Других типов полей (_value_id) не нужно
                                                }

                                                if (one_source.group3_fields_obj[dyn_fields_arr[k].field_level].indexOf(g3_s) === -1) { //
                                                    one_source.group3_fields_obj[dyn_fields_arr[k].field_level].push(g3_s)
                                                }
                                                // }
                                                // Также подготовим для ЧЕТВЕРТОЙ ГРУППЫ
                                                if (!one_source.group4_fields_obj[types[tKey]]) one_source.group4_fields_obj[types[tKey]] = []
                                                if (one_source.group4_fields_obj[types[tKey]].indexOf(dyn_fields_arr[k].field_level) === -1) {
                                                    one_source.group4_fields_obj[types[tKey]].push(dyn_fields_arr[k].field_level)
                                                }
                                            }
                                        }
                                    }
                                }

                                one_source.group1_sql += '' + pool.escapeId(one_source.group0_table_alias) + '.' + 'id, '
                                one_source.group1_sql += one_source.group1_fields.join(', ') + " FROM " + pool.escapeId(one_source.class) + ' as ' + pool.escapeId(one_source.group0_table_alias)

                                one_source.group2_sql += '' + pool.escapeId(one_source.group2_table_alias) + '.' + '*, '
                                one_source.group2_sql += one_source.group2_fields.join(', ') + " FROM " // as one_source.group2_table_alias

                                var select_val_sql = (one_source.select_tables.length) ? `${one_source.group5_table_alias}.NAME, ` : ''

                                one_source.group3_fields.push(`${pool.escapeId(one_source.group3_table_alias)}.id`)
                                one_source.group3_fields.push(`${pool.escapeId(one_source.group3_table_alias)}.${pool.escapeId(one_source.parent_key1)}`)
                                one_source.group3_fields.push(`${pool.escapeId(one_source.group3_table_alias)}.${pool.escapeId(one_source.parent_key2)}`)

                                var str = ''
                                for (var g3Key in one_source.group3_fields_obj) {
                                    if (!one_source.group3_fields_obj[g3Key].length) continue
                                    if (one_source.group3_fields_obj[g3Key].length === 1 && !select_val_sql) {
                                        str = one_source.group3_fields_obj + ' as ' + pool.escapeId(g3Key)
                                    } else {
                                        var select_val_sql_for_field = (select_val_sql && g3Key === '_real_value') ? select_val_sql : '' // dyn_SELECTS__7. NAME только для _real_value
                                        str = `COALESCE (${select_val_sql_for_field + one_source.group3_fields_obj[g3Key].join(', ')}) as ${pool.escapeId(g3Key)}`
                                    }

                                    one_source.group3_fields.push(str)
                                }
                                if (select_val_sql) {
                                    one_source.group3_fields.push(`${pool.escapeId(one_source.group5_table_alias)}.id as _real_value_rowId2`) //`dyn_SELECTS__7`.`id` AS `_real_value_rowId2`
                                }

                                one_source.group3_sql += one_source.group3_fields.join(', ') + " FROM " // as one_source.group3_table_alias


                                // Четвертая группа. Уже не для каждого поля, а для каждого типа полей INT/FLOAT/Text...
                                one_source.group4_fields.push(`${pool.escapeId(one_source.group4_table_alias)}.id`)
                                one_source.group4_fields.push(`${pool.escapeId(one_source.group4_table_alias)}.${pool.escapeId(one_source.parent_key1)}`)
                                one_source.group4_fields.push(`${pool.escapeId(one_source.group4_table_alias)}.${pool.escapeId(one_source.parent_key2)}`)
                                one_source.group4_fields.push(`${pool.escapeId(one_source.source_class_table_alias)}.${pool.escapeId(one_source.sub_table_name_for_select_key)}`)
                                // tat.sub_table_name_for_select
                                // LEFT JOIN taxon_avalible_trait AS tat ON tat.id = ttv.taxon_avalible_trait_id
                                for (var g4Key in one_source.group4_fields_obj) {
                                    for (var oneTypeIndex in one_source.group4_fields_obj[g4Key]) {
                                        var one_field = one_source.group4_fields_obj[g4Key][oneTypeIndex]
                                        str = pool.escapeId('sub_tbl_' + g4Key) + '.' + pool.escapeId(field_name_obj_by_fieldLevel[one_field]) + ' as ' + pool.escapeId(g4Key + one_field)
                                        if (one_source.group4_fields.indexOf(str) === -1) one_source.group4_fields.push(str)
                                    }

                                }

                                one_source.group4_sql += `${one_source.group4_fields.join(', ')}  FROM ${pool.escapeId(one_source.table_with_value)} as `
                                one_source.group4_sql += `${pool.escapeId(one_source.group4_table_alias)}`

                                one_source.group4_sql += ` LEFT JOIN ${pool.escapeId(one_source.source_class)} as ${pool.escapeId(one_source.source_class_table_alias)} on `
                                one_source.group4_sql += `${pool.escapeId(one_source.source_class_table_alias)}.id = ${pool.escapeId(one_source.group4_table_alias)}.${pool.escapeId(one_source.parent_key2)}`

                                let dateTimeMySQL = funcs.getDateTimeMySQL()
                                for (var tKey in one_source.dyn_field_types) {
                                    var tbl_alias = 'sub_tbl_' + tKey
                                    one_source.group4_sql += ` LEFT JOIN ${pool.escapeId(one_source.dyn_field_types[tKey])} as ${pool.escapeId(tbl_alias)} on `
                                    one_source.group4_sql += `${pool.escapeId(tbl_alias)}.${pool.escapeId(one_source.table_with_value_key)} = ${pool.escapeId(one_source.group4_table_alias)}.id`
                                    one_source.group4_sql += ` and (${pool.escapeId(tbl_alias)}.deleted IS NULL OR`
                                    one_source.group4_sql += ` ${pool.escapeId(tbl_alias)}.deleted > ${pool.escape(dateTimeMySQL)})`
                                }
                                one_source.group4_sql += ` WHERE (${pool.escapeId(one_source.group4_table_alias)}.deleted IS NULL OR`
                                one_source.group4_sql += ` ${pool.escapeId(one_source.group4_table_alias)}.deleted > ${pool.escape(dateTimeMySQL)})`
                                if (Array.isArray(one_source.additional_where_ready[one_source.table_with_value])) {
                                    var p = {
                                        tableName: one_source.group4_table_alias,
                                        class_fields_profile: one_source.additional_where_table_profiles[one_source.table_with_value],
                                        columns: one_source.additional_where_table_profiles[one_source.table_with_value].columns,
                                        where: one_source.additional_where_ready[one_source.table_with_value],
                                        ready_columns_by_colName: ready_columns_by_colName
                                    }
                                    getWhereStr(p, (err, res) => {
                                        if (err) {
                                            console.error(err)
                                            return cb(err)
                                        }
                                        whereStr = res.str
                                        return cb(null)
                                    })
                                    // for (var oneWK in one_source.additional_where_ready[one_source.table_with_value]) {
                                    //     var one_where = one_source.additional_where_ready[one_source.table_with_value][oneWK];
                                    //     one_source.group4_sql += ` AND ${pool.escapeId(one_source.group4_table_alias)}.${pool.escapeId(one_source.group4_table_alias)} > ${pool.escape(dateTimeMySQL)})`;
                                    // }
                                }

                                // Пятая группа (для полей типа SELECT)
                                var str2
                                for (var stKey in one_source.select_tables) {
                                    str2 = `SELECT id, NAME, ${pool.escape(one_source.select_tables[stKey])} as table_name FROM ${pool.escapeId(one_source.select_tables[stKey])}`
                                    one_source.group5_fields.push(str2)
                                }
                                // Теперь соберем group5_sql. Первый элемент как есть, остальные через UNION ALL
                                if (one_source.group5_fields.length) {
                                    one_source.group5_sql += one_source.group5_fields[0]
                                    one_source.group5_fields.splice(0, 1)
                                }
                                // Остальные
                                for (var gr5Key in one_source.group5_fields) {
                                    one_source.group5_sql += ` UNION ALL ${one_source.group5_fields[gr5Key]}`
                                }

                                // Составим общий SQL для одного источника (одной пары)
                                one_source.result_sql += `LEFT JOIN (`
                                one_source.result_sql += `${one_source.group1_sql} `
                                one_source.result_sql += `RIGHT JOIN (`
                                one_source.result_sql += `${one_source.group2_sql} (`
                                one_source.result_sql += `${one_source.group3_sql} (`
                                one_source.result_sql += `${one_source.group4_sql}`
                                one_source.result_sql += `) ${pool.escapeId(one_source.group3_table_alias)}`
                                if (select_val_sql) {
                                    one_source.result_sql += ` LEFT JOIN (`
                                    one_source.result_sql += `${one_source.group5_sql}`
                                    one_source.result_sql += `) as ${pool.escapeId(one_source.group5_table_alias)} on (`
                                    one_source.result_sql += `${pool.escapeId(one_source.group3_table_alias)}.${pool.escapeId(one_source.SELECT_real_value_key)} = `
                                    one_source.result_sql += `${pool.escapeId(one_source.group5_table_alias)}.id AND `
                                    one_source.result_sql += `${pool.escapeId(one_source.group3_table_alias)}.${pool.escapeId(one_source.sub_table_name_for_select_key)} = `
                                    one_source.result_sql += `${pool.escapeId(one_source.group5_table_alias)}.table_name`
                                    one_source.result_sql += `)`
                                }
                                one_source.result_sql += `) ${pool.escapeId(one_source.group2_table_alias)}`
                                one_source.result_sql += `) as ${pool.escapeId(one_source.group1_table_alias)} on ${pool.escapeId(one_source.group0_table_alias)}.id = `
                                one_source.result_sql += `${pool.escapeId(one_source.group1_table_alias)}.${pool.escapeId(one_source.parent_key1)} `
                                one_source.result_sql += `GROUP BY ${pool.escapeId(one_source.group0_table_alias)}.id`
                                one_source.result_sql += `) as ${pool.escapeId(one_source.dyn_table_alias)} on ${pool.escapeId(one_source.class)}.id = ${pool.escapeId(one_source.dyn_table_alias)}.id`

                            }
                            cb(null)
                        }
                    }, cb)
                },
                formatSort: (cb) => {
                    if (!sortColumnsReady.length) {
                        var defaultCol = (columns.indexOf('sort_no') !== -1) ? 'sort_no' : false
                        if (defaultCol) sortColumnsReady.push(defaultCol)
                    }
                    if (specColumns) {
                        for (var column in  specColumns) {
                            var s = specColumns[column] + ' as ' + pool.escapeId(column)
                            if (ready_columns.indexOf(s) === -1) ready_columns.push(s)
                            //if (sort.columns.indexOf(column) !== -1) sortColumnsReady.push(column);
                            var sortIndex = sort.columns.indexOf(column)
                            if (sortIndex !== -1) sortColumnsReady[sortIndex] = pool.escapeId(column) + ' ' + (Array.isArray(sort.directions) ? ((['ASC', 'DESC', ''].indexOf(sort.directions[sortIndex].toUpperCase()) !== -1) ? sort.directions[sortIndex].toUpperCase() : 'ASC') : 'ASC')
                        }
                    }
                    sort.columns = sortColumnsReady
                    return cb(null)
                },
                SQL_1: (cb) => {
                    var distinctSQL = (distinct) ? 'DISTINCT ' : ''
                    sqlStart = "SELECT " + distinctSQL + ready_columns.join(', ') + " FROM " + pool.escapeId(tableName)
                    sql += join_tables.join('')
                    for (var onePairKey in dyn_fields.obj_by_pair) {
                        sql += dyn_fields.obj_by_pair[onePairKey].result_sql
                    }
                    return cb(null)
                },
                formatWhere: (cb) => {
                    let new_where = []
                    for (var ii0 in where) {
                        if (typeof where[ii0] === 'object') new_where.push(where[ii0])
                    }
                    where = new_where
                    for (var ii in where) {
                        if (where[ii].group === 'Access_by_list_SYSTEM') where[ii].group = 'Access_by_list_SYSTEM_replaced'
                    }

                    if (list_of_access_ids.length) {
                        where.push(
                            {
                                key: 'id',
                                type: 'in',
                                group: 'Access_by_list_SYSTEM',
                                val1: list_of_access_ids
                            }
                        )
                    }


                    // Возможно это строго необходимо и предется вернуть, тогда надо смотреть группы role_model (role_model_where gr_)
                    where = where.sort(function(a, b) {
                        if (!a.group) a.group = a.key + '_serverAutoGroup'
                        if (!b.group) b.group = b.key + '_serverAutoGroup'
                        a.groupTrim = a.group.replace(/\.\w+/ig, '')
                        b.groupTrim = b.group.replace(/\.\w+/ig, '')
                        if (a.groupTrim > b.groupTrim) return 1
                        if (a.groupTrim < b.groupTrim) return -1
                        if (a.role_group > b.role_group) return 1
                        if (a.role_group < b.role_group) return -1
                        return 0
                    })


                    var p = {
                        tableName: tableName,
                        class_fields_profile: _t.class_fields_profile,
                        columns: columns,
                        where: where,
                        ready_columns_by_colName: ready_columns_by_colName
                    }
                    getWhereStr(p, (err, res) => {
                        if (err) {
                            console.error(err)
                            return cb(err)
                        }
                        whereStr = res.str
                        return cb(null)
                    })

                },
                SQL_2: (cb) => {
                    // Общее для всех
                    sql += ' WHERE '
                    var whereString = whereStr
                    if (whereString !== '') {
                        sql += whereString
                    }

                    if (!deleted) {
                        if (whereString !== '') {
                            sql += ' AND'
                        }
                        sql += " (" + pool.escapeId(tableName) + ".deleted IS NULL OR " + pool.escapeId(tableName) + ".deleted >" + pool.escape(funcs.getDateTimeMySQL()) + ")"
                    }
                    if (published) {
                        if (whereString !== '' || !deleted) {
                            sql += ' AND'
                        }
                        published = (published === true) ? funcs.getDateTimeMySQL() : published
                        sql += " (" + pool.escapeId(tableName) + ".published IS NOT NULL AND " + pool.escapeId(tableName) + ".published <=" + pool.escape(published) + ")"
                    }
                    sqlCount = 'SELECT count(*) FROM ' + pool.escapeId(tableName) + sql
                    sqlCountLarge = 'SELECT null FROM ' + pool.escapeId(tableName) + sql

                    if (sort.columns.length && !groupBy) {
                        var sort_columns_str = ''
                        for (var i in sort.columns) {
                            if (sort_columns_str) sort_columns_str += ', '
                            sort_columns_str += sort.columns[i]
                        }
                        sql += ' ORDER BY ' + sort_columns_str// + ' ' + sort.direction;
                    }
                    if (groupBy) {
                        sql += ' GROUP BY ' + groupBy
                    }

                    if (!isNaN(limit)) {
                        if (!isNaN(+offset)) {
                            sql += ' LIMIT ' + +offset + ', ' + +limit
                            sqlCountLarge += ' LIMIT ' + +offset + ', ' + +limit * 3
                        } else {
                            sql += ' LIMIT ' + +limit
                            sqlCountLarge += ' LIMIT ' + +limit * 3
                        }
                    }


                    realSQL = sqlStart + sql
                    if (!doNotLog) console.log(realSQL)
                    return cb(null)
                },
                query: (cb) => {
                    var count_all
                    let countLarge = (typeof params.count_large !== 'undefined') ? params.count_large : _t.class_profile.count_large
                    async.waterfall([
                        pool.getConn,
                        function(conn, cb) {
                            if (params.notCount) {
                                conn.release()
                                return cb(null)
                            }
                            async.series({
                                countMain: function(cb) {

                                    if (countLarge) return cb(null)
                                    if (distinct) {
                                        conn.release()
                                        return cb(null)
                                    }
                                    conn.queryValue(sqlCount, [], function(err, res) {
                                        conn.release()
                                        if (err) {
                                            err.msg = err.message
                                            return cb(new MyError('Не удалось посчитать количество записей по запросу', {
                                                err: err,
                                                params: params,
                                                sql: sqlCount
                                            }))
                                        }
                                        count_all = res
                                        cb(null)
                                    })
                                },
                                countLarge: function(cb) {
                                    if (!countLarge) return cb(null)
                                    // Выполним запрос и посчитаем количество результатов

                                    // var t1 = moment();
                                    if (!doNotLog) console.log('countLarge QUERY', sqlCountLarge)
                                    conn.query(sqlCountLarge, [], function(err, rows) {
                                        conn.release()
                                        if (err) {
                                            err.msg = err.message
                                            console.log(err)
                                            return cb(err)
                                        }
                                        count_all = rows.length
                                        if (offset) {
                                            count_all += offset
                                        }
                                        // console.log('countLarge', moment().diff(t1));
                                        cb(null)
                                    })

                                }
                            }, function(err, res) {
                                cb(err)
                            })


                        },
                        function(cb) {
                            if (params.countOnly) {
                                result = new UserOk('noToastr', {count: count_all})
                                return cb(null)
                            }
                            var rows
                            async.series({
                                query: (cb) => {
                                    pool.getConn((err, conn) => {
                                        if (err) return cb(new MyError('Не удалось получить подключение к БД', {err: err}))

                                        conn.query(realSQL, [], function(err, res) {
                                            conn.release()
                                            if (err) {
                                                err.msg = err.message
                                                if (err.code === 'ER_BAD_FIELD_ERROR') {
                                                    var err2 = err
                                                    err = new MyError('ER_BAD_FIELD_ERROR. Возможно, Вы добавили поле, которое использует для своего построения другие поля, ' +
                                                        'но его sort_no меньше чем у них. Проверьте что все используемые им поля имеют sort_no меньше. ' +
                                                        'Внимание! SORT_NO не синхронизируется! ' +
                                                        'Если изначально проставлено не верно, то надо залесть в class_profile и установить sort_no (функция в контекстном меню).'
                                                        , {
                                                            name: _t.name,
                                                            err: err2
                                                        })
                                                }
                                                console.log('GET ERROR', err)
                                                return cb(err)
                                            }
                                            rows = res
                                            cb(null)
                                        })
                                    })
                                },
                                getInheretedVal: function(cb) {

                                    if (params.doNotGetInheretedVal) return cb(null)
                                    var is_inherit_fields = {}
                                    for (var inhKey in _t.is_inherit_fields) {
                                        if (columns.indexOf(_t.is_inherit_fields[inhKey].value_id_key) !== -1) is_inherit_fields[inhKey] = _t.is_inherit_fields[inhKey]
                                    }

                                    if (!Object.keys(is_inherit_fields).length) return cb(null)

                                    var parent_key = (Array.isArray(_t.class_profile.server_parent_key)) ? _t.class_profile.server_parent_key[0] : undefined
                                    if (!parent_key) return cb(null)
                                    if (!rows.length) return cb(null)

                                    var ids = []
                                    for (var i in rows) {
                                        for (var inhKey in is_inherit_fields) {
                                            if (rows[i][is_inherit_fields[inhKey].value_id_key] === null) if (ids.indexOf(rows[i].id) === -1) ids.push(rows[i].id)
                                        }
                                    }

                                    if (!ids.length) return cb(null)
                                    var parent_ids, parent_ids_obj
                                    var parent_rows_obj = {}
                                    async.series({
                                        getParentIds: (cb) => {
                                            // console.log('getParentIds BEFORE');
                                            _t.getParentIds({
                                                ids: ids,
                                                parent_key: parent_key
                                            }, (err, res) => {
                                                if (err) return cb(err)
                                                parent_ids = res.ids
                                                parent_ids_obj = res.parent_ids_obj
                                                cb(null)
                                            })
                                        },
                                        getValues: (cb) => {
                                            // return cb(null);

                                            var columns_ = ['id']
                                            for (var i in is_inherit_fields) {
                                                if (columns_.indexOf(is_inherit_fields[i].value_id_key) === -1) columns_.push(is_inherit_fields[i].value_id_key)
                                                if (columns_.indexOf(is_inherit_fields[i].real_value_key) === -1) columns_.push(is_inherit_fields[i].real_value_key)
                                            }
                                            if (!parent_ids || !parent_ids.length) return cb(null)
                                            var params = {
                                                columns: columns_,
                                                where: [
                                                    {
                                                        key: 'id',
                                                        type: 'in',
                                                        val1: parent_ids
                                                    }
                                                ],
                                                limit: 10000000,
                                                sort: false,
                                                doNotGetInheretedVal: true,
                                                collapseData: false
                                            }
                                            _t.get(params, function(err, res) {
                                                if (err) return cb(new MyError('Не удалось получить значения родителей для наследуемых полей', {
                                                    params: params,
                                                    err: err
                                                }))
                                                if (!res.length) return cb(null)
                                                for (var i in res) {
                                                    parent_rows_obj[res[i].id] = res[i]
                                                }
                                                cb(null)
                                            })
                                        },
                                        merge: (cb) => {
                                            // return cb(null)
                                            if (!Object.keys(parent_rows_obj).length) return cb(null)

                                            var getParentRow = (id, col) => {
                                                var parent_id = (parent_ids_obj[id]) ? parent_ids_obj[id][0] : false
                                                if (!parent_id) return false // Нет родителей
                                                var parent_row = parent_rows_obj[parent_id]
                                                if (!parent_row) return false
                                                // if (typeof parent_row[col] === 'undefined') return false;
                                                if (typeof parent_row[col] === 'undefined') {
                                                    throw (new MyError('ОТЛАДКА не должно быть такого'))
                                                }
                                                if (parent_row[col]) return parent_row // Нашли родителя со значением.
                                                if (!parent_ids_obj[parent_id]) return false // Ничего не нашли. Больше родителей нет
                                                return getParentRow(parent_id, col)
                                            }

                                            for (var i in rows) {
                                                var row = rows[i]
                                                for (var j in is_inherit_fields) {

                                                    if (rows[i][is_inherit_fields[j].value_id_key] !== null) continue

                                                    var p_row = getParentRow(row.id, is_inherit_fields[j].value_id_key)
                                                    if (!p_row) continue
                                                    row[is_inherit_fields[j].real_value_key] = p_row[is_inherit_fields[j].real_value_key]

                                                    if (!additional_class_fields_profile[is_inherit_fields[j].real_value_key]) {
                                                        additional_class_fields_profile[is_inherit_fields[j].real_value_key] = {
                                                            is_inherit: []
                                                        }
                                                    }
                                                    additional_class_fields_profile[is_inherit_fields[j].real_value_key].is_inherit.push(row.id)
                                                }
                                            }
                                            return cb(null)
                                        }
                                    }, cb)

                                    // var params = {
                                    //     columns:Object.keys(_t.is_inherit_fields),
                                    //     where:[
                                    //         {
                                    //             key:
                                    //         }
                                    //     ],
                                    //     doNotGetInheretedVal:true,
                                    //     collapseData:false
                                    // };


                                    // var inherit_columns = {};
                                    // for (var i in columns) {
                                    //     var colProfile = _t.class_fields_profile[columns[i]];
                                    //     if (!colProfile) continue;
                                    //     if (!colProfile.inherit) continue;
                                    //     inherit_columns[columns[i]] = {
                                    //         profile:colProfile,
                                    //         data:{}
                                    //     }
                                    // }
                                    // if (Object.keys(inherit_columns).length){
                                    //
                                    //     console.log('sadsadasdsa', rows);
                                    // }
                                    // var ll1 = _t;
                                    // return cb(null);
                                },
                                getFormating: (cb) => {
                                    _t.getFormatingFunc(rows, params)
                                    return cb(null)
                                },
                                formatResponse: (cb) => {
                                    result = rows
                                    var data_columns
                                    if (!rows.length) data_columns = _t.columns
                                    if (params.collapseData !== false) {

                                        result = funcs.collapseData(rows, {
                                            count: rows.length,
                                            count_all: (count_all || rows.length),
                                            additional_class_fields_profile: additional_class_fields_profile
                                        }, data_columns)
                                    } else {
                                        additionalData.count = rows.length
                                        additionalData.count_all = (count_all || rows.length)
                                        additionalData.data_columns = data_columns
                                        additionalData.additional_class_fields_profile = additional_class_fields_profile
                                        // additionalData = {
                                        //     count:rows.length,
                                        //     count_all: (count_all || rows.length),
                                        //     data_columns:data_columns
                                        // };
                                        /*res.count = count_all;
                                         res.count_all = count_all;*/
                                    }
                                    cb(null, result, additionalData)
                                }
                            }, cb)
                            // async.waterfall([
                            //     pool.getConn,
                            //     function (conn, cb) {
                            //         conn.query(realSQL, [], function (err, rows) {
                            //             conn.release();
                            //             if (err) {
                            //
                            //                 err.msg = err.message;
                            //                 if (err.code === 'ER_BAD_FIELD_ERROR'){
                            //                     var err2 = err;
                            //                     err = new MyError('ER_BAD_FIELD_ERROR. Возможно, Вы добавили поле, которое использует для своего построения другие поля, ' +
                            //                         'но его sort_no меньше чем у них. Проверьте что все используемые им поля имеют sort_no меньше. ' +
                            //                         'Внимание! SORT_NO не синхронизируется! ' +
                            //                         'Если изначально проставлено не верно, то надо залесть в class_profile и установить sort_no (функция в контекстном меню).'
                            //                         ,{
                            //                             name:_t.name,
                            //                             err:err2
                            //                         });
                            //                 }
                            //                 console.log('GET ERROR',err);
                            //                 return cb(err);
                            //             }
                            //             _t.getFormatingFunc(rows, params);
                            //             result = rows;
                            //             var data_columns;
                            //             if (!rows.length) data_columns = _t.columns;
                            //             if (params.collapseData !== false) {
                            //
                            //                 result = funcs.collapseData(rows, {
                            //                     count: rows.length,
                            //                     count_all: (count_all || rows.length)
                            //                 }, data_columns);
                            //             } else {
                            //                 additionalData = {
                            //                     count:rows.length,
                            //                     count_all: (count_all || rows.length),
                            //                     data_columns:data_columns
                            //                 };
                            //                 /*res.count = count_all;
                            //                  res.count_all = count_all;*/
                            //             }
                            //             cb(null, result, additionalData);
                            //         });
                            //     }
                            // ], cb)
                        }
                    ], cb)
                }
            }, (err, res) => {
                cb(err, result, additionalData)
            })
        },
        /*function (cb) { // Старая реализация формирования SQL
            var param_where = [];
            for (var pkey in params.param_where) {
                var p = params.param_where[pkey];
                if (typeof p === 'string' || typeof p === 'number' || typeof p === 'boolean') {
                    param_where.push({
                        key: pkey,
                        val1: p
                    })
                }
            }
            var where = params.where || _t.where || [];
            where = where.concat(param_where);

            where = where.concat(_t.default_where);
            var limit = (isNaN(+params.limit) || params.limit === false) ? 1000 : +params.limit || 1000;

            var page_no = (isNaN(+params.page_no)) ? 1 : +params.page_no;
            var offset = (isNaN(+params.offset)) ? (limit * (page_no - 1)) : +params.offset || 0;
            var distinct = params.distinct || _t.distinct;
            if (typeof params.sort == 'string') params.sort = params.sort.trim();
            if (typeof params.sort == 'string') params.sort = {columns: params.sort.split(',')};
            var sort = params.sort || ((_t.sort) ? funcs.cloneObj(_t.sort) : {columns: ['id']});
            if (typeof sort.direction == 'string') sort.directions = sort.direction.split(',');
            var deleted = !!params.deleted;

            var published = (typeof params.published !== 'undefined') ? params.published : _t.check_published;
            var columns = [];

            var resultColumns = (Array.isArray(params.columns)) ? params.columns : _t.columns;
            for (var column in  resultColumns) {
                var classFieldsProfile = _t.class_fields_profile[resultColumns[column]];
                if (typeof classFieldsProfile !== 'object') continue;
                if (classFieldsProfile.queryable) {
                    if (columns.indexOf(resultColumns[column]) === -1) columns.push(resultColumns[column]);
                }
            }
            if (!columns.length) return cb(new MyError('Нет доступных колонок.',{params:params}));



            var sql = "";


            var joinObjs = funcs.cloneObj(_t.join_objs);
            var joinObjsWhere = funcs.cloneObj(_t.join_objs);

            var tmpWhere = [];
            var whereStr = '';

            var ready_columns = [];
            var specColumns = params.specColumns; // Объект, где ключ альяс результирующего столбца. specColumns:{pos:'POSITION(\'молоко\' IN product.NAME)'} --> POSITION('молоко' IN product.NAME) AS pos
            var groupBy = (Array.isArray(params.groupBy))? params.groupBy.join(',') : params.groupBy; // Массив полей по которым группировать. Используется в связке с specColumns. Пример ccs.vg - Investor_account
            var join_tables = [];
            var join_tables_list = [];
            var from_table_counter = {};
            var from_table_counter2 = {};
            var sortColumnsReady = [];
            var colProfile_aliases = {};
            if (columns.indexOf(distinct) == -1) distinct = false;
            var tableName = _t.tableName;
            if (sort){ // Добавим поля по которым идет сортировка к columns
                if (sort.columns){
                    for (var i0 in sort.columns) {
                        if (columns.indexOf(sort.columns[i0]) === -1) columns.push(sort.columns[i0]);
                    }
                }
            }
            for (const i_ in _t.default_where) { // Добавим поля, которые участвуют в default_where
                if (columns.indexOf(_t.default_where[i_].key) === -1) columns.push(_t.default_where[i_].key);
            }
            // Это ошибка, при сортировке колонки съезжают относительно профайла. При возникновении проблем описанных ниже надо решать их подругому.
            // // Отсортируем, так как после добавления полей для различных нужд (см выше) сортировка может отличаться от определенной в профайле (может привести к ошибке).
            // columns.sort(function(a,b){
            //     if (_t.class_fields_profile[a].sort_no < _t.class_fields_profile[b].sort_no) return -1
            //     if (_t.class_fields_profile[a].sort_no > _t.class_fields_profile[b].sort_no) return 1
            //     else return 0; // asd
            // });

            for (var i in columns) {
                var col = columns[i];
                if (distinct && col !== distinct) continue;
                var colProfile = _t.class_fields_profile[col];
                if (!colProfile) {
                    delete columns[i];
                    continue;
                }
                //if (sort.columns.indexOf(col) !== -1) sortColumnsReady.push(col);
                var sortIndex = sort.columns.indexOf(col);
                if (sortIndex !== -1) sortColumnsReady[sortIndex] = col + ' ' + (Array.isArray(sort.directions)? sort.directions[sortIndex] || 'ASC' : 'ASC');
                //if (colProfile.is_virtual && colProfile.concat_fields) continue; // Пропускаем concat_fields
                if (!colProfile.is_virtual) {
                    if (ready_columns.indexOf(tableName + '.' + col) === -1) ready_columns.push(tableName + '.' + col);
                    continue;
                }
                if (!colProfile.concat_fields) {
                    // if (colProfile.join_table_by_alias){
                    //     colProfile.join_table_old = colProfile.join_table_old || colProfile.join_table;
                    //     colProfile.join_table = colProfile.join_table_by_alias;
                    // }
                    var join_table = colProfile.join_table_by_alias || colProfile.join_table;

                    var colProfile_alias = colProfile.table_alias || colProfile.from_table + join_table + colProfile.keyword.replace(/[^a-z0-9_-]/gim,'');
                    if (colProfile_aliases[colProfile_alias]){
                        var c_name_tmp = colProfile_aliases[colProfile_alias].column_table + '.' + colProfile.return_column + ' as ' + col;
                        if (ready_columns.indexOf(c_name_tmp) === -1) ready_columns.push(c_name_tmp);
                        _t.class_fields_profile[col].from_table_alias = colProfile_aliases[colProfile_alias].from_table_alias;
                        continue;
                    }

                    if (!from_table_counter[colProfile.from_table]) from_table_counter[colProfile.from_table] = 0;
                    from_table_counter[colProfile.from_table]++;
                    colProfile.from_table_alias = colProfile.from_table + from_table_counter[colProfile.from_table];
                    var table_name;
                    if (join_table){
                        if (join_table == tableName){
                            table_name = join_table;
                        }else{
                            if (!from_table_counter2[colProfile.from_table]) from_table_counter2[colProfile.from_table] = 0;
                            from_table_counter2[colProfile.from_table]++;
                            table_name = (colProfile_aliases[join_table])? colProfile_aliases[join_table].from_table_alias : join_table + from_table_counter2[colProfile.from_table]
                        }
                    }else{
                        table_name = tableName;
                    }

                    var join_table_str = ' LEFT JOIN ' + colProfile.from_table + ' as ' + colProfile.from_table_alias + ' ON (';

                    var keyword_arr = (colProfile.keyword.indexOf('[') !== -1)? (function(){
                       var keyword_parsed;
                       try {
                           keyword_parsed = JSON.parse(colProfile.keyword);
                       }
                       catch (e){
                           return cb(MyError('Не валидный JSON в поле keyword', {colProfile:colProfile}));
                       }
                       if (typeof keyword_parsed !== 'object') return cb(MyError('Поле keyword не является объектом/массивом', {colProfile:colProfile}));
                       return keyword_parsed;
                    })() : [colProfile.keyword];
                    // if (colProfile.keyword.indexOf('[') !== -1)

                    for (var i in keyword_arr) {
                        var keywords = keyword_arr[i].split(':');
                        var keyword = keywords[0];
                        var ext_keyword = keywords[1] || 'id';
                        if (i > 0) join_table_str += ' AND ';
                        // join_table_str += (isNaN(+keyword))? table_name + '.' + keyword : +keyword;
                        if (!isNaN(+keyword)){
                            join_table_str += + keyword;
                        }else if (keyword.indexOf('|') === -1){
                            join_table_str += table_name + '.' + keyword;
                        }else{
                            var keyword_alias = keyword.replace(/\|/ig,'');
                            if (!_t.join_table_keyword_obj[keyword_alias]) {
                                return cb(new MyError('Для поля указан keyword с подстановкой, однако в таблице join_table_keyword значение отсутствует.',{colProfile:colProfile,keyword_alias:keyword_alias}));
                            }
                            join_table_str += +_t.join_table_keyword_obj[keyword_alias].linked_id;
                        }
                        // join_table_str += (keyword.indexOf('|') === -1)? table_name + '.' + keyword : keyword.replace;
                        join_table_str += ' = ';
                        // join_table_str += (isNaN(+ext_keyword))? colProfile.from_table_alias + '.' + ext_keyword : +ext_keyword;
                        if (!isNaN(+ext_keyword)){
                            join_table_str += + ext_keyword;
                        }else if (ext_keyword.indexOf('|') === -1){
                            join_table_str += colProfile.from_table_alias + '.' + ext_keyword;
                        }else{
                            var ext_keyword_alias = ext_keyword.replace(/\|/ig,'');
                            if (!_t.join_table_keyword_obj[ext_keyword_alias]) {
                                return cb(new MyError('Для поля указан keyword с подстановкой, однако в таблице join_table_keyword значение отсутствует.',{colProfile:colProfile,ext_keyword_alias:ext_keyword_alias}));
                            }
                            join_table_str += +_t.join_table_keyword_obj[ext_keyword_alias].linked_id;
                        }
                    }
                    join_table_str += ')';
                    join_tables.push(join_table_str);

                    // join_tables.push(' LEFT JOIN ' + colProfile.from_table + ' as ' + colProfile.from_table_alias + ' ON (' + table_name + '.' + colProfile.keyword + ' = ' + colProfile.from_table_alias + '.id)');

                    var c_name_tmp = (colProfile.from_table_alias || colProfile.from_table) + '.' + colProfile.return_column + ' as ' + col;
                    if (ready_columns.indexOf(c_name_tmp) === -1) ready_columns.push(c_name_tmp);
                    _t.class_fields_profile[col].from_table_alias = colProfile.from_table_alias;
                    colProfile_aliases[colProfile_alias] = {
                        column_table:(colProfile.from_table_alias || colProfile.from_table),
                        from_table_alias:colProfile.from_table_alias
                    };
                // } else if (colProfile.concat_fields) {
                //     var concat_array = colProfile.concat_array;
                //     var s = '';
                //     for (var i in concat_array) {
                //         var fieldKey = concat_array[i];
                //         var fieldProfile = _t.class_fields_profile[fieldKey];
                //         if (!s) s = 'CONCAT(';
                //         if (fieldProfile) {
                //             s += fieldProfile.from_table || tableName + '.' + (fieldProfile.return_column || fieldKey) + ',';
                //         } else {
                //             s += "'" + fieldKey + "',";
                //         }
                //     }
                //     s = s.replace(/,$/, ') as ') + col;
                //     ready_columns.push(s);
                // }
                } else if (colProfile.concat_fields) {
                    var concat_array = colProfile.concat_array;
                    var s = '';
                    for (var i in concat_array) {
                        var fieldKey = concat_array[i];
                        var fieldProfile = _t.class_fields_profile[fieldKey];
                        if (!s) s = 'CONCAT(';
                        if (fieldProfile) {
                            s += 'IFNULL(' + (fieldProfile.from_table_alias || fieldProfile.from_table || tableName) + '.' + (fieldProfile.return_column || fieldKey) + ',\'\'),';
                        } else {
                            s += "'" + fieldKey + "',";
                        }
                    }
                    s = s.replace(/,$/, ') as ') + col;
                    if (ready_columns.indexOf(s) === -1) ready_columns.push(s);
                }


            }
            if (!sortColumnsReady.length) {
                var defaultCol = (columns.indexOf('sort_no') !== -1) ? 'sort_no' : false;
                if (defaultCol) sortColumnsReady.push(defaultCol);
            }
            if (specColumns){
                for (var column in  specColumns) {
                    if (ready_columns.indexOf(specColumns[column] + ' as ' + column) === -1) ready_columns.push(specColumns[column] + ' as ' + column);
                    //if (sort.columns.indexOf(column) !== -1) sortColumnsReady.push(column);
                    var sortIndex = sort.columns.indexOf(column);
                    if (sortIndex !== -1) sortColumnsReady[sortIndex] = column + ' ' + (Array.isArray(sort.directions)? sort.directions[sortIndex] || 'ASC' : 'ASC');
                }
            }
            sort.columns = sortColumnsReady;

            var distinctSQL = (distinct) ? 'DISTINCT ' : '';
            var sqlStart = "SELECT " + distinctSQL + ready_columns.join(', ') + " FROM " + tableName;
            sql += join_tables.join('');

            let new_where = [];
            for (var ii0 in where) {
                if (typeof where[ii0] === 'object')  new_where.push(where[ii0]);
            }
            where = new_where;
            for (var ii in where) {
                if (where[ii].group === 'Access_by_list_SYSTEM') where[ii].group = 'Access_by_list_SYSTEM_replaced'
            }

            if (list_of_access_ids.length){
                where.push(
                    {
                        key:'id',
                        type:'in',
                        group:'Access_by_list_SYSTEM',
                        val1:list_of_access_ids
                    }
                );
            }

            // if (_t.user.access_list && _t.user.access_list[_t.name] && _t.user.access_list[_t.name].is_access && _t.user.access_list[_t.name].is_access_by_list){
            //
            //     where.push(
            //         {
            //             key:'id',
            //             type:'in',
            //             group:'Access_by_list_SYSTEM',
            //             val1:'SELECT a.record_id FROM list_of_access a LEFT JOIN class_operation AS b ON a.class_operation_id = b.id WHERE a.user_id = '
            //             + _t.user.user_data.id +' AND b.id = ' + _t.user.access_list[_t.name].class_operation_id
            //         }
            //     );
            // }else if (_t.user.access_list && _t.user.access_list[_t.name] && !_t.user.access_list[_t.name].is_access && _t.user.access_list[_t.name].operations['get']
            //     && _t.user.access_list[_t.name].operations['get'].is_access && _t.user.access_list[_t.name].operations['get'].is_access_by_list){
            //
            //     where.push(
            //         {
            //             key:'id',
            //             type:'in',
            //             group:'Access_by_list_SYSTEM',
            //             val1:'SELECT a.record_id FROM list_of_access a LEFT JOIN class_operation AS b ON a.class_operation_id = b.id WHERE a.user_id = '
            //             + _t.user.user_data.id +' AND b.id = ' + _t.user.access_list[_t.name].operations['get'].class_operation_id
            //         }
            //     );
            // }


            where = where.sort(function (a, b) {
                if (!a.group) a.group = '_serverAutoGroup';
                if (!b.group) b.group = '_serverAutoGroup';
                a.groupTrim = a.group.replace(/\.\w+/ig, '');
                b.groupTrim = b.group.replace(/\.\w+/ig, '');
				if (a.groupTrim > b.groupTrim) return 1;
				if (a.groupTrim < b.groupTrim) return -1;
                return 0;
            });
            // for (var i0 in where) {
				// if (!where[i0].group) where[i0].group = 'serverAutoGroup';
            // }
            var old_group = '';
            var groupComparisonTypeIsOpen;
            var groupComparisonTypeOld;
            for (var i in where) {
                var one_where = where[i];
                if (typeof  one_where !== 'object') continue;

                //var key = (table_name)? table_name+'.'+one_where.key : one_where.key;
                var columnProfile = _t.class_fields_profile[one_where.key];
                if (!columnProfile) return cb(new MyError('Нет профайла для колонки.', {
                    column: one_where.key,
                    table: tableName
                }));
                var key;
                var fromTable = columnProfile.from_table_alias || columnProfile.from_table;
                if (columnProfile.is_virtual && fromTable) {
                    key = fromTable;
                } else {
                    key = one_where.key;
                }
                if (!key) continue;
                if (!columns.indexOf(key) == -1) continue; // Поле недоступно
                var type = one_where.type || '=';
                var val1 = one_where.val1 || '';
                var val2 = one_where.val2 || '';
                one_where.group = one_where.group || 'default';
				var group = one_where.groupTrim || one_where.group.replace(/\.\w+/ig, '');
                var groupComparisonType = one_where.group.replace(/\w+\.*!/, '') || 'AND'; // EXAMPLE 'group1.OR'
				groupComparisonType = (groupComparisonType.toUpperCase() == 'OR') ? groupComparisonType.toUpperCase() : 'AND';
                // if (groupComparisonType !== 'OR'){
                 //    groupComparisonTypeOld = 'AND';
                // }
				// if (groupComparisonType === 'OR' && groupComparisonTypeOld !== 'OR'){
                 //    groupComparisonTypeOld = 'OR';
                 //    groupComparisonType = 'AND';
				// }

                var comparisonType = one_where.comparisonType || 'AND';
                comparisonType = comparisonType.toUpperCase();
                var binaryStr = (one_where.binary) ? 'BINARY ' : '';
                var keyString;
                if (!columnProfile.is_virtual) {
                    if (columnProfile.type == 'date') {
                        //keyString = "DATE_FORMAT(" + tableName + '.' + key + ",'%d.%m.%Y')";
                        keyString = tableName + '.' + key
                    } else if (columnProfile.type == 'datetime') {
                        //keyString = "DATE_FORMAT(" + tableName + '.' + key + ",'%d.%m.%Y %H:%i:%s')";
                        keyString = tableName + '.' + key;
                    } else {
                        keyString = binaryStr + tableName + '.' + key;
                    }

                } else if (columnProfile.is_virtual && fromTable) {
                    keyString = binaryStr + fromTable + '.' + columnProfile.return_column;
                } else {
                    var concat_array = columnProfile.concat_array;
                    var str = '';
                    for (var i in concat_array) {
                        var fieldKey = concat_array[i];
                        var fieldProfile = _t.class_fields_profile[fieldKey];
                        if (!str) str = 'CONCAT(';
                        if (fieldProfile) {
                            str += fieldProfile.from_table || tableName + '.' + (fieldProfile.return_column || fieldKey) + ',';
                        } else {
                            str += "'" + fieldKey + "',";
                        }
                    }
                    keyString = binaryStr + str.replace(/,$/, ')');
                }
                if (typeof keyString === 'undefined') continue;
                var s = '';
                var val1_new,val2_new;
                switch (type) {
                    case '=':
                    case '>':
                    case '<':
                    case '<=':
                    case '>=':
                    case '<>':
                        val1_new = pool.escape(val1);
                        if (columnProfile.type == 'date' || columnProfile.type == 'datetime') val1_new = "str_to_date('" + funcs.getDateTimeMySQL(val1) + "', '%Y-%m-%d %H:%i:%s')";
                        if (columnProfile.type === 'tinyint' && columnProfile.field_length === 1 && !val1) {
                            s = '(' + keyString + ' ' + type + ' ' + val1_new + ' OR ' + keyString + ' IS NULL )';
                            break;
                        }
                        s = keyString + ' ' + type + ' ' + val1_new;

                        break;
                    case 'like':
                        if (columnProfile.type == 'date' || columnProfile.type == 'datetime') keyString = "DATE_FORMAT(" + keyString + ",'%d.%m.%Y %H:%i:%s')";
                        s = keyString + ' ' + type + ' ' + pool.escape('%' + val1 + '%');
                        break;
                    case 'like%':
                        if (columnProfile.type == 'date' || columnProfile.type == 'datetime') keyString = "DATE_FORMAT(" + keyString + ",'%d.%m.%Y %H:%i:%s')";
                        s = keyString + ' LIKE ' + pool.escape(val1 + '%');
                        break;
                    case '%like':
                        if (columnProfile.type == 'date' || columnProfile.type == 'datetime') keyString = "DATE_FORMAT(" + keyString + ",'%d.%m.%Y %H:%i:%s')";
                        s = keyString + ' LIKE ' + pool.escape('%' + val1);
                        break;
                    case 'in':
                        var values = '';
                        // if (typeof val1 !== 'object' && val1) val1 = String(val1).split(',');
                        if (typeof val1 !== 'object' && val1) val1 = [val1];
                        if (typeof val1 == 'object'){
                        for (var i in val1) {
                            if (one_where.group === 'Access_by_list_SYSTEM'){
                                values +=val1[i] + ',';
                            }else{
                                values += pool.escape(val1[i]) + ',';
                            }

                        }
                        } else if (typeof val1 == 'string'){
                            values = pool.escape(val1);
                        }

                        values = values.replace(/,$/, '');
                        s = keyString + ' IN (' + values + ')';
                        break;
                    case 'notIn':
                    case '!in':
                    case '!In':
                        var values = '';
                        // if (typeof val1 !== 'object' && val1) val1 = String(val1).split(',');
                        if (typeof val1 !== 'object' && val1) val1 = [val1];
                        if (typeof val1 == 'object'){
                            for (var i in val1) {
                                values += pool.escape(val1[i]) + ',';
                            }
                        } else if (typeof val1 == 'string'){
                            values = pool.escape(val1);
                        }

                        values = values.replace(/,$/, '');
                        s = keyString + ' NOT IN (' + values + ')';
                        break;
                    case 'between':
                    case '..':
                        val1_new = pool.escape(val1);
                        val2_new = pool.escape(val2);
                        if (columnProfile.type == 'date' || columnProfile.type == 'datetime'){
                            val1_new = "str_to_date('" + funcs.getDateTimeMySQL(val1) + "', '%Y-%m-%d %H:%i:%s')";
                            val2_new = "str_to_date('" + funcs.getDateTimeMySQL(val2) + "', '%Y-%m-%d %H:%i:%s')";
                        }
                        if (val1 && val2) { // Указаны оба значения. Используем between
                            s = keyString + " BETWEEN " + val1_new + " AND " + val2_new + "";
                        } else if (!val2) { // Второе значение не указано. Используем >=
                            s = keyString + " >= " + val1_new;
                        } else { // Первое значение не указано. Используем <=
                            s = keyString + " <= " + val2_new;
                        }
                        break;
                    case 'isNull':
                        s = keyString + " IS NULL ";
                        break;
                    case 'isNotNull':
                    case '!isNull':
                        s = keyString + " IS NOT NULL ";
                        break;
                    default :
                        continue;
                        break;
                }

                if (groupComparisonType === 'OR' && !groupComparisonTypeIsOpen) {
                    s = '(' + s;
                    groupComparisonTypeIsOpen = true;
                }

                if (group != old_group) {
                    if (groupComparisonType === 'AND' && groupComparisonTypeIsOpen) {
                        whereStr += ')';
                        groupComparisonTypeIsOpen = false;
                    }

                    whereStr = (whereStr) ? whereStr + ') ' + groupComparisonType + ' (' + s : '(' + s;
                    //whereStr = (whereStr)? whereStr + ' '+ comparisonType +' ' + s : s;

                    old_group = group;
                } else {
                    whereStr = (whereStr) ? whereStr + ' ' + comparisonType + ' ' + s : s;
                }



            }

            if (groupComparisonTypeIsOpen) {
                whereStr += ')';
                // whereStr = '(' + whereStr + ')';
                groupComparisonTypeIsOpen = false;
            }

            if (whereStr) whereStr += ')';

            //console.log('whereStr', whereStr);
            // Общее для всех
            sql += ' WHERE ';
            var whereString = whereStr;
            if (whereString !== '') {
                sql += whereString;
            }

            if (!deleted) {
                if (whereString !== '') {
                    sql += ' AND';
                }
                sql += " (" + tableName + ".deleted IS NULL OR " + tableName + ".deleted >'" + funcs.getDateTimeMySQL() + "')"
            }
            if (published) {
                if (whereString !== '' || !deleted) {
                    sql += ' AND';
                }
                published = (published === true) ? funcs.getDateTimeMySQL() : published;
                sql += " (" + tableName + ".published IS NOT NULL AND " + tableName + ".published <='" + published + "')"
            }
            var sqlCount = 'SELECT count(*) FROM ' + tableName + sql;
            var sqlCountLarge = 'SELECT null FROM ' + tableName + sql;

            if (sort.columns.length && !groupBy) {
                sql += ' ORDER BY ' + sort.columns.join(',');// + ' ' + sort.direction;
            }
            if (groupBy) {
                sql += ' GROUP BY ' + pool.escape(groupBy);
            }

            if (limit) {
                if (offset) {
                    sql += ' LIMIT ' + offset + ', ' + limit;
                    sqlCountLarge += ' LIMIT ' + offset + ', ' + limit * 3;
                } else {
                    sql += ' LIMIT ' + limit;
                    sqlCountLarge += ' LIMIT ' + limit * 3;
                }
            }


            var realSQL = sqlStart + sql;
            console.log(realSQL);

            var count_all;
            let countLarge = (typeof params.count_large !== 'undefined')? params.count_large : _t.class_profile.count_large;
            async.waterfall([
                pool.getConn,
                function (conn, cb) {
                    if (params.notCount){
                        conn.release();
                        return cb(null);
                    }
                    async.series({
                        countMain:function(cb){

                            if (countLarge) return cb(null);
                            if (distinct) {
                                conn.release();
                                return cb(null);
                            }
                            conn.queryValue(sqlCount, [], function (err, res) {
                                conn.release();
                                if (err) {
                                    err.msg = err.message;
                                    return cb(new MyError('Не удалось посчитать количество записей по запросу', {err:err,params:params,sql:sqlCount}));
                                }
                                count_all = res;
                                cb(null);
                            });
                        },
                        countLarge:function(cb){
                            if (!countLarge) return cb(null);
                            // Выполним запрос и посчитаем количество результатов

                            var t1 = moment();
                            console.log('countLarge QUERY',sqlCountLarge);
                            conn.query(sqlCountLarge, [], function (err, rows) {
                                conn.release();
                                if (err) {
                                    err.msg = err.message;
                                    console.log(err);
                                    return cb(err);
                                }
                                count_all = rows.length;
                                if (offset){
                                    count_all += offset;
                                }
                                console.log('countLarge', moment().diff(t1));
                                cb(null);
                            });

                        }
                    }, function(err, res){
                        cb(err);
                    });


                },
                function (cb) {
                    if (params.countOnly) return cb(null, new UserOk('noToastr', {count: count_all}));
                    async.waterfall([
                        pool.getConn,
                        function (conn, cb) {
                            conn.query(realSQL, [], function (err, rows) {
                                conn.release();
                                if (err) {

                                    err.msg = err.message;
                                    if (err.code === 'ER_BAD_FIELD_ERROR'){
                                        var err2 = err;
                                        err = new MyError('ER_BAD_FIELD_ERROR. Возможно, Вы добавили поле, которое использует для своего построения другие поля, ' +
                                            'но его sort_no меньше чем у них. Проверьте что все используемые им поля имеют sort_no меньше. ' +
                                            'Внимание! SORT_NO не синхронизируется! ' +
                                            'Если изначально проставлено не верно, то надо залесть в class_profile и установить sort_no (функция в контекстном меню).'
                                            ,{
                                                name:_t.name,
                                                err:err2
                                            });
                                    }
                                    console.log('GET ERROR',err);
                                    return cb(err);
                                }
                                _t.getFormatingFunc(rows, params);
                                var res = rows;
                                var additionalData;
                                    var data_columns;
                                    if (!rows.length) data_columns = _t.columns;
                                if (params.collapseData !== false) {

                                    res = funcs.collapseData(rows, {
                                        count: rows.length,
                                        count_all: (count_all || rows.length)
                                    }, data_columns);
                                } else {
                                    additionalData = {
                                        count:rows.length,
                                        count_all: (count_all || rows.length),
                                        data_columns:data_columns
                                    };
                                    /!*res.count = count_all;
                                     res.count_all = count_all;*!/
                                }
                                cb(null, res, additionalData);
                            });
                        }
                    ], cb)
                }
            ], cb);


        }*/
    ], function(err, results, additionalData) {
        if (err) {
            return cb(err)
        }
        if (use_cache) {
            //console.log('cacheAlias',cacheAlias);
            if (!global.classesCache[_t.name]) global.classesCache[_t.name] = {}
            global.classesCache[_t.name][cacheAlias] = results
            global.classesCache[_t.name][cacheAlias + 'additionalData'] = additionalData

        }
        cb(null, results, additionalData)
    })
}

MySQLModel.prototype.getById = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    var id = obj.id
    if (isNaN(+id)) return cb(new MyError('В getById метод не передан id'))
    var o = {
        collapseData: false,
        where: [
            {
                key: 'id',
                val1: id
            }
        ],
        deleted: obj.deleted,
        doNotCheckList: obj.doNotCheckList,
        skipCheckRoleModel: obj.skipCheckRoleModel,
        use_cache: obj.use_cache
    }
    if (Array.isArray(obj.columns)) o.columns = obj.columns
    _t.get(o, function(err, res) {
        if (err) return cb(err)
        if (!res.length) {
            return cb(new MyError('Запись не найдена', {o: o, res: res}))
        }
        // cb(err, res);
        cb(err, new UserOk('noToastr', res))
    })
}

MySQLModel.prototype.add = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this
    var rollback_key
    var doNotClearCache = obj.doNotClearCache

    //var fromClient = !(obj.fromClient === false);
    var fromClient = obj.fromClient
    var saveHistory = fromClient ? true : obj.saveHistory
    delete obj.fromClient
    delete obj.saveHistory


    if (obj.rollback_key) {
        rollback_key = obj.rollback_key
        delete obj.rollback_key
    }

    var added_id
    async.waterfall([
        function(cb) {
            // Предзапрос ID из справочников по виртуальным полям
            async.eachSeries(Object.keys(obj), function(key, cb) {
                var colProfile = _t.class_fields_profile[key]
                if (typeof colProfile !== 'object') {
                    console.log('Не удалось получить профайл колонки...', key)
                    delete obj[key]
                    return cb(null)
                } // Просто игнорируем поля для которых нет профайла
                var colValue = obj[key]
                if ((typeof obj[colProfile.keyword] === 'undefined') && typeof colValue !== 'undefined' && colProfile.is_virtual && colProfile.from_table && colProfile.keyword && colProfile.return_column) {
                    // Загрузим значение для статуса colValue
                    var o = {
                        command: 'get',
                        object: colProfile.from_table,
                        params: {
                            collapseData: false,
                            columns: ['id'],
                            where: [
                                {
                                    key: colProfile.return_column,
                                    val1: colValue
                                }
                            ]
                        }
                    }
                    _t.api(o, function(err, res) {
                        if (err) {
                            console.log('Не удалось загрузить значение из справочнка', o, err)
                            delete obj[key]
                            return cb(null)
                        }
                        if (!res.length) {
                            console.log('В системе нет такого значения в связанной таблице', JSON.stringify(o))
                            return cb(null)
                        }
                        obj[colProfile.keyword] = res[0].id
                        cb(null)
                    })
                } else cb(null)
            }, cb)
        },
        function(cb) {
            // Проставим значения по умолчанию для is_virtual полей / Put the default values for is_virtual fields
            _t.loadDefaultValues(obj, function(err, result_obj) {
                obj = result_obj
                if (Object.keys(obj).length < 1) return cb(new UserError('insertableErr'))
                return cb(err)
            })
        },
        function(cb) {
            // Удалим не добавляемые поля

            for (var i in obj) {
                var colProfile = _t.class_fields_profile[i]
                //if (typeof colProfile!=='object') return cb(new MyError('Не удалось получить профайл колонки...',i));
                if (typeof colProfile !== 'object') {
                    console.log('Не удалось получить профайл колонки...', i)
                    delete obj[i]
                    continue
                } // Просто игнорируем поля для которых нет профайла
                var colValue = obj[i]
                if (colProfile.is_virtual || (colProfile.is_virtual && !colProfile.from_table && fromClient) || (!colProfile.server_editable && !colProfile.server_insertable && fromClient))
                    delete obj[i]
            }
            delete obj['id']
            if (fromClient) delete obj['created']
            delete obj['deleted']
            delete obj['updated']
            //if (Object.keys(obj).length < 1) return cb(new UserError('Поля, которые вы пытаетесь добавить не доступны для добавления.'));
            var requredNotFound = []
            for (var j in _t.required_fields) {
                var colName = _t.required_fields[j]
                var colProfile2 = _t.class_fields_profile[colName]
                if (colProfile2.is_virtual) continue // Я игнорирую requred для виртуальных полей
                if (typeof obj[colName] === 'undefined') requredNotFound.push({
                    column_name: colName,
                    name: colProfile2.name
                })
            }
            if (requredNotFound.length) {
                return cb(new UserError('requiredErr', {data: requredNotFound}))
            }

            obj = _t.setFormatingFunc(obj)
            _t.beforeFunction['add'](obj, function(err) {
                if (err) return cb(new MyError('Ошибка выполнения beforeFunction'))
                var valid = _t.validate(obj)
                if (typeof valid == 'object') {
                    return cb(new UserError('invalid', {msg: valid.message, fields: valid.fields}))
                }
                return cb(null)
            })
        },

        function(cb) {
            if (obj.checkUnique === false) return cb(null)
            _t.checkUnique(obj, cb)
        },
        function(cb) {
            // Проставим глубину если нужно / Pull the depth if necessary
            if (!_t.class_profile.hierarchical_table || !_t.class_profile.main_parent_key) return cb(null)
            // надо проверить, был ли передан parent_id и если был, то получить его deep / It is necessary to check whether parent_id has been passed and if there was, then get it deep

            var parent_value = obj[_t.class_profile.main_parent_key]
            if (typeof parent_value === 'undefined') return cb(null) // Родитель не указан, node_deep будет по умолчанию - 0 / Parent is not specified, node_deep will default to 0

            // Если родитель указан как null, то node_deep надо выставить в 0. Этот кейс возможен при изменении, а не добавлении, но пусть код будет одинаков.
            // If the parent is specified as null, then node_deep must be set to 0. This case is possible when changing, not adding, but let the code be the same.
            if (!parent_value) {
                obj.node_deep = 0
                return cb(null)
            }
            // Если родитель указан, то возьмем его глубину и увеличем на единицу / If the parent is specified, then take its depth and increase by one
            _t.getById({id: parent_value, columns: ['id', 'node_deep']}, function(err, res) {
                if (err) return cb(new MyError('Не удалось получить node_deep.', {id: id, err: err}))
                obj.node_deep = +res[0].node_deep + 1
                cb(null)
            })

        },
        function(cb) {

            // Установим данные о пользователе
            if (!_t.user.user_data) return cb(null)
            obj.created_by_user_id = _t.user.user_data.id
            obj.self_company_id = _t.user.user_data.company_id
            obj.ext_company_id = _t.user.user_data.company_id
            return cb(null)

            // Если класс имеет server_parent_table, то получим компанию родительской записи
            var serverParentTable = _t.class_profile.server_parent_table[0]
            if (serverParentTable) {
                var serverParentKey = _t.class_profile.server_parent_key[0]

                if (!serverParentKey) return cb(new MyError('Необходимо указать server_parent_key', {class_profile: _t.class_profile}))
                if (typeof obj[serverParentKey] === 'undefined' || obj[serverParentKey] === null) return cb(new UserError('Не указано обязательное родительское поле', {server_parent_key: serverParentKey}))
                var o = {
                    command: 'get',
                    object: serverParentTable,
                    params: {
                        columns: ['self_company_id'],
                        doNotCheckCompany: true,
                        param_where: {
                            id: obj[serverParentKey]
                        },
                        collapseData: false
                    }

                }
                _t.api(o, function(err, res) {
                    if (err) return cb(new MyError('Не удалось получить компанию из родительского класса. Ошибка', {
                        err: err,
                        id: obj[serverParentKey]
                    }))
                    if (!res.length) cb(new MyError('Не удалось получить компанию из родительского класса. Запись не найдена.', {
                        err: err,
                        id: obj[serverParentKey]
                    }))
                    var self_company_id = res[0].self_company_id
                    if (!self_company_id) {
                        // Запишем из user_id
                        var o = {
                            command: 'modify',
                            object: serverParentTable,
                            params: {
                                self_company_id: _t.user.user_data.company_id
                            }
                        }
                        _t.api(o, function(err, res) {
                            if (err) return cb(new MyError('Не удалось записать компанию родительскому классу. Ошибка', {
                                err: err,
                                id: obj[serverParentKey],
                                self_company_id: _t.user.user_data.company_id
                            }))
                            obj.self_company_id = self_company_id
                            cb(null)
                        })
                    } else {
                        obj.self_company_id = self_company_id
                        cb(null)
                    }
                })
            } else {
                obj.self_company_id = _t.user.user_data.company_id
                cb(null)
            }

        },
        pool.getConn,
        function(conn, cb) {
            obj.created = (obj.created && !fromClient) ? obj.created : funcs.getDateTimeMySQL()
            if (_t.auto_publish && !obj.published) {
                obj.published = funcs.getDateTimeMySQL()
            }

            conn.insert(_t.tableName, obj, function(err, recordId) {
                conn.release()
                if (err) {
                    console.log(err)
                    return cb(err)
                }
                added_id = recordId
                if (rollback_key) {
                    var o = {
                        type: 'add',
                        params: {
                            object: _t.name,
                            id: added_id,
                            user: _t.user
                        }
                    }
                    rollback.add(rollback_key, o, function(err, res) {
                        if (err) return cb(err)
                        cb(null)
                    })
                } else {
                    cb(null)
                }
            })
        },
        function(cb) { // Запишим в историю
            if (!_t.history_fields || saveHistory === false) return cb(null)
            var record_new_state
            async.series({
                getNew: cb => {


                    var params = {
                        id: added_id,
                        columns: _t.history_fields,
                        doNotCheckList: true,
                        use_cache: false,
                        skipCheckRoleModel: true
                    }
                    _t.getById(params, function(err, res) {
                        if (err) return cb(new MyError('Не удалось получить первоначальные данные для сохранения истории.', {
                            id: added_id,
                            oper: 'add',
                            err: err
                        }))
                        record_new_state = res[0]
                        cb(null)
                    })
                },
                addHist: cb => {

                    var hash = funcs.guid12()
                    async.eachSeries(_t.history_fields, function(key, cb) {
                        var o = {
                            command: 'add',
                            object: `_${_t.tableName}_history`,
                            params: {
                                class_id: _t.class_profile.id,
                                class_field_id: _t.class_fields_profile[key].id,
                                record_id: added_id,
                                operation_type: 'ADD',
                                value: record_new_state[key],
                                hash: hash,
                                rollback_key: rollback_key
                            }
                        }
                        _t.api(o, (err, res) => {
                            if (err) {
                                if (err.code === 2005) return cb(new MyError(`Не удалось добавить запись истории. Проверьте существование класса "_${_t.tableName}_history"`, {
                                    o: o,
                                    err: err
                                }))
                                return cb(new MyError('Не удалось добавить запись истории', {o: o, err: err}))
                            }

                            cb(null)
                        })
                    }, cb)
                }
            }, function(err, res) {
                return cb(err)
            })
        },
        function(cb) {
            // Если есть dynamic_field_pair, то для каждой выполним добавление
            // If there is a dynamic_field_pair, then for each we add

            if (!_t.dynamic_field_pair.length) return cb(null)

            async.eachSeries(_t.dynamic_field_pair, function(one_pair, cb) {
                var o = {
                    command: 'sync',
                    object: 'dynamic_field_pair',
                    params: {
                        source_id: added_id,
                        id: one_pair.id
                    }
                }
                _t.api(o, function(err, res) {
                    if (err) return cb(new MyError('Не удалось синхронизировать добавленное поле с парой динамических полей', {
                        o: o,
                        one_pair: one_pair,
                        err: err
                    })) // Could not sync added field with a pair of dynamic fields
                    cb(null)
                })
            }, cb)

        }
    ], function(err) {
        if (err) {
            if (err instanceof UserError) return cb(err)
            return cb(new MyError('Не удалось добавить запись.', {err}))
        }
        if (!doNotClearCache) {
            _t.clearCache()
        }
        return cb(null, new UserOk(_t.table_ru + ` успешно добавлен${_t.ending}.` + _t.ending + '.', {id: added_id}))
    })
}

MySQLModel.prototype.modify = function(obj_in, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj_in = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj_in !== 'object') return cb(new MyError('В метод не переданы obj'))
    // var obj = funcs.cloneObj(obj_in);
    var obj = {...obj_in}
    var _t = this
    //var fromClient = !(obj.fromClient === false);
    var fromClient = obj.fromClient

    var rollback_index
    // if (obj.rollback_key) {
    //     rollback_key = obj.rollback_key;
    //     delete obj.rollback_key;
    // }
    var rollback_key = obj.rollback_key || rollback.create()
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key
    var modifyNodeDeep = obj.modifyNodeDeep
    var noToastr = obj.noToastr
    var doNotClearCache = obj.doNotClearCache
    var saveHistory = fromClient ? true : obj.saveHistory

    delete obj.fromClient
    delete obj.rollback_key
    delete obj.doNotSaveRollback
    delete obj.modifyNodeDeep
    delete obj.noToastr
    delete obj.doNotClearCache

    var id = obj.id
    if (!id) return cb(new MyError('Не передано ключевое поле. id', {object: _t.name, command: 'modify', obj: obj}))
    var key = obj.key || obj.lock_key
    if (global.class_locks[_t.name][id]) {
        if (global.class_locks[_t.name][id].key != key) {
            var diff = moment().diff(global.class_locks[_t.name][id].timestart)
            var locktime = obj.locktime || 10000
            if (diff > locktime) {
                return cb(new UserError('Запись уже заблокирована другим процессом. Более 10 сек (modify)', {obj: obj}))
            }
            setTimeout(function() {
                _t.modify(obj_in, cb)
            }, 500)
            return
        }


        //return cb(new MyError('Запись заблокирована.',{name:_t.name,id:id}));
    }


    var modify_in_ext_tbl_arr = []
    var affected_counter = 0
    var record_prev_state
    async.series({
        pregetFromDics: cb => {
            // Предзапрос ID из справочников по виртуальным полям
            async.eachSeries(Object.keys(obj), function(key, cb) {
                var colProfile = _t.class_fields_profile[key]
                if (typeof colProfile !== 'object') {
                    // if (['doNotCheckList'].indexOf(key) === -1)
                    console.log('Не удалось получить профайл колонки...', key)
                    delete obj[key]
                    return cb(null)
                } // Просто игнорируем поля для которых нет профайла
                var colValue = obj[key]
                if (typeof obj[colProfile.keyword] === 'undefined' && typeof colValue !== 'undefined' && colProfile.is_virtual && colProfile.from_table && colProfile.keyword && colProfile.return_column) {
                    // Загрузим значение для статуса colValue
                    var o = {
                        command: 'get',
                        object: colProfile.from_table,
                        params: {
                            collapseData: false,
                            columns: ['id'],
                            where: [
                                {
                                    key: colProfile.return_column,
                                    val1: colValue
                                }
                            ]
                        }
                    }
                    _t.api(o, function(err, res) {
                        if (err) {
                            console.error('Не удалось загрузить значение из справочнка', o, err)
                            delete obj[key]
                            return cb(null)
                        }
                        if (!res.length) {
                            console.error('В системе нет такого значения в связанной таблице', o)
                            return cb(null)
                        }
                        obj[colProfile.keyword] = res[0].id
                        cb(null)
                    })
                } else cb(null)
            }, cb)
        },
        Join_table_keyword: cb => {
            return cb(null) // Устарело
            // Получить join_table_keyword
            if (_t.name === 'Join_table_keyword' || _t.name === 'User') return cb(null)
            var o = {
                command: 'get',
                object: 'join_table_keyword',
                params: {
                    doNotCheckList: true,
                    collapseData: false
                }
            }
            _t.api(o, function(err, res) {
                if (err) return cb(new MyError('Не удалось получить join_table_keyword', {o: o, err: err}))
                _t.join_table_keyword_obj = {}
                for (var i in res) {
                    _t.join_table_keyword_obj[res[i].alias] = res[i]
                }
                cb(null)
            })
        },
        setDeep: cb => {
            // Проставим глубину если нужно / Pull the depth if necessary
            delete obj.node_deep
            if (!_t.class_profile.hierarchical_table || !_t.class_profile.main_parent_key) return cb(null)
            // надо проверить, был ли передан parent_id и если был, то получить его deep / It is necessary to check whether parent_id has been passed and if there was, then get it deep

            var parent_value = +obj[_t.class_profile.main_parent_key]

            if (typeof parent_value === 'undefined') return cb(null) // Родитель не указан, node_deep будет по умолчанию - 0 / Parent is not specified, node_deep will default to 0

            var child_ids
            // Надо проверить, что запись может ссылаться на данного родителя
            async.series({
                getChilds: function(cb) {
                    if (modifyNodeDeep) return cb(null) // parent_id не менялся и проверки не требуются / parent_id has not changed and no checks are required
                    _t.getChildIds({id: id}, function(err, res) {
                        child_ids = res.ids
                        return cb(null)
                    })
                },
                check: function(cb) {
                    if (modifyNodeDeep) return cb(null) // parent_id не менялся и проверки не требуются / parent_id has not changed and no checks are required
                    if (+parent_value === +id) return cb(new UserError('Запись не может ссылаться сама на себя.')) // The record can not refer to itself
                    if (child_ids.indexOf(parent_value) !== -1) return cb(new UserError('Запись не может ссылаться на одного из своих детей')) // A record can not reference one of its children
                    cb(null)
                },
                setNodeDeep: function(cb) {
                    if (_t.class_profile.do_not_set_deep) return cb(null)
                    // Если родитель указан как null, то node_deep надо выставить в 0. Этот кейс возможен при изменении, а не добавлении, но пусть код будет одинаков.
                    // If the parent is specified as null, then node_deep must be set to 0. This case is possible when changing, not adding, but let the code be the same.
                    if (!parent_value) {
                        obj.node_deep = 0
                        return cb(null)
                    }
                    // Если родитель указан, то возьмем его глубину посчитав родителей / If the parent is specified, then take its depth counting the parents
                    _t.getParentIds({id: parent_value}, function(err, res) {
                        if (err) return cb(new MyError('Не удалось получить getParentIds'))
                        obj.node_deep = +res.ids.length + 1
                        cb(null)
                    })
                    // _t.getById({id:parent_value, columns:['id','node_deep']}, function (err, res) {
                    //     if (err) return cb(new MyError('Не удалось получить node_deep.',{id:id,err:err}));
                    //     obj.node_deep = +res[0].node_deep + 1;
                    //     cb(null);
                    // });
                }
            }, function(err, res) {
                cb(err)
            })
        },
        modify_in_ext_tbl: cb => {
            // для полей которые меняют другие таблицы (modify_in_ext_tbl)
            // Будем делать предзапрос строки, чтобы получить поле с id от другой таблицы (_rowId)
            async.eachSeries(Object.keys(obj), function(key, cb) {
                var colProfile = _t.class_fields_profile[key]
                if (typeof colProfile !== 'object') {
                    console.log('Не удалось получить профайл колонки...', key)
                    delete obj[key]
                    return cb(null)
                } // Просто игнорируем поля для которых нет профайла
                var colValue = obj[key]
                if (!colProfile.modify_in_ext_tbl || !colProfile.from_table || !colProfile.return_column) return cb(null)
                delete obj[key]
                // Получить запись
                // Добавить в объект модифая
                // var rowIdKey = key + '_rowId';
                var rowIdKey = colProfile.modify_in_ext_tbl_key || key + '_rowId'

                var excludedColumns = ['created', 'updated', 'deleted', 'published', 'created_by_user_id', 'created_by_user',
                    'deleted_by_user_id', 'deleted_by_user', 'remove_comment', 'self_company_id', 'self_company', 'ext_company_id', 'ext_company']
                var columns = []
                for (var i in _t.columns) {
                    if (columns.indexOf(_t.columns[i]) !== -1) continue
                    if (excludedColumns.indexOf(_t.columns[i]) === -1) columns.push(_t.columns[i])
                }
                _t.getById({id: id, columns: columns}, function(err, res) {
                    if (err) return cb(new MyError('Не удалось получить запись.modify_in_ext_tbl', {id: id, err: err}))
                    var row = res[0]
                    if (row[rowIdKey] === undefined) {
                        return cb(new MyError('Нельзя изменить поле во внешней таблице, если не создано (или НЕ queryable) поле из modify_in_ext_tbl_key или с такимже названием но с постфиком _rowId. ' +
                            'Оно должно соединяться с внешней таблицй также как и основное поле, но с "return_column": "id".',
                            {key: key, rowIdKey: rowIdKey, colProfile: colProfile, colValue: colValue}))
                    }
                    async.series({
                        addValueRow: function(cb) {
                            if (row[rowIdKey]) return cb(null)
                            // Надо добавить записи (example - measurement_value)
                            var fields_obj = {}
                            // fields_obj[rowIdKey] = {};
                            // fields_obj[rowIdKey][_t.class_profile.name + '_' + _t.class_profile.primary_key] = id;
                            var counter = 100
                            var addUnexistRows = function(field_name, cb) {
                                var _colProfile = _t.class_fields_profile[field_name]
                                fields_obj[field_name] = {}
                                var keyword_arr = (_colProfile.keyword.indexOf('[') !== -1) ? (function() {
                                    var keyword_parsed
                                    try {
                                        keyword_parsed = JSON.parse(_colProfile.keyword)
                                    } catch (e) {
                                        return cb(MyError('Не валидный JSON в поле keyword', {_colProfile: _colProfile}))
                                    }
                                    if (typeof keyword_parsed !== 'object') return cb(MyError('Поле keyword не является объектом/массивом', {_colProfile: _colProfile}))
                                    return keyword_parsed
                                })() : [_colProfile.keyword]

                                // var keyword_arr_splited = [];
                                async.eachSeries(keyword_arr, function(item, cb) {
                                    var keywords = item.split(':')
                                    var keyword = keywords[0]
                                    var ext_keyword = keywords[1] || 'id'
                                    if (keyword.indexOf('|') !== -1) {
                                        var keyword_alias = keyword.replace(/\|/ig, '')
                                        if (!_t.join_table_keyword_obj[keyword_alias]) {
                                            return cb(new MyError('Для поля указан keyword с подстановкой, однако в таблице join_table_keyword значение отсутствует.', {
                                                colProfile: colProfile,
                                                keyword_alias: keyword_alias
                                            }))
                                        }
                                        keyword = _t.join_table_keyword_obj[keyword_alias].linked_id
                                    }

                                    if (ext_keyword.indexOf('|') !== -1) {
                                        var ext_keyword_alias = ext_keyword.replace(/\|/ig, '')
                                        if (!_t.join_table_keyword_obj[ext_keyword_alias]) {
                                            return cb(new MyError('Для поля указан keyword с подстановкой, однако в таблице join_table_keyword значение отсутствует.', {
                                                colProfile: colProfile,
                                                ext_keyword_alias: ext_keyword_alias
                                            }))
                                        }
                                        ext_keyword = _t.join_table_keyword_obj[ext_keyword_alias].linked_id
                                    }

                                    // Найдем значение для keyword и для ext_keyword
                                    if (!isNaN(+keyword)) {
                                        fields_obj[field_name][ext_keyword] = +keyword
                                        return cb(null)
                                    }
                                    if (!isNaN(+ext_keyword)) {
                                        fields_obj[field_name][keyword] = +ext_keyword
                                        return cb(null)
                                    }

                                    if (ext_keyword === 'id') {
                                        return cb(new MyError('При проектировании я не смог представить себе такой ситуации. Сиди и разбирайся)'))
                                    } else if (ext_keyword !== 'id' && keyword !== 'id') {
                                        return cb(new MyError('ХЗ когда такое возможно. Если появится такой тип соединения таблиц, то здесь надо дописать логику.'))
                                    }

                                    // if (ext_keyword === _t.class_profile.name + '_' + _t.class_profile.primary_key){
                                    if (ext_keyword === _t.tableName + '_' + _t.class_profile.primary_key) {
                                        fields_obj[field_name][ext_keyword] = id
                                        return cb(null)
                                    }
                                    // Ищем для второго значение, если его нет, то вызываем ту же функцию для этого поля
                                    var finded_column_name
                                    if (!_colProfile.join_table) {
                                        if (!_t.class_fields_profile[ext_keyword]) {
                                            return cb(new MyError('По идее такого не должно быть. Сиди и разбирайся в своей логике'))
                                        }
                                        fields_obj[field_name][ext_keyword] = row[_t.class_fields_profile[ext_keyword].column_name]
                                        finded_column_name = _t.class_fields_profile[ext_keyword].column_name
                                    } else {
                                        for (var i in _t.class_fields_profile) {
                                            var clFP = _t.class_fields_profile[i]
                                            if (clFP.from_table === _colProfile.join_table
                                                && clFP.return_column === keyword
                                                && clFP.table_alias === _colProfile.join_table_by_alias) {
                                                fields_obj[field_name][ext_keyword] = row[clFP.column_name]
                                                finded_column_name = clFP.column_name
                                                break
                                            }
                                        }
                                    }
                                    if (!finded_column_name) {
                                        return cb(new MyError('Что то пошло не так, не удается найти колонку связи'))
                                    }
                                    if (!fields_obj[field_name][ext_keyword]) {
                                        // Надо вызвать туже функцию, но уже для данного поля
                                        addUnexistRows(finded_column_name, function(err, res) {
                                            if (err) return cb(err)
                                            fields_obj[field_name][ext_keyword] = res.id
                                            cb(null)
                                        })
                                        return
                                    }
                                }, function(err) {
                                    if (err) return cb(err)
                                    //Все поля для добавления есть, надо добавить запись
                                    // var class_to_add = _colProfile.from_table;
                                    var o = {
                                        command: 'add',
                                        object: _colProfile.from_table,
                                        params: {
                                            rollback_key: rollback_key
                                        }
                                    }
                                    for (var i in fields_obj[field_name]) {
                                        o.params[i] = fields_obj[field_name][i]
                                    }
                                    console.log('ADD', o)
                                    _t.api(o, function(err, res) {
                                        if (err) return cb(new MyError('Не удалось добавить запись в связанную таблицу', {
                                            o: o,
                                            err: err
                                        }))

                                        cb(null, res)
                                    })

                                })


                            }

                            addUnexistRows(rowIdKey, function(err, res) {
                                if (err) return cb(err)
                                row[rowIdKey] = res.id
                                cb(null)
                            })

                        },
                        modify: function(cb) {
                            var modify_obj = {
                                command: 'modify',
                                object: colProfile.from_table,
                                params: {
                                    id: row[rowIdKey],
                                    rollback_key: rollback_key
                                }
                            }
                            modify_obj.params[colProfile.return_column] = colValue
                            modify_in_ext_tbl_arr.push(modify_obj)
                            cb(null)
                        }
                    }, cb)

                })

            }, cb)
        },
        prepareFieldsAndValidate: cb => {
            // Удалим не модифицируемые поля
            var removed_fields = []
            for (var i in obj) {
                var colProfile = _t.class_fields_profile[i]
                if (typeof colProfile !== 'object') {
                    console.log('Не удалось получить профайл колонки...', i)
                    removed_fields.push[i]
                    delete obj[i]
                    continue
                } // Просто игнорируем поля для которых нет профайла
                var colValue = obj[i]
                if ((colProfile.is_virtual && !colProfile.from_table && fromClient) || (!colProfile.server_editable && !colProfile.server_updatable && fromClient && colProfile.column_name !== 'id')) {
                    delete obj[i]
                }
            }
            delete obj['created']
            // if (Object.keys(obj).length < 2 && !modify_in_ext_tbl_arr.length) return cb(new UserError('Поля, которые вы пытаетесь изменить не редактируемы.'));
            if (Object.keys(obj).length < 2 && !modify_in_ext_tbl_arr.length) {
                return cb(new UserError('The fields you are trying to change are not editable.', {
                    removed_fields: removed_fields,
                    obj: obj
                }))
            }
            var requredNotFound = []
            for (var j in _t.required_fields) {
                var colName = _t.required_fields[j]
                var colProfile2 = _t.class_fields_profile[colName]
                if (colProfile2.is_virtual) continue // Я игнорирую requred для виртуальных полей
                if (typeof obj[colName] === '') requredNotFound.push({column_name: colName, name: colProfile2.name})
            }
            if (requredNotFound.length) {
                return cb(new UserError('requiredErr', {data: requredNotFound}))
            }
            obj = _t.setFormatingFunc(obj)
            _t.beforeFunction['modify'](obj, function(err) {
                if (err) return cb(new MyError('Ошибка выполнения beforeFunction'))
                var valid = _t.validate(obj)
                if (typeof valid == 'object') {
                    return cb(new UserError('invalid', {msg: valid.message, fields: valid.fields}))
                }
                return cb(null)
            })
        },
        checkUnique: cb => {
            if (obj.checkUnique === false) return cb(null)
            _t.checkUnique(obj, cb)
        },
        getForHistory: cb => {
            if (!_t.history_fields || saveHistory === false) return cb(null)

            var params = {
                id,
                columns: _t.history_fields,
                doNotCheckList: true,
                use_cache: false,
                skipCheckRoleModel: true
            }
            _t.getById(params, function(err, res) {
                if (err) {
                    return cb(new MyError('Не удалось получить первоначальные данные для сохранения истории.', {
                        id: id,
                        oper: 'modify',
                        err: err
                    }))
                }
                record_prev_state = res[0]
                cb(null)
            })
        },
        addRollback: cb => {
            if (!rollback_key || obj.deleted === null || doNotSaveRollback) return cb(null)
            var o = {
                type: 'modify',
                params: {
                    object: _t.name,
                    id: obj.id,
                    user: _t.user
                },
                obj: obj
            }
            rollback.add(rollback_key, o, function(err, index) {
                if (err) return cb(err)
                rollback_index = index
                return cb(null)
            })
        },
        doModifies: cb => {
            // Выполним запрос(ы)

            async.series({
                modifyInExtTables: function(cb) {
                    async.eachSeries(modify_in_ext_tbl_arr, function(item, cb) {
                        _t.api(item, function(err, res) {
                            if (err) return cb(err)
                            affected_counter++
                            cb(null)
                        })
                    }, cb)
                },
                modifyThis: function(cb) {
                    async.waterfall([
                        pool.getConn,
                        function(conn, cb) {
                            obj.updated = funcs.getDateTimeMySQL()
                            //console.log(obj);
                            conn.update(_t.tableName, obj, function(err, affected) {
                                conn.release()
                                if (err) {
                                    console.log(err)
                                } else {
                                    affected_counter++
                                }
                                return cb(err)
                            })
                        }
                    ], cb)
                },
                modifyChildsDeep: function(cb) {
                    // если передан modifyNodeDeep, то значит эта функция уже вызвана для детей, и еще раз вызывать ее для детей не нужно
                    if (_t.class_profile.do_not_set_deep || typeof obj.node_deep === 'undefined' || modifyNodeDeep) return cb(null)
                    var child_ids
                    var childs
                    async.series({
                        getChildIds: function(cb) {
                            _t.getChildIds({id: id}, function(err, res) {
                                child_ids = res.ids
                                return cb(null)
                            })
                        },
                        getChilds: function(cb) {
                            if (!child_ids || !child_ids.length) return cb(null)

                            var params = {
                                where: [
                                    {
                                        key: 'id',
                                        type: 'in',
                                        val1: child_ids
                                    }
                                ],
                                limit: 10000000000,
                                collapseData: false
                            }
                            _t.get(params, function(err, res) {
                                if (err) return cb(new MyError('Не удалось получить по child_ids', {
                                    params: params,
                                    err: err
                                })) // Could not get
                                childs = res
                                cb(null)
                            })
                        },
                        callModifyDeep: function(cb) {
                            if (!childs) return cb(null)
                            var counter = 0
                            var counted_all = Object.keys(childs).length
                            // async.eachSeries(childs, function(one_child, cb){
                            //     var params = {
                            //         id:one_child.id,
                            //         modifyNodeDeep:true,
                            //         rollback_key:rollback_key
                            //     };
                            //     // Укажем parent_id чтобы механизм мог рассыитать новую глубину / Specify the parent_id so that the mechanism can propagate a new depth
                            //     params[_t.class_profile.main_parent_key] = one_child[_t.class_profile.main_parent_key];
                            //     counter++;
                            //     console.log('Всего:', counted_all, 'В работе:', counter);
                            //     _t.modify(params, cb);
                            //
                            // }, cb);

                            funcs.splitByPortion({
                                data: childs,
                                // inPortion:1000,
                                maxProcess: +(config.get('maxProcess') || 1)
                            }, function(items, cb) {
                                async.eachSeries(items, function(one_child, cb) {
                                    var params = {
                                        id: one_child.id,
                                        modifyNodeDeep: true,
                                        rollback_key: rollback_key
                                    }
                                    // Укажем parent_id чтобы механизм мог рассыитать новую глубину / Specify the parent_id so that the mechanism can propagate a new depth
                                    params[_t.class_profile.main_parent_key] = one_child[_t.class_profile.main_parent_key]
                                    counter++
                                    console.log('Всего:', counted_all, 'В работе:', counter)
                                    _t.modify(params, cb)

                                }, cb)

                            }, cb)
                        }
                    }, cb)
                }
            }, function(err, res) {
                if (err) return cb(err)
                cb(null)
            })
        },
        addHistory: cb => {
            if (!_t.history_fields || saveHistory === false || !record_prev_state) return cb(null)
            var record_new_state
            var changes = {}
            async.series({
                getNew: cb => {


                    var params = {
                        id,
                        columns: _t.history_fields,
                        doNotCheckList: true,
                        use_cache: false,
                        skipCheckRoleModel: true
                    }
                    _t.getById(params, function(err, res) {
                        if (err) {
                            return cb(new MyError('Не удалось получить новые данные для сохранения истории.', {
                                id: id,
                                oper: 'modify',
                                err: err
                            }))
                        }
                        record_new_state = res[0]
                        cb(null)
                    })
                },
                merge: cb => {
                    Object.keys(record_prev_state).forEach(key => {
                        if (record_prev_state[key] !== record_new_state[key]) changes[key] = record_new_state[key]
                    })
                    cb(null)
                },
                addHist: cb => {
                    // return cb(null);
                    if (!Object.keys(changes).length || !_t.user.authorized) return cb(null)

                    var hash = funcs.guid12()
                    async.eachSeries(Object.keys(changes), function(key, cb) {
                        var o = {
                            command: 'add',
                            object: `_${_t.tableName}_history`,
                            params: {
                                class_id: _t.class_profile.id,
                                class_field_id: _t.class_fields_profile[key].id,
                                record_id: id,
                                operation_type: 'MODIFY',
                                value: changes[key],
                                hash: hash,
                                rollback_key: rollback_key
                            }
                        }
                        _t.api(o, (err, res) => {
                            if (err) {
                                if (err.code === 2005) return cb(new MyError(`Не удалось добавить запись истории. Проверьте существование класса "_${_t.tableName}_history"`, {
                                    o: o,
                                    err: err
                                }))
                                return cb(new MyError('Не удалось добавить запись истории', {o: o, err: err}))
                            }

                            cb(null)
                        })
                    }, cb)
                }
            }, cb)
        },
        syncDynamicFieldPairs: cb => {
            // Если есть dynamic_field_pair, то для каждой выполним добавление
            // If there is a dynamic_field_pair, then for each we add

            if (!_t.dynamic_field_pair.length || obj.deleted) return cb(null)

            async.eachSeries(_t.dynamic_field_pair, function(one_pair, cb) {
                var o = {
                    command: 'sync',
                    object: 'dynamic_field_pair',
                    params: {
                        source_id: id,
                        id: one_pair.id
                    }
                }
                _t.api(o, function(err, res) {
                    if (err) return cb(new MyError('Не удалось синхронизировать измененное поле с парой динамических полей', {
                        o: o,
                        one_pair: one_pair,
                        err: err
                    })) // Could not sync added field with a pair of dynamic fields
                    cb(null)
                })
            }, cb)
        }
    }, (err) => {
        if (err) {
            if (err instanceof UserError) return cb(err)
            rollback.remove(rollback_key, rollback_index)
            return cb(new MyError('Не удалось изменить ' + _t.table_ru, {id: obj.id, err: err}))
        }
        if (affected_counter == 0) {
            return cb(new UserError('notModified', {id: obj.id, name: _t.name, obj: obj}))
        }
        if (!doNotClearCache) {
            var params = {
                doNotClearCacheAdditionalTables: modifyNodeDeep
            }
            _t.clearCache(params, null)
        }
        // return cb(null, new UserOk(_t.table_ru + ' successfully modified' + _t.ending + '.', {id: obj.id}));
        var msg = noToastr ? 'noToastr' : _t.table_ru + ` успешно изменен${_t.ending}.`
        return cb(null, new UserOk(msg, {id: obj.id}))
    })
    // async.waterfall([
    //     function (cb) {
    //         // Предзапрос ID из справочников по виртуальным полям
    //         async.eachSeries(Object.keys(obj), function (key, cb) {
    //             var colProfile = _t.class_fields_profile[key];
    //             if (typeof colProfile !== 'object') {
    //                 // if (['doNotCheckList'].indexOf(key) === -1)
    //                 console.log('Не удалось получить профайл колонки...', key);
    //                 delete obj[key];
    //                 return cb(null);
    //             } // Просто игнорируем поля для которых нет профайла
    //             var colValue = obj[key];
    //             if (typeof obj[colProfile.keyword] === 'undefined' && typeof colValue !== 'undefined' && colProfile.is_virtual && colProfile.from_table && colProfile.keyword && colProfile.return_column) {
    //                 // Загрузим значение для статуса colValue
    //                 var o = {
    //                     command: 'get',
    //                     object: colProfile.from_table,
    //                     params: {
    //                         collapseData: false,
    //                         columns: ['id'],
    //                         where: [
    //                             {
    //                                 key: colProfile.return_column,
    //                                 val1: colValue
    //                             }
    //                         ]
    //                     }
    //                 };
    //                 _t.api(o, function (err, res) {
    //                     if (err) {
    //                         console.log('Не удалось загрузить значение из справочнка', o, err);
    //                         delete obj[key];
    //                         return cb(null);
    //                     }
    //                     if (!res.length) {
    //                         console.log('В системе нет такого значения в связанной таблице', o);
    //                         return cb(null);
    //                     }
    //                     obj[colProfile.keyword] = res[0].id;
    //                     cb(null);
    //                 })
    //             } else cb(null);
    //         }, cb);
    //     },
    //     function(cb){
    //         // Получить join_table_keyword
    //         if (_t.name === 'Join_table_keyword' || _t.name === 'User') return cb(null);
    //         var o = {
    //             command:'get',
    //             object:'join_table_keyword',
    //             params:{
    //                 doNotCheckList:true,
    //                 collapseData:false
    //             }
    //         };
    //         _t.api(o, function (err, res) {
    //             if (err) return cb(new MyError('Не удалось получить join_table_keyword',{o : o, err : err}));
    //             _t.join_table_keyword_obj = {};
    //             for (var i in res) {
    //                 _t.join_table_keyword_obj[res[i].alias] = res[i];
    //             }
    //             cb(null);
    //         });
    //     },
    //     function(cb){
    //         // Проставим глубину если нужно / Pull the depth if necessary
    //         delete obj.node_deep;
    //         if (!_t.class_profile.hierarchical_table || !_t.class_profile.main_parent_key) return cb(null);
    //         // надо проверить, был ли передан parent_id и если был, то получить его deep / It is necessary to check whether parent_id has been passed and if there was, then get it deep
    //
    //         var parent_value = +obj[_t.class_profile.main_parent_key];
    //
    //         if (typeof parent_value === 'undefined') return cb(null); // Родитель не указан, node_deep будет по умолчанию - 0 / Parent is not specified, node_deep will default to 0
    //
    //         var child_ids;
    //         // Надо проверить, что запись может ссылаться на данного родителя
    //         async.series({
    //             getChilds:function(cb){
    //                 if (modifyNodeDeep) return cb(null); // parent_id не менялся и проверки не требуются / parent_id has not changed and no checks are required
    //                 _t.getChildIds({id:id}, function(err, res){
    //                     child_ids = res.ids;
    //                     return cb(null);
    //                 });
    //             },
    //             check:function(cb){
    //                 if (modifyNodeDeep) return cb(null); // parent_id не менялся и проверки не требуются / parent_id has not changed and no checks are required
    //                 if (+parent_value === +id) return cb(new UserError('Запись не может ссылаться сама на себя.')); // The record can not refer to itself
    //                 if (child_ids.indexOf(parent_value) !== -1) return cb(new UserError('Запись не может ссылаться на одного из своих детей')); // A record can not reference one of its children
    //                 cb(null);
    //             },
    //             setNodeDeep:function(cb){
    //                 if (_t.class_profile.do_not_set_deep) return cb(null);
    //                 // Если родитель указан как null, то node_deep надо выставить в 0. Этот кейс возможен при изменении, а не добавлении, но пусть код будет одинаков.
    //                 // If the parent is specified as null, then node_deep must be set to 0. This case is possible when changing, not adding, but let the code be the same.
    //                 if (!parent_value) {
    //                     obj.node_deep = 0;
    //                     return cb(null);
    //                 }
    //                 // Если родитель указан, то возьмем его глубину посчитав родителей / If the parent is specified, then take its depth counting the parents
    //                 _t.getParentIds({id:parent_value}, function(err, res){
    //                     if (err) return cb(new MyError('Не удалось получить getParentIds'));
    //                     obj.node_deep = +res.ids.length + 1;
    //                     cb(null);
    //                 });
    //                 // _t.getById({id:parent_value, columns:['id','node_deep']}, function (err, res) {
    //                 //     if (err) return cb(new MyError('Не удалось получить node_deep.',{id:id,err:err}));
    //                 //     obj.node_deep = +res[0].node_deep + 1;
    //                 //     cb(null);
    //                 // });
    //             }
    //         }, function(err, res){
    //             cb(err);
    //         });
    //
    //
    //
    //
    //     },
    //     function(cb){
    //         // для полей которые меняют другие таблицы (modify_in_ext_tbl)
    //         // Будем делать предзапрос строки, чтобы получить поле с id от другой таблицы (_rowId)
    //         async.eachSeries(Object.keys(obj), function(key, cb){
    //             var colProfile = _t.class_fields_profile[key];
    //             if (typeof colProfile !== 'object') {
    //                 console.log('Не удалось получить профайл колонки...', key);
    //                 delete obj[key];
    //                 return cb(null);
    //             } // Просто игнорируем поля для которых нет профайла
    //             var colValue = obj[key];
    //             if (!colProfile.modify_in_ext_tbl || !colProfile.from_table || !colProfile.return_column) return cb(null);
    //             delete obj[key];
    //             // Получить запись
    //             // Добавить в объект модифая
    //             // var rowIdKey = key + '_rowId';
    //             var rowIdKey = colProfile.modify_in_ext_tbl_key || key + '_rowId';
    //
    //             var excludedColumns = ['created','updated','deleted','published','created_by_user_id','created_by_user',
    //                 'deleted_by_user_id','deleted_by_user','remove_comment','self_company_id','self_company','ext_company_id','ext_company'];
    //             var columns = [];
    //             for (var i in _t.columns) {
    //                 if (columns.indexOf(_t.columns[i]) !== -1) continue;
    //                 if (excludedColumns.indexOf(_t.columns[i]) === -1) columns.push(_t.columns[i]);
    //             }
    //             _t.getById({id: id, columns:columns}, function (err, res) {
    //                 if (err) return cb(new MyError('Не удалось получить запись.modify_in_ext_tbl',{id:id,err:err}));
    //                 var row = res[0];
    //                 if (row[rowIdKey] === undefined) {
    //                     return cb(new MyError('Нельзя изменить поле во внешней таблице, если не создано (или НЕ queryable) поле из modify_in_ext_tbl_key или с такимже названием но с постфиком _rowId. ' +
    //                         'Оно должно соединяться с внешней таблицй также как и основное поле, но с "return_column": "id".',
    //                         {key: key, rowIdKey:rowIdKey, colProfile: colProfile, colValue: colValue}));
    //                 }
    //                 async.series({
    //                     addValueRow:function(cb){
    //                         if(row[rowIdKey]) return cb(null);
    //                         // Надо добавить записи (example - measurement_value)
    //                         var fields_obj = {};
    //                         // fields_obj[rowIdKey] = {};
    //                         // fields_obj[rowIdKey][_t.class_profile.name + '_' + _t.class_profile.primary_key] = id;
    //                         var counter = 100;
    //                         var addUnexistRows = function(field_name, cb){
    //                             var _colProfile = _t.class_fields_profile[field_name];
    //                             fields_obj[field_name] = {};
    //                             var keyword_arr = (_colProfile.keyword.indexOf('[') !== -1)? (function(){
    //                                 var keyword_parsed;
    //                                 try {
    //                                     keyword_parsed = JSON.parse(_colProfile.keyword);
    //                                 }
    //                                 catch (e){
    //                                     return cb(MyError('Не валидный JSON в поле keyword', {_colProfile:_colProfile}));
    //                                 }
    //                                 if (typeof keyword_parsed !== 'object') return cb(MyError('Поле keyword не является объектом/массивом', {_colProfile:_colProfile}));
    //                                 return keyword_parsed;
    //                             })() : [_colProfile.keyword];
    //
    //                             // var keyword_arr_splited = [];
    //                             async.eachSeries(keyword_arr, function(item, cb){
    //                                 var keywords = item.split(':');
    //                                 var keyword = keywords[0];
    //                                 var ext_keyword = keywords[1] || 'id';
    //                                 if (keyword.indexOf('|') !== -1){
    //                                     var keyword_alias = keyword.replace(/\|/ig,'');
    //                                     if (!_t.join_table_keyword_obj[keyword_alias]) {
    //                                         return cb(new MyError('Для поля указан keyword с подстановкой, однако в таблице join_table_keyword значение отсутствует.',{colProfile:colProfile,keyword_alias:keyword_alias}));
    //                                     }
    //                                     keyword = _t.join_table_keyword_obj[keyword_alias].linked_id;
    //                                 }
    //
    //                                 if (ext_keyword.indexOf('|') !== -1){
    //                                     var ext_keyword_alias = ext_keyword.replace(/\|/ig,'');
    //                                     if (!_t.join_table_keyword_obj[ext_keyword_alias]) {
    //                                         return cb(new MyError('Для поля указан keyword с подстановкой, однако в таблице join_table_keyword значение отсутствует.',{colProfile:colProfile,ext_keyword_alias:ext_keyword_alias}));
    //                                     }
    //                                     ext_keyword = _t.join_table_keyword_obj[ext_keyword_alias].linked_id;
    //                                 }
    //
    //                                 // Найдем значение для keyword и для ext_keyword
    //                                 if (!isNaN(+keyword)) {
    //                                     fields_obj[field_name][ext_keyword] = +keyword;
    //                                     return cb(null);
    //                                 }
    //                                 if (!isNaN(+ext_keyword)) {
    //                                     fields_obj[field_name][keyword] = +ext_keyword;
    //                                     return cb(null);
    //                                 }
    //
    //                                 if (ext_keyword === 'id'){
    //                                     return cb(new MyError('При проектировании я не смог представить себе такой ситуации. Сиди и разбирайся)'));
    //                                 } else if (ext_keyword !== 'id' && keyword !== 'id'){
    //                                     return cb(new MyError('ХЗ когда такое возможно. Если появится такой тип соединения таблиц, то здесь надо дописать логику.'));
    //                                 }
    //
    //                                 // if (ext_keyword === _t.class_profile.name + '_' + _t.class_profile.primary_key){
    //                                 if (ext_keyword === _t.tableName + '_' + _t.class_profile.primary_key){
    //                                     fields_obj[field_name][ext_keyword] = id;
    //                                     return cb(null);
    //                                 }
    //                                 // Ищем для второго значение, если его нет, то вызываем ту же функцию для этого поля
    //                                 var finded_column_name;
    //                                 if (!_colProfile.join_table){
    //                                     if (!_t.class_fields_profile[ext_keyword]) {
    //                                         debugger;
    //                                         return cb(new MyError('По идее такого не должно быть. Сиди и разбирайся в своей логике'));
    //                                     }
    //                                     fields_obj[field_name][ext_keyword] = row[_t.class_fields_profile[ext_keyword].column_name];
    //                                     finded_column_name = _t.class_fields_profile[ext_keyword].column_name;
    //                                 }else{
    //                                     for (var i in _t.class_fields_profile) {
    //                                         var clFP = _t.class_fields_profile[i];
    //                                         if (clFP.from_table === _colProfile.join_table
    //                                             && clFP.return_column === keyword
    //                                             && clFP.table_alias === _colProfile.join_table_by_alias)
    //                                         {
    //                                             fields_obj[field_name][ext_keyword] = row[clFP.column_name];
    //                                             finded_column_name = clFP.column_name;
    //                                             break;
    //                                         }
    //                                     }
    //                                 }
    //                                 if (!finded_column_name){
    //                                     debugger;
    //                                     return cb(new MyError('Что то пошло не так, не удается найти колонку связи'));
    //                                 }
    //                                 if (!fields_obj[field_name][ext_keyword]){
    //                                     // Надо вызвать туже функцию, но уже для данного поля
    //                                     addUnexistRows(finded_column_name, function(err, res){
    //                                         if (err) return cb(err);
    //                                         fields_obj[field_name][ext_keyword] = res.id;
    //                                         cb(null);
    //                                     });
    //                                     return;
    //                                 }
    //                             }, function(err){
    //                                 if (err) return cb(err);
    //                                 //Все поля для добавления есть, надо добавить запись
    //                                 // var class_to_add = _colProfile.from_table;
    //                                 var o = {
    //                                     command:'add',
    //                                     object:_colProfile.from_table,
    //                                     params:{
    //                                         rollback_key:rollback_key
    //                                     }
    //                                 };
    //                                 for (var i in fields_obj[field_name]) {
    //                                     o.params[i] = fields_obj[field_name][i];
    //                                 }
    //                                 console.log('ADD', o);
    //                                 _t.api(o, function (err, res) {
    //                                     if (err) return cb(new MyError('Не удалось добавить запись в связанную таблицу',{o : o, err : err}));
    //
    //                                     cb(null, res);
    //                                 });
    //
    //                             });
    //
    //
    //
    //
    //
    //                         }
    //
    //                         addUnexistRows(rowIdKey, function(err, res){
    //                             if (err) return cb(err);
    //                             row[rowIdKey] = res.id;
    //                             cb(null);
    //                         });
    //
    //                     },
    //                     modify:function(cb){
    //                         var modify_obj = {
    //                             command:'modify',
    //                             object:colProfile.from_table,
    //                             params:{
    //                                 id:row[rowIdKey],
    //                                 rollback_key:rollback_key
    //                             }
    //                         };
    //                         modify_obj.params[colProfile.return_column] = colValue;
    //                         modify_in_ext_tbl_arr.push(modify_obj);
    //                         cb(null);
    //                     }
    //                 }, cb);
    //
    //             });
    //
    //         }, cb);
    //     },
    //     function (cb) {
    //         // Удалим не модифицируемые поля
    //         for (var i in obj) {
    //             var colProfile = _t.class_fields_profile[i];
    //             if (typeof colProfile !== 'object') {
    //                 console.log('Не удалось получить профайл колонки...', i);
    //                 delete obj[i];
    //                 continue;
    //             } // Просто игнорируем поля для которых нет профайла
    //             var colValue = obj[i];
    //             if ((colProfile.is_virtual && !colProfile.from_table && fromClient) || (!colProfile.server_editable && !colProfile.server_updatable && fromClient && colProfile.column_name !== 'id')) {
    //                 delete obj[i];
    //             }
    //         }
    //         delete obj['created'];
    //         // if (Object.keys(obj).length < 2 && !modify_in_ext_tbl_arr.length) return cb(new UserError('Поля, которые вы пытаетесь изменить не редактируемы.'));
    //         if (Object.keys(obj).length < 2 && !modify_in_ext_tbl_arr.length) return cb(new UserError('The fields you are trying to change are not editable.'));
    //         var requredNotFound = [];
    //         for (var j in _t.required_fields) {
    //             var colName = _t.required_fields[j];
    //             var colProfile2 = _t.class_fields_profile[colName];
    //             if (colProfile2.is_virtual) continue; // Я игнорирую requred для виртуальных полей
    //             if (typeof obj[colName] === '') requredNotFound.push({column_name: colName, name: colProfile2.name});
    //         }
    //         if (requredNotFound.length) {
    //             return cb(new UserError('requiredErr', {data: requredNotFound}));
    //         }
    //         obj = _t.setFormatingFunc(obj);
    //         _t.beforeFunction['modify'](obj, function (err) {
    //             if (err) return cb(new MyError('Ошибка выполнения beforeFunction'));
    //             var valid = _t.validate(obj);
    //             if (typeof valid == 'object') {
    //                 return cb(new UserError('invalid', {msg: valid.message, fields: valid.fields}));
    //             }
    //             return cb(null);
    //         });
    //     },
    //
    //     function (cb) {
    //         if (obj.checkUnique === false) return cb(null);
    //         _t.checkUnique(obj, function (err) {
    //             if (err) return cb(err);
    //             return cb(null);
    //         });
    //
    //     },
    //     function (cb) {
    //         if (!rollback_key || obj.deleted === null) return cb(null);
    //         var o = {
    //             type: 'modify',
    //             params: {
    //                 object: _t.name,
    //                 id: obj.id,
    //                 user:_t.user
    //             },
    //             obj: obj
    //         };
    //         rollback.add(rollback_key, o, function (err, index) {
    //             if (err) return cb(err);
    //             rollback_index = index;
    //             return cb(null);
    //         })
    //     },
    //     function(cb){
    //         // Выполним запрос(ы)
    //
    //         async.series({
    //             modifyInExtTables:function(cb){
    //                 async.eachSeries(modify_in_ext_tbl_arr, function(item, cb){
    //                     _t.api(item, function(err, res){
    //                         if (err) return cb(err);
    //                         affected_counter++;
    //                         cb(null);
    //                     });
    //                 }, cb);
    //             },
    //             modifyThis:function(cb){
    //                 async.waterfall([
    //                     pool.getConn,
    //                     function (conn, cb) {
    //                         obj.updated = funcs.getDateTimeMySQL();
    //                         //console.log(obj);
    //                         conn.update(_t.tableName, obj, function (err, affected) {
    //                             conn.release();
    //                             if (err) {
    //                                 console.log(err);
    //                             }else{
    //                                 affected_counter++;
    //                             }
    //                             return cb(err);
    //                         })
    //                     }
    //                 ],cb);
    //             },
    //             modifyChildsDeep:function(cb){
    //                 // если передан modifyNodeDeep, то значит эта функция уже вызвана для детей, и еще раз вызывать ее для детей не нужно
    //                 if (_t.class_profile.do_not_set_deep || typeof obj.node_deep === 'undefined' || modifyNodeDeep) return cb(null);
    //                 var child_ids;
    //                 var childs;
    //                 async.series({
    //                     getChildIds:function(cb){
    //                         _t.getChildIds({id:id}, function(err, res){
    //                             child_ids = res.ids;
    //                             return cb(null);
    //                         });
    //                     },
    //                     getChilds:function(cb){
    //                         if (!child_ids || !child_ids.length) return cb(null);
    //
    //                         var params = {
    //                             where:[
    //                                 {
    //                                     key:'id',
    //                                     type:'in',
    //                                     val1:child_ids
    //                                 }
    //                             ],
    //                             limit:10000000000,
    //                             collapseData:false
    //                         };
    //                         _t.get(params, function (err, res) {
    //                             if (err) return cb(new MyError('Не удалось получить по child_ids',{params : params, err : err})); // Could not get
    //                             childs = res;
    //                             cb(null);
    //                         });
    //                     },
    //                     callModifyDeep:function(cb){
    //                         if (!childs) return cb(null);
    //                         var counter = 0;
    //                         var counted_all = Object.keys(childs).length;
    //                         // async.eachSeries(childs, function(one_child, cb){
    //                         //     var params = {
    //                         //         id:one_child.id,
    //                         //         modifyNodeDeep:true,
    //                         //         rollback_key:rollback_key
    //                         //     };
    //                         //     // Укажем parent_id чтобы механизм мог рассыитать новую глубину / Specify the parent_id so that the mechanism can propagate a new depth
    //                         //     params[_t.class_profile.main_parent_key] = one_child[_t.class_profile.main_parent_key];
    //                         //     counter++;
    //                         //     console.log('Всего:', counted_all, 'В работе:', counter);
    //                         //     _t.modify(params, cb);
    //                         //
    //                         // }, cb);
    //
    //                         funcs.splitByPortion({
    //                             data: childs,
    //                             // inPortion:1000,
    //                             maxProcess:+(config.get('maxProcess') || 1)
    //                         }, function (items, cb) {
    //                             async.eachSeries(items, function(one_child, cb){
    //                                 var params = {
    //                                     id:one_child.id,
    //                                     modifyNodeDeep:true,
    //                                     rollback_key:rollback_key
    //                                 };
    //                                 // Укажем parent_id чтобы механизм мог рассыитать новую глубину / Specify the parent_id so that the mechanism can propagate a new depth
    //                                 params[_t.class_profile.main_parent_key] = one_child[_t.class_profile.main_parent_key];
    //                                 counter++;
    //                                 console.log('Всего:', counted_all, 'В работе:', counter);
    //                                 _t.modify(params, cb);
    //
    //                             }, cb);
    //
    //                         }, cb);
    //                     }
    //                 }, cb);
    //             }
    //         }, function(err, res){
    //             if (err) return cb(err);
    //             cb(null);
    //         });
    //     },
    //     function(cb){
    //         // ADD history
    //         dddf
    //         cb(null);
    //     },
    //     function(cb){
    //         // Если есть dynamic_field_pair, то для каждой выполним добавление
    //         // If there is a dynamic_field_pair, then for each we add
    //
    //         if (!_t.dynamic_field_pair.length || obj.deleted) return cb(null);
    //
    //         async.eachSeries(_t.dynamic_field_pair, function(one_pair, cb){
    //             var o = {
    //                 command:'sync',
    //                 object:'dynamic_field_pair',
    //                 params:{
    //                     source_id:id,
    //                     id:one_pair.id
    //                 }
    //             };
    //             _t.api(o, function (err, res) {
    //                 if (err) return cb(new MyError('Не удалось синхронизировать измененное поле с парой динамических полей',{o : o, one_pair:one_pair, err : err})); // Could not sync added field with a pair of dynamic fields
    //                 cb(null);
    //             });
    //         }, cb);
    //     }
    // ], function (err) {
    //     if (err) {
    //         if (err instanceof UserError) return cb(err);
    //         rollback.remove(rollback_key, rollback_index);
    //         return cb(new MyError('Не удалось изменить ' + _t.table_ru, {id: obj.id, err: err}));
    //     }
    //     if (affected_counter == 0) {
    //         return cb(new UserError('notModified', {id: obj.id, name:_t.name, obj:obj}));
    //     }
    //     if (!doNotClearCache){
    //         var params = {
    //             doNotClearCacheAdditionalTables:modifyNodeDeep
    //         };
    //         _t.clearCache(params, null);
    //     }
    //     return cb(null, new UserOk(_t.table_ru + ' successfully modified' + _t.ending + '.', {id: obj.id}));
    // });
}

MySQLModel.prototype.modifyToRemove = function(obj_in, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj_in = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj_in !== 'object') return cb(new MyError('В метод не переданы obj'))
    var obj = funcs.cloneObj(obj_in)
    var _t = this
    var fromClient = obj.fromClient
    delete obj.fromClient
    obj.deleted_by_user_id = _t.user.user_data ? _t.user.user_data.id : null
    if (fromClient) return cb(new MyError('Запрещено с клиента.'))
    obj.saveHistory = false
    var modifyFunc = (typeof _t.modifyPrototype === 'function') ? 'modifyPrototype' : 'modify'
    _t[modifyFunc](obj, cb)
}

MySQLModel.prototype.remove = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this
    //if (fromClient){
    //    var confirm = obj.confirm;
    //    delete obj.confirm;
    //    if (!confirm) return cb(new UserError('needConfirm', {message: 'Эта операция требует подтверждения. Вы уверены, что хотите это сделать?'}));
    //}

    var rollback_key
    if (obj.rollback_key) {
        rollback_key = obj.rollback_key
        delete obj.rollback_key
    }
    var id = obj.id
    if (!obj.id) return cb(new MyError('Не передано ключевое поле. id'))
    //if (global.class_locks[_t.name][id] && obj.lock_key!==global.class_locks[_t.name][id]) return cb(new UserError('Запись заблокирована.',{name:_t.name,id:id}));
    var key = obj.key || obj.lock_key
    if (global.class_locks[_t.name][id]) {
        if (global.class_locks[_t.name][id].key != key) {
            var diff = moment().diff(global.class_locks[_t.name][id].timestart)
            var locktime = obj.locktime || 10000
            if (diff > locktime) {
                return cb(new UserError('Запись уже заблокирована другим процессом. Более 10 сек (remove)', {obj: obj}))
            }
            setTimeout(function() {
                _t.remove(obj, cb)
            }, 500)
            return
        }


        //return cb(new MyError('Запись заблокирована.',{name:_t.name,id:id}));
    }

    var saveHistory = obj.fromClient ? true : obj.saveHistory

    // Найдем зависимые таблицы:
    //  - подчиненные
    //  - таблицы эксплуататоры (для которых эта таблица является справочником)
    // Для каждой ищем есть ли такие данные

    var affected_cnt = 0
    async.waterfall([
        function(cb) {
            _t.beforeFunction['remove'](obj, function(err) {
                if (err) {
                    return cb(new MyError('Ошибка выполнения beforeFunction'))
                }
                return cb(null)
            })
        },
        function(cb) {
            // Если есть dynamic_field_pair, то для каждой выполним удаление
            // If there is a dynamic_field_pair, then for each we remove

            if (!_t.dynamic_field_pair.length) return cb(null)

            async.eachSeries(_t.dynamic_field_pair, function(one_pair, cb) {
                var o = {
                    command: 'get',
                    object: 'dynamic_field',
                    params: {
                        doNotCheckList: true,
                        param_where: {
                            dynamic_field_pair_id: one_pair.id,
                            id_from_source: id
                        },
                        collapseData: false,
                        limit: 1000000,
                    }
                }
                _t.api(o, function(err, res) {
                    if (err) return cb(new MyError('Не удалось получить все поля', {
                        o: o,
                        one_pair: one_pair,
                        err: err
                    })) // Could not get all fields
                    async.eachSeries(res, function(one_field, cb) {
                        // выставить to_remove и синкнуть / expose to_remove and sync
                        var o = {
                            command: 'modify',
                            object: 'dynamic_field',
                            params: {
                                id: one_field.id,
                                to_remove: true,
                                rollback_key: rollback_key
                            }
                        }
                        _t.api(o, function(err, res) {
                            if (err) return cb(new MyError('Не удалось выставить to_remove для dynamic_field', {
                                o: o,
                                err: err
                            })) // Failed to expose to_remove for dynamic_field
                            var o = {
                                command: 'sync',
                                object: 'dynamic_field',
                                params: {
                                    id: one_field.id,
                                    rollback_key: rollback_key
                                }
                            }
                            _t.api(o, function(err, res) {
                                if (err) return cb(new MyError('Не удалось синхронизировать для удаления', {
                                    o: o,
                                    err: err
                                })) // Unable to sync for deletion

                                cb(null)
                            })
                        })
                    }, cb)
                })
            }, cb)
        },
        pool.getConn,
        function(conn, cb) {
            if (obj.physical && !obj.fromClient) {
                conn.delete(_t.tableName, {id: id}, function(err, affected) {
                    conn.release()
                    affected_cnt = affected
                    cb(err)
                })
            } else {
                var row
                async.series([
                    function(cb) {
                        if (typeof obj.name_postfix !== 'string') return cb(null) // К имени удаляемой записи НЕ надо добавить постфикс
                        // получим данные о записи
                        _t.getById({
                            id: id
                        }, function(err, res) {
                            if (err) return cb(err)
                            if (!res.length) return cb(new UserError('Не удалось получить свединия о данной записи'))
                            row = res[0]
                            return cb(null)
                        })
                    },
                    function(cb) {
                        var o = {
                            id: id,
                            deleted: funcs.getDateTimeMySQL(),
                            doNotClearCache: obj.doNotClearCache
                        }
                        if (row && typeof row.name !== 'undefined') o.name = row.name + obj.name_postfix
                        _t.modifyToRemove(o, cb)
                    }
                ], function(err, res) {
                    if (err) return cb(err)
                    affected_cnt = res
                    return cb(null)
                })


            }
        },
        function(cb) {
            if (!_t.history_fields || saveHistory === false) return cb(null)
            async.series({
                addHist: cb => {

                    var hash = funcs.guid12()
                    var o = {
                        command: 'add',
                        object: `_${_t.tableName}_history`,
                        params: {
                            class_id: _t.class_profile.id,
                            record_id: id,
                            operation_type: 'REMOVE',
                            hash: hash,
                            rollback_key: rollback_key
                        }
                    }
                    _t.api(o, (err, res) => {
                        if (err) {
                            if (err.code === 2005) return cb(new MyError(`Не удалось добавить запись истории. Проверьте существование класса "_${_t.tableName}_history"`, {
                                o: o,
                                err: err
                            }))
                            return cb(new MyError('Не удалось добавить запись истории', {o: o, err: err}))
                        }

                        cb(null)
                    })
                }
            }, function(err, res) {
                return cb(err)
            })
        }
    ], function(err) {
        if (err) return cb(new MyError('Не удалось удалить запись.', err))
        if (affected_cnt == 0) return cb(new UserError('rowNotFound'))
        if (!obj.doNotClearCache) {
            _t.clearCache()
        }
        if (rollback_key) {
            var o = {
                type: 'remove',
                params: {
                    object: _t.name,
                    id: id,
                    user: _t.user
                }
            }
            rollback.add(rollback_key, o, function(err, res) {
                if (err) return cb(err)
                return cb(null, new UserOk(_t.table_ru + ` успешно удален${_t.ending}.` + _t.ending + '.', {id: obj.id}))
            })
        } else {
            return cb(null, new UserOk(_t.table_ru + ` успешно удален${_t.ending}.` + _t.ending + '.', {id: obj.id}))
        }
    })
}

MySQLModel.prototype.emitPercentInfo = function(text, options = {}) {
    this.user.socket.emit('percent', {...options, html: text})
}

MySQLModel.prototype.removeCascade = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this
    //if (fromClient){
    //    var confirm = obj.confirm;
    //    delete obj.confirm;
    //    if (!confirm) return cb(new UserError('needConfirm', {message: 'Эта операция требует подтверждения. Вы уверены, что хотите это сделать?'}));
    //}

    var rollback_key = (typeof obj.rollback_key !== 'undefined') ? obj.rollback_key : rollback.create()
    delete obj.rollback_key
    var doNotSaveRollback = obj.doNotSaveRollback
    delete obj.doNotSaveRollback

    const infoOptions = obj.infoOptions || {}


    var id = obj.ids || obj.id
    var confirm = obj.confirm

    _t.emitPercentInfo(`Удаление... Поиск связанных данных...`, infoOptions)


    if (!id) return cb(new MyError('Не передано ключевое поле. id'))

    // Найдем зависимые таблицы:
    //  - подчиненные
    //  - таблицы эксплуататоры (для которых эта таблица является справочником)
    // Для каждой ищем есть ли данные, если есть идем глубже
    //_t.removeCascadeScopes = _t.removeCascadeScopes || {};
    //_t.removeCascadeScopes[rollback_key] = _t.removeCascadeScopes[rollback_key] || {parent_tables:{}};
    var child_tables = {}
    var child_tables_arr = []
    child_tables[_t.name] = {
        name: _t.name.toLowerCase(),
        name_ru: _t.class_profile.name_ru || _t.name,
        nodes: [],
        count: 1,
        parasite_tables: {}
    }
    let errors = obj.errors || []

    async.series([
        function(cb) {
            // Найдем - подчиненные
            // Получим из классов
            // У кого прописан данный класс в поле server_parent_table
            // async.eachSeries(, function(item, cb){
            //
            // }, cb);

            var o = {
                command: 'get',
                object: 'class_profile',
                params: {
                    // param_where:{
                    //     server_parent_table:_t.name
                    // },
                    where: [
                        {
                            key: 'server_parent_table',
                            comparisonType: 'OR',
                            type: '=',
                            val1: _t.name
                        },
                        {
                            key: 'server_parent_table',
                            comparisonType: 'OR',
                            type: 'like%',
                            val1: _t.name + ','
                        },
                        {
                            key: 'server_parent_table',
                            comparisonType: 'OR',
                            type: '%like%',
                            val1: ',' + _t.name + ','
                        },
                        {
                            key: 'server_parent_table',
                            comparisonType: 'OR',
                            type: '%like',
                            val1: ',' + _t.name
                        }
                    ],
                    collapseData: false
                }
            }
            _t.api(o, function(err, res) {
                if (err) return cb(err)
                if (!res.length) {
                    console.log('Для данной таблицы (' + _t.name + ') нет подчиненных')
                    return cb(null)
                }

                async.eachSeries(res, function(item, cb) {
                    // Есть ли данные и сколько
                    child_tables_arr.push(item.name)
                    var server_parent_table = (item.server_parent_table) ? item.server_parent_table.split(',') : []
                    var server_parent_key = (item.server_parent_key) ? item.server_parent_key.split(',') : []
                    var server_parent_key_finded = server_parent_key[server_parent_table.indexOf(_t.name.toLowerCase())]

                    // //если поиск не по id, то стоит в любом случае возвращать id, помимо поля, по которому идёт поиск

                    const columns = ['id']
                    if (server_parent_key_finded !== 'id') columns.push(server_parent_key_finded)


                    var o = {
                        command: 'get',
                        object: item.name,
                        params: {
                            where: [{
                                // key: item.server_parent_key,
                                key: server_parent_key_finded,
                                type: 'in',
                                val1: id
                            }],
                            columns: columns,
                            collapseData: false
                        }
                    }
                    _t.api(o, function(err, res) {
                        if (err) {
                            errors.push(err)
                            return cb(null)
                        }
                        if (!res.length) return cb(null)

                        var ids = []
                        for (var i in res) {
                            ids.push(res[i].id)
                        }

                        child_tables[_t.name].nodes.push({
                            name: item.name,
                            name_ru: item.name_ru || item.name,
                            records: res,
                            count: res.length,
                            nodes: []
                        })


                        // Вызвать тоже самое
                        var obj2 = {}
                        obj2.ids = ids
                        obj2.rollback_key = rollback_key
                        obj2.doNotSaveRollback = doNotSaveRollback
                        obj2.child_request = true
                        obj2.errors = errors

                        var o = {
                            command: 'removeCascade',
                            object: item.name,
                            params: obj2,
                            fromClient: false
                        }
                        _t.api(o, function(err, res) {
                            if (err) return cb(err)
                            let nodes = res.nodes
                            // try {
                            errors = [...errors, ...res.errors || []]
                            // } catch (e) {
                            //     console.log(errors, res.errors)
                            // }
                            if (!nodes) {
                                return cb(null)
                            }
                            if (!nodes.length) return cb(null)
                            child_tables[_t.name].nodes[child_tables[_t.name].nodes.length - 1].name = item.name
                            child_tables[_t.name].nodes[child_tables[_t.name].nodes.length - 1].name_ru = item.name_ru || item.name
                            for (var i in nodes) {
                                child_tables[_t.name].nodes[child_tables[_t.name].nodes.length - 1].nodes.push(nodes[i])
                            }


                            //parent_tables[item.name] = item.name;
                            cb(err)
                        })
                    })
                }, cb)
            })
        },
        function(cb) {
            // Найдем - таблицы эксплуататоры (для которых эта таблица является справочником)
            //return cb(null);

            // Связанные классы
            var o = {
                command: 'get',
                object: 'class_fields_profile',
                params: {
                    // param_where:{
                    //     is_virtual:1,
                    //     from_table:_t.name.toLowerCase()
                    //
                    // },
                    where: [
                        {
                            key: 'is_virtual',
                            type: '=',
                            val1: 1
                        },
                        {
                            key: 'from_table',
                            type: '=',
                            val1: _t.name.toLowerCase()
                        },
                        {
                            key: 'join_table',
                            type: 'isNull'
                        }
                    ],
                    collapseData: false
                }
            }
            _t.api(o, function(err, res) {
                if (err) return cb(err)
                if (!res.length) {
                    console.log('Для данной таблицы (' + _t.name + ') нет классов ее использующих.')
                    return cb(null)
                }
                // console.log(child_tables_arr)
                //console.log('Связанные классы:',res);
                // мы узнали что есть зависимости. определим, есть ли данные
                //Отсортируем по таблицам и найдем ключевое поле, по которому идет связь XXXX_id
                var parasite_tables = {}
                for (var i in res) {
                    var one = res[i]
                    if (parasite_tables[one.class]) continue
                    if (!one.class) continue
                    parasite_tables[one.class] = one.keyword
                }
                async.eachSeries(Object.keys(parasite_tables), function(key, cb) {
                    var keyword = parasite_tables[key]

                    // Есть ли данные и сколько
                    if (child_tables_arr.indexOf(key) != -1) {
                        console.log('Данная таблица не использует исходную как справочник. Она зависимая (дочерняя)')
                        return cb(null)
                    }
                    async.series([
                        function(cb) {
                            // Проверим есть ли данные которые мы не можем изменять. Если есть - удалить запись нельзя.
                            //return cb(new UserError('Вы не можете удалить эту запись так как ее используют недоступные вам данные.'));
                            // Пока что return
                            return cb(null)
                        },
                        function(cb) {
                            // Проверим есть ли свои данные чтобы их вычистить.

                            // //если поиск не по id, то стоит в любом случае возвращать id, помимо поля, по которому идёт поиск
                            const columns = ['id']
                            if (keyword !== 'id') columns.push(keyword)


                            var o = {
                                command: 'get',
                                object: key,
                                params: {
                                    where: [{
                                        key: keyword,
                                        type: 'in',
                                        val1: id
                                    }],
                                    columns: columns,
                                    collapseData: false
                                }
                            }
                            _t.api(o, function(err, res) {
                                if (err) {
                                    // return cb(err);
                                    return cb(err)
                                }
                                if (!res.length) return cb(null)
                                // Данные есть.
                                child_tables[_t.name].parasite_tables[key] = {
                                    name: key,
                                    name_ru: parasite_tables[key].name_ru || key,
                                    keyword: keyword,
                                    count: res.length,
                                    records: res
                                }
                                return cb(null)
                            })
                        }
                    ], cb)
                }, cb)
            })
        }
    ], function(err) {
        //console.log(err, 'child_tables ====>',rollback_key, child_tables);
        if (err) {
            if (err.code === 2005) {
                console.log('Bad class. May by deleted', err)
                errors.push(err)
                err = null
            } else {
                return cb(err)
            }

        }
        if (obj.child_request) return cb(err, {nodes: child_tables[_t.name].nodes, errors})
        if (child_tables[_t.name].nodes.length == 0 && Object.keys(child_tables[_t.name].parasite_tables).length == 0) {
            _t.emitPercentInfo(`Удаление...`, infoOptions)
            // Нет зависимых данных, просто удалим
            obj.doNotSaveRollback = doNotSaveRollback
            obj.rollback_key = rollback_key
            return _t.remove(obj, function(err, res) {
                if (err) {
                    rollback.rollback({rollback_key: rollback_key, user: _t.user}, function(err, res) {
                        console.log('Результат выполнения rollback', err, res)
                    })
                    return cb(err)
                }
                _t.clearCache()
                if (!doNotSaveRollback) rollback.save({
                    rollback_key: rollback_key,
                    user: _t.user,
                    name: _t.name,
                    name_ru: _t.name_ru || _t.name,
                    method: 'removeCascade',
                    params: obj
                })
                _t.emitPercentInfo(`Удаление завершено`, {...infoOptions, hide:3000})
                return cb(null, res)
            })
        }

        var removed_data = {}
        if (obj.confirm) {
            // Пользователь подтвердил
            _t.emitPercentInfo(`Удаление...`, infoOptions)
            var remove = function(nodes, cb) {
                async.eachSeries(nodes, function(node, cb) {
                    async.eachSeries(node.records, function(record, cb) {
                        if (!removed_data[node.name]) removed_data[node.name] = []
                        removed_data[node.name].push(record.id)
                        var o = {
                            command: 'remove',
                            object: node.name,
                            params: {
                                id: record.id,
                                rollback_key: rollback_key,
                                doNotSaveRollback: doNotSaveRollback,
                                doNotClearCache: obj.doNotClearCache
                            }
                        }
                        _t.api(o, cb)
                    }, function(err) {
                        if (err) return cb(err)
                        if (!node.nodes.length) return cb(null)
                        remove(node.nodes, cb)
                    })
                }, cb)
            }
            async.series({
                removeChild: function(cb) {
                    remove(child_tables[_t.name].nodes, cb)
                },
                removeParasire: function(cb) {
                    // Вычистить зависимые данные
                    async.eachSeries(Object.keys(child_tables[_t.name].parasite_tables), function(key, cb) {
                        var item = child_tables[_t.name].parasite_tables[key]
                        async.eachSeries(item.records, function(record, cb) {
                            if (typeof removed_data[item.name] == 'object') {
                                if (removed_data[item.name].indexOf(record.id) !== -1) {
                                    // Эта запись уже была удалена и не нуждается в изменении
                                    return cb(null)
                                }
                            }
                            var fieldsProfile = {}
                            async.series({
                                getProfile: function(cb) {
                                    var o = {
                                        command: 'get',
                                        object: 'class_fields_profile',
                                        params: {
                                            param_where: {
                                                class: item.name
                                            },
                                            collapseData: false
                                        }
                                    }
                                    _t.api(o, function(err, res) {
                                        if (err) return cb(new MyError('Не удалось получить class_fields_profile для класса', {
                                            err: err,
                                            o: o
                                        }))
                                        for (var i in res) {
                                            fieldsProfile[res[i].column_name] = res[i]
                                        }
                                        cb(null)
                                    })

                                },
                                modify: function(cb) {
                                    if (!fieldsProfile[item.keyword]) return cb(null)
                                    if (fieldsProfile[item.keyword].is_virtual) return cb(null)
                                    var o = {
                                        command: 'modify',
                                        object: item.name,
                                        params: {
                                            id: record.id,
                                            rollback_key: rollback_key
                                        }
                                    }
                                    o.params[item.keyword] = null
                                    _t.api(o, function(err, res) {
                                        if (err) {
                                            console.log(err)
                                        }
                                        cb(err, res)
                                    })
                                }
                            }, cb)

                        }, cb)

                    }, cb)
                },
                removeSelf: function(cb) {
                    // Удалим саму запись
                    obj.rollback_key = rollback_key
                    obj.doNotSaveRollback = doNotSaveRollback
                    _t.remove(obj, cb)
                }
            }, function(err) {

                if (err) {
                    _t.emitPercentInfo(`Удаление... Произошла ошибка. Отмена удаления`, infoOptions)
                    rollback.rollback({rollback_key: rollback_key, user: _t.user}, function(err, res) {
                        _t.emitPercentInfo(`Удаление... Произошла ошибка. Все изменения отменены`, {...infoOptions, hide:3000})
                        console.log('Результат выполнения rollback', err, res)
                    })
                    return cb(err)
                }
                _t.emitPercentInfo(`Удаление завершено`, {...infoOptions, hide:3000})
                _t.clearCache()
                if (!doNotSaveRollback) rollback.save({
                    rollback_key: rollback_key,
                    user: _t.user,
                    name: _t.name,
                    name_ru: _t.name_ru || _t.name,
                    method: 'removeCascade',
                    params: obj
                })
                return cb(null, new UserOk(_t.table_ru + ` успешно удален${_t.ending}.` + _t.ending + '.', {
                    id: obj.id,
                    child_tables: child_tables
                }))
            })
        } else {
            _t.emitPercentInfo(`Удаление... Найдены связанные данные`, {...infoOptions, hide:3000})
            // return cb(new UserError('needConfirm', {confirmType:'dialog',message: 'While deleting this record all related data will be removed. Are you sure to continue?',data:child_tables}));
            child_tables[_t.name].errors = errors
            return cb(new UserError('needConfirm', {
                confirmType: 'dialog',
                message: 'При удалении данной записи также удалятся дочерние данные. Подтвердить?',
                data: child_tables
            }))
        }
    })

    //
    //async.waterfall([
    //    function (cb) {
    //        _t.beforeFunction['remove'](obj, function (err) {
    //            if (err) {
    //                return cb(new MyError('Ошибка выполнения beforeFunction'));
    //            }
    //            return cb(null);
    //        });
    //    },
    //    pool.getConn,
    //    function (conn, cb) {
    //        if (obj.physical) {
    //            conn.delete(_t.tableName, {id: id}, function (err, affected) {
    //                conn.release();
    //                cb(err, affected);
    //            })
    //        } else {
    //            var o = {
    //                id: id,
    //                deleted: funcs.getDateTimeMySQL()
    //            };
    //            _t.modify(o, cb);
    //        }
    //    }
    //], function (err, results) {
    //    if (err) return cb(new MyError('Не удалось удалить запись.', err));
    //    if (results == 0) return cb(new UserError('rowNotFound'));
    //    _t.clearCache();
    //    if (rollback_key) {
    //        var o = {
    //            type: 'remove',
    //            params: {
    //                object: _t.name,
    //                id: id,
    //                user:_t.user
    //            }
    //        };
    //        rollback.add(rollback_key, o, function (err, res) {
    //            if (err) return cb(err);
    //            return cb(null, new UserOk(_t.table_ru + ' успешно удален' + _t.ending + '.', {id: obj.id}));
    //        })
    //    } else {
    //        return cb(null, new UserOk(_t.table_ru + ' успешно удален' + _t.ending + '.', {id: obj.id}));
    //    }
    //});
}

/**
 *
 * ПРИМЕР КОДА для вызова в модалке ============================================================================
 // Внимание! Если этот код убрать, то поле input будет недоступно в выпадающем списке
 dialogInstance.removeAttr('tabindex');

 var denySelId = MB.Core.guid();

 var selInstance = MB.Core.select3.init({
                    id :                denySelId,
                    wrapper:            $('#choose-synonym'),
                    column_name:        'actual_taxon_id',
                    class:              'taxon',
                    return_id:          'id', // Не прокинуты в select3 (используется данные из профайла колонки)
                    return_name:        'name_with_id', // Не прокинуты в select3 (используется данные из профайла колонки)
                    rowId:              data.id,
                    withSearch:         true,
                    withEmptyValue:     false,
                    absolutePosition:   true,
                    isFilter:           false,
                    value: {},
                    additionalClass:    ''
                });
 * КОНЕЦ КОДА ============================================================================
 * @param obj
 * @param cb
 * @returns {*}
 */
MySQLModel.prototype.getForSelect = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this
    var search_keyword = obj.search_keyword || ''
    var column_name = obj.column_name
    if (!column_name) return cb(new MyError('Не передан параметр column_name'))
    var page_no = obj.page_no || 1
    //select_search_columns
    var colProfile = _t.class_fields_profile[column_name]
    if (!colProfile) return cb(new MyError('Нет профайла для данного столбца'))
    var select_class = colProfile.select_class// || _t.name;
    var select_search_columns = colProfile.select_search_columns || colProfile.return_name || 'name'
    if (typeof select_search_columns == 'string') select_search_columns = select_search_columns.replace(/\s+/ig, '').split(',')
    var return_id = obj.return_id || colProfile.return_id || 'id'
    var return_name = obj.return_name || colProfile.return_name || select_search_columns[0] || 'name'
    var return_names = return_name.split(',')


    if (!select_class) { // Если не указан класс у колонки в который стучаться
        //_t.get(params, cb);
        //You must specify the select_class (Measurement) field in the "Measorement" class in the "category" field

        // var txt = 'You must specify the select_class (set "' + _t.name + '") field in the ' + _t.name + ' class in the "' + column_name + '" field';
        var txt = 'Укажите поле select_class для колонки "' + column_name + '" класса "' + _t.name + '". (класс из которого берется это поле)'

        var data0 = {id: 0, name: txt}
        data0[return_name] = data0.name
        var res = funcs.collapseData([data0], {count: 1, count_all: 1})
        return cb(null, res)
    }


    var params = {
        page_no: page_no,
        limit: obj.limit || 40,
        columns: [return_id, return_name, 'sysname'],
        where: obj.default_where || [],
        depend_value: obj.depend_value,
        class: _t.name,
        client_object: _t.client_object,
        fromClient: true,
        additional_params: obj.additional_params
    }
    for (var i in select_search_columns) {
        params.where.push({
            key: select_search_columns[i],
            type: _t.class_profile.like_type || 'like',
            val1: search_keyword,
            group: 'getForSelectOrGroup',
            comparisonType: 'OR'
        })
    }

    params.where.forEach(one=>{
        if (!params.columns.includes(one.key)) params.columns.push(one.key)
    })

    var o = {
        command: 'get',
        object: select_class,
        params: params
    }
    _t.api(o, function(err, res) {
        return cb(err, res)
    })

}

MySQLModel.prototype.getForFilterSelect = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this

    var search_keyword = obj.search_keyword || ''
    var column_name = obj.column_name
    var client_object = obj.client_object
    if (!column_name) return cb(new MyError('Не передан параметр column_name'))
    var page_no = obj.page_no || 1


    /// ЭТОТ БЛОК БЫЛ ЗАКОМЕНТИРОВАН /////////////////////////////////
    //select_search_columns
    var colProfile = _t.class_fields_profile[column_name]
    if (!colProfile) return cb(new MyError('Нет профайла для данного столбца'))
    var select_class = colProfile.select_class// || _t.name;
    //var select_search_columns = colProfile.select_search_columns || 'name';
    //if (typeof select_search_columns=='string') select_search_columns = select_search_columns.replace(/\s+/ig,'').split(',');
    //var return_id = colProfile.return_id || 'id';
    //var return_name = colProfile.return_name || 'name';
    /// ЭТОТ БЛОК БЫЛ ЗАКОМЕНТИРОВАН /////////////////////////////////

    var select_search_columns = colProfile.select_search_columns || colProfile.return_name || 'name'
    if (typeof select_search_columns == 'string') select_search_columns = select_search_columns.replace(/\s+/ig, '').split(',')
    var return_id = obj.return_id || colProfile.return_id || 'id'
    var return_name = obj.return_name || colProfile.return_name || select_search_columns[0] || 'name'


    // select id, distinct column_name from class where column_name like '%%'
    var params = {
        page_no: page_no,
        limit: obj.limit || 40,
        columns: [column_name, return_id, return_name],
        where: obj.default_where || [],
        groupBy: column_name
    }
    if (client_object) params.client_object = client_object
    if (search_keyword) {
        params.where.push({
            key: column_name,
            type: _t.class_profile.like_type || 'like',
            val1: search_keyword,
            group: 'getForSelectOrGroup',
            comparisonType: 'OR'
        })
    }


    //if (!select_class) { // Если не указан класс у колонки в который стучаться
    //    //_t.get(params, cb);
    //    var res = funcs.collapseData([{id: 0, name: 'Необходимо указать поле select_class'}], {count: 1, count_all: 1});
    //    cb(null, res);
    //} else { // есть класс, запросим его get
    //    var o = {
    //        command: 'get',
    //        object: select_class,
    //        params: params
    //    };
    //    _t.api(o, cb);
    //}
    var o = {
        command: 'get',
        // object: colProfile.join_table || _t.name,
        object: _t.name,
        params: params
    }
    _t.api(o, function(err, res) {
        return cb(err, res)
    })
}

MySQLModel.prototype.validate = function(obj) {
    var _t = this
    var not_valid = []
    for (var field in _t.validation) {
        if (_t.columns.indexOf(field) == -1) {
            continue
        }
        var valFunc = _t.validation[field]
        if (obj[field] === undefined || typeof funcs.validation[valFunc] != 'function') {
            continue
        }
        if (!funcs.validation[valFunc](obj[field])) {
            not_valid.push({
                field: field,
                format: _t.validationFormats[valFunc] || ''
            })
        }
    }
    if (not_valid.length > 0) {
        return {
            message: 'Одно или несколько полей имеет не верный формат',
            fields: not_valid
        }
    } else {
        return true
    }
}

MySQLModel.prototype.clearCache = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    var _t = this
    obj = obj || {}
    if (typeof cb !== 'function') cb = function() {
    }

    _t.uniqueColumns = []

    // global.classesCache[_t.name] = {};
    // console.log('=============>clearCache', _t.name);
    // if (obj.doNotClearCacheAdditionalTables){
    //     console.log('doNotClearCacheAdditionalTables', obj.doNotClearCacheAdditionalTables, ' Не будем чистить кеш связанных таблиц.');
    //     if (typeof cb === 'function') cb(null);
    //     return;
    // }
    let alreadyCleared = obj.alreadyCleared || []
    async.series({
        clearThis: function(cb) {
            global.classesCache[_t.name] = {}
            alreadyCleared.push(_t.name.toLowerCase())
            if (debug) console.log('=============>clearCache', _t.name)
            return cb(null)
        },
        clearLinked: function(cb) {
            if (obj.doNotClearCacheAdditionalTables) return cb(null)
            _t.table.getLinkedTables({}, function(err, res) {
                if (err) {
                    console.error('Во время запроса связаных таблиц для очистки кеша возникла ош.', err)
                    return cb(null)
                }
                async.eachSeries(res, (one_linked_tbl, cb) => {
                    if (alreadyCleared.includes(one_linked_tbl)) return cb(null)
                    let o = {
                        command: 'clearCache',
                        object: one_linked_tbl,
                        params: {...obj, alreadyCleared}
                    }
                    _t.api(o, (err, res) => {
                        if (err) {
                            console.error('Во время clearCache для связаных таблиц возникла ош.', err)
                        }
                        alreadyCleared.push(one_linked_tbl.toLowerCase())
                        cb(null)
                    })
                }, cb)
                // if (!err){
                //     for (var i in res) {
                //         var name =   res[i].charAt(0).toUpperCase() + res[i].substr(1);
                //         global.classesCache[name] = {};
                //         console.log('====>clearCacheAdditionalTables', name);
                //     }
                // }else{
                //     console.log('Во время запроса связаных таблиц для очистки кеша возникла ош.', err);
                // }
                // return cb(null);
            })
        },
        clearAdditional: cb => {
            if (!Array.isArray(_t.additionalClearCache)) return cb(null)
            async.each(_t.additionalClearCache, (one_add_tbl, cb) => {
                if (alreadyCleared.includes(one_add_tbl)) return cb(null)
                let o = {
                    command: 'clearCache',
                    object: one_add_tbl,
                    params: {...obj, alreadyCleared}
                }
                _t.api(o, (err, res) => {
                    if (err) {
                        console.error('Во время clearCache для additionalClearCache таблиц возникла ош.', err)
                    }
                    alreadyCleared.push(one_add_tbl.toLowerCase())
                    cb(null)
                })
            }, cb)
        },
        clearDynamicFieldsTables: function(cb) {
            //_t.dynamic_field_tables_for_clear_cache
            for (var i in _t.dynamic_field_tables_for_clear_cache) {
                var one_tbl = _t.dynamic_field_tables_for_clear_cache[i]

                var name = one_tbl.class.charAt(0).toUpperCase() + one_tbl.class.substr(1)
                global.classesCache[name] = {}

                for (var j in global.classes) {
                    var one_cls = global.classes[j]
                    if (j.substr(0, name.length + 3) === name + '_-_') {
                        if (typeof global.classes[j] === 'object') delete global.classes[j][one_tbl.client_object]
                    }
                }

                console.log('====>clearDynamicFieldsTables', name)
            }
            cb(null)
        }
    }, cb)

}

MySQLModel.prototype.execProcedure = function(obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0]
        obj = {}
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb')
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'))
    var _t = this
    //var fromClient = !(obj.fromClient === false);
    var fromClient = obj.fromClient
    delete obj.fromClient
    if (fromClient) return cb(new MyError('Запрещено!'))
    var procedureName = obj.procedureName
    if (!procedureName) return cb(new MyError('Не передан procedureName'))
    async.waterfall([
        pool.getConn,
        function(conn, cb) {

            var q
            if (obj.return_alias) {
                q = 'select ' + procedureName + '() as ' + obj.return_alias
            } else {
                q = 'CALL ' + procedureName + '()'
            }
            console.log(q)
            conn.query(q, function(err, res) {
                conn.release()
                if (err) {
                    err.msg = err.message
                    return cb(new MyError('Не удалось выполнить хранимую процедуру ' + procedureName, err))
                }
                cb(null, res)
            })
        }
    ], function(err, results) {
        if (err) {
            return cb(err)
        }
        if (!obj.doNotClearCache) _t.clearCache()
        cb(null, new UserOk('noToastr', {affected: results.affectedRows, results}))
    })
}

module.exports = MySQLModel


// Пример как работать с виртуальными полями ссылающимися на уже подключенные таблицы
//"category_id" : {"type": "bigint", "length": "20", "visible": false},
//"category" : {"type": "varchar", "length": "255", "from_table": "category", "keyword": "category_id", "return_column": "name", "is_virtual": true, "name": "Подкатегория"},
//"parent_category_id" : {"type": "varchar", "length": "255", "from_table": "category", "join_table": "category", "keyword": "parent_category_id", "return_column": "id", "is_virtual": true},
//"parent_category" : {"type": "varchar", "length": "255", "from_table":"category", "join_table": "category", "keyword": "parent_category_id", "return_column": "name", "is_virtual": true, "name": "Категория"},
// Внимание! Когда колонка ссылается на таблицу, которая взята и з другой таблице, а та в свою очередь на третью... ТО Важна последовательность колонок, то есть SORT_NO!
// При этом SORT_NO не синхронизируется! Если изначально проставлено не верно, то надо залесть в class_profile, найти класс "class_fields_profile"/"client_object_fields_profile" и проставить вручную
//
// Example
// "id_from_source" : {"type": "bigint", "length": "20", "from_table": "dynamic_field", "keyword": "dynamic_field_id", "return_column": "id_from_source", "is_virtual": true, "editable":false, "sort_no":1000},
// "table_for_filter" : {"type": "varchar", "length": "255", "join_table": "dynamic_field", "from_table": "dynamic_field_pair", "keyword": "dynamic_field_pair_id", "return_column": "table_for_filter", "is_virtual": true, "editable":false, "sort_no":1001},
// "parent_key_for_filter" : {"type": "varchar", "length": "255", "join_table": "dynamic_field", "from_table": "dynamic_field_pair", "keyword": "dynamic_field_pair_id", "return_column": "parent_key_for_filter", "is_virtual": true, "editable":false, "sort_no":1002}


// Пример использования table_alias + join_table_by_alias
// "test_select_2_value_id": {
//     "type": "bigint",
//         "length": "20",
//         "from_table": "measurement_value",
//         "keyword": "[\"id:data_individual_id\",\"5:measurement_id\"]",
//         "return_column": "id",
//         "is_virtual": true
// },
// "test_select_2_real_value_id_rowId": {
//     "type": "bigint",
//         "length": "20",
//         "table_alias": "table_test_select_2_real_value_id",
//         "join_table": "measurement_value",
//         "from_table": "measurement_sub_table_select",
//         "keyword": "id:measurement_value_id",
//         "return_column": "id",
//         "is_virtual": true
// },
// "test_select_2_real_value_id": {
//     "type": "bigint",
//         "length": "20",
//         "table_alias": "table_test_select_2_real_value_id",
//         "join_table": "measurement_value",
//         "from_table": "measurement_sub_table_select",
//         "modify_in_ext_tbl": true,
//         "keyword": "id:measurement_value_id",
//         "return_column": "value1",
//         "is_virtual": true
// },
// "test_select_2_real_value": {
//     "type": "bigint",
//         "length": "20",
//         "join_table_by_alias": "table_test_select_2_real_value_id",
//         "join_table": "measurement_sub_table_select",
//         "from_table": "measurement_sub_table_select_test_select_2",
//         "keyword": "value1",
//         "return_column": "name",
//         "is_virtual": true
// },
// "test_select_3_value_id": {
//     "type": "bigint",
//         "length": "20",
//         "from_table": "measurement_value",
//         "keyword": "[\"id:data_individual_id\",\"6:measurement_id\"]",
//         "return_column": "id",
//         "is_virtual": true
// },
// "test_select_3_real_value_id_rowId": {
//     "type": "bigint",
//         "length": "20",
//         "table_alias": "table_test_select_3_real_value_id",
//         "join_table": "measurement_value",
//         "from_table": "measurement_sub_table_select",
//         "keyword": "id:measurement_value_id",
//         "return_column": "id",
//         "is_virtual": true
// },
// "test_select_3_real_value_id": {
//     "type": "bigint",
//         "length": "20",
//         "table_alias": "table_test_select_3_real_value_id",
//         "join_table": "measurement_value",
//         "from_table": "measurement_sub_table_select",
//         "modify_in_ext_tbl": true,
//         "keyword": "id:measurement_value_id",
//         "return_column": "value1",
//         "is_virtual": true
// },
// "test_select_3_real_value": {
//     "type": "bigint",
//         "length": "20",
//         "join_table_by_alias": "table_test_select_3_real_value_id",
//         "join_table": "measurement_sub_table_select",
//         "from_table": "measurement_sub_table_select_test_select_3",
//         "keyword": "value1",
//         "return_column": "name",
//         "is_virtual": true
// }


// В tables.json параметр parent_key:true ставить не надо. Он только для таблиц в форме (клиентских объектов)
// pm2 start bin/www --node-args="--max-old-space-size=6144"
