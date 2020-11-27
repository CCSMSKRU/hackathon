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
var https = require('https');
var request = require('request');

var funcs = require('../libs/functions');
var fs = require('fs');

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

Model.prototype.modify = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
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

Model.prototype.externalRequest = function(obj, cb){
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var t1 = moment();
    var method = obj.method;
    var url = obj.url || '';
    var pass = obj.pass || '';
    var o = {
        method: 'GET',
        json:true,

        //preambleCRLF: true,
        //postambleCRLF: true,
        uri: url + '/'+method+'/',
        //'auth': {
        //    'Authorization': _t.pass,
        //    'sendImmediately': true
        //},
        headers: {
            'Authorization': pass,
            "Accept":"application/json"
        }
    };
    if (typeof obj.params == 'object'){
        o.qs = obj.params;
        o.useQuerystring = true;
    }
    request(o,
        function (error, response, body) {
            if (error) {
                return cb(new MyError('Ошибка при выполнении externalRequest:', {err:error,o:JSON.stringify(o)}));
            }
            if (response.statusCode !== 200) {
                return cb(new MyError('externalRequest вернул нестандартный код: '+ response.statusCode, {err:error,o:JSON.stringify(o)}));
            }
            //console.log(response);
            //console.log(o);
            console.log('Запрос method занял:', moment()-t1);
            return cb(null, body);
        });
};

Model.prototype.returnHello = function (obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    // var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    const a = ['Hello','HellO','heLLo','hElLo','HeLlO'];
    let str = '';
    async.series({
        one:(cb)=>{
            // Здесь можно реализацию метода
            str = a[funcs.randomInt(0,a.length-1)];
            cb(null);
        },
        save:(cb)=>{
            var params = {
                id:id,
                description:str,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить таблицу For_test',{params : params, err : err}));
                cb(null);
            });

        },
    },function (err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err);
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            cb(null, new UserOk('Функция вернула: ' + str + '. Результат записан в Описание', {str:str}));
        }
    });
};


Model.prototype.prepareRoleFile = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    // var id = obj.id;
    // if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj})); // Not passed to id
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var filename = './modules/data_migration/instances/User/jsonusers.json';
    var filename2 = './modules/data_migration/instances/User/role.json';
    var role = {
        role:[],
        role_obj:{},
    };
    async.series({
        readFile: cb => {
            // считать и распарсить JSON
            fs.exists(filename, function (exists) {
                if (!exists) return cb('Файл не существует ' + filename);
                var file = fs.readFileSync(filename, {encoding: 'utf-8'});
                try {
                    _t.data = JSON.parse(file);
                } catch (e) {
                    return cb('Не корректный формат JSON в файле ' + filename);
                }
                var roles = [];
                for (var i in _t.data.user) {
                    var rec = _t.data.user[i];
                    if (!rec.role) continue;
                    if (roles.indexOf(rec.role) === -1) {
                        roles.push(rec.role);
                        role.role.push({
                            id:roles.length,
                            name:rec.role
                        });
                        // role.role_obj[roles.length] = rec.role;
                        role.role_obj[rec.role] = roles.length;
                    }
                }
                cb(null);
            });
        },
        wrireToFile: cb => {
            fs.writeFile(filename2, JSON.stringify(role), function(error){
                if(error) return cb(error);
                cb(null);
            });
        }
    },function (err, res) {
        if (err) {
            return cb(err);
            // if (doNotSaveRollback) return cb(err);
            // rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
            //     return cb(err, err2);
            // });
        } else {
            //if (!doNotSaveRollback){
            //    rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'METHOD_NAME', params:obj});
            //}
            cb(null, new UserOk('Ок'));
        }
    });
};

var export1 = require('../modules/data_migration/instances/User/user_from_old');
Model.prototype.importUser = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    async.series({
        // get: cb => {
        //     _t.getById({id:8}, function (err, res) {
        //         if (err) return cb(new MyError('Не удалось получить .',{id:id,err:err}));
        //
        //         cb(null);
        //     });
        // },
        export: cb => {
            // return;
            export1.importFromJSON({
                filename:'./modules/data_migration/instances/User/jsonusers.json',
                api:_t.api,
                user:_t.user,
                rollback_key:rollback_key
            }, (err, res)=>{
                console.log(err, res);
                return cb(err, res)
            })

        }
    },function (err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err);
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            if (!doNotSaveRollback){
                rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:`Import_${_t.name}`, params:obj});
            }
            cb(null, new UserOk('Ок'));
        }
    });
};



var tmc = require('../modules/data_migration/instances/User/tmc');
Model.prototype.importTmc = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    async.series({
        // get: cb => {
        //     _t.getById({id:8}, function (err, res) {
        //         if (err) return cb(new MyError('Не удалось получить .',{id:id,err:err}));
        //
        //         cb(null);
        //     });
        // },
        export: cb => {
            // return;
            tmc.importFromJSON({
                filename:'./modules/data_migration/instances/User/tmc.json',
                api:_t.api,
                user:_t.user,
                rollback_key:rollback_key
            }, (err, res)=>{
                console.log(err, res);
                return cb(err, res)
            })

        }
    },function (err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err);
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            if (!doNotSaveRollback){
                rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:`Import_${_t.name}`, params:obj});
            }
            cb(null, new UserOk('Ок'));
        }
    });
};

// var equip_ = require('../modules/data_migration/instances/User/equip_');
/*Model.prototype.importRequestPPR_TEMP = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var url = 'https://yes.pro-fm.com/ppr/issues/json_issues.json';
    async.series({
        getData: cb => {
            request.get('http://yes.pro-fm.com/').auth('ilchin_serg@mail.ru', '12345', false);
            request
                .get(url)
                .on('response', function(response) {
                    console.log(response.statusCode) // 200
                    console.log(response.headers['content-type']) // 'image/png'
                })
                .pipe(chunk => {
                    console.log('chunk', chunk);
                })
        },
        getData_OLD: cb => {
            return;
            var body = '';

            //Set the cookie instead of setting into header
            var cookie = request.cookie('_profm_session=ZS94Wi9iT1VMNXRBNkhOZXZyQ0NLdThZdzFrOWlSVStPRXNzSisrQm5rMzNiR3ZITjBmR3BXUTdYL0IrK2pkUCtac0MzY0lnY2V0WGpsbU1lMC9XVnFVRWxocUM0UlhxdCtwZ2RiVHJnSzRta2hQemdVM1ByZm9ZMUtyVHdnT1FLOVFEZDJ2U3g0eEZmVDJNRU5OL01hS3ZGSVIyVVBEeVVuZExYeHhXN2sweXVYNVlFOTdSWFBxY3hFQ3gyMHZuRy9KNFhmVXkrYUVOemJ5c0ZVUXhxNVlxU3VDdlNMRW8vSEtmS0xGL1crZ1lXbHFmZUUwMWl0UHZwUTJiTEQyV3RBQUNsb2NUcjhxNVBCMW1zOHVOWTFGLytucEJ0ZWFmb0E3R1R6cnQvRlc1ejJiT0lPTmJ4VDk0VVZZZnhKKy8wQTg0Nlg1WXdhYUJMUEw0SXVjcjRsNngrQnNzVmZIUitzeStrU2l0U05rPS0tZzVFYnVLR2hJMFE3K2ViZ3FWVkZ0QT09--ca11518fb98ad23e7df69126abde5316e5947c39');


// Set the headers for the request
            var headers = {
                'Content-Type': 'application/json',
                // 'Content-Length': Buffer.byteLength(post_data),
                'Cookie': cookie
            };

            const options = {
                hostname: 'yes.pro-fm.com',
                port: 443,
                path: '/ppr/issues/json_issues.json',
                method: 'GET',
                headers: headers
            };


            const req = https.request(options, (res) => {
                console.log('statusCode:', res.statusCode);
                console.log('headers:', res.headers);

                res.on('data', (d) => {
                    process.stdout.write(d);
                });
            });

            req.on('error', (e) => {
                console.error(e);
                return cb(new MyError('Запрос данных вернул ошибку',{err:e,options:options}))
            });
            req.end();
        },
        export: cb => {
            return cb(null);
            // return;
            equip_.importFromJSON({
                filename:'./modules/data_migration/instances/User/systems.json',
                api:_t.api,
                user:_t.user,
                rollback_key:rollback_key
            }, (err, res)=>{
                console.log(err, res);
                return cb(err, res)
            })

        }
    },function (err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err);
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            if (!doNotSaveRollback){
                rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:`Import_${_t.name}`, params:obj});
            }
            cb(null, new UserOk('Ок'));
        }
    });
};*/

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
            if (doNotSaveRollback) return cb(err);
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
