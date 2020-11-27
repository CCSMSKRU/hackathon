(function () {

    let tableInstance = MB.Tables.getTable(MB.Tables.justLoadedId);


    tableInstance.ct_instance.highlight_row = [

        {
            column: 'timeliness_for_request_work_sysname',
            value: 'orange',
            color: 'orange'
        },
        {
            column: 'timeliness_for_request_work_sysname',
            value: 'red',
            color: 'red'
        }

    ];

    tableInstance.ct_instance.ctxMenuData = [
        {
            name: 'option1',
            title: 'Открыть в форме',
            disabled: function () {
                return false;
            },
            callback: function () {
                tableInstance.openRowInModal();
            }
        },
        // {
        //     name: 'createNew',
        //     title: 'Создать (temp)',
        //     disabled: function () {
        //         return false;
        //     },
        //     callback: function () {
        //         var form = new MB.FormN({
        //             id: MB.Core.guid(),
        //             name: 'form_request_work_new',
        //             class: 'Request_work',
        //             client_object: 'form_request_work_new',
        //             type: 'form',
        //             ids: [],
        //             position: 'center',
        //             read_only:true,
        //             hideReloadButton:true
        //         });
        //         form.create();
        //     }
        // },
        // {
        //     name: 'openNew',
        //     title: 'Открыть (temp)',
        //     disabled: function () {
        //         return false;
        //     },
        //     callback: function () {
        //         var row = tableInstance.ct_instance.selectedRowIndex;
        //         var id = tableInstance.data.data[row].id;
        //         var form = new MB.FormN({
        //             id: MB.Core.guid(),
        //             name: 'form_request_work_new',
        //             class: 'Request_work',
        //             client_object: 'form_request_work_new',
        //             type: 'form',
        //             ids: [id],
        //             position: 'center',
        //             read_only:true
        //         });
        //         form.create();
        //     }
        // }
    ];

}());
