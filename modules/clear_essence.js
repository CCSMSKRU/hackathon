var MyError = require('../error').MyError;
var UserError = require('../error').UserError;
var UserOk = require('../error').UserOk;
var async = require('async');
var funcs = require('../libs/functions');

var fs = require('fs');
var moment = require('moment');
var Logger = require('../libs/Logger');

var prepare_script = function(obj, cb){
    obj = obj || {};
    var essence = obj.class;
    var exclude = obj.exclude || {}; //{class_name:[1,2,3]}


    var structure;
    var str_arr = [];
    async.series({
        readFile:cb => {
            fs.readFile('./models/system/tables.json', function (err, data) {
                if (err) return cb(new MyError('Не удалось считать структуры таблиц из файла.', {err:err, file:'tables.json'}));
                var tablesJSON = data.toString();
                try {
                    structure = JSON.parse(tablesJSON);
                } catch (e) {
                    return cb(new MyError('Информация по таблцам (tables.json или другие) имеет не верный формат.', {e:e}));
                }
                return cb(null);
            });
        },
        prepareSQL:cb => {
            if (!structure) return cb(new MyError('!strucrure'));
            if (!structure[essence]) return cb(new MyError('В структуре нет данной сущности',{essence,structure}));

            var sql = `DELETE IGNORE FROM ${pool.escapeId(essence.toLowerCase())}`;
            if (exclude[essence] && exclude[essence].length) sql += ` WHERE id NOT IN (${exclude[essence].join(',')})`;
            sql += ';';
            str_arr.push(sql);

            var getDepend = (class_)=>{
                var arr = [];
                Object.keys(structure).forEach(key=>{
                    var item = structure[key].profile;
                    if (item.server_parent_table !== class_ || key === class_ || !item.server_parent_key) return [];
                    var sql = `DELETE IGNORE FROM ${pool.escapeId(key.toLowerCase())} WHERE ${item.server_parent_key} NOT IN (SELECT id FROM ${pool.escapeId(class_.toLowerCase())})`;
                    if (exclude[key] && exclude[key].length) sql += ` AND id NOT IN (${exclude[key].join(',')})`;
                    sql += ';';
                    arr.push(sql);
                    var sqls_arr = getDepend(key);
                    arr = [...arr, ...sqls_arr]
                });
                return arr;
            }
            var depend_arr = getDepend(essence) || [];
            str_arr = [...str_arr, ...depend_arr];
            return cb(null);

        }
    }, function (err, res) {
        if (err) return cb(err);
        cb(null, new UserOk('noToastr',{data:str_arr}));
    });
};

module.exports.prepare_script = prepare_script;
