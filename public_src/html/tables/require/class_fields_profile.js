(function () {

    var tableInstance = MB.Tables.getTable(MB.Tables.justLoadedId);



    tableInstance.ct_instance.ctxMenuData = [
        {
            name: 'option1',
            title: 'Open',
            disabled: function(){
                return false;
            },
            callback: function(){
                tableInstance.openRowInModal();
            }
        },
        {
            name: 'option2',
            title: 'Set column position',
            disabled: function(){
                return false;
            },
            callback: function(){
                var column_name = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['column_name'];
                var column_class = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['class'];
                var column_co = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['client_object'];
                var max = tableInstance.data.extra_data.count_all;

                bootbox.dialog({
                    title: 'Enter column position',
                    message: '<input autofocus type="number" id="new_column_position" min="1" value=""/>',
                    buttons: {
                        success: {
                            label: 'Confirm',
                            callback: function(){
                                var val = $('#new_column_position').val();
                                if(val != '' && !isNaN(+val)){
                                    var o = {
                                        command: 'setColumnPosition',
                                        object: column_class,
                                        params: {
                                            column: column_name,
                                            position: val
                                        }
                                    };
                                    if(column_co){
                                        o.client_object = column_co;
                                    }
                                    socketQuery(o, function(res){
                                        console.log(res);
                                        tableInstance.reload();
                                    });

                                }else{
                                    toastr['info']('Please enter a valid position');
                                }
                            }
                        },
                        error: {
                            label: 'Cancel',
                            callback: function(){

                            }
                        }
                    }
                });

            }
        }
    ];

}());
