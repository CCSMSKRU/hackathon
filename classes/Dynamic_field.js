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


Model.prototype.add_ = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    async.series({
        add:function(cb){
            obj.rollback_key = rollback_key;
            obj.alias = funcs.guidShort();
            _t.addPrototype(obj, function(err, res){
                return cb(err, res);
            });
        }
    },function (err, res) {
        if (err) return cb(err);
        cb(null, new UserOk('Ок', res.add));
    });
};



// "test_select_2_value_id": {
//     "type": "bigint",
//         "length": "20",
//         "table_alias": "table_test_select_2_value_id",
//         "from_table": "measurement_value",
//         "keyword": "[\"id:data_individual_id\",\"|test_select_2_value_id.measurement.id|:measurement_id\"]",
//         "return_column": "id",
//         "is_virtual": true
// },
// "test_select_2_real_value_id_rowId": {
//     "type": "bigint",
//         "length": "20",
//         "join_table_by_alias": "table_test_select_2_value_id",
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
//         "join_table_by_alias": "table_test_select_2_value_id",
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

//test_select_2_value_id,test_select_2_real_value_id_rowId,test_select_2_real_value_id,test_select_2_real_value


// var o = {
//     command:'sync',
//     object:'Dynamic_field',
//     params:{
//         id:3
//     }
// };
// socketQuery(o, function(r){
//     console.log(r);
// })

Model.prototype.sync = function (obj, cb) {
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var id = obj.id;
    if (isNaN(+id)) return cb(new MyError('Не передан id',{obj:obj}));
    var rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    var dynamic_field;
    var class_profile_;
    var client_object_profile_;
    async.series({
        get:function(cb){
            _t.getById({id:id}, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить Dynamic_field.',{id:id,err:err}));
                dynamic_field = res[0];
                cb(null);
            });
        },
        getCP:function(cb){
            var o = {
                command:'getById',
                object:'class_profile',
                params:{
                    id:dynamic_field.source_class_id,
                    collapseData:false
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить client_profile',{o : o, err : err}));
                class_profile_ = res[0];
                cb(null);
            });
        },
        getCOP:function(cb){
            var o = {
                command:'getById',
                object:'client_object_profile',
                params:{
                    id:dynamic_field.target_client_object_id,
                    collapseData:false
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить client_object_profile',{o : o, err : err}));
                client_object_profile_ = res[0];
                cb(null);
            });
        },
        getSourceRow:function(cb){
            var o = {
                command:'get',
                object:dynamic_field.source_class,
                params:{
                    param_where:{
                        id: dynamic_field.id_from_source
                    },
                    collapseData:false
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить dynamic_field.source_class = ' + dynamic_field.source_class ,{o : o, err : err}));
                if (!res.length) {
                    dynamic_field.to_remove = true;
                    return cb(null);
                }
                dynamic_field.source_row = res[0];
                cb(null);
            });
        },
        getCOFProfile:function(cb){
            var o = {
                command:'get',
                object:'client_object_fields_profile',
                params:{
                    param_where:{
                        dynamic_field_id:dynamic_field.id
                    },
                    collapseData:false
                }
            };
            _t.api(o, function (err, res) {
                if (err) return cb(new MyError('Не удалось получить client_object_fields_profile для dynamic_field',{o : o, err : err}));
                dynamic_field.cof_profile_obj_by_name = {};
                for (var i in res) {
                    dynamic_field.cof_profile_obj_by_name[res[i].column_name] = res[i];
                }
                cb(null);
            });
        },
        remove:function(cb){
            if (!dynamic_field.to_remove && !obj.to_remove) return cb(null);
            async.series({
                removeCOP:function(cb){
                    if (!dynamic_field.cof_profile_obj_by_name) return cb(null);
                    async.eachSeries(Object.keys(dynamic_field.cof_profile_obj_by_name), function(cof_profile_name, cb){
                        var cof_profile = dynamic_field.cof_profile_obj_by_name[cof_profile_name];
                        var o = {
                            command:'remove',
                            object:'client_object_fields_profile',
                            params:{
                                id:cof_profile.id,
                                physical:true,
                                rollback_key:rollback_key
                            }
                        };
                        _t.api(o, function (err, res) {
                            if (err) return cb(new MyError('Не удалось удалить client_object_fields_profile',{o : o, err : err}));
                            cb(null);
                        });
                    }, cb);
                },
                removeSelf:function(cb){
                    var params = {
                        id:dynamic_field.id,
                        rollback_key:rollback_key
                    };
                    _t.remove(params, function(err, res){
                        if (err) return cb(err);
                        cb(null);
                    });
                }

            }, cb);
        },
        mergeFields:function(cb){
            if (dynamic_field.to_remove) return cb(null);
            var alias_postfixes = [];
            //test_select_2_value_id,test_select_2_real_value_id_rowId,test_select_2_real_value_id,test_select_2_real_value
            switch (dynamic_field.type_sysname) {
                case "SELECT":
                    alias_postfixes = ['_value_id', '_real_value_rowId', '_real_value_rowId2', '_real_value'];
                    // alias_postfixes = ['_value_id', '_real_value_rowId', '_real_value_rowId2', '_real_value']; // ttv, id from sub_table_select, id from personal select table, value from personal select table
                    break;
                case "TEXT":
                default:
                    alias_postfixes = ['_value_id', '_real_value_rowId', '_real_value'];
                    break;
            }
            for (var i in alias_postfixes) {
                if (dynamic_field.cof_profile_obj_by_name[dynamic_field.alias + alias_postfixes[i]]){
                    dynamic_field.cof_profile_obj_by_name[dynamic_field.alias + alias_postfixes[i]].to_modify = true;
                }else{
                    dynamic_field.cof_profile_obj_by_name[dynamic_field.alias + alias_postfixes[i]] = {
                        to_add:true
                    }
                }
            }
            for (var j in dynamic_field.cof_profile_obj_by_name) {
                if (!dynamic_field.cof_profile_obj_by_name[j].to_modify && !dynamic_field.cof_profile_obj_by_name[j].to_add) dynamic_field.cof_profile_obj_by_name[j].to_remove = true;
            }
            cb(null);
        },
        syncFields:function(cb){
           async.eachSeries(Object.keys(dynamic_field.cof_profile_obj_by_name), function(cof_profile_name, cb){
               var one_cof =  dynamic_field.cof_profile_obj_by_name[cof_profile_name];
                async.series({
                    addOrModify:function(cb){
                        if (!one_cof.to_add && !one_cof.to_modify) return cb(null);
                        var params = {};

                        params.id_from_source = dynamic_field.id_from_source;
                        params.dynamic_field_pair_id = dynamic_field.dynamic_field_pair_id;
                        params.source_class_id = dynamic_field.source_class_id;
                        params.source_class = dynamic_field.source_class;
                        params.table_for_filter = dynamic_field.table_for_filter;
                        params.parent_key_for_filter = dynamic_field.parent_key_for_filter;
                        params.record_key_for_filter = dynamic_field.record_key_for_filter;
                        params.input_key_for_filter = dynamic_field.input_key_for_filter;
                        params.table_value_name_prefix = dynamic_field.table_value_name_prefix;

                        params.modify_in_ext_tbl = false;
                        params.modify_in_ext_tbl_key = '';

                        params.is_inherit = dynamic_field.source_row.inherit || dynamic_field.source_row.is_inherit;


                        switch (cof_profile_name){
                            case dynamic_field.alias + '_value_id':
                                params.sort_no = 940;
                                params.visible = false;
                                params.name = dynamic_field.name + '_value_id';

                                params.type = "bigint";
                                params.field_length = 20;
                                // params.table_alias = "table_test_select_2_value_id"
                                params.table_alias = 'table_' + dynamic_field.alias + '_value_id';
                                // params.from_table = "measurement_value";
                                params.from_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value';
                                // params.keyword = "[\"id:data_individual_id\",\"|test_select_2_value_id.measurement.id|:measurement_id\"]";
                                params.keyword = '["id:' + client_object_profile_.class + '_id","|' + dynamic_field.alias + '|:' + dynamic_field.source_class + '_id"]';
                                params.return_column = "id";
                                params.is_virtual = true;



                                break;
                            case dynamic_field.alias + '_real_value_rowId':
                                params.sort_no = 950;
                                params.visible = false;
                                params.name = dynamic_field.name + '_real_value_rowId';

                                params.type = "bigint";
                                params.field_length = 20;
                                params.join_table_by_alias = 'table_' + dynamic_field.alias + '_value_id';
                                params.join_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value';
                                params.keyword = 'id:' + (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value_id';
                                params.return_column = "id";
                                params.is_virtual = true;

                                params.table_alias = (dynamic_field.type_sysname === 'SELECT')? 'table_' + dynamic_field.alias + '_real_value_rowId2' : undefined;
                                var sub_table_alias = (dynamic_field.type_sysname==='SHORT_TEXT')? '_sub_table_varchar' : '_sub_table_' + dynamic_field.type_sysname.toLowerCase();
                                params.from_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + sub_table_alias;

                                // params.modify_in_ext_tbl = (dynamic_field.type_sysname === 'SELECT');
                                // params.modify_in_ext_tbl_key = (dynamic_field.type_sysname === 'SELECT')? dynamic_field.alias + '_real_value_rowId2' : '';

                                break;
                            case dynamic_field.alias + '_real_value_rowId2':
                                if (dynamic_field.type_sysname !== 'SELECT') return cb(new MyError('Данное поле только для select'));

                                params.sort_no = 960;
                                params.visible = false;
                                params.name = dynamic_field.name + '_real_value_rowId2';

                                params.type = "bigint";
                                params.field_length = 20;
                                params.join_table_by_alias = 'table_' + dynamic_field.alias + '_value_id';
                                params.join_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value';
                                params.table_alias = 'table_' + dynamic_field.alias + '_real_value_rowId2';
                                params.from_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_sub_table_select';

                                params.modify_in_ext_tbl = (dynamic_field.type_sysname === 'SELECT');
                                params.modify_in_ext_tbl_key = (dynamic_field.type_sysname === 'SELECT')? dynamic_field.alias + '_real_value_rowId' : '';

                                params.keyword = 'id:' + (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value_id';
                                params.return_column = "value1";
                                params.is_virtual = true;
                                break;
                            case dynamic_field.alias + '_real_value':
                                params.sort_no = 970;
                                params.name = dynamic_field.name;



                                switch (dynamic_field.type_sysname){
                                    case "SELECT":

                                        params.type_of_editor = 'select2withEmptyValue';
                                        params.select_class = dynamic_field.source_row.sub_table_name_for_select;
                                        params.lov_return_to_column = dynamic_field.alias + '_real_value_rowId2';
                                        params.type = "varchar";
                                        params.field_length = 255;
                                        params.join_table_by_alias = 'table_' + dynamic_field.alias + '_real_value_rowId2';
                                        params.join_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_sub_table_select';
                                        params.from_table = dynamic_field.source_row.sub_table_name_for_select;
                                        params.keyword = 'value1';
                                        params.return_column = "name";
                                        params.is_virtual = true;

                                        params.modify_in_ext_tbl = false;

                                        break;
                                    case "TEXT":
                                        params.type_of_editor = 'text';
                                        params.type = "text";
                                        params.join_table_by_alias = 'table_' + dynamic_field.alias + '_value_id';
                                        params.join_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value';
                                        params.from_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_sub_table_text';

                                        params.modify_in_ext_tbl = true;
                                        params.modify_in_ext_tbl_key = dynamic_field.alias + '_real_value_rowId';
                                        params.keyword = 'id:' + (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value_id';
                                        params.return_column = "value1";
                                        params.is_virtual = true;
                                        break;
                                    case "SHORT_TEXT":
                                        params.type_of_editor = 'text';
                                        params.type = "varchar";
                                        params.field_length = 1000;
                                        params.join_table_by_alias = 'table_' + dynamic_field.alias + '_value_id';
                                        params.join_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value';
                                        params.from_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_sub_table_varchar';
                                        params.modify_in_ext_tbl = true;
                                        params.modify_in_ext_tbl_key = dynamic_field.alias + '_real_value_rowId';
                                        params.keyword = 'id:' + (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value_id';
                                        params.return_column = "value1";
                                        params.is_virtual = true;
                                        break;
                                    case "INTEGER":
                                        params.type_of_editor = 'number';
                                        params.type = "text";
                                        params.join_table_by_alias = 'table_' + dynamic_field.alias + '_value_id';
                                        params.join_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value';
                                        params.from_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_sub_table_integer';
                                        params.modify_in_ext_tbl = true;
                                        params.modify_in_ext_tbl_key = dynamic_field.alias + '_real_value_rowId';
                                        params.keyword = 'id:' + (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value_id';
                                        params.return_column = "value1";
                                        params.is_virtual = true;
                                        break;
                                    case "FLOAT":
                                        params.type_of_editor = 'number';
                                        params.type = "text";
                                        params.join_table_by_alias = 'table_' + dynamic_field.alias + '_value_id';
                                        params.join_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value';
                                        params.from_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_sub_table_float';
                                        params.modify_in_ext_tbl = true;
                                        params.modify_in_ext_tbl_key = dynamic_field.alias + '_real_value_rowId';
                                        params.keyword = 'id:' + (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value_id';
                                        params.return_column = "value1";
                                        params.is_virtual = true;
                                        break;
                                    case "BOOLEAN":
                                        return cb(new MyError('Такой тип поля еще не поддерживаентся BOOLEAN'));
                                        // params.type_of_editor = 'checkbox';
                                        // params.type = "tinyint";
                                        // params.field_length = 1;
                                        // params.join_table_by_alias = 'table_' + dynamic_field.alias + '_value_id';
                                        // params.join_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value';
                                        // params.from_table = (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_sub_table_boolean';
                                        // // params.modify_in_ext_tbl = true;
                                        // // params.modify_in_ext_tbl_key = dynamic_field.alias + '_real_value_rowId';
                                        // params.keyword = 'id:' + (dynamic_field.table_value_name_prefix || dynamic_field.source_class) + '_value_id';
                                        // params.return_column = "value1";
                                        // params.is_virtual = true;

                                        break;
                                    default:
                                        return cb(new MyError('Такой тип поля еще не поддерживаентся'));
                                        break;
                                }
                                break;
                        }
                        var o = {
                            object:'client_object_fields_profile',
                            params:params
                        };
                        // o.params.name = dynamic_field.name;
                        if (one_cof.to_add){
                            o.command = 'add';
                            o.params.column_name = cof_profile_name;
                            o.params.class_id = client_object_profile_.class_id;
                            o.params.client_object_id = dynamic_field.target_client_object_id;
                            o.params.dynamic_field_id = dynamic_field.id;
                            o.params.rollback_key = rollback_key;
                            _t.api(o, function (err, res) {
                                if (err) return cb(new MyError('Не удалось добавить client_object_fields_profile',{o : o, err : err}));

                                cb(null);
                            });
                        }else{
                            o.command = 'modify';
                            o.params.id = one_cof.id;
                            delete o.params.sort_no;
                            o.params.rollback_key = rollback_key;
                            _t.api(o, function (err, res) {
                                if (err) return cb(new MyError('Не удалось изменить client_object_fields_profile',{o : o, err : err}));

                                cb(null);
                            });
                        }
                    }
                }, cb);
           }, cb);
        },
        syncDynamicKeyword:function(cb){
            var join_table_keyword;
            async.series({
                get:function(cb){
                    var o = {
                        command:'get',
                        object:'join_table_keyword',
                        params:{
                            param_where:{
                                alias:dynamic_field.alias
                            },
                            collapseData:false
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось получить join_table_keyword',{o : o, err : err}));
                        join_table_keyword = res[0];
                        cb(null);
                    });
                    
                },
                add:function(cb){
                    if (dynamic_field.to_remove) return cb(null);
                    if (join_table_keyword) return cb(null);
                    var o = {
                        command:'add',
                        object:'join_table_keyword',
                        params:{
                            alias:dynamic_field.alias,
                            linked_id:dynamic_field.id_from_source,
                            rollback_key:rollback_key
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось добавить join_table_keyword',{o : o, err : err}));

                        cb(null);
                    });

                },
                modify:function(cb){
                    if (dynamic_field.to_remove) return cb(null);
                    if (!join_table_keyword) return cb(null);
                    var o = {
                        command:'modify',
                        object:'join_table_keyword',
                        params:{
                            id:join_table_keyword.id,
                            linked_id:dynamic_field.id_from_source,
                            rollback_key:rollback_key
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось изменить join_table_keyword',{o : o, err : err}));
                        cb(null);
                    });

                },
                remove:function(cb){
                    if (!dynamic_field.to_remove) return cb(null);
                    if (!join_table_keyword) return cb(null);
                    var o = {
                        command:'remove',
                        object:'join_table_keyword',
                        params:{
                            id:join_table_keyword.id,
                            rollback_key:rollback_key
                        }
                    };
                    _t.api(o, function (err, res) {
                        if (err) return cb(new MyError('Не удалось удалить join_table_keyword',{o : o, err : err}));

                        cb(null);
                    });
                }
            }, cb);
        },
        clearCache:function(cb){
            // Очистим кеш для профиля
            if (!client_object_profile_) return cb(null);
            var o = {
                command: '_clearCache',
                object: client_object_profile_.class,
                params:{}
            };
            _t.api(o, function (err) {
                if (err) return cb(new MyError('Не удалось очистить кеш ' + client_object_profile_.class, {err:err}));
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
            if (!doNotSaveRollback){
               rollback.save({rollback_key:rollback_key, user:_t.user, name:_t.name, name_ru:_t.name_ru || _t.name, method:'sync', params:obj});
            }
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

module.exports = Model;
