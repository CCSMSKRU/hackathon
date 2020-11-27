(function () {

    var tableInstance = MB.Tables.getTable(MB.Tables.justLoadedId);


    tableInstance.ct_instance.ctxMenuData = [
        {
            name: 'option0',
            title: 'Выдать доступ',
            disabled: function(){
                return false;
            },
            callback: function(){

                var row = tableInstance.ct_instance.selectedRowIndex;
                var id = tableInstance.data.data[row].id;

                var o = {
                    command: 'setAccessToCheckedRole',
                    object: 'Menu',
                    params: {id: id}
                };
                socketQuery(o, function (res) {
                    console.log(res);
                });
            }
        },
        {
            name: 'option1',
            title: 'Забрать доступ',
            disabled: function(){
                return false;
            },
            callback: function(){

                var row = tableInstance.ct_instance.selectedRowIndex;
                var id = tableInstance.data.data[row].id;

                var o = {
                    command: 'setAccessToCheckedRole',
                    object: 'Menu',
                    params: {
                        id: id,
                        remove: true
                    }
                };
                socketQuery(o, function (res) {
                    console.log(res);
                });
            }
        }
    ];


    var insert = $('.ct-environment-buttons ul');
    var html = '<li style="list-style: none;" class="ct-environment-btn sync_operations"><div class="nb btn btnDouble blue"><i class="fa fa-download"></i><div class="btnDoubleInner">Sync operations</div></div></li>';

    insert.prepend(html);

    $('.sync_operations').off('click').on('click', function () {
        var info = toastr.info('Synchronizing...');

        let o = {
            command:'sync',
            object:'class_operation',
            params:{}
        };

        socketQuery(o, (res) => {
            info.fadeOut(100);
        });
    });
}());
