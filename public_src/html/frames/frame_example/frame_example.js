(function(){

    var frameID = MB.Frames.justLoadedId;
    var frameInstance = MB.Frames.getFrame('frame_example', frameID);
    // var frameWrapper = $('#mw-'+frameInstance.id);

    var frameWrapper = frameInstance.container;


    var id = frameInstance.activeId;

    var frameEditor = {
        changes: [],
        tree: [],
        init: function (cb) {
            async.series({
                load:cb => {
                    frameEditor.load(cb)
                }
            }, cb);
        },
        load: function(cb){
            async.series({
                setHandlers:cb => {
                    frameEditor.setHandlers(cb)
                }
            }, cb);
        },
        reload: function(cb){
            async.series({
                load:cb => {
                    frameEditor.load(cb)
                }
            }, cb);
        },


        initTabs: function(cb){
            var nav_label = 'TAB_LABEL';
            frameWrapper.find(`.nav_headers[data-label=${nav_label}] li`).off('click').on('click', (e) => {
                let headers = $(e.currentTarget).parents('ul').first();
                let contents = frameWrapper.find(`.nav_tabs[data-label=${nav_label}]`);
                let type = $(e.currentTarget).attr('data-tab');

                // Проверим все ли required на данной вкладке заполнены
                // let active_type = headers.children('li.active').attr('data-tab');

                contents.children('.nav_tab').removeClass('active');
                headers.children('li').removeClass('active');
                contents.children(`.nav_tab[data-tab=${type}]`).addClass('active');
                $(e.currentTarget).addClass('active');
            });

            var tab_with_btn = 'TAB1';
            var tab_of_destination = 'TAB1';

            frameWrapper.find(`.nav_tab[data-tab=${tab_with_btn}] .go-next-tab`).off('click').on('click', (e) => {
                frameWrapper.find(`.nav_headers[data-label=${nav_label}] li[data-tab=${tab_of_destination}]`).click();
            });
            if (typeof cb==='function') cb(null);
        },
        setHandlers: function (cb) {
            frameEditor.initTabs();
            cb(null);
        }


    };

    frameInstance.afterLoad = function(cb){
        frameEditor.init();
        cb(null);
    }
    frameInstance.afterReload = function(cb){
        // Можно запихнуть все что нужно вызвать при релоаде без загрузки нового скрипта.
        frameEditor.reload(cb);
    };
    frameInstance.afterAdd = function(cb){
        var _t = this;
        return cb(null);
    };


    // Функции, которые подготавливают условия для зависимых where
    frameInstance.prepareWhere_COLUMN_NAME = function (obj, cb) {
        if (obj.value === null) return cb(null, [{key:'id',type:'in', val1:[-1]}]);
        // Получаем выбранную организацию. Получим объекты для организации
        var _ids = [];
        var o = {
            command:'get',
            object:'',
            columns:['',''],
            params:{
                where:[{key:'',type:'in', val1:[obj.value]}]
            },
            limit:10000000,
        };
        socketQuery(o, function (r) {
            if (r.code) return;
            if (!Object.keys(r.data).length) return cb(null, [{key:'id',type:'in', val1:[-1]}]);
            for (var i in r.data) {
                if (_ids.indexOf(r.data[i].SOME_ID) === -1) _ids.push(r.data[i].SOME_ID);
            }
            return cb(null, [{key:'id',type:'in', val1:_ids}]);
        })

    };

    // Требуется галочка depend_func. COLUMN_NAME for example = type_request_for_request_work_id;
    frameInstance.prepareSelfWhere_name = function (obj, cb) {
        if (!frameInstance.parent|| !frameInstance.parent.data_ || !frameInstance.parent.data_.COLUMN_NAME) return cb(null, [{key:'id',type:'in', val1:[-1]}]);
        return cb(null, [{key:'COLUMN_NAME', val1:frameInstance.parent.data_.COLUMN_NAME}]);

    };

    // Теребуется depend_column
    /**
     * depend_field_profile (может иметь value - значения родительского поля)
     * depend_sysname_field Поле с sysname
     * @param obj
     * @returns {{visible: boolean}|{}}
     */
    frameInstance.prepareProfile_COLUMN_NAME = function (obj) {
        var parent_field_value = (()=>{
            if (obj.depend_field_profile && obj.depend_field_profile.value && obj.depend_field_profile.value.sysname) return obj.depend_field_profile.value.sysname;
            if (obj.depend_sysname_field && obj.depend_sysname_field.value) return  obj.depend_sysname_field.value;
            return false;
        })();

        if (!parent_field_value) return {visible:false};
        var visible_if_sysname = ['SOME_SYSNAME'];
        if (visible_if_sysname.indexOf(parent_field_value) !== -1) return {};
        return {visible:false};
    };





}());
