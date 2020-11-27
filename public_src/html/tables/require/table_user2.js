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
            title: 'Configure access',
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
            title: 'Configure roles',
            disabled: function(){
                return false;
            },
            callback: function(){

                let row = tableInstance.ct_instance.selectedRowIndex;
                let row_id = tableInstance.data.data[row]['id'];

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
        }
    ];

}());
