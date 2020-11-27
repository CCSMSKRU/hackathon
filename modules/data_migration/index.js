var MyError = require('../../error').MyError;
var UserError = require('../../error').UserError;
var UserOk = require('../../error').UserOk;
var async = require('async');
var rollback = require('../../modules/rollback');
var funcs = require('../../libs/functions');
var config = require('../../config');
var apiPrototype = require('../../libs/api');

var fs = require('fs');
var moment = require('moment');
var Logger = require('../../libs/Logger');

var checkCode = function (obj) {
    var res = obj.resultJSON;
    if (res.code) {
        return false;
    }
    return funcs.jsonToObj(res);
};




var DataMigration = function (obj) {
    if (typeof obj !== 'object') {
        return new MyError('В конструктор DataMigration не передан объект');
    }
    if (!obj.name) {
        return new MyError('В конструктор DataMigration не передан obj.name');
    }
    this.name = obj.name;
    this.name_ru = obj.name_ru || obj.name;
    this.dependenceForExport = obj.dependenceForExport? {...obj.dependenceForExport} : {};
    this.dependenceForImport = obj.dependenceForImport? {...obj.dependenceForImport} : {};
    this.mergedWith_key = obj.mergedWith_key || 'MERGEDWITH__';
};

// DataMigration.prototype.exportToJSON = function(obj,client,cb) {
//     if (typeof obj!="object"){
//         console.log('В exportToJSON не передан obj');
//         return;
//     }
//     if (typeof client!='object'){
//         console.log('В exportToJSON не передан client');
//         return;
//     }
//     var parent_id = obj.id;
//     var sid = client.sid;
//     if (!parent_id || !sid){
//         console.log('Не передан id (obj.id) или sid (client.sid)');
//         return;
//     }
//     var dependence = this.dependenceForExport || {};
//     var file_name = obj.file_name || dependence.parent.name + '_'+parent_id+'('+config.host+')';
//
//
//     var results = {};
//     results[dependence.parent.key] = dependence.parent;
//
//
//     //------------------------------------------------------------------------------------------------------------------------
//     async.waterfall([
//             function(cb){
//                 var o = {
//                     command: "get",
//                     object: dependence.parent.name,
//                     sid: sid,
//                     params: {
//                         where: dependence.parent.key +' = '+parent_id
//                     }
//                 };
//                 oracle.execute({
//                     o: o, cb: function (obj) {
//                         var data = checkCode(obj);
//                         if (!data){
//                             return cb (obj);
//                         }
//                         if (data.length==0){
//                             return cb(new MyError('Не существует такой сущности',{name:dependence.parent.name,id:parent_id}));
//                             /*client.cSocket.emit('log','Нет такой схемы');
//                             return;*/
//                         }
//                         data = data[0];
//                         cb(null,data);
//                     }
//                 });
//             },
//             function(data, cb){
//                 // Сохраним поля сущьности
//                 for (var i in data) {
//                     if (i.indexOf('_ID')!=-1 && i !== dependence.parent.key){
//                         continue;
//                     }
//                     results[i] = data[i];
//                 }
//                 async.eachSeries(dependence.items,function(item,cb){
//                     var o = {
//                         command: "get",
//                         object: item.object,
//                         sid: sid,
//                         params: {}
//                     };
//                     if (item.useWhere){
//                         o.params.where = dependence.parent.key + ' = '+parent_id
//                     }else{
//                         o.params[dependence.parent.key] = parent_id
//                     }
//                     oracle.execute({
//                         o: o, cb: function (obj) {
//                             console.time('checkCode');
//                             var data = checkCode(obj);
//                             console.timeEnd('checkCode');
//                             if (!data){
//                                 return cb(obj);
//                             }
//                             console.time(item.name);
//                             results[item.name] = funcs.cloneObj(data);
//                             console.timeEnd(item.name);
//                             console.log(data);
//                             cb(null,null);
//                         }
//                     });
//                 },function(err, res){
//                     console.log('ALL_LOADED');
//                     if(err){
//                         return cb(err, res);
//                     }
//                     var fileName = config.root_public+'savedFiles/' + file_name + '.json';
//                     var publicFileName = 'savedFiles/' + file_name + '.json';
//                     console.time('JSON');
//                     var data = JSON.stringify(results);
//                     console.timeEnd('JSON');
//                     toFile({fileName: fileName, flags:"w", data: data},function(err){
//                         if (err){
//                             console.log(err, res);
//                             //process.exit();
//                         }
//                         cb(err,publicFileName);
//                     });
//                 })
//             }
//         ]
//         ,function(err,filename){
//             if (err){
//                 return cb({code:-1,type:'error',message:err});
//             }
//             //console.log(cb);
//             return cb({code:0,filename:filename});
//         });
//     //------------------------------------------------------------------------------------------------------------------------
//
//
//
// };

DataMigration.prototype.importFromJSON = function(obj, cb) {
    if (arguments.length === 1) {
        cb = arguments[0];
        obj = {};
    }
    var _t = this;
    var t1 = new Date();

    let rollback_key = obj.rollback_key || rollback.create();
    var doNotSaveRollback = obj.doNotSaveRollback || !!obj.rollback_key;

    if (typeof obj != "object") return cb(new MyError('В importFromJSON не передан obj', {obj:obj}));

    // var apiPrototype = obj.api;
    // if (typeof apiPrototype !== 'function') return cb(new MyError('В importFromJSON не передан api', {obj:obj}));
    var user = funcs.cloneObj(obj.user);
    if (typeof user !== 'object') return cb(new MyError('В importFromJSON не передан user', {obj:obj}));
    _t.api = (o, cb)=>{
        apiPrototype(o, cb, user);
    };
    delete obj.api;
    delete obj.user;

    var logger = new Logger({l:'e',c:true}); // Error по умолчанию для log
    _t.logger = logger;
    var log = logger.log;
    logger.i('Старт importFromJSON');


    var filename = obj.filename;

    _t.data = _t.data || obj.data;
    _t.existing_fields = {};
    if (!filename && !_t.data) return cb(new MyError('В importFromJSON не передан ни filename ни data. Также this.data не определена в инстансе. ' +
        'Если загрузка данных идет в инстансе, то определите там this.data = {}', {obj:obj}));

    /* Этот объект описывает зависимости сущьностей */
    var dependence = this.dependenceForImport? {...this.dependenceForImport} : {};
    if (dependence.ext_system_name.indexOf('|') !== -1) return cb(new MyError('Имя системы (ext_system_name) из которой импортируются данные не должно содержать знак"|"',{ext_system_name:dependence.ext_system_name}));
    dependence.logger = _t.logger;

    var head_rec_id;
    async.series({
        readFile: cb => {
            // считать и распарсить JSON
            if (_t.data) return cb(null);
            fs.exists(filename, function (exists) {
                if (!exists) return cb('Файл не существует ' + filename);
                var file = fs.readFileSync(filename, {encoding: 'utf-8'});
                try {
                    _t.data = JSON.parse(file);
                } catch (e) {
                    return cb('Не корректный формат JSON в файле ' + filename);
                }
                for (var i in dependence.order) {
                    if (typeof dependence.order[i] !== 'string') continue;
                    if (typeof _t.data[i] !== 'object') _t.data[i] = {};
                }
                cb(null);
            });
        },
        doImport: cb => {
            if (!Array.isArray(dependence.order) || typeof dependence.items !== 'object') {
                logger.w('dependence.order не является массивом или dependence.items не является объектом',{dependence:dependence});
                return cb(new MyError('dependence.order не является массивом или dependence.items не является объектом',{dependence:dependence}));
            }
            for (var o_i in dependence.order) {
                if (typeof dependence.items[dependence.order[o_i]] !== 'object' && typeof dependence.items[dependence.order[o_i]] !== 'function'){
                    logger.w('Для одного из элементов order нет соответствующего объекта в items',{key:dependence.order[o_i], dependence:dependence});
                    return cb(new MyError('Для одного из элементов order нет соответствующего объекта в items',{item: dependence.order[o_i],items:dependence.items}));
                }
            }
            if (!_t.data) _t.data = {};

            var getAdaptedFieldValue = function(field_, data, existing_fields = [], instance_){
                // return (typeof field_ != 'object') ? ((typeof data[field_]!== 'undefined')? data[field_] : field_) || field_ : function () {
                // Теперь если поле не найдено как поле, то подставляется null. Чтобы подставить конкретное значение, можно использовать func у описания поля
                // return (typeof field_ != 'object') ? ((typeof data[field_]!== 'undefined')? data[field_] : null) || field_ : function () {
                // return (typeof field_ != 'object') ? ((typeof data[field_]!== 'undefined')? data[field_] : null) : function () {
                // Новая задача выглядит следующем образом: Если такого поля в принципе не существует, то значение как есть,
                // но если оно в принципе есть, но нет в этой записи, то null
                return (typeof field_ != 'object') ?
                    (() => {
                        // ((existing_fields.indexOf(field_) !== -1 && typeof data[field_]!== 'undefined')? data[field_] : null)
                        if (existing_fields.indexOf(field_) === -1) return field_;
                        return (typeof data[field_] !== 'undefined') ? data[field_] : null;
                    })()
                    :
                    (() => {
                        var ext_fields = field_.ext_fields;

                        var res_str = null;
                        if (Array.isArray(ext_fields)) {
                            for (var i in ext_fields) { // Каждое поле может быть таким же объектом как и входной. То есть может иметь ext_key и|или func
                                var val = getAdaptedFieldValue(ext_fields[i], data, existing_fields, instance_);
                                // if (val === null) val = '';
                                if (val === null) continue;
                                if (res_str === null) res_str = '';
                                res_str += val;
                            }
                        }

                        var func = field_.func;
                        if (typeof func === 'function') {
                            res_str = func(res_str, instance_);
                        }
                        return (typeof res_str !== 'undefined')? res_str : null;
                    })();
            };
            
            async.eachSeries(dependence.order, function(key, cb){

                var import_item = dependence.items[key];





                if (typeof import_item != 'function' && typeof import_item != 'object') {
                    log('import_item Не определен. Должен быть объектом или функцией. ' + key + '. import_item = ' + import_item);
                    return cb(null);
                }
                if (typeof import_item === 'function'){
                    logger.i(`Элемент (${key}) в списке импорта - функция. Процесс пойдет дальше после вызова cb в теле этой функции`);
                    import_item(dependence, (err, res)=>{
                        if (err){
                            log(`Во время выполнения функции (${key}) из списка импорта произошла ош. Процесс будет остановлен.`,{err:err});
                            return cb(err);
                        }
                        _t[key + '_res'] = res;
                        cb(null);
                    }, _t.api);
                    return; // Выполним функцию и вызовем колбек
                }

                // Если это все же название класса для импорта, то начнем
                import_item.data = import_item.data || _t.data[import_item['data_key'] || key];
                // Подготовим existing_fields
                if (import_item.data){
                    if (!_t.existing_fields[import_item.name]) _t.existing_fields[import_item.name] =[];
                    for (var i0 in import_item.data){

                        for (var k in import_item.data[i0]) {
                            if (_t.existing_fields[import_item.name].indexOf(k) === -1) _t.existing_fields[import_item.name].push(k);
                        }
                    }
                }

                import_item.dependence_classes = {}; // Объект для хранения зависимых данных
                // if (typeof dependence.pages[key] !== "undefined" && dependence.pages[key] === false) return cb(null);

                if (typeof import_item.data !== 'object'){
                    log(`Для элемента (${key}) не определены данные. Они могут быть определены в самом элементе или быть в объекте data инстанса, 
                            под соответствующем ключем (одноименный или определенный параметром data_key) - "${import_item['data_key'] || key}".
                            Процесс импорта будет остановлен.`);
                    return cb(new MyError(`Для элемента (${key}) не определены данные.`,{key:key, data_key:import_item['data_key'] || key}));
                }



                import_item.data_obj = {}; // Объект с данными по id из внешней системы
                import_item.data_obj_toMerge = {}; // Объект с данными по id из внешней системы по типу действия
                import_item.data_obj_toAdd = {}; // Объект с данными по id из внешней системы по типу действия
                for (var i in import_item.data) {
                    let extId_key = import_item.key || 'id';
                    let ext_id = import_item.data[i][extId_key];
                    if (import_item.data_obj[ext_id]){
                        log(`Входные данные для "${key}" содержат дубликаты по первичному ключу (${extId_key}). 
                                Процесс импорта будет остановлен.`, {data1:import_item.data_obj[ext_id], data2:import_item.data[i]});
                        return cb(new UserError('Дублирующиеся входные данные.',{key:key, data1:import_item.data_obj[ext_id], data2:import_item.data[i]}))
                    }
                    // Преобразуем входные данные согласно параметрам для каждого поля.
                    // import_item.data_obj[ext_id] = import_item.data[i];
                    import_item.data_obj[ext_id] = {};
                    import_item.data_obj[ext_id].ext_id = ext_id;
                    import_item.data_obj[ext_id].ext_fields = {};
                    // import_item.existed_fields = [];
                    for (var fKey in import_item.fields) {
                        if (fKey === extId_key){
                            log('Ключевое поле не может быть преобразовано. Если таковое преобразование все же необходимо, сделайте его заранее.',{fKey:fKey, key:key});
                            continue;
                        }
                        // if (import_item.existed_fields.indexOf(fKey) === -1) import_item.existed_fields.push(fKey);
                        var tmp = getAdaptedFieldValue(import_item.fields[fKey], import_item.data[i], _t.existing_fields[import_item.name], dependence);
                        import_item.data_obj[ext_id].ext_fields[fKey] = tmp;
                    }
                }
                if (!Object.keys(import_item.data_obj).length){
                    logger.i(`Отсутствуют входные данные. Процесс импорта будет продолжен`,{key:key});
                    return cb(null);
                }

                let class_name = import_item['class_name'] || import_item['name'] || key;

                async.series({
                    prepare: cb => {
                        async.series({
                            getByExtIds: cb => {

                                var o = {
                                    command:'get',
                                    object: class_name,
                                    params:{
                                        where:[
                                            {
                                                key:'ext_id',
                                                type:'in',
                                                val1:Object.keys(import_item.data_obj)
                                            },
                                            {
                                                key:'ext_system_alias',
                                                type:'like',
                                                val1:`${dependence.ext_system_name}|`
                                            }
                                        ],
                                        collapseData:false,
                                        limit:10000000000
                                    }
                                };
                                var where_ = (typeof import_item.where ==='object')? import_item.where : (typeof import_item.where ==='string')? (()=>{
                                    var w;
                                    try {
                                        w = JSON.parse(import_item.where);
                                    } catch (e) {
                                        return cb(new MyError('Для одного из элементов импорта, некоректно указан where',{e:e, import_item:import_item}));
                                    }
                                    return w;
                                })() : false;
                                if (Array.isArray(where_)) o.params.where = o.params.where.concat(where_);
                                _t.api(o, (err, res)=>{
                                    if (err) return cb(new MyError('Не удалось получить данные по extId',{o : o, err : err}));
                                    for (var i in res) {
                                        // import_item.data_obj[res[i].ext_id].toMerge = true;
                                        // import_item.data_obj[res[i].ext_id].in_fields = res[i];
                                        let extId = res[i].ext_id;
                                        if (!import_item.data_obj[extId]) continue;
                                        import_item.data_obj_toMerge[extId] = import_item.data_obj[extId];
                                        import_item.data_obj_toMerge[extId].in_fields = res[i];
                                        delete import_item.data_obj[extId];
                                    }
                                    cb(null);
                                });
                            },
                            getBySearchFields: cb => {
                                if (typeof import_item.search_fields !== 'object' || !(import_item.search_fields.length > 0)) return cb(null);

                                var search_fields_arr = [];

                                var data_extIds_obj_by_alias = {};
                                for (var i1 in import_item.data_obj) {
                                    var one_data = import_item.data_obj[i1];
                                    // if (one_data.toMerge) continue; // Уже найдена по extId
                                    var p = {};
                                    var alias = '';
                                    for (var sf_i in import_item.search_fields){
                                        let field_name = import_item.search_fields[sf_i];
                                        alias += one_data.ext_fields[field_name] + '_---_';
                                        // if (!p[field_name]) p[field_name] = [];
                                        // p[field_name].push(one_data[field_name] || '');
                                        p[field_name] = one_data.ext_fields[field_name] || '';
                                    }
                                    search_fields_arr.push(p);
                                    alias = funcs.hashCode(alias);
                                    data_extIds_obj_by_alias[alias] = one_data;
                                }
                                var g_res = [];
                                funcs.splitByPortion({
                                    data:search_fields_arr,
                                    inPortion:200, // Это макс размер порции - будет 200 where
                                    maxProcess:obj.maxProcess || config.get('maxProcess') || 1
                                }, (items, cb)=>{
                                    var o = {
                                        command:'get',
                                        object:class_name,
                                        params:{
                                            where:[ // Вроде можно влить данные в записи импортированные из других систем
                                                // {
                                                //     key:'ext_id',
                                                //     type:'isNull'
                                                // }
                                                // ,
                                                // {
                                                //     key:'ext_system_alias',
                                                //     type:'isNull'
                                                // }
                                            ],
                                            collapseData:false,
                                            limit:10000000000
                                        }
                                    };
                                    
                                    for (var sf_i2 in items) {
                                        for (var sfI2Key in items[sf_i2]) {
                                            o.params.where.push({
                                                key:sfI2Key,
                                                val1:items[sf_i2][sfI2Key],
                                                group:`dataMigration_orGroup${sf_i2}.OR`
                                            });
                                        }

                                    }
                                    var where_ = (typeof import_item.where ==='object')? import_item.where : (typeof import_item.where ==='string')? (()=>{
                                        var w;
                                        try {
                                            w = JSON.parse(import_item.where);
                                        } catch (e) {
                                            return cb(new MyError('Для одного из элементов импорта, некоректно указан where',{e:e, import_item:import_item}));
                                        }
                                        return w;
                                    })() : false;
                                    if (Array.isArray(where_)) o.params.where = o.params.where.concat(where_);

                                    // console.log('asdasd o.params.where', o.params.where);
                                    // return ;
                                    _t.api(o, (err, res)=>{
                                        if (err) return cb(new MyError('Не удалось получить данные по extId',{o : o, err : err}));
                                        g_res = g_res.concat(res);
                                        cb(null);
                                    });
                                }, (err)=>{
                                    if (err) return cb(err);
                                    for (var i in g_res) {
                                        var one_data = g_res[i];
                                        var alias = '';
                                        for (var i in import_item.search_fields){
                                            let field_name = import_item.search_fields[i];
                                            alias += one_data[field_name] + '_---_';
                                        }
                                        alias = funcs.hashCode(alias);
                                        if (data_extIds_obj_by_alias[alias]){
                                            var one_res = data_extIds_obj_by_alias[alias];
                                            // import_item.data_obj[one_res.ext_id].toMerge = true;
                                            // import_item.data_obj[one_res.ext_id].in_fields = one_res;
                                            let extId = one_res.ext_id;
                                            if (!import_item.data_obj[extId]) continue;
                                            import_item.data_obj_toMerge[extId] = import_item.data_obj[extId];
                                            import_item.data_obj_toMerge[extId].finded_by_search_fields = true;
                                            import_item.data_obj_toMerge[extId].in_fields = one_data;
                                            delete import_item.data_obj[extId];
                                        }
                                    }
                                    return cb(null);
                                });
                            },
                            setToAddFlag: cb => {
                                if (dependence.add === false) return cb(null); // Запрет добавление для всех данных
                                if (import_item.add === false) return cb(null); // Запрет добавление конкретного класса
                                // Запрет на уровне полей будет обработан в функции toAdd

                                for (var extId in import_item.data_obj) {
                                    import_item.data_obj_toAdd[extId] = import_item.data_obj[extId];
                                    delete import_item.data_obj[extId];
                                }
                                cb(null);
                            }
                        }, cb);
                    },
                    getDependence: cb => {
                        import_item.dependence_fields = {};

                        for (var fName in import_item.fields) {
                            var field = import_item.fields[fName];
                            if (typeof field.dependence !== 'object') continue;
                            if (field.dependence.type === 'rel') continue;
                            if (!field.dependence.ext_class_name || !field.dependence.ext_class_id_key) continue;
                            if (!field.dependence.in_class_name || !field.dependence.in_class_id_key) continue;
                            if (!import_item.dependence_classes[field.dependence.in_class_name]) import_item.dependence_classes[field.dependence.in_class_name] = {};
                            if (!import_item.dependence_fields[fName]) {
                                import_item.dependence_fields[fName] = field.dependence;
                                import_item.dependence_fields[fName].values = {};
                            }
                            // var d_data = {
                            //     company_sys:{
                            //         // ext_id:'id'
                            //         15:2,
                            //         18:3
                            //     }
                            // };
                        }
                        // console.log('dasdasda');
                        for (var i in import_item.data_obj_toAdd) {
                            var one_data = import_item.data_obj_toAdd[i];
                            for (var one_field_name in one_data.ext_fields) {
                                var one_field_val = one_data.ext_fields[one_field_name];
                                if (!import_item.dependence_fields[one_field_name]) continue;
                                if (!one_field_val) continue;
                                import_item.dependence_fields[one_field_name].values[one_field_val] = null;
                            }
                        }
                        for (var i in import_item.data_obj_toMerge) {
                            var one_data = import_item.data_obj_toMerge[i];
                            for (var one_field_name in one_data.ext_fields) {
                                var one_field_val = one_data.ext_fields[one_field_name];
                                if (!import_item.dependence_fields[one_field_name]) continue;
                                if (!one_field_val) continue;
                                import_item.dependence_fields[one_field_name].values[one_field_val] = null;
                            }
                        }
                        async.eachSeries(Object.keys(import_item.dependence_fields), function(field_name, cb){
                            var one_field = import_item.dependence_fields[field_name];
                            funcs.splitByPortion({
                                data:Object.keys(one_field.values),
                                inPortion:1000,
                                maxProcess: obj.maxProcess || config.get('maxProcess') || 1
                            }, (field_ext_ids, cb)=>{
                                var ids = [];
                                // Поищем id из нашей системы в поля
                                var depend_class_import_item = dependence.items[one_field.ext_class_name];

                                if (depend_class_import_item) {
                                    for (var i in field_ext_ids) {
                                        var extId = field_ext_ids[i];

                                        if (depend_class_import_item.data_obj_toMerge && depend_class_import_item.data_obj_toMerge[extId]) {
                                            if (depend_class_import_item.data_obj_toMerge[extId].in_fields.id) {
                                                one_field.values[extId] = depend_class_import_item.data_obj_toMerge[extId].in_fields.id;
                                                continue;
                                            }
                                        }
                                        ids.push(extId);
                                    }
                                } else {
                                    ids = field_ext_ids;
                                }
                                if (!ids.length) return cb(null);
                                var o = {
                                    command:'get',
                                    object:one_field.in_class_name,
                                    params:{
                                        columns:['id','ext_id'],
                                        where:[
                                            {
                                                key:'ext_id',
                                                type:'in',
                                                val1:ids
                                            },
                                            {
                                                key:'ext_system_alias',
                                                type:'like',
                                                val1:`${dependence.ext_system_name}|`
                                            }
                                        ],
                                        collapseData:false,
                                        limit:10000000000
                                    }
                                };

                                _t.api(o, (err, res)=>{
                                    if (err) return cb(new MyError('Не удалось получить данные для подстановки внутренних id',{o : o, err : err}));
                                    for (var i in res) {
                                        if (typeof one_field.values[res[i].ext_id] !== 'undefined') one_field.values[res[i].ext_id] = res[i].id;
                                    }
                                    cb(null);
                                });
                            }, cb);
                        }, cb);

                    },
                    toMerge: cb => {
                        // return cb(null);
                        if (dependence.merge === false || dependence.rewrite === false) return cb(null); // Запрет обновление для всех данных
                        if (import_item.merge === false || import_item.rewrite === false) return cb(null); // Запрет обновление конкретного класса
                        // Запрет на уровне полей будет обработан в функции toModify
                        var fieldsToMerge_isExist;
                        for (var extId in import_item.data_obj_toMerge) {
                            let one_field = import_item.data_obj_toMerge[extId];
                            for (var key in one_field.ext_fields) {
                                var one_field_val = one_field.ext_fields[key];
                                if (import_item.fields[key].merge === false) continue;
                                // if (import_item.fields[key].rewrite !== false && (one_field.in_fields[key] !== null && one_field.in_fields[key] !== '')) continue;
                                if (!(import_item.fields[key].rewrite === true || import_item.rewrite === true || dependence.rewrite) && (one_field.in_fields[key] !== null && one_field.in_fields[key] !== '')) continue;

                                var val = (import_item.dependence_fields[key] && typeof import_item.dependence_fields[key].values[one_field.ext_fields[key]] !== 'undefined')?
                                    import_item.dependence_fields[key].values[one_field.ext_fields[key]]
                                    : one_field.ext_fields[key]
                                if (!one_field.in_fields[key] && !val) continue; // У нас значение "" а во внешней системе null
                                if (one_field.in_fields[key] != val) {
                                    if (!one_field.to_modify) one_field.to_modify = {};
                                    one_field.to_modify[key] = val;
                                }
                            }
                            // Если все поля совпадают, но поле еще не отмечено как импортированное (ext_id === null ('')),
                            // то отправим в to_modify чтобы проставить ext_id
                            if (!one_field.to_modify && !one_field.in_fields.ext_id) one_field.to_modify = {};
                        }
                        return cb(null);
                    },
                    toAdd: cb => {
                        funcs.splitByPortion({
                            data:Object.keys(import_item.data_obj_toAdd),
                            inPortion:1000,
                            maxProcess: obj.maxProcess || config.get('maxProcess') || 1
                        }, (ext_ids, cb)=>{
                            async.eachSeries(ext_ids, function(ext_id, cb){
                                var one_data = import_item.data_obj_toAdd[ext_id];
                                // В дальнейшем надо добавить зависимости

                                var o = {
                                    command:import_item.addPrototype? 'addPrototype' : 'add',
                                    object: class_name,
                                    params:{
                                        ext_id:one_data.ext_id,
                                        ext_system_alias:`${dependence.ext_system_name}|`,
                                        rollback_key:rollback_key
                                    }
                                };
                                for (var key in one_data.ext_fields) {
                                    if (import_item.fields[key] && import_item.fields[key].add === false) continue;
                                    if (import_item.dependence_fields[key] && typeof import_item.dependence_fields[key].values[one_data.ext_fields[key]] !== 'undefined'){
                                        o.params[key] = import_item.dependence_fields[key].values[one_data.ext_fields[key]];
                                    }else{
                                        o.params[key] = one_data.ext_fields[key];
                                    }
                                }
                                _t.api(o, (err, res)=>{

                                    if (err) {
                                        logger.w(`Не удалось добавить запись`, {o:o, ext_id:one_data.ext_id, err:err});
                                        return cb(null);
                                    }
                                    one_data.___id = res.id;
                                    cb(null);
                                });
                            }, cb);
                        }, cb);


                    },
                    toModify: cb => {
                        funcs.splitByPortion({
                            data:Object.keys(import_item.data_obj_toMerge),
                            inPortion:1000,
                            maxProcess: obj.maxProcess || config.get('maxProcess') || 1
                        }, (ext_ids, cb)=>{
                            async.eachSeries(ext_ids, function(ext_id, cb){
                                var one_data = import_item.data_obj_toMerge[ext_id];
                                if (!one_data.to_modify) return cb(null);

                                var o = {
                                    command:import_item.modifyPrototype? 'modifyPrototype' : 'modify',
                                    object: class_name,
                                    params:{
                                        id:one_data.in_fields.id,
                                        // ext_ids:+ext_id,
                                        ext_id:+ext_id,
                                        rollback_key:rollback_key
                                    }
                                };
                                var ext_system_aliases = (one_data.in_fields.ext_system_alias)? one_data.in_fields.ext_system_alias.split('|') : [];
                                if (one_data.finded_by_search_fields && ext_system_aliases[0] !== 'go.core') ext_system_aliases.unshift('go.core');
                                if (ext_system_aliases.indexOf(dependence.ext_system_name) === -1) ext_system_aliases.push(dependence.ext_system_name);
                                o.params.ext_system_alias = ext_system_aliases.join('|');
                                if (o.params.ext_system_alias) o.params.ext_system_alias += '|';
                                // if (one_data.in_fields.ext_system_alias.indexOf(`${dependence.ext_system_name}|`) === -1) {
                                //     o.params.ext_system_alias = (one_data.finded_by_search_fields)? `${dependence.ext_system_name}|`;
                                // }
                                var fieldsToMerge_isExist;
                                for (var field_key in one_data.to_modify) {
                                    o.params[field_key] = one_data.to_modify[field_key];
                                }
                                _t.api(o, (err, res)=>{
                                    // if (err) return cb(new MyError('Не удалось изменить запись',{o : o, err : err}));
                                    if (err) {
                                        logger.w(`Не удалось изменить запись`, {o:o, err:err});
                                        return cb(null);
                                    }
                                    cb(null);
                                });
                            }, cb);
                        }, cb);
                    },
                    toRemove: cb => {
                        return cb(null);
                    }
                }, cb);
                
            }, cb);
            

        },
        importNextPortion: cb => {
            if (!dependence.pages) return cb(null);
            var flag_hasData;
            for (var i in dependence.pages) {
                if (dependence.pages[i] > 0) {
                    flag_hasData = true;
                    break;
                }
            }
            if (flag_hasData){
                logger.i(`Вызовем еще раз, так как остались необработанные записи`, {i:i, pages:dependence.pages});
                _t.importFromJSON({
                    is_child:true,
                    data:_t.data,
                    user,
                    rollback_key:rollback_key
                }, cb);
            }else{
                logger.i(`Больше не будем запускать, так как достигли больше данных нет`, {i:i, pages:dependence.pages});
                return cb(null);
            }
        }
    }, (err, res)=>{
        logger.i(`Завершим импорт одной порции.`);

        if (!obj.is_child){
            logger.i(`Завершим ВСЕ.`);
        }
        logger.save();

        cb(err, res);
    });
};

module.exports = DataMigration;
/*module.exports.exportToJSON = exportToJSON;
module.exports.importFromJSON = importFromJSON;*/

