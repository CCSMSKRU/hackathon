var createRandId = function () {
    return "xxxxxxxx".replace(/[xy]/g, function (c) {
        var r, v;
        r = Math.random() * 16 | 0;
        v = (c === "x" ? r : r & 0x3 | 0x8);
        return v.toString(16);
    }).toUpperCase();
};

var sbmt = function (form) {
    // console.log('asdasdasd', evt, files);
    // debugger;
    // return false;
    // evt.preventDefault();
    _t.attemptsSendCount = 1;
    // TODO после массового выделения файлов не срабатывает событие

    for (var i in self.input[0].files) {
        if (isNaN(+i)) {
            continue;
        }

        let file = self.input[0].files[i];
        file.extname = file.name.split('.').pop();

        if (_t.extraParams && Array.isArray(_t.extraParams.formats)) {

            if (_t.extraParams.formats.indexOf(file.extname) === -1) {
                if (toastr) toastr.error('File with name ' + file.name + ' has an unsupported format. Supported: ' + _t.extraParams.formats.join(', '));
                continue;
            }
        }

        if (_t.extraParams && _t.extraParams.max_size) {
            if (file.size > _t.extraParams.max_size) {
                if (toastr) toastr.error('File with name ' + file.name + ' too large. Max size is ' + _t.extraParams.max_size / 1024 / 1024 + 'MB.');
                continue;
            }
        }

        self.filelist.push(file);
    }
    _t.before(function (err) {
        if (err) return err;
        self.send();
    })

    return false;
}


var ImageLoader = function(params){
    console.log('new ImageLoader');
    if (!socket)  throw 'ImageLoader -> socket не определен.';
    if (typeof Delivery!=='function') throw 'ImageLoader -> Не подключен можуль Delivery';
    if (typeof params!=='object') params = {};
    var _t = this;
    this.filelist = [];
    this.counter = 0;
    this.InProcessCounter = 0;
    this.attemptsSendCount = 1;
    delivery.on('delivery.connect', function (delivery0) {
        console.log('=================================delivery.connect');

        delivery0.on('receive.start',function(fileUID){
            if (_t.id !== fileUID.params.id) return;
            console.log('receiving a file!');
        });

        delivery0.on('receive.success',function(file){
            if (_t.id !== file.params.id) return;
            if (file.isImage()) {
                $('img').attr('src', file.dataURL());
            }
        });

        delivery0.on('receive.success',function(file){
            if (_t.id !== file.params.id) return;
            console.log('------> receive.success');
            var params = file.params;
            var html = '<a href='+ file.dataURL() +'>ТЕСТ ССЫЛКИ</a>';
            $('body').prepend(html);
            /* if (file.isImage()) {
             $('img').attr('src', file.dataURL());
             }*/
        });
        delivery0.on('file.load',function(filePackage){
            if (_t.id !== filePackage.params.id) return;
            console.log(filePackage.name + " has just been loaded.");
        });
        _t.loaded = true;
    });




    // this.filelist = [];
    // this.counter = 0;
    // this.InProcessCounter = 0;
    // this.attemptsSendCount = 1;
    var self = this;
    this.id =  'ImageLoader_' + createRandId();
    var $body = $("body");
    $body.append('<div id="'+ this.id +'"></div>');
    this.container_ = $body.children('#' + this.id);
    this.container_.children("form").remove();
    // this.container_.append('<form style="display: none;" action="#" onsubmit="sbmt(this);return false;">');
    this.container_.append('<form style="display: none;" action="#" onsubmit="return false;">');
    this.container = this.container_.children('form');
    this.sendMethod = params.sendMethod || 'send';

    this.dir = params.dir || "upload/";
    this.name = params.name || "ForUploadFile";
    this.multiple = (params.multiple === false)? '' : 'multiple';
    var counter = 0;
    while(this.container.find("#input"+this.name+counter).length!==0){
        counter++;
    }
    this.container.children("input[type=file]").remove();
    this.container.children("input[type=submit]").remove();
    this.container.append('<input type="file" style="display: none;" ' + this.multiple + '  id="input'+this.name+counter+'">');
    this.container.append('<input type="submit" style="display: none;" id="submit'+this.name+counter+'">');
    this.input = this.container.find("#input"+this.name+counter);
    this.submit = this.container.find("#submit"+this.name+counter);
    this.before = (typeof params.before==="function")? params.before : function(cb){
        return cb(null);
    };
    if (typeof params.success==="function") this.success = params.success;

    if (typeof params.sending ==="function") this.sending = params.sending;
    if (typeof params.error==="function") this.success = params.error;

    this.container.on("submit", function (evt) {
        evt.preventDefault();
        _t.attemptsSendCount = 1;
        // TODO после массового выделения файлов не срабатывает событие

        for (var i in self.input[0].files) {
            if (isNaN(+i)) {
                continue;
            }

            let file = self.input[0].files[i];
            file.extname = file.name.split('.').pop();

            if (_t.extraParams && Array.isArray(_t.extraParams.formats)) {

                if (_t.extraParams.formats.indexOf(file.extname) === -1) {
                    if (toastr) toastr.error('File with name ' + file.name + ' has an unsupported format. Supported: ' + _t.extraParams.formats.join(', '));
                    continue;
                }
            }

            if (_t.extraParams && _t.extraParams.max_size) {
                if (file.size > _t.extraParams.max_size) {
                    if (toastr) toastr.error('File with name ' + file.name + ' too large. Max size is ' + _t.extraParams.max_size / 1024 / 1024 + 'MB.');
                    continue;
                }
            }

            self.filelist.push(file);
        }
        _t.before(function (err) {
            if (err) return err;
            self.send();
        })
    });

    // this.submit.on("click", function (evt) {
    //     evt.preventDefault();
    //     _t.attemptsSendCount = 1;
    //     // TODO после массового выделения файлов не срабатывает событие
    //
    //     for (var i in self.input[0].files) {
    //         if (isNaN(+i)) {
    //             continue;
    //         }
    //
    //         let file = self.input[0].files[i];
    //         file.extname = file.name.split('.').pop();
    //
    //         if (_t.extraParams && Array.isArray(_t.extraParams.formats)) {
    //
    //             if (_t.extraParams.formats.indexOf(file.extname) === -1) {
    //                 if (toastr) toastr.error('File with name ' + file.name + ' has an unsupported format. Supported: ' + _t.extraParams.formats.join(', '));
    //                 continue;
    //             }
    //         }
    //
    //         if (_t.extraParams && _t.extraParams.max_size) {
    //             if (file.size > _t.extraParams.max_size) {
    //                 if (toastr) toastr.error('File with name ' + file.name + ' too large. Max size is ' + _t.extraParams.max_size / 1024 / 1024 + 'MB.');
    //                 continue;
    //             }
    //         }
    //
    //         self.filelist.push(file);
    //     }
    //     _t.before(function (err) {
    //         if (err) return err;
    //         self.send();
    //     })
    //
    //
    //     /*var file = self.filelist[0];
    //     delete self.filelist[0];
    //     self.delivery.send(file);
    //     self.counter++;*/
    //     evt.preventDefault();
    // });
    this.uid = '';

    delivery.on('send.success',function(fileUID){
        // if (self.id===fileUID.uid){
        if (self.id !== fileUID.params.id){
            return;
        }
        self.InProcessCounter--;
        self.uid = fileUID.uid;
        // self.success(fileUID);
        self.send();
        /* if (!!self.filelist[self.counter]){
             self.send();
         }else{
             //self.counter = 0;
         }*/
        //console.log(fileUID);

    });


    delivery.socket.on('save.success',function(fileUID){
        if (self.id !== fileUID.params.id){
            return;
        }
        self.success(fileUID);
    });
    delivery.socket.on('save.error',function(error, fileUID){
        if (self.id !== fileUID.params.id){
            return;
        }
        self.error(error, fileUID);
    });

    delivery.on('send.error',function(error){
        self.error(error);
    });




    this.input.on("change",function(){
//        console.log($(self.input).val());
        if($(self.input).val().length == 0){
            return;
        }
        self.submit.click();
    });
    this.container.trigger('ready');
};


ImageLoader.prototype = {
    prepare:function(files){
        var _t = this;
        console.log('COUNTER',_t.InProcessCounter);
        // _t.extraParams.max_size = 1048576;
        if (!_t.InProcessCounter){
            for (var i in files) {
                // if (_t.extraParams.max_size){
                //     if (files[i].size > _t.extraParams.max_size){
                //         if (toastr) toastr.error('File with name ' + files[i].name + ' too large. Max size is ' + _t.extraParams.max_size/1024/1024 + 'MB.');
                //         continue;
                //     }
                // }
                _t.filelist.push(files[i])
            }
            console.log('FILE SENDED');
            _t.send();
        }else{
            setTimeout(function(){
                _t.prepare(files);
            },100);
        }
    },
    send:function(files){
        // debugger
        var _t = this;

        try {
            _t.sending()
        } catch (err) {}
        if (_t.elem) _t.elem.emit('send',{test:'TEST'});
        if (Array.isArray(files)){
            // Создадим очередь и оттуда будем вызывать send;
            return _t.prepare(files);
        }

        if (!this.filelist.length){
            return;
        }
        _t.InProcessCounter++;
        if (!_t.loaded){
            if (_t.attemptsSendCount>50) return console.log('Сокет не подключени. Отправка невозможна.');
            return window.setTimeout(function () {
                _t.attemptsSendCount++;
                _t.InProcessCounter--;
                _t.send();
            }, 100);
        }
        var file = this.filelist.shift();
        file.name = decodeURI(file.name);
        var extraParams = this.extraParams || {};
        extraParams.id = _t.id;
        extraParams.dir = _t.dir;
        delivery.send(file, extraParams);
        //delivery.send(file, {param1:'sdsd'});
        this.counter++;
    },
    success:function(fileUID){
        this.extraParams = {};
        // console.log(fileUID);

        // this.container.trigger('success', [fileUID]);

    },
    error:function(error){
        this.extraParams = {};
        console.log("Загрузка файла не удалась:");
        console.log(error);

    },
    start:function(params){
        if (!this.loaded) return;
        if (typeof params==="object"){
            if (typeof params.success==="function") this.success = params.success;
            if (typeof params.error==="function") this.success = params.error;
            if (params.dir) this.dir = params.dir;
            this.extraParams = params.params;
        }
        $(this.input).val('');
        $(this.input).trigger('change');
        this.input.click();
//        $(this.input).trigger('change');
    },
    remove: function() {

    }

};



