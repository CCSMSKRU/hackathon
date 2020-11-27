/**
 * Created by igoptarev on 22.07.2015.
 */
var fs = require('fs');
var config = require('../config');
var MyError = require('../error/index').MyError;

var data = {
    items: [],
    getItem: function (name, callback) {
        if (typeof callback !== 'function') {
            return console.log('В DataMigration.getItem не передана функция callback');
        }
        if (typeof name !== 'string') {
            return callback(new MyError('В DataMigration.getItem не переданы объект'))
        }
        var instance;
        for (var i in data.items) {
            var item = data.items[i];
            if (item.name == name){
                instance = item;
                break;
            }
        }
        if (instance){
            return callback(null, instance);
        }
        var path = config.root+'node/dataMigration/instances/' + name + '.js';
        fs.exists(path, function (exists) {
            if (!exists) return callback(new MyError('Обмен еще не реализован.', name));
            instance = require(path);
            data.items.push(instance);
            return callback(null, instance)
        });
    }
};

module.exports = data;