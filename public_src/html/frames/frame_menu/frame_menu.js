(function(){

    var frameID = MB.Frames.justLoadedId;
    var frameInstance = MB.Frames.getFrame('frame_menu', frameID);
    // var frameWrapper = $('#mw-'+frameInstance.id);
    var frameWrapper = frameInstance.container;
    alert('TTTS')

    var id = frameInstance.activeId;

    var se_tbl = frameInstance.tblInstances[0];

    var _Editor = {
        changes: [],
        tree: [],
        init: function () {
            console.log('_Editor init');
            _Editor.getTree(function () {

                _Editor.populateTree();

            });

            _Editor.setHandlers();

        },

        reload: function(cb){
            _Editor.setHandlers();
        },

        getTree: function (cb) {

            var o = {
                command: 'getTree',
                object: 'Menu',
                params: {
                    id: frameInstance.activeId
                }
            };

            socketQuery(o, function (res) {

                if (res.code != 0) {
                    toastr[res.toastr.type](res.toastr.message);
                    return;
                }

                _Editor.tree = res.tree;


                if (typeof cb == 'function') {
                    cb();
                }

            });

        },


        populateTree: function () {
            var holder = frameWrapper.find('.example-tree-holder');

            holder.jstree({
                'core':{
                    'multiple' : false,
                    'data': function(node, cb){
                        if(node.id === "#") {
                            cb(_Editor.tree.core.data);
                        }
                        else {
                            // debugger;
                            var o = {
                                command:'getTreeChilds',
                                object:'Menu',
                                params:{
                                    id: node.id
                                }
                            };

                            socketQuery(o, function(res){

                                if(!res.code == 0){
                                    toastr[res.toastr.type](res.toastr.message);
                                    return false;
                                }

                                cb(res.tree.core.data);
                            });
                        }
                    }
                }
            });


            holder.on('open_node.jstree', function (e,a) {

                console.log('open_node.jstree', a);

            });

            holder.on('select_node.jstree', function (e,a) {
                var id = a.node.id;
                frameInstance.activeId = id;
                // frameInstance.tablePKeys['data'][0] = id;
                //
                // frameInstance.reloadByActiveId(function(newFormInstance){
                //     _Editor.reload();
                //     frameWrapper.find('.name-place').html(frameInstance.data.data[0].name);
                //
                // });
            });



        },

        setHandlers: function () {



        }
    };

    //exampleEditor.getAll();

    // frameInstance.doNotGetScript = true;
    frameInstance.afterReload = function(cb){
        // Можно запихнуть все что нужно вызвать при релоаде без загрузки нового скрипта.
        _Editor.reload();
        cb();
    };
    _Editor.init();



}());
