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

var Model = function(obj){
    this.name = obj.name;
    this.tableName = obj.name.toLowerCase();
    // this.getTree_parent_key = 'class_operation_id';
    // this.getTreeByAnotherKey = true;
    var basicclass = BasicClass.call(this, obj);
    if (basicclass instanceof MyError) return basicclass;
};
util.inherits(Model, BasicClass);
Model.prototype.getPrototype = Model.prototype.get;
Model.prototype.addPrototype = Model.prototype.add;
Model.prototype.modifyPrototype = Model.prototype.modify;
Model.prototype.removeCascadePrototype = Model.prototype.removeCascade;
Model.prototype.getForSelectPrototype = Model.prototype.getForSelect;

Model.prototype.init = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));
    var _t = this;
    Model.super_.prototype.init.apply(this, [obj , function (err) {
        cb(null);
    }]);
};

Model.prototype.getTreeNameFunction = function(essence){
    return (essence.name === '*')? essence.class : essence.name;
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

Model.prototype.removeCascade = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var client_object = _t.client_object || '';

    var coFunction = 'removeCascade_' + client_object;

    if (typeof _t[coFunction] === 'function') {
        _t[coFunction](obj, cb);
    } else {
        if (typeof _t['removeCascade_'] === 'function') {
            _t['removeCascade_'](obj, cb);
        } else {
            _t.removeCascadePrototype(obj, cb);
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

    var access_to_operation;
    async.series({
        get:function(cb){
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить Access_to_operation.',{id:id,err:err}));
                access_to_operation = res[0];
                cb(null);
            });
        },
        modify:function(cb){
            _t.modifyPrototype(obj, function(err, res){
                return cb(err, res);
            });
        },
        skipAccessList:function(cb){

            async.series({
                skipForThis:function(cb){
                    for (var i in io.sockets.sockets) {
                        var socket = io.sockets.sockets[i];
                        if (!socket.handshake.user) continue;
                        if (!socket.handshake.user.user_data) continue;
                        if (socket.handshake.user.user_data.id === access_to_operation.user_id){
                            socket.handshake.user.need_reload_access_list = true;
                        }
                    }
                    cb(null);
                },
                skipForAnotherUserWhoUseThisRole:function(cb){
                    async.series({
                        getAnotherUsers:function(cb){
                            var o = {
                                command:'get',
                                object:'User_role',
                                params:{
                                    columns:['user_id'],
                                    param_where:{
                                        role_user_id:access_to_operation.user_id
                                    },
                                    limit:10000,
                                    collapseData:false
                                }
                            };
                            _t.api(o, function (err, res) {
                                if (err) return cb(new MyError('Не удалось получить user_role',{o : o, err : err}));
                                for (var k in res) {
                                    for (var i in io.sockets.sockets) {
                                        var socket = io.sockets.sockets[i];
                                        if (!socket.handshake.user) continue;
                                        if (!socket.handshake.user.user_data) continue;
                                        if (socket.handshake.user.user_data.id === res[k].user_id){
                                            socket.handshake.user.need_reload_access_list = true;
                                        }
                                    }
                                }
                                cb(null);
                            });
                        }
                    }, cb);
                }
            }, cb);
        },
        clearCache:function(cb){
            var o = {
                command: '_clearCache',
                object: access_to_operation.class
            };
            // if (_t.client_object) o.client_object = _t.client_object;
            _t.api(o, function (err) {
                if (err) {
                    console.log('\nНемогу очистить кеш класса.', err);
                }
                cb(null);
            });
        }
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
            cb(null, res.modify);
        }
    });
};

Model.prototype.add_ = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var id;
    var access_to_operation;
    async.series({

        add:function(cb){
            _t.addPrototype(obj, function(err, res){
                if (err) return cb(err);
                id = res.id;
                return cb(err, res);
            });
        },
        get:function(cb){
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить Access_to_operation.',{id:id,err:err}));
                access_to_operation = res[0];
                cb(null);
            });
        },
        skipAccessList:function(cb){

            async.series({
                skipForThis:function(cb){
                    for (var i in io.sockets.sockets) {
                        var socket = io.sockets.sockets[i];
                        if (!socket.handshake.user) continue;
                        if (!socket.handshake.user.user_data) continue;
                        if (socket.handshake.user.user_data.id === access_to_operation.user_id){
                            socket.handshake.user.need_reload_access_list = true;
                        }
                    }
                    cb(null);
                },
                skipForAnotherUserWhoUseThisRole:function(cb){
                    async.series({
                        getAnotherUsers:function(cb){
                            var o = {
                                command:'get',
                                object:'User_role',
                                params:{
                                    columns:['user_id'],
                                    param_where:{
                                        role_user_id:access_to_operation.user_id
                                    },
                                    limit:10000,
                                    collapseData:false
                                }
                            };
                            _t.api(o, function (err, res) {
                                if (err) return cb(new MyError('Не удалось получить user_role',{o : o, err : err}));
                                for (var k in res) {
                                    for (var i in io.sockets.sockets) {
                                        var socket = io.sockets.sockets[i];
                                        if (!socket.handshake.user) continue;
                                        if (!socket.handshake.user.user_data) continue;
                                        if (socket.handshake.user.user_data.id === res[k].user_id){
                                            socket.handshake.user.need_reload_access_list = true;
                                        }
                                    }
                                }
                                cb(null);
                            });
                        }
                    }, cb);
                }
            }, cb);
        },
        clearCache:function(cb){
            var o = {
                command: '_clearCache',
                object: access_to_operation.class
            };
            // if (_t.client_object) o.client_object = _t.client_object;
            _t.api(o, function (err) {
                if (err) {
                    console.log('\nНемогу очистить кеш класса.', err);
                }
                cb(null);
            });
        }
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
            cb(null, res.add);
        }
    });
};

Model.prototype.getTree = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    var user_id = obj.user_id;
    if (isNaN(+user_id)) return cb(new MyError('Не передан user_id',{obj:obj}));

    var tree = [];
    var child_tree = obj.child_tree;
    var essence;
    var childs;
    var access_to_operation_obj_by_alias = {}; // class & name
    async.series({
        getTop:function(cb){
            if (id) return cb(null);
            // if (!_t.class_fields_profile.is_top) return cb(new MyError('Не передан id. Определить верхний уровень не возможно, так как у таблицы не предусмотрено поле is_top'));
            var o = {
                command:'get',
                object:'Class_operation',
                params:{
                    param_where:{
                        is_top:true
                    },
                    columns:['id', 'is_top'],
                    collapseData:false
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить is_top',{params : params, err : err}));
                if (!res.length) return cb(new MyError('Не передан id. Определить верхний уровень не возможно так как не у одной записи не стоит признак is_top'));
                if (res.length > 1) return cb(new MyError('Не передан id. Определить верхний уровень не возможно так как признак is_top указан у нескольких записей',{class:_t.name,res:res}));
                id = res[0].id;
                cb(null);
            });
        },
        getAccess_to_operations:function(cb){
            var params = {
                param_where:{
                    user_id:user_id
                },
                sort:{
                    columns:['name'],
                    directions:['ASC']
                },
                limit:100000000,
                collapseData:false
            };
            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить access_to_operation',{params : params, err : err}));
                for (var i in res) {
                    var alias = res[i].class + '_-_' + res[i].name;
                    access_to_operation_obj_by_alias[alias] = res[i];
                }
                cb(null);
            });
        },
        get:function(cb){
            var o = {
                command:'getById',
                object:'Class_operation',
                params:{
                    id:id
                }
            };

            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить сущность.',{o:o,err:err}));
                essence = res[0];
                var alias = res[0].class + '_-_' + res[0].name;
                essence.access_to_operation = access_to_operation_obj_by_alias[alias] || {};
                cb(null);
            });
        },
        getChilds:function(cb){
            if (obj.doNotLoadChild) return cb(null);
            // if (!essence) return cb(new MyError('сущность не существует.',{obj:obj}));
            if (!essence) return cb(null);
            // if (need_to_load_ids.indexOf(essence.id) === -1) return cb(null);
            var params = {
                // param_where:{
                //     parent_id:essence.id
                // },
                where:[
                    {
                        key:obj.getTree_parent_key || _t.getTree_parent_key || 'parent_id',
                        val1:essence.id
                    }

                ],
                sort:{
                    columns:['name'],
                    directions:['ASC']
                },
                limit:1000000000,
                collapseData:false
            };
            if (obj.where){
                for (var i in obj.where) {
                    params.where.push(obj.where[i]);
                }
            }
            var o = {
                command:'get',
                object:'Class_operation',
                params:params
            };

            if (_t.getTree_where){
                for (var i in _t.getTree_where) {
                    params.where.push(_t.getTree_where[i]);
                }
            }
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить детей сущности',{params : params, err : err}));
                childs = res;
                cb(null);
            });
        },
        getChildChilds:function(cb){
            if (!childs) return cb(null);
            async.eachSeries(childs, function(item, cb){

                var alias = item.class + '_-_' + item.name;
                item.access_to_operation = access_to_operation_obj_by_alias[alias] || {};

                var params = {
                    // param_where:{
                    //     parent_id:item.id
                    // },
                    where:[
                        {
                            key:obj.getTree_parent_key || _t.getTree_parent_key || 'parent_id',
                            val1:item.id
                        }
                    ],
                    columns:['id','name'],
                    limit:1000000000,
                    // countOnly:true,
                    // sort:{
                    //     columns:['name'],
                    //     directions:['ASC']
                    // },
                    collapseData:false
                };
                var o = {
                    command:'get',
                    object:'Class_operation',
                    params:params
                };

                _t.api(o, function (err, res) {
                    if (err) return cb(new MyError('Не удалось получить детей детей сущности',{params : params, err : err}));
                    // if
                    // item.children = (res.count)? [] : false;
                    item.children = res;
                    // var alias = res.class + '_-_' + res[i].name;
                    // item.children.access_to_operation = access_to_operation_obj_by_alias[alias] || {};
                    cb(null);
                });
            }, cb);
        },
        compileTree:function(cb){
            if (!essence) return cb(null);
            tree.push({
                id:essence.id,
                name:essence.name,
                class_name:(essence.name === '*')? 'is_class' : 'is_method',
                li_attr:(essence.name === '*')? {is_class:true} : {is_class:false},
                name_with_id:essence.name_with_id,
                text:(typeof _t.getTreeNameFunction === 'function')? _t.getTreeNameFunction(essence) : essence.name,
                children:[],
                count:0,
                expanded:true,
                state:{
                    opened:true,
                    selected:!obj.child_tree
                },
                access_to_operation:essence.access_to_operation
            });
            var tree_index = tree.length -1;
            for (var i in childs) {
                // if (need_to_load_ids.indexOf(childs[i].id) === -1 && need_to_load_ids.indexOf(childs[i].parent_id) === -1) return cb(null);
                if (obj.only_ids){
                    if (need_to_load_ids.indexOf(childs[i].id) === -1) continue;
                }

                tree[tree_index].children.push({
                    id:childs[i].id,
                    name:childs[i].name,
                    class_name:(childs[i].name === '*')? 'is_class' : 'is_method',
                    li_attr:(childs[i].name === '*')? {is_class:true} : {is_class:false},
                    name_with_id:childs[i].name_with_id,
                    text:(typeof _t.getTreeNameFunction === 'function')? _t.getTreeNameFunction(childs[i]) : childs[i].name,
                    // children:[],
                    children:!!childs[i].children,
                    // children:(childs[i].children)? [{
                    //     needToLoad:true
                    // }] : [],
                    needToLoadChilds:!!childs[i].children,
                    count:0,
                    access_to_operation:childs[i].access_to_operation
                });
                tree[tree_index].count++;
            }

            if (child_tree){
                console.log('child_node', child_tree);
                for (var i in tree[0].children) {
                    var child_node = tree[0].children[i];
                    if (+child_node.id === +child_tree[0].id){
                        tree[0].children[i] = child_tree[0];
                    }
                }
            }
            cb(null);
        },
        getParent:function(cb){
            if (!essence) return cb(null);
            if (obj.doNotLoadParent) return cb(null);
            essence.parent_id = essence[(obj.getTree_parent_key || _t.getTree_parent_key || 'parent_id')]
            if (!essence.parent_id) return cb(null);
            var params = {
                id:essence.parent_id,
                child_tree:tree,
                only_ids:obj.only_ids
            };
            _t.getTree(params, function(err, res){
                if (err) return cb(err);
                tree = res.tree;
                cb(null);
            })
        }
    },function (err, res) {
        if (err) return cb(err);
        var resTree = tree;
        if (!obj.child_tree){
            resTree = {
                'core': {
                    'data': tree
                }
            };
        }


        cb(null, new UserOk('noToastr',{tree:resTree}));

    });
};

Model.prototype.checkStarOper = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var class_operation_id = obj.class_operation_id;
    if (isNaN(+class_operation_id)) return cb(new MyError('Не передан class_operation_id',{obj:obj}));
    var user_id = obj.user_id;
    if (isNaN(+user_id)) return cb(new MyError('Не передан user_id',{obj:obj}));
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var class_oper;
    var star_oper;
    var access_to_oper_star_row;
    async.series({
        getClassOper:function(cb){
            var o = {
                command:'getById',
                object:'class_operation',
                params:{
                    id:class_operation_id
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить class_operation',{o : o, err : err})); // Could not
                class_oper = res[0];
                cb(null);
            });
        },
        createIfNotExist:function(cb){
            if (class_oper.name === '*') return cb(null);
            async.series({
                getStarOperation:function(cb){
                    var o = {
                        command:'get',
                        object:'class_operation',
                        params:{
                            param_where:{
                                class_id:class_oper.class_id,
                                name:'*'
                            },
                            collapseData:false
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить class_operation для этого класса с *',{o : o, err : err})); // Could not
                        if (!res.length) return cb(new MyError('Нету операции со звездочкой для этого класса. Обновите список операций',{o:o, res:res}));
                        if (res.length > 1) return cb(new MyError('Слишком много операции со звездочкой для этого класса. Проверьте список операций',{o:o, res:res}));
                        star_oper = res[0];
                        cb(null);
                    });
                },
                getStarAccessToOper:function(cb){
                    var params = {
                        param_where:{
                            class_operation_id:star_oper.id,
                            user_id:user_id
                        },
                        collapseData:false
                    };
                    _t.get(params, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить access_to_operation с * для этого пользователя',{params : params, err : err})); // Could not get
                        if (!res.length) return cb(null); // Будем добавлять
                        if (res.length > 1) return cb(new MyError('Слишком много записей в access_to_operation для этого пользователя. Проверьте список access_to_operation',{params:params, res:res}));
                        access_to_oper_star_row = res[0];
                        cb(null);
                    });
                },
                add:function(cb){
                    if (access_to_oper_star_row) return cb(null);
                    var params = {
                        user_id:user_id,
                        class_operation_id:star_oper.id,
                        is_denied:false,
                        rollback_key:rollback_key
                    };
                    _t.add(params, function (err, res) {
                        if (err) return cb(new MyError('Не удалось добавить access_to_operation класса',{params : params, err : err}));

                        cb(null);
                    });
                }
            }, cb);
        }
    },function (err, res) {
        if (err) {
            if (doNotSaveRollback) return cb(err);
            rollback.rollback({obj:obj, rollback_key: rollback_key, user: _t.user}, function (err2) {
                return cb(err, err2);
            });
        } else {
            cb(null, new UserOk('Ок'));
        }
    });
};

Model.prototype.modifyIsDenied = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var class_operation_id = obj.class_operation_id;
    if (isNaN(+class_operation_id)) return cb(new MyError('Не передан class_operation_id',{obj:obj}));
    var user_id = obj.user_id;
    if (isNaN(+user_id)) return cb(new MyError('Не передан user_id',{obj:obj}));
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var access_to_operation;
    async.series({
        checkStarOper:function(cb){
            _t.checkStarOper(obj, cb);
        },
        get:function(cb){
            var params = {
                param_where:{
                    class_operation_id:class_operation_id,
                    user_id:user_id
                },
                collapseData:false
            };

            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить Access_to_operation.',{id:id,err:err}));
                if (!res.length) return cb(null); // Еще не создан.
                access_to_operation = res[0];
                cb(null);
            });
        },
        createIfNotExist:function(cb){
            if (access_to_operation) return cb(null);
            var params = {
                user_id:user_id,
                class_operation_id:class_operation_id,
                is_denied:!!obj.state,
                rollback_key:rollback_key
            };
            _t.add(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось добавить access_to_operation',{params : params, err : err}));

                cb(null);
            });
        },
        modifyIfExist:function(cb){
            if (!access_to_operation) return cb(null);
            if (access_to_operation.is_denied === !!obj.state) return cb(null);
            var params = {
                id:access_to_operation.id,
                is_denied:!!obj.state,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить access_to_operation',{params : params, err : err}));

                cb(null);
            });
        }
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

Model.prototype.modifyIsAccess = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var class_operation_id = obj.class_operation_id;
    if (isNaN(+class_operation_id)) return cb(new MyError('Не передан class_operation_id',{obj:obj}));
    var user_id = obj.user_id;
    if (isNaN(+user_id)) return cb(new MyError('Не передан user_id',{obj:obj}));
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var access_to_operation;
    async.series({
        checkStarOper:function(cb){
            _t.checkStarOper(obj, cb);
        },
        get:function(cb){
            var params = {
                param_where:{
                    class_operation_id:class_operation_id,
                    user_id:user_id
                },
                collapseData:false
            };

            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить Access_to_operation.',{id:id,err:err}));
                if (!res.length) return cb(null); // Еще не создан.
                access_to_operation = res[0];
                cb(null);
            });
        },
        createIfNotExist:function(cb){
            if (access_to_operation) return cb(null);
            var params = {
                user_id:user_id,
                class_operation_id:class_operation_id,
                is_access:!!obj.state,
                rollback_key:rollback_key
            };
            _t.add(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось добавить access_to_operation',{params : params, err : err}));

                cb(null);
            });
        },
        modifyIfExist:function(cb){
            if (!access_to_operation) return cb(null);
            if (access_to_operation.is_access === !!obj.state) return cb(null);
            var params = {
                id:access_to_operation.id,
                is_access:!!obj.state,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить access_to_operation',{params : params, err : err}));

                cb(null);
            });
        }
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

Model.prototype.modifyIsAccessByList = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var class_operation_id = obj.class_operation_id;
    if (isNaN(+class_operation_id)) return cb(new MyError('Не передан class_operation_id',{obj:obj}));
    var user_id = obj.user_id;
    if (isNaN(+user_id)) return cb(new MyError('Не передан user_id',{obj:obj}));
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var access_to_operation;
    async.series({
        checkStarOper:function(cb){
            _t.checkStarOper(obj, cb);
        },
        get:function(cb){
            var params = {
                param_where:{
                    class_operation_id:class_operation_id,
                    user_id:user_id
                },
                collapseData:false
            };

            _t.get(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить Access_to_operation.',{id:id,err:err}));
                if (!res.length) return cb(null); // Еще не создан.
                access_to_operation = res[0];
                cb(null);
            });
        },
        createIfNotExist:function(cb){
            if (access_to_operation) return cb(null);
            var params = {
                user_id:user_id,
                class_operation_id:class_operation_id,
                is_access_by_list:!!obj.state,
                rollback_key:rollback_key
            };
            _t.add(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось добавить access_to_operation',{params : params, err : err}));

                cb(null);
            });
        },
        modifyIfExist:function(cb){
            if (!access_to_operation) return cb(null);
            if (access_to_operation.is_access_by_list === !!obj.state) return cb(null);
            var params = {
                id:access_to_operation.id,
                is_access_by_list:!!obj.state,
                rollback_key:rollback_key
            };
            _t.modify(params, function (err, res) {
                if (err) return cb(new MyError('Не удалось изменить access_to_operation',{params : params, err : err}));

                cb(null);
            });
        }
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

Model.prototype.example = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj}));
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

//FOR ALL MIGRATION

Model.prototype.ALL_MIRGATION_saveJSON = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    const DatamigrationFormationDMWithInvitech = require('../modules/datamigrationFormationDMWithInvitech.js');
    let lil = new DatamigrationFormationDMWithInvitech('saveJSON')
}


module.exports = Model;
