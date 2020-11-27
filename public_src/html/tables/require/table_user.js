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
            name: 'option5',
            title: 'Настроить доступ',
            disabled: function(){
                return false;
            },
            callback: function(){

                let formId = MB.Core.guid();
                let row = tableInstance.ct_instance.selectedRowIndex;
                let id = tableInstance.data.data[row]['id'];

                let form = new MB.FormN({
                    id: formId,
                    name: 'form_user_access_to_operation',
                    class: 'user',
                    client_object: 'form_user_access_to_operation',
                    type: 'form',
                    ids: [id],
                    position: 'center'
                });

                form.create(function () {

                });

            }
        },
        {
            name: 'option3',
            title: 'Настроить роли',
            disabled: function(){
                return false;
            },
            callback: function(){

                let row = tableInstance.ct_instance.selectedRowIndex;
                let row_id = tableInstance.data.data[row]['id'];


                let formId = MB.Core.guid();

                let form = new MB.FormN({
                    id: formId,
                    name: 'form_user_role',
                    class: 'user',
                    client_object: 'form_user_role',
                    type: 'form',
                    ids: [row_id],
                    position: 'center',
                    params: {
                    }
                });

                form.create(function () {

                });

                return;


                var o = {
                    command: 'get',
                    object: 'company_sys',
                    params: {

                    }
                };

                var companies;

                socketQuery(o, function(res){

                    if(!res.code == 0){
                        return false;
                    }

                    companies = res.data;


                    let tpl = `<div id="list-holder">{{#data}}<div class="list-item" data-id="{{id}}">{{name}}</div>{{/data}}</div>`;
                    let mo = {
                        data: [{
                            id: 'ALL',
                            name: 'All companies'
                        }]
                    };

                    for(let i in companies){
                        mo.data.push(companies[i]);
                    }


                    bootbox.dialog({
                        title: 'Select company',
                        message: Mustache.to_html(tpl,mo),
                        buttons: {
                            success: {
                                label: 'Select',
                                callback: function(){

                                    let selected = $('#list-holder .list-item.selected').attr('data-id');

                                    if(!selected){
                                        toastr['warning']('Please, select a company.');
                                        return false;
                                    }

                                    let formId = MB.Core.guid();

                                    let form = new MB.FormN({
                                        id: formId,
                                        name: 'form_user_role',
                                        class: 'user',
                                        client_object: 'form_user_role',
                                        type: 'form',
                                        ids: [row_id],
                                        position: 'center',
                                        params: {
                                            company_id: selected
                                        }
                                    });

                                    form.create(function () {

                                    });
                                }
                            },
                            error: {
                                label: 'Cancel',
                                callback: function(){

                                }
                            }
                        }
                    });

                    $('#list-holder .list-item').off('click').on('click', function(){

                        $('#list-holder .list-item').removeClass('selected');
                        $(this).addClass('selected');

                    });



                    console.log(companies);

                });

            }
        },
        {
            name: 'option2',
            title: 'Подтвердить регистрацию',
            disabled: function(){
                return false;
            },
            callback: function(){
                var column_name = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['column_name'];
                var column_class = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['name'];
                var column_co = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['client_object'];
                var row_id = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['id'];
                var max = tableInstance.data.extra_data.count_all;

                var o = {
                    command: 'confirmUser',
                    object: 'User',
                    params: {
                        id: row_id
                    }
                };

                socketQuery(o, function (res) {
                    toastr[res.toastr.type](res.toastr.message);
                    tableInstance.reload();
                });

            }
        },
        {
            name: 'option4',
            title: 'Проставить почту для уведомлений всем юзерам, у кого не указана почта для уведомлений',
            disabled: function(){
                return false;
            },
            callback: function(){
                var o = {
                    command: 'setDefaultEmailForNotificationForAllUsers',
                    object: 'User'
                };

                socketQuery(o, function (res) {
                    tableInstance.reload();
                });

            }
        },
        {
            name: 'option999',
            title: 'Отправить новый пароль пользователю на почту',
            disabled: function(){
                return false;
            },
            callback: function(){
                // setRandomPasswordAndSendEmail
                let row = tableInstance.ct_instance.selectedRowIndex;
                let id = tableInstance.data.data[row]['id'];
                var o = {
                    command: 'setRandomPasswordAndSendEmail',
                    object: 'User',
                    params: {
                        id: id
                    }
                };

                socketQuery(o, function (res) {
                    tableInstance.reload();
                });

            }
        }
        // {
        //     name: 'option7',
        //     title: 'Создать пароль и выслать на почту',
        //     disabled: function(){
        //         return false;
        //     },
        //     callback: function(){
        //
        //         let row = tableInstance.ct_instance.selectedRowIndex;
        //         let id = tableInstance.data.data[row]['id'];
        //
        //         let o = {
        //             command: 'generateTempPassword',
        //             object: 'user',
        //             params: {
        //                 id: id
        //             }
        //         };
        //
        //         socketQuery(o, function(res){
        //
        //             if(!res.code){
        //
        //             }
        //
        //         });
        //
        //     }
        // }
    ];

}());
