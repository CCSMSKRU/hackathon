(function () {

    var tableNId = $('.page-content-wrapper .classicTableWrap').data('id');
    var tableInstance = MB.Tables.getTable(tableNId);


    tableInstance.ct_instance.ctxMenuData = [
        {
            name: 'option1',
            title: 'Открыть в форме',
            disabled: function(){
                return false;
            },
            callback: function(){
                tableInstance.openRowInModal();
            }
        }
    ];

}());
