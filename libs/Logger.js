
var moment = require('moment');
var toFile = require('../modules/saveToFile').toFile;

var LogItem = function(obj) {

    this.time = moment();
    this.msg_text = obj.msg || obj.message || 'NO TEXT';
    this.msg = '';
    this.msg += obj.l.s + ': ';
    if (obj.t) this.msg += this.time.format(obj.dt_format || 'DD.MM.YYYY HH:mm:ss') + ' ';
    this.msg += this.msg_text;
    if (typeof obj.data ==='object'){
        for (var i in obj.data) {
            this.msg += '.\r\n    ' + i + ': ';
            this.msg += (typeof obj.data[i]==='object')? JSON.stringify(obj.data[i]) : obj.data[i];
            this.msg += ';';
        }
    }
};
var Logger = function (obj){
    if (typeof obj !== 'object') obj = {};
    var _t = this;
    _t.items = [];
    /**
     * @param obj
     * * msg
     * * c|console: bool; Выводить ли сразу в консоль
     * * l|level: string:e|w|i|l; По умолчанию error - e; Определеят уровень лога Ошибка|Предупреждение|Инфо|Обычный лог
     * * t|time: bool; Добавлять ли время в начале; По умолчанию true
     */
    var get_err_levels = (s)=>{
        var r = {};
        switch (s) {
            case 'error':
            case 'err':
            case 'e':
                r.s = 'ERR';
                r.f = 'error';
                break;
            case 'warning':
            case 'warn':
            case 'w':
                r.s = 'WARN';
                r.f = 'warn';
                break;
            case 'info':
            case 'i':
                r.s = 'INFO';
                r.f = 'info';
                break;
            case 'log':
            case 'l':
            default:
                r.s = 'LOG';
                r.f = 'log';
                break;
        }
        return r;
    };
    _t.c = obj.c || obj.console || true;
    _t.l = get_err_levels(obj.l || obj.level || 'l');
    _t.t = obj.t || obj.time || true;
    _t.add = (obj, data) => {
        if (typeof obj !== 'object') {
            obj = {msg: obj}
        }
        obj.c = obj.c || obj.console || _t.c;
        obj.l = get_err_levels(obj.l || obj.level || _t.l || 'l');
        obj.t = obj.t || obj.time || _t.t || true;
        obj.msg = obj.msg || obj.message;
        obj.data = data;
        var e = new LogItem(obj);
        if (obj.c) console[obj.l.f](e.msg);
        _t.items.push(e);
    };
    this.log = this.add;
    this.l = this.add;
    this.save = (obj, cb) => {
        if (!_t.items) return

        for (var i in _t.items) {
            console.log(_t.items[i].msg);
        }


        var log_file = 'dataMigration_' + moment().format('YYYYMMDD_HHmm');
        var log_file_path = './log/' + log_file;

        var saveObj = {fileName: log_file_path, data: _t.items.map(one => one.msg).join('\n'), error: true, flags:'w'};
        toFile(saveObj, function(err, res){
            console.log(`SAVE LOG ${err? 'ERROR' : 'SUCCESS'}`, log_file_path, err)
        });
    }
};
Logger.prototype.error = function(obj, data){
    if (typeof obj !== 'object') {obj = {msg: obj}}
    obj.l = 'e';
    return this.add(obj, data);
}
Logger.prototype.err = Logger.prototype.error;
Logger.prototype.e = Logger.prototype.error;

Logger.prototype.warning = function(obj, data){
    if (typeof obj !== 'object') {obj = {msg: obj}}
    obj.l = 'w';
    return this.add(obj, data);
}
Logger.prototype.warn = Logger.prototype.warning;
Logger.prototype.w = Logger.prototype.warning;

Logger.prototype.info = function(obj, data){
    if (typeof obj !== 'object') {obj = {msg: obj}}
    obj.l = 'i';
    return this.add(obj, data);
}
Logger.prototype.i = Logger.prototype.info;

Logger.prototype.logtext = function(obj, data){
    if (typeof obj !== 'object') {obj = {msg: obj}}
    obj.l = 'l';
    return this.add(obj, data);
}
Logger.prototype.l = Logger.prototype.log;

// Logger.prototype.log = (obj, data)=>{
//     return this.add(obj, data);
// }


module.exports = Logger;
