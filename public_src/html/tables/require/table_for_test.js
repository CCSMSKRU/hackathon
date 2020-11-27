(function () {
    var tableInstance = MB.Tables.getTable(MB.Tables.justLoadedId);


    tableInstance.ct_instance.ctxMenuData = [
        {
            name: 'option1',
            title: 'Открыть в форме',
            disabled: function(){
                return true;
            },
            callback: function(){
                tableInstance.openRowInModal();
            }
        },
        {
            name: 'optionRun',
            title: 'Выполнить',
            disabled: function(){
                return false;
            },
            callback: function(){

                var index = tableInstance.ct_instance.selectedRowIndex;
                var row = tableInstance.data.data[index];
                if (!row) return;
                if (!row.method){
                    toastr.error('Не указан метод который надо выполнить.');
                    return;
                }
                var o = {
                    command: row.method,
                    object:'for_test',
                    params:{
                        id:row.id
                    }
                };
                socketQuery(o, (r)=>{
                    console.log(r);
                    if (row.reloadTableAfterExecute) tableInstance.reload();
                });

            }
        },
        {
            name: 'FrameTest',
            title: 'FrameTest',
            disabled: function(){
                return false;
            },
            callback: function(){

                let index = tableInstance.ct_instance.selectedRowIndex;
                let row = tableInstance.data.data[index];
                let profile = tableInstance.profile;
                if (!row) return;

                const b1Id = MB.Core.guid();
                let b1 = bootbox.dialog({
                    title: 'Фрейм',
                    // message: '<div id="' + b1Id + '" data-class="menu" data-co="frame_menu"></div>',
                    message: '<div id="' + b1Id + '" data-class="class_operation" data-co="frame_class_operation">Пока ничего не загружено</div>',
                    // message: '<div id="' + b1Id + '" data-class="example" data-co="frame_example"></div>',
                    // message: '<div id="' + b1Id + '" data-class="" data-co=""></div>',
                    buttons: {
                        success: {
                            label: 'Огонь!',
                            callback: function () {

                            }
                        },
                        error: {
                            label: 'Отмена',
                            callback: function () {

                            }
                        }

                    }
                });

                var container = $('#'+b1Id);
                let obj = {
                    container:container,
                    parent:{
                        profile:profile,
                        row:row
                    },
                    ids:[1],
                    name:'frame_class_operation'
                }
                MB.Frames.createFrame(obj, (err, frame)=>{
                    if (err) return console.error('Не удалось создать фрейм',err);
                });

                // createFrame().then(frame=>{
                //     console.log('Фрейм успешно создан', frame);
                // }).catch(e => {
                //     console.warn('Не удалось создать фрейм', e);
                // });


                // debugger;
                // b1.init(()=>{
                //     console.log('INITED');
                // });
                // b1.init(function(){
                //     console.log('INIT');
                //     return true;
                //     // return;
                //     // const createFrame = async function () {
                //     //     var container = $('#'+b1Id);
                //     //     let obj = {
                //     //         container:container,
                //     //         parent:{
                //     //             profile:profile,
                //     //             row:row
                //     //         }
                //     //     }
                //     //     var frame = await MB.Frames.createFrame(obj);
                //     //     return frame;
                //     // };
                //     //
                //     // createFrame().then(frame=>{
                //     //     console.log('Фрейм успешно создан', frame);
                //     // }).catch(e => {
                //     //     console.warn('Не удалось создать фрейм', e);
                //     // });
                //
                // });
                return true;

            }
        }
    ];

}());
