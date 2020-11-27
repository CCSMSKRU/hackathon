(function() {

    var modal = $('.mw-wrap').last();
    var formID = MB.Forms.justLoadedId;
    var formInstance = MB.Forms.getForm('form_user_role', formID);
    var formWrapper = $('#mw-' + formInstance.id);

    var id = formInstance.activeId;

    var tceWrapper = formWrapper.find('.tce_inner');

    var company_id = formInstance.params.company_id;

    console.log('company_id', company_id);

    tceWrapper.tce({
	    search_placeholder: 'Введите поисковый запрос...',
        parent_id: id,
        parent_key: 'user_id',

        left_pk : 'id',
        right_pk : 'id',

        left_id : 'id',
        right_id : 'id',

        left_name : 'fio',
        right_name : 'fio_role',

        get_left : 'user',
        get_left_params: [
            {
                key: 'user_type_sysname',
                value: 'USER_ROLE'
            }
        ],
	    exclude_left_field: 'role_user_id',
        get_right : 'user_role',
        command_right: 'get',
        get_right_params: [
            {
                key: 'user_id',
                value: formInstance.activeId
            }
        ],
        lu_command : 'user_role',
        add_params: [
            // {
            //     key: 'class_operation_id',
            //     value: $('.operation-tab.selected').attr('data-id')
            // },
            // {
            //     key: 'record_id',
            //     value: obj.id
            // },
            {
                key: 'role_user_id',
                value: 'GET_ROW_ID'
            },
            {
                key: 'user_id',
                value: formInstance.activeId
            }
        ],

        left_label: 'Availiable roles',
        right_label: 'Binded roles',
        search_label: 'Search for roles',

        back_button: false
    });



    // tceWrapper.tce({
    //     parent_id: formInstance.activeId,
    //     parent_key: 'user_id',
    //
    //     left_pk : 'id',
    //     right_pk : 'id',
    //
    //     left_id : 'id',
    //     right_id : 'id',
    //
    //     left_name : 'name',
    //     right_name : 'name',
    //
    //     get_left : 'role',
    //     get_right : 'user_role',
    //
    //     lu_command : 'user_role',
    //
    //     left_label: 'Availiable roles',
    //     right_label: 'Binded roles',
    //     search_label: 'Search for roles',
    //
    //     back_button: false
    // });

}());

