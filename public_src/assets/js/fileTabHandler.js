class File {
    constructor (obj, cb) {
        this.data = {
            id: obj.file.id,
            file_id: obj.file.file_id,
            preview: obj.file.preview || undefined,
            extension: obj.file.extension,
            name: obj.file.name || '',
        };
        this.params = {
            open: obj.params.open,
            remove: obj.params.remove,
            download: obj.params.download,
            select: obj.params.select
        };
        this.wrapper =  obj.wrapper;
        this.elem = undefined
        this.selected = false;
        this.template = ``
        this.templates = {
            start_wrapper_file: `
                <div class="wrapper-file {{is_image}}"  data-id='{{id}}'>
                    <div class="wrapper-file-without-label">
                        <img style="height: 52px;" src="{{preview}}">
                    </div>
                    <div class="label-file">{{name}}</div>
            `,
            start_wrapper_additional_btn: `<div class="item-file-additional">`,
            additional_btn_download: `<i class="fa fa-download item-file-download" aria-hidden="true" data-id-file='{{file_id}}'></i>`,
            additional_btn_remove: `<i class="fa fa-trash item-file-remove" aria-hidden="true" data-id='{{id}}'></i>`,
            end_div : `</div>`
        };
        this.identifier = {
            additional_buttons: {
                download: '.item-file-download',
                remove: '.item-file-remove'
            }
        }
        this.observers = []

        let _t = this;

        if (!this.data.preview) this.previewExtension(function(){
            _t.init(cb)
        });

    }
    subscribe(fn) {
        let _t = this;
        _t.observers.push(fn);
    }
    unsubscribe(fn) {
        let _t = this;
        _t.observers = _t.observers.filter(function(item) {if (item !== fn) {return item}});
    }
    fire(o, thisObj) {
        let _t = this;
        let scope = thisObj || window;
        _t.observers.forEach(function(item) { item.call(scope, o)  });
    }
    previewExtension (cb) {
        let _t = this;
        let path = 'assets/img/extensions_file/';

        let primalExtention;


        let imageExtentions = ['.jpeg','.jpg','.png','.gif'];

        if(imageExtentions.indexOf(_t.data.extension) > -1){

            _t.loadBase64(function (data) {


                if(data.data != 'notImageExtention'){
                    path = data;

                    switch (_t.data.extension) {
                        case '.jpeg':
                            primalExtention = 'jpeg';
                            break;
                        case '.jpg':
                            primalExtention = 'jpg';
                            break;
                        case '.png':
                            primalExtention = 'png';
                            break;
                        case '.gif':
                            primalExtention = 'gif';
                            break;
                        default:
                            primalExtention = 'jpg';
                            break;
                    }

                    _t.data.preview = 'data:image/' + primalExtention + ';base64, ' + data;

                    _t.data.is_image = 'image-file';

                    cb();

                }else{

                    switch (_t.data.extension) {
                        case '.7z':
                            _t.data.preview = path + '7z.png'
                            break
                        case '.csv':
                            _t.data.preview = path + 'csv.png'
                            break
                        case '.gif':
                            _t.data.preview = path + 'gif.png'
                            break
                        case '.jpeg':
                            _t.data.preview = path + 'jpeg.png'
                            break
                        case '.jpg':
                            _t.data.preview = path + 'jpg.png'
                            break
                        case '.pdf':
                            _t.data.preview = path + 'pdf.png'
                            break
                        case '.png':
                            _t.data.preview = path + 'png.png'
                            break
                        case '.psd':
                            _t.data.preview = path + 'psd.png'
                        case '.txt':
                            _t.data.preview = path + 'txt.png'
                            break
                        default:
                            _t.data.preview = path + 'unknown.png'
                    }
                    _t.data.is_image = 'not-image-file';

                    cb();

                }

            });

        }else{

            switch (_t.data.extension) {
                case '.7z':
                    _t.data.preview = path + '7z.png'
                    break
                case '.csv':
                    _t.data.preview = path + 'csv.png'
                    break
                case '.gif':
                    _t.data.preview = path + 'gif.png'
                    break
                case '.jpeg':
                    _t.data.preview = path + 'jpeg.png'
                    break
                case '.jpg':
                    _t.data.preview = path + 'jpg.png'
                    break
                case '.pdf':
                    _t.data.preview = path + 'pdf.png'
                    break
                case '.png':
                    _t.data.preview = path + 'png.png'
                    break
                case '.psd':
                    _t.data.preview = path + 'psd.png'
                case '.txt':
                    _t.data.preview = path + 'txt.png'
                    break
                default:
                    _t.data.preview = path + 'unknown.png'
            }

            _t.data.is_image = 'not-image-file';

            cb();

        }




    }
    select () {
        let _t = this;
        _t.selected = true;
        $(_t.elem).addClass('selected-file-on-gallery')
    }
    unselect () {
        let _t = this
        _t.selected = false;
        $(_t.elem).removeClass('selected-file-on-gallery')
        console.log('unselect lel')

    }
    switchSelect () {
        let _t = this
        if (_t.selected)  return _t.unselect();
        if (!_t.selected) return _t.select()
    }
    constructorTemplate () {
        let _t = this;

        _t.template = _t.templates.start_wrapper_file;


        //start handler template additional buttons
        let additional_btn = false
        for (let i in _t.params) {
            if (_t.params[i]) {
                additional_btn = true;
                _t.template += _t.templates.start_wrapper_additional_btn
                break
            }
        }
        if (_t.params.download) _t.template += _t.templates.additional_btn_download
        if (_t.params.remove) _t.template += _t.templates.additional_btn_remove
        if (additional_btn) _t.template += _t.templates.end_div
        _t.template += _t.templates.end_div
        //end handler template additional buttons


    }

    download() {
        let _t = this;
        let o = {
            command: 'download',
            object:'File',
            params:{
                id: _t.data.file_id
            }
        };
        socketQuery(o, function (res) {
            if (+res.code) {
                // toastr[res.toastr.type](res.toastr.title, res.toastr.message);
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

            // cb(null)
        });
    }

    remove() {
        let _t = this;
        _t.fire('remove');
    }
    removeElement() {
        let _t = this;
        _t.elem.remove()
    }

    renderFile () {
        let _t = this
        _t.elem =  _t.wrapper.append(Mustache.to_html(_t.template, _t.data)).children().last();
    }

    loadBase64 (cb){

        let _t = this;

        let imageExtentions = ['.jpeg','.jpg','.png','.gif'];

        if(imageExtentions.indexOf(_t.data.extension) > -1){

            let o = {
                command: 'getPreview',
                object: 'file',
                params: {
                    id: _t.data.file_id,
                    noToastr: true
                }
            };

            socketQuery(o, function(res) {

                // debugger;

                if(!res.code){
                    return cb(res.data);
                }else{
                    return cb({data: 'notImageExtention'});
                }

            });

        }else{
            return cb({data: 'notImageExtention'});
        }



    }

    watchPicture () {

        let _t = this;
        let primalExtention;

        _t.loadBase64(function(data){

            if(data == 'notImageExtention'){

                toastr['info']('Данный файл не является изобрадением, скачайте его для просмотра.');

            }else{

                switch (_t.data.extension) {
                    case '.jpeg':
                        primalExtention = 'jpeg';
                        break;
                    case '.jpg':
                        primalExtention = 'jpg';
                        break;
                    case '.png':
                        primalExtention = 'png';
                        break;
                    case '.gif':
                        primalExtention = 'gif';
                        break;
                    default:
                        primalExtention = 'jpg';
                        break;
                }

                bootbox.dialog({
                    title: _t.data.name,
                    message: '<div class="image-64-holder"><img src="data:image/'+primalExtention+';base64, '+data+'" /></div>',
                    buttons: {
                    }
                });
            }

        });



    }
    setHandlers () {
        let _t = this;

        _t.elem.off('click').on('click', function(){
            _t.watchPicture();

        });

        if (_t.params.download) _t.elem.find(_t.identifier.additional_buttons.download).off().on('click', function (elem) {
            _t.download()
            elem.stopPropagation()
        })
        if (_t.params.remove)   _t.elem.find(_t.identifier.additional_buttons.remove).off().on('click', function (elem) {
            _t.remove()
            elem.stopPropagation()
        })
        if (_t.params.select)   _t.elem.off().on('click', function (elem) {
            _t.switchSelect()
        })
    }

    init (cb) {
        let _t = this
        // _t.wrapper.html('');
        async.series({
            renderTemplate: cb => {
                _t.constructorTemplate()
                cb(null)
            },
            initFile: cb => {
                async.series({
                    renderFile: cb => {
                        _t.renderFile()
                        cb(null)
                    },
                    setHandlers: cb => {
                        _t.setHandlers()
                        cb(null)
                    }
                }, (err, res) => {
                    cb(null)
                })
            }
        }, (err, res) => {
            if (cb) cb(null)
        })
    }
};

class FileHandler {
    constructor (obj, cb) {
        let _t = this;
        this.table = obj.table || undefined;
        this.id = obj.id  || undefined;
        this.name_method_get = obj.name_method_get || undefined;
        this.name_method_set = obj.name_method_set || undefined;
        this.name_method_remove = obj.name_method_remove || undefined;
        this.name_method_get_types = obj.name_method_get_types || undefined;

        this.uploadingNewFile = obj.uploadingNewFile || undefined;
        this.successUploadNewFile = obj.successUploadNewFile || undefined;

        this.data = obj.files || undefined;

        this.wrapper = obj.wrapper; //bootbox

        this.files = {
            items:[],
            add: (file, cb) => {
                let newFile = new File({
                    file: file.file,
                    wrapper: file.wrapper,
                    params: file.params
                }, res => {
                    _t.files.items.push(newFile);
                    if (cb) cb(newFile)
                })
            }
        };

        // console.log(obj)
        // debugger
        if (obj.params) {

            if (obj.params.notification_non_files == undefined) obj.params.notification_non_files = true
            if (obj.params.notification_non_files == false) obj.params.notification_non_files = false


            this.params = {
                open: obj.params.open || false, //обработчик не написан
                download: obj.params.download || false,
                remove: obj.params.remove || false,
                confirm_before_remove: obj.params.confirm_before_remove || false,
                select: obj.params.select || false,
                upload: obj.params.upload || false,
                notification_non_files: obj.params.notification_non_files,

                select_type_for_new_file: obj.params.select_type_for_new_file || false,
                name_for_new_file: obj.params.name_for_new_file || false,

                before_selected_files: obj.params.before_selected_files || [],
            }
        } else {
            this.params = {
                open: false, //обработчик не написан
                download: false,
                remove: false,
                select: false,
                notification_non_files: true

            }
        }
        // console.log(obj.params, this.params)
        // debugger
        this.filesDom = {
            wrapper: this.wrapper,
            container_files: undefined,
            button_new_file: undefined,
            non_files: undefined
        }

        this.templates = {
            non_files: `<div class="non-files">Файлов пока нет.</div>`,
            button: {
                upload_new_file: `<div class="new-file-btn tangibles-files-btn"><i class="fa fa-upload"></i>&nbsp;&nbsp;Загрузить файлы</div>`
            },
            bootbox_info_new_file : {
                field_name_type: `
                    <select class="select-type-new-file" id="select_type_new_file" name="select_type_new_file">
                        <option selected disabled>Выберите тип документа</option>
                        {{#.}}
                            <option value="{{sysname}}" >{{name}}</option>
                        {{/.}}
                    </select> 
                    <hr>
                    <input id="input_name_new_file" type="text" style="width: 100%", placeholder="Введите наименование документа" class="description-new-file fn-control">
                `,
                field_name: ` 
                    <input id="input_name_new_file" type="text" style="width: 100%", placeholder="Введите наименование документа" class="description-new-file fn-control">
                `,
                field_type: `
                    <select class="select-type-new-file" id="select_type_new_file" name="select_type_new_file">
                        <option selected disabled>Выберите тип документа</option>
                        {{#.}}
                            <option value="{{sysname}}" >{{name}}</option>
                        {{/.}}
                    </select> 
                `

            },
        }

        this.init(cb)

    }
    renderNotificationNonFiles (cb) {
        let _t = this;
        async.series({
            renderNotificationNonFiles: cb => {
                _t.filesDom.non_files = _t.filesDom.container_files.append(Mustache.to_html(_t.templates.non_files)).children().last();
                cb(null)
            }
        }, (err, res) => {
            if (cb) cb(null)
        })
    }
    renderButtonNewFile (cb) {
        let _t = this

        //render btn
        let template = _t.templates.button.upload_new_file
        _t.wrapper.find('.new-file-btn.tangibles-files-btn').remove()
        _t.wrapper.append(Mustache.to_html(template));

        //save prop
        _t.filesDom.button_new_file = _t.wrapper.find('.new-file-btn.tangibles-files-btn')

        cb(null)
    }

    uploadFile (cb) {
        let _t = this
        let new_file = undefined

        let template = ``
        if (_t.params.name_for_new_file && _t.params.select_type_for_new_file) { // с именем и типом
            template = _t.templates.bootbox_info_new_file.field_name_type
        } else if (_t.params.name_for_new_file && !_t.params.select_type_for_new_file) { // с именем и без тип
            template = _t.templates.bootbox_info_new_file.field_name
        } else if (!_t.params.name_for_new_file && _t.params.select_type_for_new_file) { // без именем, но с типом
            template = _t.templates.bootbox_info_new_file.field_type
        }

        if (_t.params.name_for_new_file || _t.params.select_type_for_new_file) {
            bootbox.dialog({
                title: 'Добавить документ',
                message: Mustache.to_html(template, _t.types_file),
                buttons:{
                    success: {
                        label: 'Загрузить документ',
                        callback: function(){
                            let type_sysname = $('.select-type-new-file').val() || undefined;
                            let description = $('.description-new-file').val() || undefined;
                            var counter = 0;
                            let fl = new ImageLoader({
                                success: function (file) {

                                    let o = {
                                        command: _t.name_method_set,
                                        object: _t.table,
                                        params: {
                                            id: _t.id,
                                            filename: file.name,
                                        }
                                    };
                                    if (_t.params.name_for_new_file) o.params.description = description
                                    if (_t.params.select_type_for_new_file) o.params.type_sysname = type_sysname
                                    var do_cb = (fl.InProcessCounter === 0);
                                    socketQuery(o, function (res) {
                                        counter++;
                                        let obj = {
                                            file: res.data[0],
                                            wrapper: $(_t.filesDom.container_files),
                                            params: {
                                                open: _t.params.open,
                                                remove: _t.params.remove,
                                                download: _t.params.download,
                                                select: _t.params.select,
                                            }
                                        }
                                        _t.initFile(obj)

                                        if (do_cb) {
                                            cb(null)
                                        }
                                    });
                                }

                            });

                            fl.start({
                                params: {
                                    not_public: true
                                }
                            });
                        }
                    },
                    error: {
                        label: 'Отмена',
                        callback: function(){}
                    }
                }
            });
            $('.select-type-new-file').select2();
        } else {
            var counter = 0;
            console.log('МЫ ТУТ')
            let fl = new ImageLoader({
                // noAutoClick:true,
                success: function (file) {
                    console.log('ПРОИЗОШЁЛ САКСЭСФУЛ')
                    // debugger
                    let o = {
                        command: _t.name_method_set,
                        object: _t.table,
                        params: {
                            id: _t.id,
                            filename: file.name,
                        }
                    };
                    var do_cb = (fl.InProcessCounter === 0);
                    socketQuery(o, function (res) {
                        counter++;
                        if (_t.successUploadNewFile) _t.successUploadNewFile();
                        let obj = {
                            file: res.data[0],
                            wrapper: $(_t.filesDom.container_files),
                            params: {
                                open: _t.params.open,
                                remove: _t.params.remove,
                                download: _t.params.download,
                                select: _t.params.select,
                            }
                        }
                        _t.initFile(obj)
                        if (do_cb) {
                            cb(null)
                        }
                    });
                },
                sending: function () {
                    console.log('ПРОИСХОДИТ СЭНДИНЕГ')
                    if (_t.uploadingNewFile) _t.uploadingNewFile();
                    // debugger
                },
            });
            fl.start({
                params: {
                    not_public: true
                }
            });
            // fl.input.click()

        }

        cb(null)
    }
    removeFile (id, cb) {
        let _t = this;
        let o = {
            command: _t.name_method_remove,
            object: _t.table,
            params:{
                file_id: id,
                id: _t.id
            }
        };
        if (_t.params.confirm_before_remove) {
            let template = `<br>
                <button type='button' style='margin-right:10px' class='confirmationRevertYes btn clear'>Да</button>
                <button type='button' class='confirmationRevertNo btn clear'>Нет</button>`;
            let confirm = toastr.warning(template, 'Удалить?', {
                closeButton: false,
                allowHtml: true,
            });
            confirm.find('.confirmationRevertYes').on('click', function () {
                socketQuery(o, function (res) {
                    if (+res.code) return cb(res);
                    _t.files.items = _t.files.items.filter(function(file) { return file.data.id != id });

                    if (_t.files.items.length == 0 && _t.params.notification_non_files == true)  _t.filesDom.non_files = _t.filesDom.container_files.append(Mustache.to_html(_t.templates.non_files)).children().last();

                    if (cb) cb(null)
                });
            })
        } else {
            socketQuery(o, function (res) {
                if (+res.code) return cb(res);
                _t.files.items = _t.files.items.filter(function(file) { return file.data.id != id });
                if (cb) cb(null)
            });
        }
    }
    getFiles (cb) {
        let _t = this;
        async.series({
            getFilesRemote: cb => {
                let o = {
                    command: _t.name_method_get,
                    object: _t.table,
                    params: {
                        id: _t.id
                    }
                }
                socketQuery(o, res => {
                    if (+res.code) return cb(res);
                    _t.data = Object.values(res.data).map(file => {
                        return {
                            file_id: file.file_id,
                            type: file.type,
                            type_sysname: file.type_sysname,
                            id: file.id,
                            name: file.name,
                            extension: file.extension
                        }
                    })
                    if (_t.data.length > 0 && _t.filesDom.non_files) _t.filesDom.non_files.remove()
                    cb(null)
                })
            }
        }, (err, res) => {
            if (cb) cb(null);
        })
    }
    getSelectedFiles () {
        let _t = this
        let selected = []
        for (let i in _t.files.items) {
            if (_t.files.items[i].selected) {
                selected.push(_t.files.items[i])
            }
        }
        return selected
    }
    initFile(obj, cb) {
        let _t = this;
        _t.files.add(obj, res => {
            let file = _t.files.items[_t.files.items.length - 1];
            if (_t.params.before_selected_files.indexOf(obj.file.file_id) > -1) file.select()

            _t.files.items[_t.files.items.length - 1].subscribe(() => {
                _t.removeFile(file.data.id, res => {
                    file.removeElement()
                })
            })
            if(cb) cb(res);
        })
    }
    init (cb) {
        let _t = this;
        async.series({
            renderWrapper: cb => {
                if ( _t.filesDom.wrapper.find('.list-files').length == 0) {
                    _t.filesDom.container_files = _t.filesDom.wrapper.append('<div class="list-files"></div>').find('.list-files');
                }
                cb(null)
            },
            renderNotificationNonFiles: cb => {
                if (_t.params.notification_non_files == true) {
                    _t.renderNotificationNonFiles(res => {
                        cb(res)
                    })
                } else {
                    // debugger
                    cb(null)
                }
            },
            getFiles: cb => {
                if (!_t.name_method_get && !_t.table) {
                    cb(null)
                } else {
                    _t.getFiles( res => {
                        cb(null)
                    })
                }
            },
            render: cb => {
                async.parallel({
                    renderFiles: cb => {
                        let promises_arr = []
                        for (let i in _t.data) {
                            promises_arr.push(
                                new Promise((resolve, reject) => {
                                    let obj = {
                                        file: _t.data[i],
                                        wrapper: $(_t.filesDom.container_files),
                                        params: {
                                            open: _t.params.open,
                                            remove: _t.params.remove,
                                            download: _t.params.download,
                                            select: _t.params.select,
                                        }

                                    }
                                    _t.initFile(obj, res => {
                                        resolve(null)
                                    })
                                })
                            )
                        }
                        Promise.all(promises_arr).then(function(){
                            _t.data = undefined;
                            cb(null)
                        });
                    },
                    renderButtonNewFile: cb => {
                        if (_t.params.upload) {
                            _t.renderButtonNewFile( res => cb(null))
                        } else {
                            cb(null)
                        }
                    }
                }, (err, res) => {
                    cb(null)
                })
            },
            getTypesFile: cb => {
                if (_t.params.select_type_for_new_file) {
                    let o = {
                        command: _t.name_method_get_types,
                        object: _t.table,
                    }
                    socketQuery(o, res => {
                        if (+res.code) return cb(res)
                        _t.types_file = Object.values(res.data)
                        cb(null)
                    })
                } else {
                    cb(null)
                }

            },
            setHandler: cb => {
                if (_t.params.upload) {
                    _t.filesDom.button_new_file.on('click', function (el) {
                        _t.uploadFile(res => {
                            if (_t.filesDom.non_files) _t.filesDom.non_files.remove()
                        })
                    })
                }
                cb(null)
            }
        }, (err, res) => {
            if (cb) cb(null)
        })
    }
};
