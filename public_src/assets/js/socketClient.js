/**
 * socketClient.js - conplex cloud solutions, LLC
 *
 * main client-side module provides data exchange with server
 */


var socket;
var fileLoader;
var createGuid = function () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r, v;
        r = Math.random() * 16 | 0;
        v = (c === "x" ? r : r & 0x3 | 0x8);
        return v.toString(16);
    }).toUpperCase();
};


var jsonToObj = function (obj) {
    var i, j, result = {},
        convert = function (d, n) {
            for (i in obj[d]) {
                result[i] = {};
                for (j in obj[n]) {
                    result[i][obj[n][j]] = obj[d][i][j];
                }
            }
        };

    if (obj['DATA'] && obj['NAMES']) convert('DATA', 'NAMES');
    else if (obj['data']) {
        if (obj['data_columns']) convert('data', 'data_columns');
        else if (obj['names']) convert('data', 'names');
    } else result = obj;

    return result;
};


window.socketQuery = function(obj, callback){
    console.log('socketQuery еще не готова к использованию');
    window.setTimeout(function () {
        socketQuery(obj, callback);
    }, 50);
};

var socketQuery_stack = {
    items: {},
    getItem: function (id) {
        return this.items[id];
    },
    addItem: function (cb, obj) {
        var id = createGuid();
        this.items[id] = {
            callback: cb,
            request: obj
        };

        return id;
    },
    removeItem: function (id) {
        delete this.items[id];
    }
};


console.log('CONNECTING');
socket = io.connect();
var delivery;
socket.on('connect', function (data) {
    console.log('CONNECTED');
    socketQuery = function (obj, callback, type) {
        if (debugMode) {
            var alias = ' ➢ ' + obj.object + ' ➢ ' + obj.command + '    ';
            console.groupCollapsed('%c ' + alias, 'background: #35ff4829; color: #000');
            console.log(obj);
            console.groupEnd();
            if (obj.params && typeof obj.params.collapseData !== 'undefined') console.log('%c ' + alias + 'С клиента нельзя передовать параметр collapseData. Необходимо исправить метод так, чтобы он не использовал его. \nВ одном из обновлений параметр collapseData будет заблокирован для клиента!', 'background: #ffa482; color: #000');
        }
        if (typeof callback === "function")
            var id = socketQuery_stack.addItem(callback, obj);
        socket.emit('socketQuery', obj, id, type);
    };
    if (!delivery) {
        console.log('new Delivery');
        if(typeof Delivery == "undefined"){
            return;
        }
        delivery = new Delivery(socket);
    }
    // MB.Core.fileLoader = new ImageLoader();
    fileLoader = new ImageLoader();
});

socket.on('disconnect', function (data) {
    console.warn('Соединение с сервером прервано.');
    window.delivery = undefined;
    socketQuery = function(obj, callback){
        console.log('socketQuery еще не готова к использованию');
        window.setTimeout(function () {
            socketQuery(obj, callback);
        }, 50);
    };
});

socket.on('error', function (data) {
    console.log('Ошибка соединения', data);


    if (data=='handshake unauthorized') {
        console.log('Перейдем на страницу login', location.href);
        //return location.href = '/login.html';
    }
});

socket.on('message', function (obj) {
    if (typeof obj !== "object") return;
    var mode = obj.mode || "normal";
    switch (mode) {
        case "getFile":
            var fileName = obj.fileName;
            var shortName = fileName.substring(fileName.lastIndexOf('/') + 1, fileName.length);
            $("body").prepend('<a id="my_download_link" href="' + obj.fileName + '" download="' + shortName + '" style="display:none;"></a>');
            $("#my_download_link")[0].click();
            $("#my_download_link").remove();
            break;
        default :
            break;
    }
});

socket.on('log', function (data) {
    console.log('---SERVER--LOG--->',data);
});

socket.on('percent', function (data) {
    data = typeof data ==='object' && data !== null? data : {}
    if (data.console) console.log('Emitted from server', data.console);
    if (typeof data.html === 'undefined' && isNaN(+data.percent)) return
    var container = $(data.selector || 'a.developer')
    if (!container.length) return
    var percent_container = container.find('.percent_container')
    if (!percent_container.length) {
        container.append('<div class="percent_container"></div>')
        percent_container = container.find('.percent_container')
    }
    const html = typeof data.html !== 'undefined'? data.html : (data.command || 'Operation:') + ' ' +data.percent + '%'
    percent_container.html(html)
    if (data.hide && !isNaN(+data.hide)) {
        setTimeout(function() {
            percent_container.html('')
        }, data.hide)
    }
});

socket.on('logBody', function (data) {
    var type = 'error';
    var title = '';
    toastr[type](data, title);
});




socket.on('socketQueryCallback', function (callback_id, result, request_time) {
    var item = socketQuery_stack.getItem(callback_id);
    if (typeof item !== "object") return;
    // Не удалять это сравнение, так как typeof null возвращает "object"
    // var alias = '➢ ' + item.request.object + ' ( ' + (item.request.client_object)? item.request.client_object : 'NO CO' + ' ) ' + ' ➢ ' + item.request.command + '    ';
    var alias = '➢ ' + item.request.object + ' ➢ ' + item.request.command + '    ';
    let dataIsObj;
    if (item.request.params){
        dataIsObj = item.request.params.dataIsObj;
    }
    if (typeof result==='object' && result!==null){
        if (typeof result.code === 'undefined') {
            console.log(`%c ${alias}Серверная функция должна возвращать "code". Используйте стандартный ответ, например, cb(null, new UserOk('noToastr',{data:data});`, 'background: #ffd582; color: #000');
        }
        if (result.code !== 10){
            result.time = request_time;
            var t = result.toastr;
            let r_params = item.request.params || {};
            let show_toastr = (()=>{
                if (r_params.noToastr) return false; // Если есть параметр noToastr, не показываем ни в каком случае
                // Если ответ с ошибкой, то не показываем если есть параметры noToastrError или noToastrErr
                if (result.code) return !(r_params.noToastrError || r_params.noToastrErr);
                return !r_params.noToastrSuccess;
            })();
            if (typeof toastr=="object" && t && t.message!=='noToastr' && t.message!=='noToastrErr'
                && show_toastr && !r_params.checkAccess) toastr[t.type](t.message, t.title);
            if (typeof toastr=="object" && t && t.additionalMessage) toastr['error'](t.additionalMessage, 'ВНИМАНИЕ!');

            if(result.code === -4){
                return document.location.href = '/login.html';
            }
        }
    }else{
        console.log(`%c ОТВЕТ ДОЛЖЕН БЫТЬ ОБЪЕКТОМ И НЕ null. Используйте стандартный ответ, например, cb(null, new UserOk('noToastr',{data:data});`, 'background: #F00; color: #fff');
        console.log('RESULT:', result);
    }

    if (typeof item.callback === "function") {

        // console.log('RESULT BEFORE:', result);
        if (window.debugMode) {

            //#c60000
            var bg = result.code? ((result.code === 10) ? '#c66fbb' : (result.code === 11)? '#e08f9b' :'#c60000') : '#2a711a';
            console.groupCollapsed('%c ' + alias, 'background: ' + bg + '; color: #fff500');
            console.log(item.request);
            console.log(result);
            console.groupEnd();
        }
        // else console.log('%c === RESULT ===', 'background: #222; color: #bada55', result);
        // console.log(result);



        if(result !== null && typeof result == 'object'){

            if (typeof result.data == 'object' && typeof result.data_columns == 'object'){
                result.data = jsonToObj(result);

            }

        }else{
            var primal_res = result;
            result = {
                code: -888,
                toastr: {
                    type: 'error',
                    title: 'Ошибка',
                    message: 'В ответ пришел null или ответ не является объектом'
                },
                results:[primal_res]
            };
        }


        if(result.code == 10){
            // SERVER EXAMPLE
            //var confirm = obj.confirm;
            //if (!confirm){
            //    return cb(new UserError('needConfirm', {message: 'Это тестовый confirm. Напишите "ВАСЯ"',title:'Подтвердите действие', confirmType:'dialog',responseType:'text'}));
            //}else if (confirm!='ВАСЯ'){
            //    return cb(null, new UserOk('Не верно вверено контрольное значение. Запрос отклонен.',{type:'info'}));
            //}
            //return cb(null, new UserOk('Все ок'));
            // END SERVER EXAMPLE

            item.request.params.confirmKey = result.confirmKey || result.key;
            var cancelMsg = result.cancelMsg || 'Операция отменена';
            var okBtnText = result.okBtnText || 'Подтвердить';
            var cancelBtnText = result.cancelBtnText || 'Отменить';
            switch (result.confirmType){

                case 'dialog' :

                    var html = '';

                    if(result.responseType == 'text'){
                        html = result.toastr.message + '<input style="margin-top: 10px;" type="text" class="form-control" id="server-confirm-input" />';
                    }else{
                        html = result.toastr.message;
                    }



                    bootbox.dialog({
                        title: result.toastr.title,
                        message: html,
                        buttons: {
                            success: {
                                label: okBtnText,
                                callback: function () {

                                    if(result.responseType == 'text'){

                                        item.request.params.confirm = $('#server-confirm-input').val()

                                    }else{
                                        item.request.params.confirm = true;
                                    }

                                    socketQuery(item.request, item.callback);

                                }
                            },
                            error: {
                                label: cancelBtnText,
                                callback: function () {


                                    toastr['info'](cancelMsg);

                                    item.callback(result);

                                }
                            }
                        }
                    });


                    break;

                case 'date':

                    break;

                default :

                    var btnGuid = MB.Core.guid();

                    toastr[result.toastr.type](result.toastr.message + '<div style="width: 100%;"><button id="confirm_socket_query_'+btnGuid+'" type="button" class="btn clear">Подтвердить</button> <button id="cancel_socket_query_'+btnGuid+'" type="button" class="btn clear">Отмена</button></div>','',{
                        "closeButton": false,
                        "debug": false,
                        "newestOnTop": false,
                        "progressBar": false,
                        "positionClass": "toast-bottom-right",
                        "preventDuplicates": false,
                        "onclick": null,
                        "showDuration": "300",
                        "hideDuration": "1000",
                        "timeOut": 0,
                        "extendedTimeOut": 0,
                        "showEasing": "swing",
                        "hideEasing": "linear",
                        "showMethod": "fadeIn",
                        "hideMethod": "fadeOut",
                        "tapToDismiss": false
                    });


                    $('#confirm_socket_query_'+btnGuid).off('click').on('click', function(){
                        item.request.params.confirm = true;
                        window.setTimeout(function(){
                            toastr.clear();
                        }, 1000);

                        socketQuery(item.request, item.callback);
                    });

                    $('#cancel_socket_query_'+btnGuid).off('click').on('click', function(){
                        toastr['info'](cancelMsg);
                        window.setTimeout(function(){
                            toastr.clear();
                        }, 1000);
                        item.callback(result);
                    });


                    break;

            }

            socketQuery_stack.removeItem(callback_id);
            return false;

        }

        if (result.system_download_now){
            var linkName = 'my_download_link' + MB.Core.guid();

            var nameRu = result.name_ru || result.filename;

            $("body").prepend('<a id="'+linkName+'" href="' + result.path + result.filename +'" download="'+ nameRu+'" style="display:none;"></a>');
            var jqElem = $('#'+linkName);
            jqElem[0].click();
            jqElem.remove();
        }

        item.callback(result);
    }
    socketQuery_stack.removeItem(callback_id);
});

socket.on('socketQueryCallbackError', function (err) {
    console.log(err);
});

socket.on('logout', function () {
    document.location.href = "login.html";
});

var toggleLog = function () {
    socket.emit('toggleLog');
};

window.debugMode = $.cookie('debugMode');
var debug = function () {
    var bool = window.debugMode = !window.debugMode;
    if (bool) $.cookie('debugMode', bool);
    else $.removeCookie('debugMode');
    return 'debug mode ' + (bool ? 'ON' : 'OFF');
};




/// TEMP
var testDownload = function () {
    var o = {
        command:'download',
        object:'File',
        params:{
            id:18
        }
    };
    socketQuery(o, function (res) {
        if (+res.code){
            console.log('Ошибка',res);
            return;
        }
        var filename = res.filename;
        var path = res.path;
        var name = res.name + res.extension;
        var id = 'my_download_link_1';
        var html = '<a id="'+ id +'" download="'+ name +'" style="display:none;" target="_blank" href='+ path + '?filename=' + filename +'>ТЕСТ ССЫЛКИ</a>';
        $('body').append(html);
        var btn = $('#'+id);
        btn.on("click",function (e) {
            $(this).remove();
        });
        btn[0].click();
    });
};
