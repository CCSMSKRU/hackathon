(function () {

    var tableInstance = MB.Tables.getTable(MB.Tables.justLoadedId);


    tableInstance.wrapper.find('.ct-btn-create-inline').remove();

    tableInstance.ct_instance.ctxMenuData = [
        {
            name: 'option1',
            title: 'Открыть в форме',
            disabled: function(){ return false; },
            callback: function(){
                tableInstance.openRowInModal();
            }
        },
        {
            name: 'option2',
            title: 'Копировать систему в текущую группу систем',
            disabled: function(){ return false; },
            callback: function(){
                socketQuery({
                    command: 'doublicate',
                    object: 'object_system',
                    params: {
                        id: tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex].id
                    }
                }, res => {
                    tableInstance.reload()
                })
            }
        }

    ];

}());
