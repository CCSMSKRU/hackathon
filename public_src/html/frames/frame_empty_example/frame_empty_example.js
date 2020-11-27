(function(){

    var frameID = MB.Frames.justLoadedId;
    var frameInstance = MB.Frames.getFrame('frame_empty_example', frameID);
    var frameWrapper = frameInstance.container;

    var id = frameInstance.activeId;

    var frameEditor = {
        changes: [],
        tree: [],
        init: function () {
            frameEditor.setHandlers();
        },

        reload: function(cb){
            frameEditor.setHandlers();
        },

        setHandlers: function () {

        }
    };

    frameInstance.afterReload = function(cb){
        // Можно запихнуть все что нужно вызвать при релоаде без загрузки нового скрипта.
        frameEditor.reload();
        cb();
    };
    frameInstance.afterLoad = function(cb){
        frameEditor.init();
        cb(null);
    }



}());
