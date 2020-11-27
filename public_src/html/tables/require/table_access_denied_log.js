(function () {

    var tableInstance = MB.Tables.getTable(MB.Tables.justLoadedId);


    $('.ct-environment-buttons ul').prepend(`<li id="make_access_true" class="ct-environment-btn">
                                            <div class="nb btn btnDouble green">
                                            <i class="fa fa-check"></i><div class="btnDoubleInner">Выдать доступ</div></div>
                                            </li>
                                            <li id="make_access_false" class="ct-environment-btn">
                                            <div class="nb btn btnDouble red">
                                            <i class="fa fa-times"></i><div class="btnDoubleInner">Закрыть доступ</div></div>
                                            </li>`);

    $('#make_access_true').off('click').on('click', function () {


        let o = {
            command: 'setAccessToCheckedRoleList',
            object: 'Access_denied_log',
            params: {
                ids: []
            }
        };

        for(let i in tableInstance.ct_instance.selection2.data){

            let sitem = tableInstance.ct_instance.selection2.data[i].id;

            o.params.ids.push(sitem);
        }

        if(!o.params.ids.length){
            return toastr['info']('Выберите строки');
        }

        socketQuery(o, function (res) {
            // console.log(res);
        });


    });

    $('#make_access_false').off('click').on('click', function () {


        let o = {
            command: 'setAccessToCheckedRoleList',
            object: 'Access_denied_log',
            params: {
                ids: [],
                remove:true
            }
        };

        for(let i in tableInstance.ct_instance.selection2.data){

            let sitem = tableInstance.ct_instance.selection2.data[i].id;

            o.params.ids.push(sitem);
        }


        if(!o.params.ids.length){
            return toastr['info']('Выберите строки');
        }

        socketQuery(o, function (res) {
            // console.log(res);
        });


    });






    tableInstance.ct_instance.ctxMenuData = [
        {
            name: 'addAccess',
            title: 'Выдать доступ',
            disabled: function(){
                return false;
            },
            callback: function(){

                var row = tableInstance.ct_instance.selectedRowIndex;
                var id = tableInstance.data.data[row].id;

                var o = {
                    command: 'setAccessToCheckedRole',
                    object: 'Access_denied_log',
                    params: {id: id}
                };

                socketQuery(o, function (res) {
                    // console.log(res);
                });
            }
        },
        {
            name: 'removeAccess',
            title: 'Забрать доступ',
            disabled: function(){
                return false;
            },
            callback: function(){

                var row = tableInstance.ct_instance.selectedRowIndex;
                var id = tableInstance.data.data[row].id;

                var o = {
                    command: 'setAccessToCheckedRole',
                    object: 'Access_denied_log',
                    params: {id: id, remove:true}
                };

                socketQuery(o, function (res) {
                    // console.log(res);
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
