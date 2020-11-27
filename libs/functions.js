var moment = require('moment');
var MyError = require('../error').MyError;
var async = require('async');

var funcs = {
    guid: function () {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r, v;
            r = Math.random() * 16 | 0;
            v = (c === "x" ? r : r & 0x3 | 0x8);
            return v.toString(16);
        }).toUpperCase();
    },
    guidShort: function () {
        return "xxxxxxxx".replace(/[xy]/g, function (c) {
            var r, v;
            r = Math.random() * 16 | 0;
            v = (c === "x" ? r : r & 0x3 | 0x8);
            return v.toString(16);
        }).toUpperCase();
    },
    guid12: function () {
        return "xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r, v;
            r = Math.random() * 16 | 0;
            v = (c === "x" ? r : r & 0x3 | 0x8);
            return v.toString(16);
        }).toUpperCase();
    },
    randomInt: function(min, max) {
        var rand = min - 0.5 + Math.random() * (max - min + 1);
        rand = Math.round(rand);
        return rand;
    },
    hashCode: function (str) {
        var hash = 0, i, chr;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    },
    formatResponse: function (code, type, message, data) {
        code = code || 0;
        var o = {
            code: code,
            toastr: {
                type: type,
                message: message
            }
        };
        if (data){
            o.data = data;
            if (!isNaN(data.count)){
                o.totalCount = data.count;
                delete data.count;
            }
        }

        return o;
    },
    getDateTimeMySQL: function (d, format) {
        format = format || 'DD.MM.YYYY HH:mm:ss';
        if (d){
            if (moment(d,format).isValid()){
                return moment(d, format).format('YYYY-MM-DD HH:mm:ss');
            }else{
                return d;
            }
        }else if (d===''){
            return null;
        }
        return moment().format('YYYY-MM-DD HH:mm:ss');
    },
    getDateMySQL: function (d, format) {
        format = format || 'DD.MM.YYYY';
        if (d){
            if (moment(d,format).isValid()){
                return moment(d,format).format('YYYY-MM-DD');
            }else{
                return d;
            }
        }else if (d===''){
            return null;
        }
        return moment().format('YYYY-MM-DD');
    },
    getDate: function (d, format) {
        format = format || 'DD.MM.YYYY';
        if (d){
            if (moment(d,format).isValid()){
                return moment(d,format).format('DD.MM.YYYY');
            }else{
                return d;
            }
        }else if (d===''){
            return null;
        }
        return moment().format('DD.MM.YYYY');
    },
    getDateTime: function (d, format) {
        format = format || 'DD.MM.YYYY HH:mm:ss';
        if (d){
            if (moment(d,format).isValid()){
                return moment(d, format).format('DD.MM.YYYY HH:mm:ss');
            }else{
                return d;
            }
        }else if (d===''){
            return null;
        }
        return moment().format('DD.MM.YYYY HH.mm.ss');
    },
    date_A_more_B: function (a,b,format) {
        format = format || 'DD.MM.YYYY';
        var a1 = moment(a, format);
        var b1 = moment(b, format);
        return a1 > b1;
    },
    date_A_more_or_equal_B: function (a,b,format) {
        format = format || 'DD.MM.YYYY';
        var a1 = moment(a, format);
        var b1 = moment(b, format);
        return a1 >= b1;
    },
    parseBlob: function(arr){
        if (typeof arr!=='object'){
            return arr;
        }
        return arr.toString();
    },
    parseBool: function(val){
        return !!val;
    },
    parseFriendlyBool: function(val, lang){
        val = !isNaN(+val)? +val : val;
        switch (lang) {
            case 'en': return !!val? 'Yes' : 'No';
            default: return !!val? 'Да' : 'Нет';
        }
    },
    formatMoney: function(val){
        if (!val) val = 0;
        if (isNaN(+val)) return val;
        return +val.toFixed(2);
    },
    formatPercent: function(val){
        if (!val) val = 0;
        if (isNaN(+val)) return val;
        return val.toFixed(2);
    },
    nullToString: function(val){
        return (val === null)? '' : val;
    },
    returnVasja: function(val){
        return 'Вася';
    },
    age: function(val,f){
        f = f || "YYYY-MM-DD";
        if (!moment(val, f).isValid()){
            return val;
        }
        var a = moment(val,f);
        var b = moment();
        return b.diff(a,'years');
    },
    userFriendlyDate: function(val){
        if (!moment(val).isValid()){
            return val;
        }
        var a = moment(val).format('DD.MM.YYYY');
        return a;
    },
    userFriendlyDateTime: function(val){
        if (!moment(val).isValid()){
            return val;
        }
        var a = moment(val).format('DD.MM.YYYY HH:mm:ss');
        return a;
    },
    clearEmpty: function(arr) {
        if (typeof arr!=='object'){
            return arr;
        }
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === undefined) {
                arr.splice(i, 1);
                funcs.clearEmpty();
            }
        }

    },
    between: function (a, b) {
        var min = Math.min.apply(Math, [a, b]),
            max = Math.max.apply(Math, [a, b]);
        return this > min && this < max;
    },
    validation:{
        isDate:function(val,format){
            if (!val) return false;
            return moment(val,(format || 'DD.MM.YYYY')).isValid();
        },
        notNull:function(val){
            if (val === undefined || val === null) return false;
            return (String(val).length>0);
        },
        number:function(val){
            if (val==='' && val!==null){
                return false;
            }
            return !isNaN(+val);
        },
        url:function(val){
            var regExp = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?/;
            return regExp.test(val);
        },
        email:function(val){
            //var regExp = /^([\w\._]+)@\1\.([a-z]{2,6}\.?)$/;
            var regExp = /.+@.+\..+/i;
            return regExp.test(val);
        }
    },
    makeQuery: function (options, callback) {
        var xml = "<query>";
        //if (options && typeof options === "object" && options.object && options.command) {
        if (options && typeof options === "object" && options.command) {
            if (options.hasOwnProperty("params")) {
                for (var key in options.params) {
                    xml += "<" + key + ">" + options.params[key] + "</" + key + ">";
                }
                //delete options.params;
            }
            for (var key in options) {
                if (key == "params") continue;
                xml += "<" + key + ">" + options[key] + "</" + key + ">";
            }
            xml += "</query>";
        }
        return xml;
    },
    jsonToObj: function (obj) {
        var obj_true = {};
        var objIndex = {};
        for (i in obj['data']) {
            for (var index in obj['data_columns']) {
                if (obj_true[i] == undefined) {
                    obj_true[i] = {};
                }
                obj_true[i][obj['data_columns'][index]] = obj['data'][i][index];
            }
        }
        return obj_true;
    },
    cloneObj: function (obj, depth, currentDepth) {
        depth = (typeof depth!=='undefined')? depth : 10000;
        funcs.cloneObjCounter = currentDepth || 0;
        if (obj == null || typeof(obj) != 'object') {
            return obj;
        }
        var temp = {};
        if (Array.isArray(obj)){
            temp = [];
        }
        for (var key in obj) {
            if (key == 'socket') continue;
            if (funcs.cloneObjCounter<depth){
                //funcs.cloneObjCounter++;
                temp[key] = this.cloneObj(obj[key], depth, funcs.cloneObjCounter);
            }

        }
        return temp;
    },
    countObj: function (obj) {
        if (typeof obj !== "object") {
            return -1;
        }
        var counter = 0;
        for (var i in obj) {
            counter++;
        }
        return counter;
    },
    supplementObj: function (obj1 = {}, obj2 = {}) {
        if (obj1 === null || typeof obj1 !== 'object') throw 'supplementObj: obj1 is not an object'
        if (obj2 === null || typeof obj2 !== 'object') throw 'supplementObj: obj2 is not an object'

        const res = {...obj1, ...obj2}
        Object.keys(res).forEach(key => {
            if (typeof obj1[key] === 'object' && obj1[key] !== null
                && typeof obj2[key] === 'object' && obj2[key] !== null){
                res[key] = funcs.supplementObj(obj1[key], obj2[key])
            }
        })
        return res
    },
    collapseData: function (arr, extra_data, data_columns) {
        if (typeof arr!='object'){
            return new MyError('В функцию collapseData пришли не верные данные',arr);
        }
        var o = {
            data_columns: data_columns || [],
            data: [],
            extra_data: extra_data || {}
        };
        var dataColumns = data_columns || [];
        for (var i0 in arr[0]) {
            dataColumns.push(i0);
        }
        for (var i in arr) {
            var row = arr[i];
            o.data[i] = {};
            for (var j in dataColumns) {
                o.data[i][j] = row[dataColumns[j]];
            }
        }
        o.data_columns = dataColumns;
        o.code = 0;
        return o;
    },
    fieldSorter: function(fields) {
        return function (a, b) {
            return fields
                .map(function (o) {
                    var dir = 1;
                    if (o[0] === '-') {
                        dir = -1;
                        o=o.substring(1);
                    }
                    a[o] = (!isNaN(+a[o]) && a[o]!=='')? +a[o] : a[o];
                    b[o] = (!isNaN(+b[o]) && b[o]!=='')? +b[o] : b[o];
                    if (a[o] > b[o]) return dir;
                    if (a[o] < b[o]) return -(dir);
                    return 0;
                })
                .reduce(function firstNonZeroValue (p,n) {
                    return p ? p : n;
                }, 0);
        };
    },
    splitByPortion:function(obj,portionFunction, cbFull){
        var portions = [];
        var inPortion = obj.inPortion || 200;
        var maxProcess = obj.maxProcess || 2;
        var data = obj.data || [];
        while (data.length !== 0) {
            for (var i = 0; i<maxProcess; i++) {
                if (!portions[i]) portions[i] = [];
                var item = data.shift();
                if (!item) continue;
                portions[i].push(item);
            }
        }

        var cnt = 0;
        async.each(portions, function (item, cb) {
            var portions2 = [];
            var counter = 0;
            while (item.length !== 0) {
                var arr = portions2[counter++] = [];
                for (var i = 0; i < inPortion; i++) {
                    var item2 = item.shift();
                    if (!item2) continue;
                    arr.push(item2);
                }
            }

            async.eachSeries(portions2,function (item2, cb) {
                portionFunction(item2,function(err, res){
                    return cb(err, res);
                });

            },cb);

        }, function (err, r) {
            cbFull(err, r);
        });
    },



};
module.exports = funcs;
