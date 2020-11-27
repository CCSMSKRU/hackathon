(function() {

    var modal = $('.mw-wrap').last();
    var formID = MB.Forms.justLoadedId;
    var formInstance = MB.Forms.getForm('form_access_to_operation', formID);
    var formWrapper = $('#mw-' + formInstance.id);

    var id = formInstance.activeId;


    var access = {
        operationsTree: undefined,
        menuTree: undefined,
        activeNode: undefined,

        init: function(){

            access.getOperationsTree(function(){
                access.populateOperationsTree();
            });

            access.getMenuTree(function(){
                access.populateMenuTree();
            });

        },

        getOperationsTree: function(cb){

            var o = {
                command: 'getTree',
                object: 'access_to_operation',
                params: {
                    // id: formInstance.activeId
                    user_id: 25
                }
            };

            socketQuery(o, function (res) {

                if (res.code != 0) {
                    toastr[res.toastr.type](res.toastr.message);
                    return;
                }

                access.operationsTree = res.tree;

                console.log('oper tree', res.tree);

                if (typeof cb == 'function') {
                    cb();
                }
            });
        },
        // populateOperationsTree: function () {
        //
        //     var holder = formWrapper.find('.operations-tree-holder');
        //
        //     holder.jstree(access.operationsTree);
        //
        //     holder.on('select_node.jstree', function (e,a) {
        //         var id = a.node.id;
        //
        //         access.activeNode = a.node;
        //
        //         formInstance.activeId = id;
        //         formInstance.tablePKeys['data'][0] = id;
        //
        //         access.reload();
        //
        //         formInstance.reloadByActiveId(function(){
        //             formWrapper.find('.name-place').html(formInstance.data.data[0].name);
        //         });
        //
        //         access.populateRules();
        //
        //     });
        //
        // },
        populateOperationsTree: function () {

            var holder = formWrapper.find('.operations-tree-holder');
            holder.jstree({
                'core':{
                    'multiple' : false,
                    'data': function(node, cb){
                        if(node.id === "#") {
                            cb(access.operationsTree.core.data);
                        }
                        else {
                            // debugger;
                            var o = {
                                command:'getTreeChilds',
                                object:'access_to_operation',
                                params:{
                                    id: node.id
                                }
                            };

                            socketQuery(o, function(res){

                                if(!res.code == 0){
                                    toastr[res.toastr.type](res.toastr.message);
                                    return false;
                                }
                                console.log('TREE DATA', res.tree.core.data);

                                cb(res.tree.core.data);
                            });
                        }
                    }
                }
            });
            holder.on('open_node.jstree', function (e,a) {
                console.log('here', a);
            });

            holder.on('select_node.jstree', function (e,a) {
                var id = a.node.id;

                access.activeNode = a.node;

                formInstance.activeId = id;
                formInstance.tablePKeys['data'][0] = id;

                formInstance.reloadByActiveId(function(newFormInstance){
                    access.reload();
                    formWrapper.find('.name-place').html(formInstance.data.data[0].name);

                });

                //
            });
        },

        getMenuTree: function(cb){
            return;
            var o = {
                command: 'getTree',
                object: 'menu',
                params: {
                    id: formInstance.activeId
                }
            };

            socketQuery(o, function (res) {

                if (res.code != 0) {
                    toastr[res.toastr.type](res.toastr.message);
                    return;
                }

                access.menuTree = res.tree;

                console.log('oper tree', res.tree);

                if (typeof cb == 'function') {
                    cb();
                }
            });
        },
        populateMenuTree: function () {
            console.log('ПЕРЕДЕЛАТЬ КАК populateOperationsTree');
            return;

            var holder = formWrapper.find('.menu-tree-holder');

            holder.jstree(access.menuTree);

            holder.on('select_node.jstree', function (e,a) {
                var id = a.node.id;

                formInstance.activeId = id;
                formInstance.tablePKeys['data'][0] = id;

                access.reload();

                formInstance.reloadByActiveId(function(){
                    formWrapper.find('.name-place').html(formInstance.data.data[0].name);
                });


            });

        },

        setHandlers: function(){

            formWrapper.find('.rule-holder input[type="checkbox"][data-id="is_denied"]').off('change').on('change', function(){

                var state = $(this)[0].checked;

                var o = {
                    command: 'modifyIsDenied',
                    object: 'access_to_operation',
                    params: {
                        state: state
                    }
                };

                socketQuery(o, function(res){

                    if(!res.code == 0){
                        access.populateRules();
                        return false;
                    }


                    access.activeNode.original.access_to_operation.is_denied = state;
                    access.populateRules();
                });
            });

            formWrapper.find('.rule-holder input[type="checkbox"][data-id="is_access"]').off('change').on('change', function(){

                var state = $(this)[0].checked;


                var o = {
                    command: 'modifyIsAccess',
                    object: 'access_to_operation',
                    params: {
                        state: state
                    }
                };

                socketQuery(o, function(res){

                    if(!res.code == 0){
                        access.populateRules();
                        return false;
                    }

                    access.activeNode.original.access_to_operation.is_access = state;
                    access.populateRules();
                });
            });

            formWrapper.find('.rule-holder input[type="checkbox"][data-id="is_access_by_list"]').off('change').on('change', function(){

                var state = $(this)[0].checked;


                var o = {
                    command: 'modifyIsAccessByList',
                    object: 'access_to_operation',
                    params: {
                        state: state
                    }
                };

                socketQuery(o, function(res){

                    if(!res.code == 0){
                        access.populateRules();
                        return false;
                    }
                    access.activeNode.original.access_to_operation.is_access_by_list = state;
                    access.populateRules();
                });
            });






        },
        reload: function(cb){
            // access.getOperationsTree(function(){
            //     access.populateOperationsTree();
            // });

            // access.getMenuTree(function(){
            //     access.populateMenuTree();
            // });
            access.populateRules();
        },

        getRules: function(cb){



        },
        populateRules: function(){

            var mo = {
                is_denied: access.activeNode.original.access_to_operation.is_denied,
                is_access: access.activeNode.original.access_to_operation.is_access,
                is_access_by_list: access.activeNode.original.access_to_operation.is_access_by_list,
                node_name: access.activeNode.text,
                cos: []
            };

            var tpl = `<h3 class="rules-class-title">{{node_name}}</h3>
                    
                    <div class="rules-holder {{#is_denied}}is_denied{{/is_denied}}">
                    
                    <div class="rule-holder disallow-rule" data-id="is_denied">
                        <div class="rule-handler-holder">
                            <input type="checkbox" {{#is_denied}}checked="checked"{{/is_denied}} data-id="is_denied"/>                        
                        </div>                    
                        <div class="rule-title">Disallow all</div>                    
                    </div>

                                                                                                                    
                    <div class="rule-holder" style="display: none;" data-id="SELECT_ALL">
                        <div class="rule-handler-holder">
                            <input type="checkbox" {{#is_denied}}disabled="disabled"{{/is_denied}} data-id="SELECT_ALL"/>                        
                        </div>                    
                        <div class="rule-title">Select/deselect all</div>                    
                    </div>
                    
                    <div class="rule-holder" data-id="is_access">
                        <div class="rule-handler-holder">
                            <input type="checkbox" {{#is_denied}}disabled="disabled"{{/is_denied}} {{#is_access}}checked="checked"{{/is_access}} data-id="is_access"/>                        
                        </div>                    
                        <div class="rule-title">Allow access</div>                    
                    </div>
                    
                    <div class="rule-holder" style="margin-left: 30px;max-width: 500px;" data-id="is_access_by_list">
                        <div class="rule-handler-holder">
                            <input type="checkbox" {{#is_denied}}disabled="disabled"{{/is_denied}} {{#is_access_by_list}}checked="checked"{{/is_access_by_list}} data-id="is_access_by_list"/>                        
                        </div>                    
                        <div class="rule-title">Access by list</div>
                        
                        <div class="rule-select-title">Access by list type:</div>
                        <select class="rule-handler-select" {{#is_denied}}disabled="disabled"{{/is_denied}} data-id="LIST_ACCESS_TYPE">
                            <option value="-1"> - </option>                        
                            <option value="1">Some type</option>                        
                            <option value="2">Some other type</option>                        
                        </select>
                                             
                    </div>
                    
                    <br/>
                    <br/>
                    <br/>
                    
                    <h3>Client objects:</h3>
                    
                    <div class="rule-holder" data-id="CO_ALLOW_ALL">
                        <div class="rule-handler-holder">
                            <input type="checkbox" data-id="CO_ALLOW_ALL"/>                        
                        </div>                    
                        <div class="rule-title">Allow all</div>                    
                    </div>
                    
                    <div class="rule-holder" data-id="CO_DISALLOW_ALL">
                        <div class="rule-handler-holder">
                            <input type="checkbox" data-id="CO_DISALLOW_ALL"/>                        
                        </div>                    
                        <div class="rule-title">Disallow all</div>                    
                    </div>
                    
                    <div class="list-of-co-holder">
                        {{#cos}}
                            <div class="rule-holder" data-id="CO_{{name}}">
                                <div class="rule-handler-holder">
                                    <input type="checkbox" class="rule-co" data-id="CO_{{name}}"/>                        
                                </div>                    
                                <div class="rule-title">{{name}}</div>                    
                            </div>
                        {{/cos}}                    
                    </div>
                    </div>`;

            var settings_wrapper = formWrapper.find('.operations-settings-holder');

            settings_wrapper.html(Mustache.to_html(tpl, mo));

            access.setHandlers();

        }
    };

    formInstance.doNotGetScript = true;
    formInstance.afterReload = function(cb){
        // Можно запихнуть все что нужно вызвать при релоаде без загрузки нового скрипта.
        access.reload();
        cb();
    };
    access.init();


}());