(function() {

    var modal = $('.mw-wrap').last();
    var formID = MB.Forms.justLoadedId;
    var formInstance = MB.Forms.getForm('form_class_operation', formID);
    var formWrapper = $('#mw-' + formInstance.id);

    var id = formInstance.activeId;




     var co = {
         tree: undefined,

         init: function(){
             co.getTree(function(){
                 co.populateTree();
             });
         },

         getTree: function (cb) {

             var o = {
                 command: 'getTree',
                 object: 'class_operation',
                 params: {
                     id: formInstance.activeId
                 }
             };

             socketQuery(o, function (res) {

                 if(res.code != 0){
                     toastr[res.toastr.type](res.toastr.message);
                     return;
                 }

                 co.tree = res.tree;

                 console.log('TREWEEEEEEEE', res.tree);

                 if(typeof cb == 'function'){
                     cb();
                 }

             });



         },

         populateTree: function () {

             var holder = formWrapper.find('.co-tree-holder');

             holder.jstree({
                 // 'plugins': ["checkbox"],
                 'core':{
                     'multiple' : false,
                     'data': function(node, cb){
                         if(node.id === "#") {
                             cb(co.tree.core.data);
                         }
                         else {
                             // debugger;
                             var o = {
                                 command:'getTreeChilds',
                                 object:'class_operation',
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
                 formInstance.activeId = id;
                 formInstance.tablePKeys['data'][0] = id;

                 formInstance.reloadByActiveId(function(newFormInstance){
                     co.reload();
                     formWrapper.find('.name-place').html(formInstance.data.data[0].name);

                 });
             });

         },
     }

     co.init();



}());
