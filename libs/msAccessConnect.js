var config = require('../config');
var async = require('async');
var MyError = require('../error').MyError;
if (global.platform !== 'win32'){
    msAccess = function(){

    }
    msAccess.query = function (obj, cb) {
        return cb(new MyError('Данная функция доступна только для ОС Windows'));
    }
    module.exports = msAccess;
    return;
}




var ADODB = require('node-adodb');
ADODB.debug = true;
var msAccess = ADODB.open('Provider=Microsoft.ACE.OLEDB.12.0;Data Source=./DB/msaccess/Eco_Tax_V1.11_backend_2017.06.07.accdb;Persist Security Info=False;');

msAccess.queryPrototype = msAccess.query;

msAccess.query = function(obj, cb){
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    var q = obj.q;
    msAccess.queryPrototype(q)
        .on('done', function(data) {
            console.log(JSON.stringify(data, null, 2));
            console.log(data);
            return cb(null, data)
        })
        .on('fail', function(error) {
            console.log(error);
            return cb(error);
        });
};



module.exports = msAccess;
