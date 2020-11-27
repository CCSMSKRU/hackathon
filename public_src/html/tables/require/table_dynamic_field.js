(function () {

    var tableNId = $('.page-content-wrapper .classicTableWrap').data('id');
    var tableInstance = MB.Tables.getTable(tableNId);

    tableInstance.ct_instance.ctxMenuData = [
        // {
        //     name: 'option1',
        //     title: 'Open',
        //     disabled: function(){
        //         return false;
        //     },
        //     callback: function(){
        //         tableInstance.openRowInModal();
        //     }
        // },
        {
            name: 'sync',
            title: 'Sync',
            disabled: function(){
                return false;
            },
            callback: function(){
                var row = tableInstance.ct_instance.selectedRowIndex;
                var o = {
                    command:'sync',
                    object:'dynamic_field',
                    params:{
                        id:tableInstance.data.data[row].id
                    }
                };
                socketQuery(o, function(r){
                    console.log(r);
                    tableInstance.reload();
                });
            }
        },
        {
            name: 'removeSelected',
            title: 'Remove selected',
            disabled: function(){
                return false;
            },
            callback: function(){
                var row = tableInstance.ct_instance.selectedRowIndex;

                var d = tableInstance.ct_instance.selection2.data;
                var ids = [];

                for (var i in d) {
                    ids.push(d[i].id);

                }
                async.eachSeries(ids, function(id, cb){
                    var o = {
                        command:'sync',
                        object:'dynamic_field',
                        params:{
                            id:id,
                            to_remove:true
                        }
                    };
                    socketQuery(o, function(r){
                        cb(null);
                    });
                }, (err, res)=>{
                    tableInstance.reload();
                });
            }
        }
    ];




}());
