(function(){

    var modal = $('.mw-wrap').last();
    var formID = MB.Forms.justLoadedId;
    var formInstance = MB.Forms.getForm('form_user', formID);
    var formWrapper = $('#mw-'+formInstance.id);

    var id = formInstance.activeId;

    var formEditor = {
        changes: [],
        tree: [],
        object_tree:{

        },
        init: function (cb) {
            async.series({
                renderRoles: cb => {
                    let roles = ''
                    for (let role in MB.User.roles.roles_obj_bySysname) {
                        roles += `${role}`
                    }
                    formWrapper.find('.roles-user').html(roles)
                    cb(null)
                },
                setHandlers: formEditor.setHandlers,
            }, function(err){
                if (err){
                    console.error('Возникли ош в init', err);
                    if (typeof cb == 'function') cb(err);
                    return;
                }
                if (typeof cb == 'function') cb(null);
            });

        },

        reload: function(cb){
            async.series({
                setHandlers: formEditor.setHandlers,
            }, function(err){
                if (err){
                    console.error('Возникли ош в reload', err);
                    if (typeof cb == 'function') cb(err);
                    return;
                }
                if (typeof cb == 'function') cb(null);
            });
        },

        setHandlers: function () {

        }
    };


    formInstance.doNotGetScript = true;
    formInstance.afterReload = function(cb){
        formEditor.reload();
        cb();
    };
    formEditor.init();

    formWrapper.find('.change-password').off('click').on('click', function(){

        var html =
            '<p>Внимание! На всех устройствах, где Вы сейчас авторизированы, возможно продолжение работы несмотря на смену пароля. Рекомендуем после смены, выйти из системы и авторизироваться заново.</p>' +
            '<p>Выход из системы произойдет на всех устройствах, где Вы авторизированы.</p>' +
            '<div class="form-group">' +
            '<label for="pwd">Укажите Ваш текущий пароль:</label>' +
            '<input type="password" class="form-control" id="old_psw">' +
            '</div>' +
            '<div class="form-group">' +
            '<label for="pwd">Укажите новый пароль:</label>' +
            '<input type="password" class="form-control" id="new_psw1">' +
            '</div>' +
            '<div class="form-group">' +
            '<label for="pwd">Повторите новый пароль:</label>' +
            '<input type="password" class="form-control" id="new_psw2">' +
            '</div>';
        var dialog = bootbox.dialog({
            title: 'Сменить пароль',
            message: html,
            buttons: {
                // toggleLog: {
                //     label: 'Вкл/Выкл Лог',
                //     closeButton:true,
                //     callback: function(){
                //
                //         var o = {
                //             command:'toggleConsoleLog',
                //             object:'User',
                //             params:{
                //             }
                //         };
                //         socketQuery(o, function(r){
                //             // console.log(r);
                //         });
                //     }
                // },
                success: {
                    label: 'Установить новый пароль',
                    closeButton:false,
                    callback: function(){
                        var old_psw = $('#old_psw').val();
                        var new_psw1 = $('#new_psw1').val();
                        var new_psw2 = $('#new_psw2').val();
                        if (!old_psw || !new_psw1){
                            toastr.error('Заполните все поля.');
                            return false
                        }
                        if (new_psw1 !== new_psw2){
                            toastr.error('Пароли не совпадают.');
                            return false

                        }
                        var o = {
                            command: 'changePassword',
                            object: 'User',
                            params:{
                                password:old_psw,
                                new_password:new_psw1
                            }
                        };

                        socketQuery(o, function(res){
                            console.log(res);
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

    })


}());
