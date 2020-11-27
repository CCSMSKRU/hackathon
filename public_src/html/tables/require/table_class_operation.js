(function () {

    var tableNId = $('.page-content-wrapper .classicTableWrap').data('id');
    var tableInstance = MB.Tables.getTable(tableNId);


    tableInstance.ct_instance.ctxMenuData = [
        {
            name: 'option1',
            title: 'Open in form',
            disabled: function(){
                return false;
            },
            callback: function(){
                tableInstance.openRowInModal();
            }
        },
        {
            name: 'option2',
            title: 'Refresh list',
            disabled: function(){
                return false;
            },
            callback: function(){

                let row = tableInstance.ct_instance.selectedRowIndex;
                let row_id = tableInstance.data.data[row]['id'];

                var o = {
                    command: 'sync',
                    object: 'class_operation',
                    params: {

                    }
                };


                socketQuery(o, function(res){

                    if(!res.code == 0){
                        return false;
                    }
                    tableInstance.reload();
                });

            }
        },
        {
            name: 'option3',
            title: 'Настроить доступ',
            disabled: function(){
                return false;
            },
            callback: function(){

                let row = tableInstance.ct_instance.selectedRowIndex;
                let row_id = tableInstance.data.data[row]['id'];
                let o_name = tableInstance.data.data[row]['name'];

                let tpl = `<ul id="list-of-roles">
                            {{#items}}
                                <li><label><input type="checkbox" data-id="{{name}}" /> {{name}}</label></li>
                            {{/items}}
                            </ul>`;

                // let ro = {
                //     command: 'get',
                //     object: 'user_role',
                //     params: {
                //         where: [{
                //             key: 'user_type_sysname',
                //             type
                //             : 'USER_ROLE'
                //         }]
                //     }
                // };

                let business_logic_roles = ['CLEANING', 'COMPANY_ADMIN', 'DISPATCHER',
                    'COMPANY_EMPLOYEE', 'ENGINEER', 'FACILITY_MANAGER', 'LEAD_ENGINEER',
                    'TECHNICIAN', 'GENERAL_DIRECTOR', 'SECRETARY', 'RENT_MANAGER', 'RECEPTION',
                    'SECURITY', 'SUPERADMIN','STOREKEEPER'];


                let mo = {
                    items:[]
                };


                for(let i in business_logic_roles){
                    mo.items.push({
                        name: business_logic_roles[i]
                    })
                }

                function executeAccess(type){

                    let o = {
                        command: 'setToRoles',
                        object: 'class_operation',
                        params: {
                            operation_ids: [],
                            roles: [],
                            remove: (type !== 'access')
                        }
                    };

                    for(let i=0; i< $('#list-of-roles input').length; i++ ){

                        let inp = $('#list-of-roles input').eq(i);

                        if(inp.attr('checked') == 'checked'){
                            o.params.roles.push(inp.attr('data-id'));
                        }

                    }

                    for(let i in tableInstance.ct_instance.selection2.data){

                        let sitem = tableInstance.ct_instance.selection2.data[i].id;

                        o.params.operation_ids.push(sitem);
                    }

                    console.log(o);

                    // return false;

                    socketQuery(o, function(res){

                    });



                }

                bootbox.dialog({
                    title: 'Настроить доступ к операции '+o_name,
                    message: Mustache.to_html(tpl, mo),
                    buttons:{
                        grant: {
                            label: 'Выдать доступ',
                            callback: function(){

                                executeAccess('access');

                                // return false;
                            }
                        },
                        reject: {
                            label: 'Отменить доступ',
                            callback: function(){

                                executeAccess('deny');

                                // return false;

                            }
                        }
                    }

                });




            }
        },
        {
            name: 'option4',
            title: 'Дать доступы всех операций YES для SUPERADMIN',
            disabled: function(){
                return false;
            },
            callback: function(){
                var o = {
                    command: 'setAllOperationYEStoSUPERADMIN',
                    object: 'class_operation',
                };
                socketQuery(o, function(res){
                    if(!res.code == 0){
                        return false;
                    }
                    tableInstance.reload();
                });

            }
        }
    ];

}());
