(function(){

    var frameID = MB.Frames.justLoadedId;
    var frameInstance = MB.Frames.getFrame('frame_request_dashboard', frameID);
    // var frameWrapper = $('#mw-'+frameInstance.id);

    var frameWrapper = frameInstance.container;


    var id = frameInstance.activeId;

    var frameEditor = {
        changes: [],
        tree: [],
        role_alias: (()=>{
            var roles = (MB.User.roles && MB.User.roles.roles_obj_bySysname)? Object.keys(MB.User.roles.roles_obj_bySysname).sort() : [];
            return (roles.length)? roles.join('-') : 'NO_ROLE_FULL';
        })(),
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
                },
                initRequestTable:cb => {
                    frameEditor.initRequestTable(cb);
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
        initRequestTable:() => {
            // Проверим наличие клиентского объекта frame_request_dashboard_ROLE_ALIAS
            // Если нету загрузим frame_request_dashboard_NO_ROLE
            var frame_name = `frame_request_dashboard_${frameEditor.role_alias}`;
            var is_exist;
            async.series({
                checkCOExist:cb => {
                    var o = {
                        command:'checkExist',
                        object:'Client_object_profile',
                        params:{
                            object:'Request_work',
                            client_object:frame_name
                        }
                    };
                    socketQuery(o, (r)=>{
                        if (r.code) return cb(null);
                        is_exist = r.is_exist;
                        cb(null);
                    })
                },
                loadFrame:cb => {
                    frame_name = is_exist ? frame_name : 'frame_request_dashboard_NO_ROLE';
                    let o = {
                        container:frameWrapper.find('.frame-content'),
                        class:'Request_work',
                        client_object:frame_name,
                        parent:frameInstance,
                        ids:[],
                        name:frame_name,
                        // attr:$(item).data()
                    }

                    MB.Frames.createFrame(o, (err, frame)=>{
                        if (err) {
                            return cb(new MyError('Не удалось создать фрейм',{err:err, o:o}));
                        }
                        frameInstance.frmInstances.push(frame);
                        cb(null)
                    });
                }
            }, (err)=>{
                if (err) console.error(err);
            });
        },

        setHandlers: function (cb) {
            cb(null);
            // frameEditor.initTabs();
        }


    };

    frameInstance.afterReload = function(cb){
        // Можно запихнуть все что нужно вызвать при релоаде без загрузки нового скрипта.
        frameEditor.reload(cb);
    };
    frameInstance.afterAdd = function(cb){
        var _t = this;
        return cb(null);
    };


    frameInstance.afterLoad = function(cb){
        frameEditor.init();
        cb(null);
    }





}());
