(function () {
    var tableInstance = MB.Tables.getTable(MB.Tables.justLoadedId);


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
        },
        {
            name: 'option2',
            title: 'Синхронизировать с table.json',
            disabled: function(){
                return false;
            },
            callback: function(){
                var column_name = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['column_name'];
                var column_class = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['name'];
                var column_co = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['client_object'];
                var max = tableInstance.data.extra_data.count_all;

                var o = {
                    command: 'syncWithTableJson',
                    object: 'Table',
                    params: {
                        name: column_class
                    }
                };

                socketQuery(o, function (res) {
                    toastr[res.toastr.type](res.toastr.message);
                    tableInstance.reload();
                });

            }
        },
        {
            name: 'checkGet',
            title: 'Проверить get запрос',
            disabled: function () {
                return false;
            },
            callback: function () {
                var column_name = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['column_name'];
                var class_name = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['name'];
                var column_co = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['client_object'];
                var max = tableInstance.data.extra_data.count_all;

                var o = {
                    command: 'get',
                    object: class_name,
                    params: {
                    }
                };

                socketQuery(o, function (res) {
                });

            }
        },
        {
            name: 'SyncGoCoreClasses',
            title: 'Sync GoCore classes (DANGER)',
            disabled: function(){
                return false;
            },
            callback: function(){
                var o = {
                    command: 'syncTableCore',
                    object: 'class_profile',
                    params: {}
                };

                socketQuery(o, function (res) {
                    toastr[res.toastr.type](res.toastr.message);
                    tableInstance.reload();
                });

            }
        },
        {
            name: 'syncServer',
            title: 'Update server (DANGER)',
            disabled: function(){
                return false;
            },
            callback: function(){
                // var column_name = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['column_name'];
                // var column_class = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['name'];
                // var column_co = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['client_object'];
                // var max = tableInstance.data.extra_data.count_all;

                var o = {
                    command: 'syncServer',
                    object: 'Class_profile',
                    params: {}
                };
                socketQuery(o, function (r) {


                    if (+r.code){
                        if (toastr) toastr[r.toastr.type](r.toastr.message, r.toastr.title);
                        return;
                    }

                    console.log(r);

                    var html = '';


                    for(var i in r.data){
                        var c = r.data[i];
                        html += '<div class="class-holder"><h4 class="class-name">'+c.name+'</h4>';

                        if(c.to_remove){
                            html += '<div class="ch-holder ch-remove-holder"><input data-type="class" data-fields="false" data-class="'+c.name+'" data-co="" data-oper="remove" type="checkbox" class="ch-handler ch-remove"/> to remove</div>';
                        }
                        if(c.to_add){
                            html += '<div class="ch-holder ch-add-holder"><input data-type="class" data-fields="false" data-class="'+c.name+'" data-co="" data-oper="add" type="checkbox" class="ch-handler ch-add"/> to add</div>';
                        }
                        if(c.to_modify){
                            html += '<div class="class-ctm-holder">';
                            for(var k in c.columns_to_modify){
                                var p = c.columns_to_modify[k];
                                html += '<div class="class-ctm-item">' +
                                            '<input type="checkbox" class="ch-handler ch-ctm" data-ctm="'+k+'" data-type="class" data-fields="false" data-class="'+c.name+'" data-co="" data-oper="modify" data-name="'+k+'" />' +
                                            '<span class="ctm-name">'+k+'</span>'+
                                            '<span class="ctm-old">old: '+p.old_val+'</span>' +
                                            '<span class="ctm-new">new: '+p.new_val+'</span>' +
                                        '</div>';
                            }
                            html+='</div>';
                        }

                        if(!c.to_remove && !c.to_add){
                            html += '<div class="class-fields-holder">';
                        // <div class="class-fields-holder-label">Fields:</div>
                            for(var j in c.fields){
                                var f = c.fields[j];
                                if(f.to_remove || f.to_add || f.to_modify){
                                    html += '<div class="fld-item"><h5>'+j+'</h5>';
                                    if(f.to_remove){
                                        html += '<div class="ch-holder fld-remove-holder"><input type="checkbox" data-type="class" data-fields="true" data-class="'+c.name+'" data-co="" data-oper="remove" data-name="'+j+'" class="ch-handler fld-remove"/> to remove</div>';
                                    }
                                    if(f.to_add){
                                        html += '<div class="ch-holder fld-add-holder"><input type="checkbox" data-type="class" data-fields="true" data-class="'+c.name+'" data-co="" data-oper="add" data-name="'+j+'" class="ch-handler fld-add"/> to add</div>';
                                    }
                                    if(f.to_modify){
                                        html += '<div class="field-ctm-holder">';
                                        for(var l in f.columns_to_modify){
                                            var fctm = f.columns_to_modify[l];
                                            html += '<div class="field-ctm-item">' +
                                                '<input type="checkbox" class="ch-handler ch-ctm" data-ctm="'+l+'" data-type="class" data-fields="true" data-class="'+c.name+'" data-co="" data-oper="modify" data-name="'+j+'"/>' +
                                                '<span class="ctm-name">'+l+'</span>'+
                                                '<span class="ctm-old">old: '+fctm.old_val+'</span>' +
                                                '<span class="ctm-new">new: '+fctm.new_val+'</span>' +
                                                '</div>';
                                        }
                                        html+='</div>';
                                    }
                                    html += '</div>';
                                }
                            }
                            html+='</div>';
                        }

                        // CLIENT OBJECTS

                        for(var i in c.client_objects){
                            var co = c.client_objects[i];
                            html += '<div class="class-holder co-holder"><h4 class="class-name co-name">co:&nbsp;&nbsp;&nbsp;<span style="font-weight: bold; font-size: 14px;">'+co.name+'</span></h4>';

                            if(co.to_remove){
                                html += '<div class="ch-holder ch-remove-holder"><input type="checkbox" data-type="co" data-fields="false" data-class="'+c.name+'" data-co="'+co.name+'" data-oper="remove" class="ch-handler ch-remove co-ch"/> to remove</div>';
                            }
                            if(co.to_add){
                                html += '<div class="ch-holder ch-add-holder"><input type="checkbox" data-type="co" data-fields="false" data-class="'+c.name+'" data-co="'+co.name+'" data-oper="add"  class="ch-handler ch-add  co-ch"/> to add</div>';
                            }
                            if(co.to_modify){
                                html += '<div class="class-ctm-holder co-ctm-holder">';
                                for(var ko in co.columns_to_modify){
                                    var po = co.columns_to_modify[ko];
                                    html += '<div class="class-ctm-item">' +
                                        '<input type="checkbox" class="ch-handler ch-ctm co-ctm" data-ctm="'+ko+'" data-type="co" data-fields="false" data-class="'+c.name+'" data-co="'+co.name+'" data-oper="modify" data-name="'+ko+'"/>' +
                                        '<span class="ctm-name">'+ko+'</span>'+
                                        '<span class="ctm-old">old: '+po.old_val+'</span>' +
                                        '<span class="ctm-new">new: '+po.new_val+'</span>' +
                                        '</div>';
                                }
                                html+='</div>';
                            }

                            if(!co.to_remove && !co.to_add){
                                html += '<div class="class-fields-holder co-fields-holder">';
                                // <div class="class-fields-holder-label">Fields:</div>
                                for(var jo in co.fields){
                                    var fo = co.fields[jo];
                                    if(fo.to_remove || fo.to_add || fo.to_modify){
                                        html += '<div class="fld-item co-fld-item"><h5>'+jo+'</h5>';
                                        if(fo.to_remove){
                                            html += '<div class="ch-holder fld-remove-holder"><input type="checkbox" class="ch-handler fld-remove co-ch"  data-type="co" data-fields="true" data-class="'+c.name+'" data-co="'+co.name+'" data-oper="remove"  data-name="'+jo+'"/> to remove</div>';
                                        }
                                        if(fo.to_add){
                                            html += '<div class="ch-holder fld-add-holder"><input type="checkbox" class="ch-handler fld-add co-ch" data-type="co" data-fields="true" data-class="'+c.name+'" data-co="'+co.name+'" data-oper="add" data-name="'+jo+'" /> to add</div>';
                                        }
                                        if(fo.to_modify){
                                            html += '<div class="field-ctm-holder">';
                                            for(var lo in fo.columns_to_modify){
                                                var fctmo = fo.columns_to_modify[lo];
                                                html += '<div class="field-ctm-item">' +
                                                    '<input type="checkbox" class="ch-handler ch-ctm" data-ctm="'+lo+'" data-type="co" data-fields="true" data-class="'+c.name+'" data-co="'+co.name+'" data-oper="modify"  data-name="'+jo+'"/>' +
                                                    '<span class="ctm-name">'+lo+'</span>'+
                                                    '<span class="ctm-old">old: '+fctmo.old_val+'</span>' +
                                                    '<span class="ctm-new">new: '+fctmo.new_val+'</span>' +
                                                    '</div>';
                                            }
                                            html+='</div>';
                                        }
                                        html += '</div>';
                                    }
                                }
                                html+='</div>';
                            }
                            html+='</div>';
                        }
                        html+='</div>';
                    }

                    /// MENU
                    // html += '<div class="class-holder"><h2>=========MENU==========</h2></div>';
                    //
                    // for(var i2 in r.menu){
                    //     var c = r.menu[i2];
                    //     html += '<div class="class-holder"><h4 class="menu-name">'+c.name+'</h4>';
                    //
                    //     if(c.to_remove){
                    //         html += '<div class="ch-holder ch-remove-holder"><input data-type="class" data-fields="false" data-class="'+c.name+'" data-co="" data-oper="remove" type="checkbox" class="ch-handler ch-remove"/> to remove</div>';
                    //     }
                    //     if(c.to_add){
                    //         html += '<div class="ch-holder ch-add-holder"><input data-type="class" data-fields="false" data-class="'+c.name+'" data-co="" data-oper="add" type="checkbox" class="ch-handler ch-add"/> to add</div>';
                    //     }
                    //     if(c.to_modify){
                    //         html += '<div class="class-ctm-holder">';
                    //         for(var k in c.columns_to_modify){
                    //             var p = c.columns_to_modify[k];
                    //             html += '<div class="class-ctm-item">' +
                    //                 '<input type="checkbox" class="ch-handler ch-ctm" data-ctm="'+k+'" data-type="class" data-fields="false" data-class="'+c.name+'" data-co="" data-oper="modify" data-name="'+k+'" />' +
                    //                 '<span class="ctm-name">'+k+'</span>'+
                    //                 '<span class="ctm-old">old: '+p.old_val+'</span>' +
                    //                 '<span class="ctm-new">new: '+p.new_val+'</span>' +
                    //                 '</div>';
                    //         }
                    //         html+='</div>';
                    //     }
                    //
                    //     html+='</div>';
                    // }


                    bootbox.dialog({
                        title: 'Differences between servers',
                        message: html,
                        className: 'wide-modal merge-databases',
                        buttons: {
                            confirm: {
                                label: 'Confirm selected',
                                callback: function(){
                                    var o = {
                                        command: 'updateServer',
                                        object: 'Class_profile',
                                        params: {
                                            data:r.data,
                                            dateTimeMySQL:r.dateTimeMySQL
                                        }
                                    };
                                    socketQuery(o, function (r) {
                                        if (+r.code) {
                                            if (toastr) toastr[r.toastr.type](r.toastr.message, r.toastr.title);
                                            return;
                                        }
                                    });
                                }
                            },
                            cancel: {
                                label: 'Cancel',
                                callback: function(){

                                }
                            }
                        }
                    });

                    $('.field-ctm-item input[type="checkbox"]').off('mouseover').on('mouseover', function(e){
                        if (!e.ctrlKey && !e.shiftKey) return;
                        if (e.ctrlKey && $(this).attr('checked') === 'checked') return; // Уже выбрана
                        if (e.shiftKey && $(this).attr('checked') !== 'checked') return; // Уже снята
                        $(this).click();
                    });

                    // $('.field-ctm-item').each(function (index, value){
                    //     var name = $(this).find('span.ctm-name:first').text();
                    //     var old = $(this).find('span.ctm-old:first').text();
                    //     var inpt = $(this).find('input:first');
                    //     if (name === 'created_by_user_id' && old === 'old: null') inpt.click();
                    //     if (name === 'self_company_id' && old === 'old: null') inpt.click();
                    //     if (name === 'ext_company_id' && old === 'old: null') inpt.click();
                    // });

                    // $('.field-ctm-item').each(function (index, value){
                    //     var name = $(this).find('span.ctm-name:first').text();
                    //     var old = $(this).find('span.ctm-old:first').text();
                    //     var inpt = $(this).find('input:first');
                    //     if (name === 'updated' && old === 'old: null') inpt.click();
                    // });

                    $('.field-ctm-item').each(function (index, value){
                        var name = $(this).find('span.ctm-name:first').text();
                        var old = $(this).find('span.ctm-old:first').text();
                        var new_ = $(this).find('span.ctm-new:first').text();
                        var inpt = $(this).find('input:first');
                        // console.log("old", old);
                        if (name === 'default_value' && old === 'old: ' && new_ === 'new: null') $(this).hide();
                    });

                    $('.field-ctm-item').each(function (index, value){
                        var name = $(this).find('span.ctm-name:first').text();
                        var old = $(this).find('span.ctm-old:first').text();
                        var new_ = $(this).find('span.ctm-new:first').text();
                        var inpt = $(this).find('input:first');
                        // console.log("old", old);
                        if (name === 'select_class_id' && old === 'old: ' && new_ === 'new: null') $(this).hide();
                    });


                    var inputs_count = $('.merge-databases .ch-handler').length;

                    $('.merge-databases').prepend('<div class="winner-timer-holder">Till start to work over the web-site updating: <span class="timercount">'+inputs_count+'</span></div>');

                    $('.merge-databases .ch-handler').off('change').on('change', function(){

                        var state = $(this)[0].checked;
                        var type = $(this).attr('data-type');
                        var className = $(this).attr('data-class');
                        var co = $(this).attr('data-co');
                        var is_field = $(this).attr('data-fields') == 'true';
                        var oper = $(this).attr('data-oper');
                        var name = $(this).attr('data-name');
                        var ctm = $(this).attr('data-ctm');

                        console.log(type, className, co, is_field, oper);

                        if(type == 'class'){

                            if(oper == 'modify'){

                                if(is_field){
                                    r.data[className]['fields'][name]['columns_to_modify'][ctm].checked_ = state;
                                    console.log(r.data[className]['fields'][name]['columns_to_modify'][ctm]);
                                }else{
                                    r.data[className]['columns_to_modify'][ctm].checked_ = state;
                                    console.log(r.data[className]['columns_to_modify'][ctm]);
                                }

                            }else{
                                if(is_field){
                                    r.data[className]['fields'][name].checked_ = state;
                                    console.log(r.data[className]['fields'][name]);
                                }else{
                                    r.data[className].checked_ = state;
                                    console.log(r.data[className]);
                                }
                            }

                        }else{//co
                            if(oper == 'modify'){

                                if(is_field){
                                    r.data[className]['client_objects'][co]['fields'][name]['columns_to_modify'][ctm].checked_ = state;
                                    console.log(r.data[className]['client_objects'][co]['fields'][name]['columns_to_modify'][ctm]);
                                }else{
                                    r.data[className]['client_objects'][co]['columns_to_modify'][ctm].checked_ = state;
                                    console.log(r.data[className]['client_objects'][co]['columns_to_modify'][ctm]);
                                }

                            }else{
                                if(is_field){
                                    r.data[className]['client_objects'][co]['fields'][name].checked_ = state;
                                    console.log(r.data[className]['client_objects'][co]['fields'][name]);
                                }else{
                                    r.data[className]['client_objects'][co].checked_ = state;
                                    console.log(r.data[className]['client_objects'][co]);
                                }
                            }
                        }

                        console.log(r.data);

                        var cur_timer = $('.timercount').html();

                        $('.timercount').html(parseInt(cur_timer) - 1);


                    });

                })

            }
        },
        {
            name: 'prepareClear',
            title: 'Подготовить CLEAR SQL',
            disabled: function(){
                return false;
            },
            callback: function(){
                var column_name = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['column_name'];
                var column_class = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['name'];
                var column_co = tableInstance.data.data[tableInstance.ct_instance.selectedRowIndex]['client_object'];
                var max = tableInstance.data.extra_data.count_all;


                bootbox.dialog({
                    title: 'Укажите id (через запятую) которые не нужно удалять:',
                    message: '<input type="text" class="form-control" id="exclude_ids" value=""/>',
                    buttons: {
                        confirm: {
                            label: 'Подготовить скрипт',
                            callback: function(){
                                var row = tableInstance.ct_instance.selectedRowIndex;
                                var id = tableInstance.data.data[row].id;
                                var val = $('#exclude_ids').val();
                                var o = {
                                    command: 'getClearSql',
                                    object: 'Class_profile',
                                    params: {
                                        class: column_class,
                                        exclude:val
                                    }
                                };

                                socketQuery(o, function (res) {
                                    // toastr[res.toastr.type](res.toastr.message);
                                    tableInstance.reload();
                                });
                            }
                        },
                        cancel: {
                            label: 'Отмена',
                            callback: function(){

                            }
                        }
                    }
                });



            }
        },
    ];

}());
