(function () {
    let modal = $('.mw-wrap').last();
    let formID = MB.Forms.justLoadedId;
    let formInstance = MB.Forms.getForm('form_request_work', formID);
    let formWrapper = $('#mw-'+formInstance.id);
    let id = formInstance.activeId;
    let formInstanceData = formInstance.data.data[0];


    // let setExecutor = {
    //     GENERAL_DIRECTOR:['FACILITY_MANAGER','LEAD_ENGINEER','RENT_MANAGER','SECURITY','RECEPTION','SECRETARY'],
    //     FACILITY_MANAGER:['LEAD_ENGINEER','RENT_MANAGER','SECURITY','RECEPTION','CLEANING','SECRETARY'],
    //     RENT_MANAGER:['LEAD_ENGINEER','SECURITY','RECEPTION','CLEANING','SECRETARY'],
    //     LEAD_ENGINEER:['DISPATCHER','SECRETARY','ENGINEER','CLEANING'],
    //     DISPATCHER:['TECHNICIAN','CLEANING'],
    //     SECRETARY:['RECEPTION SECURITY','CLEANING'],
    //     ENGINEER:['TECHNICIAN']
    // };

    // let checkRoleAccess = function (roleAccess) {
    //
    //     let rolesList = MB.User.user_role;
    //     let rolesFlat = [];
    //     let access = false;
    //
    //     for(let i in rolesList){
    //         let item = rolesList[i];
    //         rolesFlat.push(item.email_role);
    //     }
    //
    //     for(let cl in roleAccess){
    //         let cl_item = roleAccess[cl];
    //
    //         if(rolesFlat.indexOf(cl_item) > -1 || rolesFlat.indexOf('SUPERADMIN') > -1){
    //             access = true;
    //         }
    //     }
    //
    //     return access;
    //
    // };


    formWrapper.find('.itt_option.two_tangibles_itt_tab').off('click').on('click', (e) => {
        let $parent = $(e.currentTarget).parents('.in_tab_tabs_wrapper.two_tangibles_itt_tab');
        let type = $(e.currentTarget).attr('data-tab');

        if(type == 'history'){

        }
        $parent.find('.itt_tab.two_tangibles_itt_tab').removeClass('active');
        $parent.find('.itt_option.two_tangibles_itt_tab').removeClass('active');
        $parent.find(`.itt_tab.two_tangibles_itt_tab[data-tab=${type}]`).addClass('active');
        $(e.currentTarget).addClass('active');
    });

    formWrapper.find('.itt_option.type_request_itt_tab').off('click').on('click', (e) => {
        let $parent = $(e.currentTarget).parents('.in_tab_tabs_wrapper.type_request_itt_tab');
        let type = $(e.currentTarget).attr('data-tab');
        $parent.find('.itt_tab.type_request_itt_tab').removeClass('active');
        $parent.find('.itt_option.type_request_itt_tab').removeClass('active');
        $parent.find(`.itt_tab.type_request_itt_tab[data-tab=${type}]`).addClass('active');
        $(e.currentTarget).addClass('active');
    });

    let commentHandler = new CommentHandler({
        id: id,
        table: 'request_work',

        name_method_get: 'getComment',
        name_method_set: 'setComment',
        restructingComment: (instance_comment, cb) => {

            if(instance_comment.data) instance_comment.user = instance_comment.data.created_by_user_fio

            cb(null, null)
        },
        wrapper: formWrapper.find('.itt_tab.comments-tab'),


        attach_file_handler: {
            attach_new_files: true
        }
    }, res => {})


    //roleAccess: ['DISPATCHER','LEAD_ENGINEER','ENGINEER','RECEPTION','SECRETARY',''],

    // let hhh = ['GENERAL_DIRECTOR', 'FACILITY_MANAGER', 'RENT_MANAGER', 'LEAD_ENGINEER', 'DISPATCHER', 'SECRETARY', 'RECEPTION', 'SECURITY', 'ENGINEER', 'TECHNICIAN', 'CLEANING', 'COMPANY_ADMIN', 'COMPANY_EMPLOYEE']

    formInstance.lowerButtons = [
        {
            title: 'Отозвать',
            color: 'blcak',
            icon: "fa-reply",
            type: "SINGLE",
            hidden: false,
            // roleAccess: ['GENERAL_DIRECTOR', 'FACILITY_MANAGER', 'RENT_MANAGER', 'LEAD_ENGINEER', 'DISPATCHER', 'SECRETARY', 'RECEPTION', 'SECURITY', 'ENGINEER', 'TECHNICIAN', 'CLEANING', 'COMPANY_ADMIN', 'COMPANY_EMPLOYEE'],
            condition: [
                // {
                //     colNames: ['status_sysname'],
                //     matching: [ formInstanceData.created_by_user_id == MB.User.id ? 'equal' : 'not_equal'],
                //     colValues: ['CREATED']
                // },

            ],
            operationAccess:'setReturned',
            handler: function () {


                bootbox.dialog({
                    title: 'Необходимо указать обязательный комментарий',
                    message: Mustache.to_html(`
                            Комментарий: <textarea class="required-comment" style="width: 100%"></textarea> <br><br>`),
                    buttons: {
                        success: {
                            label: 'Сохранить',
                            callback: function () {
                                let comment = $('textarea.required-comment').val();
                                if (!comment) {
                                    toastr.info('Комментарий необходим для отзыва заявки.');
                                    return;
                                }
                                var o = {
                                    command:'setReturned',
                                    object:'Request_work',
                                    params:{
                                        id:id,
                                        comment:comment
                                    }
                                };
                                socketQuery(o, r => {
                                    if (r.code){}

                                    request.init();
                                    formInstance.reload();

                                })

                                // if (comment) {
                                //     async.series({
                                //         setComment: cb => {
                                //             let o = {
                                //                 command: 'add',
                                //                 object: 'request_work_comment',
                                //                 params: {
                                //                     request_work_id: id,
                                //                     text: 'Заявка была отозвана с комментарием: "' + comment + '"'
                                //                 }
                                //             }
                                //             socketQuery(o, res => {
                                //                 cb(null)
                                //             })
                                //         },
                                //         changeStatus: cb => {
                                //             request.data.set.changeStatus({
                                //                 id: id,
                                //                 status_sysname: 'RETURNED'
                                //             }, res => {
                                //                 request.init()
                                //                 formInstance.reload();
                                //                 formInstance.remove();
                                //             })
                                //         }
                                //     }, res => {
                                //         // return cb(null)
                                //     })
                                //
                                // }









                            }
                        },
                        error: {
                            label: 'Отмена',
                            callback: function () {
                            }
                        }
                    }
                });



            }
        },
        {
            title: (formInstanceData.executor_user_id ? 'Переназначить исполнителя' : 'Назначить исполнителя'),
            color: 'blue',
            icon: "fa-user",
            type: "SINGLE",
            hidden: false,
            roleAccess: ['DISPATCHER','LEAD_ENGINEER', 'GENERAL_DIRECTOR', 'FACILITY_MANAGER', 'RENT_MANAGER'],
            condition: [
                {
                    colNames: ['status_sysname'],
                    // matching: [(formInstanceData.executor_organization_id == '' && formInstanceData.executor_user_id == '' )? 'equal' : 'not_equal'],
                    matching: [ (formInstanceData.status_request_work_sysname != 'DENIED' && formInstanceData.status_request_work_sysname != 'CLOSED')  ? 'equal' : 'not_equal'],
                    // matching: ['equal'],
                    colValues: ['READY_TO_WORK']
                },
            ],
            operationAccess:'setExecutor',
            handler: function () {
                // console.log(request.storage.request)
                // debugger
                let providerService = { sysName: 'service_provider'};
                let executor = {};
                async.parallel([
                    (cbGetTypeId) => {
                        let o = {
                            command: 'get',
                            object: 'type_for_organization',
                            params: {
                                param_where: {
                                    sysname: providerService.sysName
                                },
                            }
                        };
                        socketQuery(o, resApi => {
                            providerService.id = resApi[0].id;
                            cbGetTypeId(null, resApi[0].id)
                        });
                    },
                    (cb) => {
                        console.log(request.storage.request)
                        let o = {
                            command: 'getByTypeAndObject',
                            object: 'organization',
                            params: {
                                where: [
                                    {key: 'role_sysname', type: '=', val1: 'service_provider'},
                                    {key: 'object_id', type: '=', val1: request.storage.request.object_id}
                                ],
                            }
                        }
                        socketQuery(o, res => {
                            console.log(res)
                            cb(null, res)
                        })
                    }
                ], (cb, res) => {
                    var mO = [];
                    for (let i in res[1]) if (res[1][i].id) mO.push({
                        i: i,
                        id: res[1][i].organization_id,
                        name: res[1][i].name
                    });
                    let tpl = "<div id='select_box_org' class=\"select-box\">\n" +
                        "  <div class=\"select-box__current\" tabindex=\"1\">" +
                        "    <div class=\"select-box__value\">\n" +
                        "      <input class=\"select-box__input\" name=\"org\" type=\"radio\" id=\"0\" value=\"0\" checked=\"checked\"/>\n" +
                        "      <p class=\"select-box__input-text\">выберите организацию</p>\n" +
                        "    </div>" +
                        "{{#.}}" +
                        "    <div class=\"select-box__value\">\n" +
                        "      <input class=\"select-box__input\" name=\"org\" type=\"radio\" id=\"{{i}}orgSelect\" value=\"{{id}}\" />\n" +
                        "      <p class=\"select-box__input-text\">{{name}}</p>\n" +
                        "    </div>" +
                        "{{/.}}" +
                        "    <img class=\"select-box__icon\" src=\"http://cdn.onlinewebfonts.com/svg/img_295694.svg\" alt=\"Arrow Icon\" aria-hidden=\"true\"/>\n" +
                        "  </div>\n" +
                        "  <ul class=\"select-box__list\">\n" +
                        "{{#.}}" +
                        "    <li>\n" +
                        "      <label data-id=\"{{id}}\" class=\"select-box__option  select-box__option-org\" for=\"{{i}}orgSelect\" aria-hidden=\"aria-hidden\">{{name}}</label>\n" +
                        "    </li>\n" +
                        "{{/.}}" +
                        "  </ul>\n" +
                        "</div><br><br>" +
                        "<div id='select_box_employee' class=\"select-box\"></div> ";
                    let employees_organization = {};
                    $('.select-box__option-org').live('click', function () {

                        let idOrg = $(this).data('id');
                        executor.orgId = idOrg;
                        let tpl = "<div class=\"select-box__current\" tabindex=\"1\">" +
                            "    <div class=\"select-box__value\">\n" +
                            "      <input class=\"select-box__input\" name=\"employee\" type=\"radio\" id=\"0\" value=\"0\" checked=\"checked\"/>\n" +
                            "      <p class=\"select-box__input-text\">выберите исполнителя</p>\n" +
                            "    </div>" +
                            "{{#.}}" +
                            "    <div class=\"select-box__value\">\n" +
                            "      <input class=\"select-box__input\" name=\"employee\" type=\"radio\" id=\"{{i}}employeeSelect\" value=\"{{id}}\" />\n" +
                            "      <p class=\"select-box__input-text\">{{fio}}</p>\n" +
                            "    </div>" +
                            "{{/.}}" +
                            "    <img class=\"select-box__icon\" src=\"http://cdn.onlinewebfonts.com/svg/img_295694.svg\" alt=\"Arrow Icon\" aria-hidden=\"true\"/>\n" +
                            "  </div>\n" +
                            "  <ul class=\"select-box__list\">\n" +
                            "{{#.}}" +
                            "    <li>\n" +
                            "      <label data-id=\"{{id}}\" class=\" select-box__option select-box__option-user\" for=\"{{i}}employeeSelect\" aria-hidden=\"aria-hidden\">{{fio}}</label>\n" +
                            "    </li>\n" +
                            "{{/.}}" +
                            "  </ul>\n";
                        if (!employees_organization[idOrg]) {
                            let my_role = MB.User.user_role[0].email_role;
                            // let my_role = 'GENERAL_DIRECTOR'
                            async.series({
                                // getMyRole: cb => {
                                //
                                // },
                                getUsers: cb => {
                                    let setExecutor = {
                                        SUPERADMIN: ['FACILITY_MANAGER', 'LEAD_ENGINEER', 'RENT_MANAGER', 'SECURITY', 'RECEPTION', 'SECRETARY'],
                                        GENERAL_DIRECTOR: ['FACILITY_MANAGER', 'LEAD_ENGINEER', 'RENT_MANAGER', 'SECURITY', 'RECEPTION', 'SECRETARY'],
                                        FACILITY_MANAGER: ['LEAD_ENGINEER', 'RENT_MANAGER', 'SECURITY', 'RECEPTION', 'CLEANING', 'SECRETARY'],
                                        RENT_MANAGER: ['LEAD_ENGINEER', 'SECURITY', 'RECEPTION', 'CLEANING', 'SECRETARY'],
                                        LEAD_ENGINEER: ['DISPATCHER', 'SECRETARY', 'ENGINEER', 'CLEANING'],
                                        DISPATCHER: ['TECHNICIAN', 'CLEANING'],
                                        SECRETARY: ['RECEPTION', 'SECURITY', 'CLEANING'],
                                        ENGINEER: ['TECHNICIAN']
                                    };


                                    console.log(setExecutor[my_role], my_role)

                                    // debugger;


                                    // var o = {
                                    //     command:'getUsersForSetExecuter',
                                    //     object:'Request_work',
                                    //     params:{
                                    //         organization_id:idOrg,
                                    //         id:id
                                    //     }
                                    // };


                                    let o = {
                                        command: 'getByOrgByType',
                                        object: 'organization_relation_user',
                                        params: {
                                            where: [
                                                {
                                                    idOrg: idOrg,
                                                    typeOrg: providerService.id,
                                                }
                                            ],
                                            roles: setExecutor[my_role]
                                        }
                                    };
                                    socketQuery(o, resApi => {
                                        employees_organization[idOrg] = [];
                                        for (let i in resApi)
                                            if (resApi[i].fio)
                                                employees_organization[idOrg].push({
                                                    fio: resApi[i].fio,
                                                    id: i,
                                                    i: employees_organization[idOrg].length
                                                })
                                        $("#select_box_employee").html(Mustache.to_html(tpl, employees_organization[idOrg]));
                                        $('.select-box__option-user').off().on('click', function () {
                                            executor.userId = $(this).data('id');
                                        })
                                        cb(null)
                                    });
                                }
                            }, (err, res) => {
                                // cb(null)
                            })



                        } else {
                            $("#select_box_employee").html(Mustache.to_html(tpl, employees_organization[idOrg]));
                            $('.select-box__option-user').off().on('click', function () {
                                executor.userId = $(this).data('id');
                            })
                        }
                    });
                    bootbox.dialog({
                        title: 'Выбрать исполнителя',
                        message: Mustache.to_html(tpl, mO),
                        buttons: {
                            success: {
                                label: 'Сохранить',
                                callback: function () {
                                    console.log(executor);
                                    if (executor.orgId && executor.userId) {

                                        // let o = {
                                        //     command: 'setExecutor',
                                        //     object: 'request_work',
                                        //     params: {
                                        //         id: id,
                                        //         executor_user_id: executor.userId,
                                        //         executor_organization_id: executor.orgId
                                        //     }
                                        // }
                                        // socketQuery(o, (err, resApi) => {
                                        //     reloadCountNewRequest()
                                        //
                                        //     request.init()
                                        //     formInstance.reload();
                                        // });


                                        let o = {
                                            command: 'modify',
                                            object: 'request_work',
                                            params: {
                                                id: id,
                                                executor_user_id: executor.userId,
                                                executor_organization_id: executor.orgId
                                            }
                                        }
                                        socketQuery(o, (err, resApi) => {
                                            reloadCountNewRequest()

                                            request.init()
                                            formInstance.reload();
                                        });
                                    } else {
                                        console.log('не все параметры есть');
                                    }
                                }
                            },
                            error: {
                                label: 'Отмена',
                                callback: function () {
                                }
                            }
                        }
                    })
                })
            }
        },
        {
            title: 'Принять',
            color: 'green',
            icon: "fa-check",
            type: "SINGLE",
            hidden: false,
            // roleAccess: ['FACILITY_MANAGER', 'RENT_MANAGER', 'LEAD_ENGINEER', 'DISPATCHER', 'SECRETARY', 'RECEPTION', 'SECURITY', 'ENGINEER', 'TECHNICIAN', 'CLEANING'],
            // roleAccess: ['DISPATCHER','ENGINEER'],
            condition: [
                // {
                //     colNames: ['status_sysname'],
                //     // matching: [ (formInstanceData.status_request_work_sysname == 'CREATED'   && (formInstanceData.executor_organization_id != '' && formInstanceData.request.executor_user_id != '') ? 'equal' : 'not_equal') ],
                //     matching: [ (formInstanceData.status_request_work_sysname == 'CREATED' ? 'equal' : 'not_equal') ],
                //     colValues: ['READY_TO_WORK']
                // },
            ],
            operationAccess:'setAccepted',
            handler: function () {

                var o = {
                    command:'setAccepted',
                    object:'Request_work',
                    params:{
                        id:id
                    }
                };
                socketQuery(o, r => {
                    if (r.code){}
                    request.init();
                    formInstance.reload();

                })


                // request.data.set.changeStatus({
                //     id: id,
                //     status_sysname: 'CONFIRM'
                // }, res => {
                //     request.init()
                //     formInstance.reload();
                //     // request.render.buttonsChangeStatus(id)
                //     // request.render.historyStatus(id)
                // })
            }
        },
        {
            title: 'Отклонить',
            color: 'red',
            icon: "fa-times",
            type: "SINGLE",
            hidden: false,
            // roleAccess: ['FACILITY_MANAGER', 'RENT_MANAGER', 'LEAD_ENGINEER', 'DISPATCHER', 'SECRETARY', 'RECEPTION', 'SECURITY', 'ENGINEER', 'TECHNICIAN', 'CLEANING'],
            // roleAccess: ['DISPATCHER', 'FACILITY_MANAGER'],
            condition: [
                // {
                //     colNames: ['status_sysname'],
                //     matching: [(formInstanceData.status_request_work_sysname == 'CREATED' ? 'equal' : 'not_equal')],
                //     colValues: ['READY_TO_WORK']
                // },
            ],
            operationAccess:'setRejected',
            handler: function () {

                bootbox.dialog({
                    title: 'Укажите причину отказа',
                    message: `<textarea id="request-reject-reason"></textarea>`,
                    buttons: {
                        success: {
                            label: 'Подтвердить',
                            callback: function(){

                                var comment = $('#request-reject-reason').val();
                                if (!comment) {
                                    toastr.info('Комментарий необходим для отклонения заявки.');
                                    return;
                                }

                                var o = {
                                    command:'setRejected',
                                    object:'Request_work',
                                    params:{
                                        id:id,
                                        comment:comment
                                    }
                                };
                                socketQuery(o, r => {
                                    if (r.code){}
                                    request.init();
                                    formInstance.reload();

                                });

                                // let o = {
                                //     command: 'setComment',
                                //     object: 'request_work',
                                //     params: {
                                //         id: formInstance.activeId,
                                //         text: $('#request-reject-reason').val(),
                                //         visible_client: true,
                                //         attach_files: []
                                //     }
                                // };
                                //
                                //
                                // if(o.params.text.length <= 0) {
                                //     toastr['info']('Необходимо указать комментарий');
                                //     return;
                                // }else{
                                //     socketQuery(o, res => {
                                //
                                //         request.data.set.changeStatus({
                                //             id: id,
                                //             status_sysname: 'DENIED'
                                //         }, res => {
                                //             request.init();
                                //             formInstance.reload();
                                //         });
                                //
                                //     });
                                //
                                // }
                            }
                        }
                    }
                });



            }
        },
        {
            title: 'Выполняется',
            color: 'blue',
            icon: "fa-spinner",
            type: "SINGLE",
            hidden: false,
            // roleAccess: ['FACILITY_MANAGER', 'RENT_MANAGER', 'LEAD_ENGINEER', 'DISPATCHER', 'SECRETARY', 'RECEPTION', 'SECURITY', 'ENGINEER', 'TECHNICIAN', 'CLEANING'],
            // roleAccess: ['LEAD_ENGINEER','DISPATCHER','SECRETARY','RECEPTION','SECURITY','ENGINEER','TECHNICIAN','CLEANING'],
            // roleAccess: ['LEAD_ENGINEER','ENGINEER','TECHNICIAN','CLEANING', 'FACILITY_MANAGER'],
            // roleAccess: ['ENGINEER'], //TODO заявку может выполнять не только инженер, надо уточнить кто ещё может выполнять заявку (тип всякий уборщицы и всё такое)
            condition: [
                // {
                //     colNames: ['status_sysname'],
                //     matching: [
                //         ((formInstanceData.status_request_work_sysname == 'CONFIRM')  && (formInstanceData.executor_organization_id != '' && formInstanceData.executor_user_id != '')
                //         && formInstanceData.executor_user_id == MB.User.id
                //         ? 'equal' : 'not_equal')
                //     ],
                //     colValues: ['READY_TO_WORK']
                // },
            ],
            operationAccess:'setProcessing',
            handler: function () {
                var o = {
                    command:'setProcessing',
                    object:'Request_work',
                    params:{
                        id:id
                    }
                };
                socketQuery(o, r => {
                    if (r.code){}
                    request.init();
                    formInstance.reload();

                })

                // request.data.set.changeStatus({
                //     id: id,
                //     status_sysname: 'PROCESSIND'
                // }, res => {
                //     request.init()
                //     formInstance.reload();
                //     // request.render.buttonsChangeStatus(id)
                //     // request.render.historyStatus(id)
                // })
            }
        },
        {
            title: 'Исполнено',
            color: 'green',
            icon: "fa-pencil",
            type: "SINGLE",
            hidden: false,
            // roleAccess: ['DISPATCHER'],//TODO заявку может выполнять не только инженер, надо уточнить кто ещё может выполнять заявку (тип всякий уборщицы и всё такое)
            // roleAccess: ['DISPATCHER', 'FACILITY_MANAGER', 'RENT_MANAGER', 'LEAD_ENGINEER', 'DISPATCHER', 'SECRETARY', 'RECEPTION', 'SECURITY', 'ENGINEER', 'TECHNICIAN', 'CLEANING'],

            condition: [
                // {
                //     colNames: ['status_sysname'],
                //     matching: [(
                //         (formInstanceData.status_request_work_sysname == 'PROCESSIND' || formInstanceData.status_request_work_sysname == 'CONFIRM')
                //         && (formInstanceData.executor_organization_id != '' && formInstanceData.executor_user_id != '')
                //         ? 'equal' : 'not_equal')],
                //     colValues: ['READY_TO_WORK']
                // },
            ],
            operationAccess:'setSuccessful',
            handler: function () {

                let selInstance = undefined;

                bootbox.dialog({
                    title: 'Укажите комментарий',
                    message: `<textarea id="request-complete-reason"></textarea>
                                <label>Выберите категорию:</label>
                                <div id="request-category-select"></div>`,
                    buttons: {
                        success: {
                            label: 'Подтвердить',
                            callback: function(){
                                let comment = $('#request-complete-reason').val();
                                var request_work_category_id = selInstance.value.id;

                                if (!comment) {
                                    toastr['info']('Необходимо указать комментарий');
                                    return;
                                }
                                if (!request_work_category_id) {
                                    toastr['info']('Необходимо выбрать категорию');
                                    return;
                                }

                                var o = {
                                    command:'setSuccessful',
                                    object:'Request_work',
                                    params:{
                                        id:id,
                                        comment:comment,
                                        request_work_category_id:request_work_category_id
                                    }
                                };
                                socketQuery(o, r => {
                                    if (r.code){}
                                    request.init();
                                    formInstance.reload();

                                })

                                // let text_comment = $('#request-complete-reason').val()
                                //
                                //
                                // let co = {
                                //     command: 'modify',
                                //     object: 'request_work',
                                //     params: {
                                //         id: formInstance.activeId,
                                //         request_work_category_id: selInstance.value.id
                                //     }
                                // };
                                //
                                //
                                // if(!co.params.request_work_category_id) {
                                //     toastr['info']('Необходимо выбрать категорию');
                                //     return false;
                                // }else{
                                //
                                //     socketQuery(co, function(res){
                                //         if(res.code == 0){
                                //             reloadCountNewRequest()
                                //
                                //             let o = {
                                //                 command: 'setComment',
                                //                 object: 'request_work',
                                //                 params: {
                                //                     id: formInstance.activeId,
                                //                     text: text_comment,
                                //                     visible_client: true,
                                //                     attach_files: []
                                //                 }
                                //             };
                                //
                                //             // console.log(o, o.params.text, $('#request-complete-reason').val())
                                //             // debugger
                                //             if (!o.params.text) {
                                //                 toastr['info']('Необходимо указать комментарий');
                                //                 return false;
                                //             }
                                //             if(o.params.text.length <= 0) {
                                //                 toastr['info']('Необходимо указать комментарий');
                                //                 return false;
                                //             } else {
                                //
                                //                 socketQuery(o, res => {
                                //
                                //                     if(res.code == 0){
                                //                         request.data.set.changeStatus({
                                //                             id: id,
                                //                             status_sysname: 'SUCCESSFUL'
                                //                         }, res => {
                                //                             request.init();
                                //                             formInstance.reload();
                                //
                                //
                                //                         })
                                //                     }
                                //
                                //                 });
                                //             }
                                //
                                //         }
                                //     });
                                // }
                            }
                        }
                    }
                });

                var catSelId = MB.Core.guid();

                selInstance = MB.Core.select3.init({
                    id :                catSelId,
                    wrapper:            $('#request-category-select'),
                    column_name:        'id',
                    class:              'request_work_category',
                    client_object:      '',
                    return_id:          'id',
                    return_name:        'name',
                    withSearch:         true,
                    withEmptyValue:     true,
                    absolutePosition:   true,
                    isFilter:           false,
                    parentObject:       {},
                    value: {},
                    additionalClass:    ''
                });



            }
        },
        {
            title: 'Закрыть',
            color: 'black',
            icon: "fa-check-circle",
            type: "SINGLE",
            hidden: false,
            // roleAccess: ['GENERAL_DIRECTOR', 'FACILITY_MANAGER', 'RENT_MANAGER', 'LEAD_ENGINEER', 'DISPATCHER', 'ENGINEER', 'COMPANY_ADMIN', 'COMPANY_EMPLOYEE'],
            condition: [
                // {
                //     colNames: ['status_sysname'],
                //     matching: [(
                //         (formInstanceData.status_request_work_sysname == 'PROCESSIND' || formInstanceData.status_request_work_sysname == 'SUCCESSFUL')
                //         && (formInstanceData.executor_organization_id != '' && formInstanceData.executor_user_id != '')
                //         // && (formInstanceData.created_by_user_id == MB.User.id)
                //         ? 'equal' : 'not_equal')],
                //     colValues: ['READY_TO_WORK']
                // },
            ],
            operationAccess:'setClosed',
            handler: function () {

                if(formInstanceData.by_close_photo_necessary){


                    bootbox.dialog({
                        title: 'Приложите фотографию.',
                        message: `<textarea id="request-close-text"></textarea>
                                  <div id="close-necessary-files"></div>`,
                        buttons: {
                            success: {
                                label: 'Подтвердить',
                                callback: function(){

                                    // console.log('request.data', request.data.fileHandlerAttachNewFiles.files.items.length > 0);

                                    if(request.data.fileHandlerAttachNewFiles.files.items.length > 0){

                                        let attach_new_files =  request.data.fileHandlerAttachNewFiles.files.items.map(function (file) {
                                            return file.data
                                        });


                                        var o = {
                                            command:'setClosed',
                                            object:'Request_work',
                                            params:{
                                                id:id,
                                                by_close_photo_necessary:formInstanceData.by_close_photo_necessary,
                                                comment:$('#request-close-text').val(),
                                                attach_files:attach_new_files
                                            }
                                        };
                                        socketQuery(o, r => {
                                            if (r.code){}
                                            request.init();
                                            formInstance.reload();

                                        });

                                    }else{
                                        toastr['info']('Для закрытия заявки прикрепите фото.');
                                        return;
                                    }

                                }
                            }
                        }
                    });


                    let concat = [];

                    if (request.data.fileHandlerAttachNewFiles) {
                        let attach_new_files =  request.data.fileHandlerAttachNewFiles.files.items.map(function (file) {
                            return file.data
                        });
                        concat = concat.concat(attach_new_files)
                    }

                    let constructor = {
                        // id: res.id,
                        table: 'session_attach_files',
                        name_method_get: 'getFiles',
                        name_method_set: 'uploadFile',
                        name_method_remove: 'removeFile',
                        wrapper: $('#close-necessary-files'),
                        params: {
                            open: true,
                            upload: true,
                            remove: true,
                            notification_non_files: false
                        },
                        label: {
                            button_new_file: 'Загрузить с компьютера'
                        }
                    };

                    if (!request.data.session_attach_new_files_id) {

                        socketQuery({
                            command: 'createSessid',
                            object: 'session_attach',
                        }, res => {
                            request.data.session_attach_new_files_id = res.id;
                            constructor.id = request.data.session_attach_new_files_id;
                            request.data.fileHandlerAttachNewFiles = new FileHandler(constructor)
                        })
                    } else {
                        constructor.id = request.data.session_attach_new_files_id;
                        request.data.fileHandlerAttachNewFiles = new FileHandler(constructor)
                    }


                }else{

                    var o = {
                        command:'setClosed',
                        object:'Request_work',
                        params:{
                            id:id
                        }
                    };
                    socketQuery(o, r => {
                        if (r.code){}
                        request.init();
                        formInstance.reload();

                    });

                }


                // if(formInstanceData.by_close_photo_necessary){
                //
                //
                //     bootbox.dialog({
                //         title: 'Приложите фотографию.',
                //         message: `<textarea id="request-close-text"></textarea>
                //                   <div id="close-necessary-files"></div>`,
                //         buttons: {
                //             success: {
                //                 label: 'Подтвердить',
                //                 callback: function(){
                //
                //                     // console.log('request.data', request.data.fileHandlerAttachNewFiles.files.items.length > 0);
                //
                //                     if(request.data.fileHandlerAttachNewFiles.files.items.length > 0){
                //
                //                         let attach_new_files =  request.data.fileHandlerAttachNewFiles.files.items.map(function (file) {
                //                             return file.data
                //                         });
                //
                //                         let o = {
                //                             command: 'setComment',
                //                             object: 'request_work',
                //                             params: {
                //                                 id: formInstance.activeId,
                //                                 text: $('#request-close-text').val(),
                //                                 visible_client: true,
                //                                 attach_files: attach_new_files
                //                             }
                //                         };
                //
                //
                //                         socketQuery(o, res => {
                //
                //                             request.data.set.changeStatus({
                //                                 id: id,
                //                                 status_sysname: 'CLOSED'
                //                             }, res => {
                //                                 request.init()
                //                                 formInstance.reload();
                //
                //                             });
                //
                //                         });
                //
                //                     }else{
                //                         toastr['info']('Для закрытия заявки прикрепите фото.');
                //                         return;
                //                     }
                //
                //                 }
                //             }
                //         }
                //     });
                //
                //
                //     let concat = [];
                //
                //     if (request.data.fileHandlerAttachNewFiles) {
                //         let attach_new_files =  request.data.fileHandlerAttachNewFiles.files.items.map(function (file) {
                //             return file.data
                //         });
                //         concat = concat.concat(attach_new_files)
                //     }
                //
                //     let constructor = {
                //         // id: res.id,
                //         table: 'session_attach_files',
                //         name_method_get: 'getFiles',
                //         name_method_set: 'uploadFile',
                //         name_method_remove: 'removeFile',
                //         wrapper: $('#close-necessary-files'),
                //         params: {
                //             open: true,
                //             upload: true,
                //             remove: true,
                //             notification_non_files: false
                //         },
                //         label: {
                //             button_new_file: 'Загрузить с компьютера'
                //         }
                //     };
                //
                //     if (!request.data.session_attach_new_files_id) {
                //
                //         socketQuery({
                //             command: 'createSessid',
                //             object: 'session_attach',
                //         }, res => {
                //             request.data.session_attach_new_files_id = res.id;
                //             constructor.id = request.data.session_attach_new_files_id;
                //             request.data.fileHandlerAttachNewFiles = new FileHandler(constructor)
                //         })
                //     } else {
                //         constructor.id = request.data.session_attach_new_files_id;
                //         request.data.fileHandlerAttachNewFiles = new FileHandler(constructor)
                //     }
                //
                //
                // }else{
                //
                //     request.data.set.changeStatus({
                //         id: id,
                //         status_sysname: 'CLOSED'
                //     }, res => {
                //         request.init()
                //         formInstance.reload();
                //         // request.render.buttonsChangeStatus(id)
                //         // request.render.historyStatus(id)
                //     });
                //
                // }
            }
        },
        {
            title: 'Вернуть в исполнение',
            color: 'red',
            icon: "fa-ban",
            type: "SINGLE",
            hidden: false,
            // roleAccess: ['GENERAL_DIRECTOR', 'FACILITY_MANAGER', 'RENT_MANAGER', 'LEAD_ENGINEER', 'DISPATCHER', 'ENGINEER', 'COMPANY_ADMIN', 'COMPANY_EMPLOYEE'],
            condition: [
                // {
                //     colNames: ['status_sysname'],
                //     matching: [( (formInstanceData.status_request_work_sysname == 'CLOSED') && (formInstanceData.executor_organization_id != '' && formInstanceData.executor_user_id != '') ? 'equal' : 'not_equal')],
                //     colValues: ['READY_TO_WORK']
                // },
            ],
            operationAccess:'returnToProcessing',
            handler: function () {


                bootbox.dialog({
                    title: 'Необходимо указать обязательный комментарий',
                    message: Mustache.to_html(`
                            Комментарий: <textarea class="description" style="width: 100%"></textarea> <br><br>`),
                    buttons: {
                        success: {
                            label: 'Сохранить',
                            callback: function () {
                                let comment  = $('textarea.description').val()



                                var o = {
                                    command:'returnToProcessing',
                                    object:'Request_work',
                                    params:{
                                        id:id,
                                        comment:comment
                                    }
                                };
                                socketQuery(o, r => {
                                    if (r.code) return;
                                    let formId = MB.Core.guid();
                                    let form = new MB.FormN({
                                        id: formId,
                                        name: 'form_request_work',
                                        class: 'request_work',
                                        client_object: "form_request_work",
                                        type: 'form',
                                        ids: [id],
                                        position: 'center'
                                    });
                                    form.create(function () {
                                        MB.Core.modalWindows.windows.getWindow(formID).close()


                                        let modal = MB.Core.modalWindows.windows.getWindow(formId);
                                        $(modal).on('close', function () {
                                        });
                                        $(form).on('update', function () {
                                        });
                                    });

                                })

                                // async.series({
                                //     cancelLastStatus: cb => {
                                //         // let id = tableInstance.ct_instance.selection2.data[0].id // ppr
                                //         let status = {
                                //             last_live: null,
                                //             pre_last_live: null
                                //         };
                                //         async.series([
                                //             cb => {
                                //                 let o = {
                                //                     command: 'get',
                                //                     object: 'log_status_change_request_work',
                                //                     params: {
                                //                         where: [{key: 'request_work_id', type: '=', val1: id}],
                                //                         collapseData: false
                                //                     }
                                //                 }
                                //                 socketQuery(o, res => {
                                //                     log_status = res;
                                //                     res = res.reverse()
                                //                     for (let i in res) if (i != 'time' && res[i].canceled != true) {
                                //                         status.pre_last_live = status.last_live;
                                //                         status.last_live = res[i];
                                //                     }
                                //                     cb(null)
                                //                 })
                                //             },
                                //         ], res => {
                                //             cb(null)
                                //         })
                                //     },
                                //     changeStatus: cb => {
                                //         let status_id = null
                                //         async.series({
                                //             getIdStatus: cb => {
                                //                 let o = {
                                //                     command: 'get',
                                //                     object: 'status_request_work_for_request_work',
                                //                     params: {
                                //                         where: [{key: 'sysname', type: '=', val1: 'PROCESSIND'}]
                                //                     }
                                //                 }
                                //                 socketQuery(o, res => {
                                //                     // console.log(o, res)
                                //                     status_id = res.data[0].id
                                //                     cb(null)
                                //                 })
                                //             },
                                //             setStatus: cb => {
                                //                 let oo = {
                                //                     command: 'modify',
                                //                     object: 'request_work',
                                //                     params: {
                                //                         id: id,
                                //                         is_archived: false,
                                //                         status_request_work_id: status_id
                                //                     }
                                //                 }
                                //                 socketQuery(oo, res => {
                                //                     reloadCountNewRequest()
                                //                     let o = {
                                //                         command: 'add',
                                //                         object: 'log_status_change_request_work',
                                //                         params: {
                                //                             request_work_id: id,
                                //                             status_request_work_for_request_work_sysname: 'PROCESSIND'
                                //                         }
                                //                     }
                                //                     socketQuery(o, res => {
                                //                         cb(null)
                                //                     })
                                //                 })
                                //             }
                                //         }, (err, res) => {
                                //             cb(null)
                                //         })
                                //
                                //     },
                                //     setComment: cb => {
                                //         let o = {
                                //             command: 'add',
                                //             object: 'request_work_comment',
                                //             params: {
                                //                 request_work_id: id,
                                //                 text: 'Комментарий оставленный при возврате на исполнение из архива "' + comment + '"'
                                //             }
                                //         }
                                //         socketQuery(o, res => {
                                //             cb(null)
                                //         })
                                //     }
                                // }, res => {
                                //     let formId = MB.Core.guid();
                                //     let form = new MB.FormN({
                                //         id: formId,
                                //         name: 'form_request_work',
                                //         class: 'request_work',
                                //         client_object: "form_request_work",
                                //         type: 'form',
                                //         ids: [id],
                                //         position: 'center'
                                //     });
                                //     form.create(function () {
                                //         MB.Core.modalWindows.windows.getWindow(formID).close()
                                //
                                //
                                //         let modal = MB.Core.modalWindows.windows.getWindow(formId);
                                //         $(modal).on('close', function () {
                                //         });
                                //         $(form).on('update', function () {
                                //         });
                                //     });
                                // })
                            }
                        },
                        error: {
                            label: 'Отмена',
                            callback: function () {
                            }
                        }
                    }
                });


            }
        }
    ];


    let request = {

        storage : {
            request: {},
	        fields: {
            	list: [],
		        changes: []
	        },
            comments: [],
            statuses: [],
            access_obj:{},
            user: {},
            organizationsOfApplicant: [],
            //для всех заявок в табах *kolhoz*
            filters_request: [],
            table_request_work: {}
        },
        data: {
            set: {
                newComment: function (obj, cb) {
                    // let o = {
                    //     command: 'add',
                    //     object: 'request_work_comment',
                    //     params: {
                    //         request_work_id: obj.id,
                    //         text: obj.comment
                    //     }
                    // }
                    let o = {
                        command: 'setComment',
                        object: 'request_work',
                        params: {
                            id: obj.id,
                            text: obj.comment || obj.text,
                            visible_client:!!(formWrapper.find('.visible-client-check-holder input:checkbox').attr('checked') === 'checked')
                        }
                    };
                    socketQuery(o, res => {if (cb) {cb(res)}})
                },
                changeStatus: function(obj, cb){
                    async.series([
                        cb => {
                            if (obj.status_sysname && !obj.status_id) {
                                request.data.get.status({
                                    sysname: obj.status_sysname,
                                }, res => {
                                    obj.status_id = res.id;
                                    cb(null)
                                })
                            } else {
                                cb(null)
                            }
                        },
                        cb => {
                            async.parallel([
                                cb => {
                                    let o = {
                                        command: 'modify',
                                        object: 'request_work',
                                        params: {
                                            id: obj.id,
                                            status_request_work_id: obj.status_id
                                        }
                                    }
                                    let status = obj.status_sysname;

                                    // if(status == 'CLOSED' || status == 'SUCCESSFUL' || status == 'DENIED'){
                                    if (status == 'CLOSED' || status == 'DENIED') {
                                        o.params.is_archived = true
                                    } else
                                    // if (status == 'CLOSED' || status == 'SUCCESSFUL' || status == 'DENIED') o.params.end_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                    if (status == 'CLOSED'|| status == 'DENIED') o.params.end_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                    socketQuery(o, (err, res) => {
                                        reloadCountNewRequest()

                                        if (o.params.is_archived) MB.Core.modalWindows.windows.getWindow(formID).close()
                                        cb(null)
                                    })
                                },
                                cb => {
                                    request.data.set.loggingStatus({
                                        status_id: obj.status_id,
                                        request_work_id: obj.id
                                    }, res => {
                                        cb(null)
                                    })
                                }
                            ], res => {
                                cb(null)
                            })
                        },
                    ], res => {
                        if (cb) cb(res);
                    })
                },
                loggingStatus: function (obj, cb) {
                    let o = {
                        command: 'add',
                        object: 'log_status_change_request_work',
                        params: {
                            request_work_id: obj.request_work_id,
                            status_request_work_for_request_work_id: obj.status_id
                        }
                    }
                    socketQuery(o, res => {
                        if (cb) cb(res)
                    })
                },
                rollbackStatus: function (id, cb) {
                    let status = {
                        last_live: null,
                        pre_last_live: null
                    };
                    async.series([
                        cb => {
                            let o = {
                                command: 'get',
                                object: 'log_status_change_request_work',
                                params: {
                                    where: [{key: 'request_work_id', type: '=', val1: id}],
                                }
                            }
                            socketQuery(o, res => {
                                log_status = res;
                                res = res.reverse()
                                for (let i in res) if (i != 'time' && res[i].canceled != true) {
                                    status.pre_last_live = status.last_live;
                                    status.last_live = res[i];
                                }
                                cb(null)
                            })
                        },
                        cb => {
                            async.parallel([
                                cb => {
                                    let o = {
                                        command: 'modify',
                                        object: 'request_work',
                                        params: {
                                            id: id,
                                            status_request_work_id: (status.pre_last_live ? status.pre_last_live.status_request_work_for_request_work_id : "")
                                        }
                                    }
                                    socketQuery(o, res => {
                                        reloadCountNewRequest()

                                        cb(null)
                                    })
                                },
                                cb => {
                                    let o = {
                                        command: 'modify',
                                        object: 'log_status_change_request_work',
                                        params: {
                                            id: status.last_live.id,
                                            canceled: 1
                                        }
                                    }
                                    socketQuery(o, res => {
                                        cb(null)
                                    })
                                }
                            ], res => {
                                cb(null)
                            })
                        }
                    ], res => {
                        if (cb) cb(res);
                    })
                },
                organizationApplicant: function (obj, cb) {
                    let o = {
                        command: 'modify',
                        object: 'request_work',
                        params: {
                            id: obj.id,
                            applicant_organization_id: obj.applicant_organization_id
                        }
                    }
                    socketQuery(o, res => {
                        // console.log(o, res)
                        reloadCountNewRequest()

                        // debugger;
                        if (cb) cb(res);
                    })
                },
                organizationExecutor: function (obj, cb) {
                    let o = {
                        command: 'modify',
                        object: 'request_work',
                        params: {
                            id: obj.id,
                            executor_organization_id: obj.executor_organization_id
                        }
                    }
                    socketQuery(o, res => {
                        // console.log(o, res)
                        // debugger;
                        if (cb) cb(res);
                    })
                }
            },
            get: {
                user: function(cb) {
                    let o = {
                        command:'get_me',
                        object:'User'
                    };
                    socketQuery(o, function(res){
                        request.storage.user = res.user;
                        if (cb) cb(res.user);
                    });
                },
                request_work: function(id, cb) {
                    // if (request.storage.request) {
                    //     if (cb) cb(request.storage.request)
                    //     return;
                    // }
                    let o = {
                        command: 'getById',
                        object: 'request_work',
                        params: {
                            id: id,
                        }
                    }
                    socketQuery(o, res => {
                        request.storage.request = res[0];
                        if (cb) cb(res)
                    })
                },
                status: function(obj, cb) {
                    let o = {
                        command: 'get',
                        object: 'status_request_work_for_request_work',
                        params: {
                            where: []
                        },
                    }
                    if (obj.id) o.params.where.push({key: 'id', type: '=', val1: obj.id})
                    if (obj.sysname) o.params.where.push({key: 'sysname', type: '=', val1: obj.sysname})
                    socketQuery(o, res => {
                        if (cb) cb(res.data[0])
                    })
                },
                comments: function (id, cb) {
                    let o = {
                        command: 'get',
                        object: 'request_work_comment',
                        params: {
                            where: [{key: 'request_work_id', type: '=', val1: id}],
                            id: id,
                        }
                    }
                    socketQuery(o, res => {
                        request.storage.comments = Object.assign([], res.data).reverse();
                        if (cb) cb(request.storage.comments)
                    })
                },
                historyStatusRequestWork: function(id, cb) {
                    let o = {
                        command: 'get',
                        object: 'log_status_change_request_work',
                        params: {
                            where: [{key: 'request_work_id', type: '=', val1: id}],
                        }
                    }
                    socketQuery(o, res => {
                        request.storage.statuses = Object.assign([], res.data).reverse();
                        if (cb) cb(request.storage.statuses)
                    })
                },
                organizationsOfApplicant: function(cb) {
                    request.data.get.user( user => {
                        let o = {
                            command: 'get',
                            object: 'organization_relation_user',
                            params: {
                                where: [{key: 'user_id', type: '=', val1: user.id}]
                            }
                        }
                        socketQuery(o, res => {
                            request.storage.organizationsOfApplicant = Object.values(res.data);
                            if (cb) cb(res.data)
                        })
                    })
                },
                organizationsOnRole: function(role_sysname, cb) {
                    let o = {
                        command: 'get',
                        object: 'organization_relation_type_for_organization',
                        params: {
                            where: [{key: 'type_for_organization_sysname', type: '=', val1: role_sysname}]
                        }
                    }
                    socketQuery(o, res => {
                        request.storage.organizationsOnRole = Object.values(res.data);
                        if (cb) cb(res.data)
                    })
                },
                historyRequestWork: function(id, trackedColumns, cb) {
                    let o = {
                        command: 'getHistory',
                        object: 'request_work',
                        params: {
                            id: id,
                            trackedColumns: trackedColumns
                        }
                    }
                    socketQuery(o, res => {
                        // console.log(res);
                        if (res.code) return;
                        if (cb) cb(res);
                        // debugger
                    })
                },

                //для всех заявок в табах *kolhoz*
                allTypeRequest: function(cb) {
                    let o = {
                        command: 'get',
                        object: 'type_request_for_request_work',
                    }
                    socketQuery(o, res => {
                        if (cb) cb(Object.values(res.data))
                    })
                },

                getFields: cb => {
                    let o = {
                        command: 'getAllFields',
                        object: 'request_field',
                        params: {
                        	request_id: id,
                        	type: formInstanceData.type_request_for_request_work_sysname
                        }
                    };

                    socketQuery(o, cb);
                },
	            fieldById: (id) => {
		            for (const field of request.storage.fields.list) {
			            if (field.id === id)
			            	return field;
		            }
	            }
            }
        },
        render: {

            executor: function(cb) {
                request.data.get.request_work(id, res => {
                    // console.log(res);
                    // debugger
                    formWrapper.find('.executor').find('.organization').html('Исполнитель орг.:' + res[0].executor_organization);
                    formWrapper.find('.executor').find('.user').html('Исполнитель:' + res[0].executor_user);
                    if (cb) cb(null)
                });
            },
            mainInfo: function(cb){
                // <div class="executor">
                //         <div class="organization">Исполнитель орг.: {+{executor_organization}+} </div>
                //     <br>
                //     <div class="user">Исполнитель: {+{executor_user}+} </div>
                //     </div>

                // request.data.get.request_work(id, res => {
                // if (request.storage.request.applicant_organization) {
                //     formWrapper.find('.applicant').find('.organization').find('.value').html(request.storage.request.applicant_organization);
                // } else {
                //     request.data.get.organizationsOfApplicant(res => {
                //         let org_select = formWrapper.find('.applicant').find('.organization').find('.value').html(Mustache.to_html(request.templates.select_option_organization_applicant, request.storage.organizationsOfApplicant));
                //         $(org_select).find('.select-box__option-org').off().on('click', function() {
                //             let org_id = $(this).data('id')
                //             request.data.set.organizationApplicant({
                //                 id: id,
                //                 applicant_organization_id: org_id
                //             }, () => {
                //                 request.render.mainInfo()
                //             })
                //         })
                //     })
                // };
                // if (request.storage.request.executor_organization && request.storage.request.executor_user) {
                //     formWrapper.find('.executor').find('.organization').css("display", "unset").find('.value').html(request.storage.request.executor_organization)
                //     formWrapper.find('.executor').find('.user').css("display", "unset").find('.value').html(request.storage.request.executor_user)
                // } else {
                //     request.data.get.organizationsOnRole('service_provider', res => {
                //         let org_select = formWrapper.find('.executor').find('.organization').find('.value').html(Mustache.to_html(request.templates.select_option_organization_executor, request.storage.organizationsOnRole));
                //         $(org_select).find('.select-box__option-org').off().on('click', function() {
                //             let org_id = $(this).data('id')
                //             request.data.set.organizationExecutor({
                //                 id: id,
                //                 executor_organization_id: org_id
                //             }, () => {
                //                 request.render.mainInfo()
                //             })
                //         })
                //     })
                // }
                // })
            },
            modify: function(cb) {
                //$()
                // console.log(formInstance.reload);
                // formInstance.reload();
            },
            renderStatus: function(cb) {
                request.data.get.request_work(id, res => {
                    console.log('lil', res[0].status_request_work);
                    $(formWrapper).find('.card-request').find('.status').find('.value').find('strong').html(res[0].status_request_work)
                    if (cb) cb(null)
                })
            },

	        fields: cb => {
	            request.data.get.getFields((res) => {
	            	if (!res.data || !res.data.length) {
                        if (typeof cb == 'function') cb(null);
	            	    return;
                    }

	            	request.storage.fields.list = res.data;
		            request.storage.fields.changes = [];
		            request.methods.setHighlightFieldSave(false);
	            	request.render.renderFields();

		            if (typeof cb == 'function') cb(null);
	            });
	        },
	        renderFields: () => {
		        let tpl = `
			            <div class="fields_wrapper">
				            {{#params}}
				            <div class="field_wrapper" data-id="{{id}}" data-type="{{request_field_type_sysname}}">
				                <label>{{name}}</label>
				                <div class="field_value_wrapper" data-value1="{{value1}}" data-value2="{{value2}}" data-value_id="{{value_id}}"></div>
				                {{#isSetted}}<div class="field_icon remove" data-id="{{id}}"><i class="fa fa-trash"></i></div>{{/isSetted}}
				            </div>
				            {{/params}}
				        </div>
			        `;

		        let mo = {
			        params: []
		        };

		        mo.params = request.storage.fields.list.map(row => {
			        return {
				        id: row.id,
				        name: row.name,
				        request_field_type_sysname: row.request_field_type_sysname,
				        value1: row.value ? row.value.value1 : null,
				        value2: row.value ? row.value.value2 : null,
				        value_id: row.value ? row.value.value_id : null,
				        isSetted: !!row.value
			        }
		        });

		        formWrapper.find('.fields_wrapper').html(Mustache.to_html(tpl, mo));

		        formWrapper.find('.fields_wrapper .field_wrapper').each((i, e) => {
			        let $field = $(e);
			        let $value_wrapper = $field.find('.field_value_wrapper');

			        let field_id = +$field.attr('data-id');
			        let field = request.data.get.fieldById(field_id);
			        let value = field.value || {
				        value1: '',
				        value2: '',
				        value_id: ''
			        };

			        MB.Fields.insertFieldHTML($value_wrapper, field, field.request_field_type_sysname, value);
		        });

		        formWrapper.find('.fields_wrapper select').select2();

		        formWrapper
			        .find('.fields_wrapper select')
			        .off('select2:opening')
			        .on('select2:opening', (e) => {
				        let $select = $(e.currentTarget);
				        let object = $select.attr('data-get');
				        let selected_id = $select.select2('data').length ? +$select.select2('data')[0].id : null;

				        if (!$select.hasClass('loaded')) {
					        e.preventDefault();

					        $select.html('<option></option>');

					        let o = {
						        command: 'get',
						        object: object,
						        params: {}
					        };

					        socketQuery(o, function (res) {
						        if (res.code !== 0) return;

						        for (let j in res.data) {
							        let opt = res.data[j];

							        let data = {
								        id: opt.id,
								        text: opt.name
							        };

							        let newOption = new Option(data.text, data.id, false, false);
							        $select.append(newOption);
							        if (opt.id === selected_id)
								        $select.val(selected_id);
							        $select.trigger('change');
						        }

						        if (!$select.hasClass('loaded')) {
							        $select.addClass('loaded');
							        $select.select2('open');
						        }
					        });
				        }
			        })
			        .off('select2:select')
			        .on('select2:select', (e) => {
				        console.log('select');
				        let $field = $(e.currentTarget).parents('.field_wrapper');
				        let field_id = +$field.attr('data-id');
				        let val = +e.params.data.id;

				        request.methods.setFieldChange({
					        id: field_id,
					        value1: val,
					        value2: ''
				        });
			        });

		        formWrapper.find('.field_value_input_wrapper[data-type="DATETIME"] input').flatpickr({
			        dateFormat: "d.m.Y H:i:S",
			        locale: {
				        "firstDayOfWeek": 1 // start week on Monday
			        },
			        formatDate: (date, format) => {
				        return moment(date).format('DD.MM.YYYY HH:mm:ss');
			        },
			        parseDate: (date, format) => {
				        return moment(date, 'DD.MM.YYYY HH:mm:ss').toDate();
			        },
			        enableTime: true,
			        time_24hr: true,
			        enableSeconds: true,
			        noCalendar: false,
			        onChange: (selectedDates, dateStr, instance) => {
				        let $field = $(instance.element).parents('.field_wrapper');
				        let field_id = +$field.attr('data-id');
				        console.log('dateStr', dateStr, field_id);
				        request.methods.setFieldChange({
					        id: field_id,
					        value1: dateStr,
					        value2: ''
				        });
			        }
		        });

		        formWrapper.find('.fields_wrapper .field_wrapper').each((i, e) => {
			        let $field = $(e);
			        let field_id = +$field.attr('data-id');
			        let type = $field.attr('data-type');

			        let $input = $field.find('.field_value_input');

			        switch (type) {
				        case 'VARCHAR':
				        case 'TEXT':
					        $input.off('input').on('input', function () {
						        request.methods.setFieldChange({
							        id: field_id,
							        value1: $input.val(),
							        value2: ''
						        });
					        });
					        break;
				        case 'BOOLEAN':
					        $input.off('input').on('input', function () {
						        request.methods.setFieldChange({
							        id: field_id,
							        value1: $input.attr('checked') || null,
							        value2: ''
						        });
					        });
					        break;
				        default :
					        break;
			        }
		        });
	        },

            // comments: function(id, wrappers, cb) {
            //     request.data.get.comments(id, res => {
            //         // formWrapper.find('.history-сomments').html(Mustache.to_html(request.templates.comment, { log: res}));
            //         wrappers.history_comments.html(Mustache.to_html(request.templates.comment, { log: res}));
            //         // formWrapper.find('button.new-comment-upload').off().on('click', function() {
            //         wrappers.btn_new_comment.off().on('click', function() {
            //             request.data.set.newComment({
            //                 id: id,
            //                 comment: wrappers.field_new_comment.val()
            //             }, res => {
            //                 request.render.comments(id, wrappers)
            //             })
            //         });
            //         if (cb) cb(null)
            //     });
            // },
            // buttonsChangeStatus: function(id, cb) {
            //     request.data.get.request_work(id, res => {
            //         console.log((request.storage.request.status_request_work_sysname == 'CREATED'   && (request.storage.request.executor_organization_id != '' && request.storage.request.executor_user_id != '') ? 'equal' : 'not_equal'))
            //
            //         MB.Core.createButtons(formInstance)
            //         if (cb) cb(null)
            //     })
            // },
            historyStatus: function(id, wrapper, cb) {
                request.data.get.historyStatusRequestWork(id, res => {
                    request.render.renderStatus()
                    for (let i in res) {
                        res[i].color = res[i].canceled == true ? 'red' : 'greenyellow';
                    }
                    tpl = `
                        {{#log}}
                            <div class="log-status">
                                <div class="status-s {{color}}">{{status_request_work_for_request_work}}</div>
                                <div class="status-name-date"><div class="status-name">{{created_by_user}}</div><div class="status-date">{{created}}</div></div>                            
                            </div>
                        {{/log}}

                    `
                    wrapper.html(Mustache.to_html(tpl, { log: res}));
                    if (request.storage.statuses.length > 1) {
                        wrapper.append('<button class="history-cancel">отменить последний статус</button>').find('button').off().on('click', () => {
                            for (let i in request.storage.statuses) {
                                if (i > 0 && request.storage.statuses[i].canceled == false) {
                                    request.data.set.rollbackStatus(id, res => {
                                        request.render.renderStatus()
                                        // request.render.buttonsChangeStatus(id)
                                        request.render.historyStatus(id, wrapper)
                                        request.render.histortyRequest(id, formWrapper.find('.history-table'))
                                        formInstance.reload();
                                    });
                                    break;
                                }
                            }
                        })
                    }
                    if (cb) cb(null)
                });
            },
            histortyRequest: function(id, wrapper, cb) {
                let trackedColumns = {
                    // all: false,
                    // nothing: false,
                    columns: [
                        'created',
                        'created_by_user',
                        'request',
                        // 'paid',
                        'type_request_for_request_work',
                        'status_request_work',
                        'timeliness_for_request_work',
                        'location_description',
                        'executor_organization',
                        'executor_user',
                        'is_archived'
                    ],
                    columns_name_ru: [
                        'Дата',
                        'Кем',
                        'Заявка',
                        // 'Платная',
                        'Тип заявки',
                        'Статус',
                        'Срочность',
                        'Описание помещения',
                        'Исполнительная организация',
                        'Исполнитель',
                        'Архив'
                    ]
                    // columns: ['request', 'paid', 'status_request_work', 'timeliness_for_request_work', 'location_description']
                }
                request.data.get.historyRequestWork(id, trackedColumns, res => {


                    let data = res.data.map(function(item) {
                        let text = '';
                        for (let i in item.fields) {
                            // text += item.fields[i].ru_filed + ': ' + item.fields[i].value + '<br>'
                            text += item.fields[i].name + ': ' + item.fields[i].value_ru + '<br>'
                        }

                        // text = text.replace('undefined', '')
                        let ret = {
                            created: item.created,
                            created_by_user: item.created_by_user,
                            text: text,
                            visible_client: true,
                        }
                        return ret
                    })

                    let commentHandler = new CommentHandler({
                        id: id,
                        data: data,
                        wrapper: formWrapper.find(wrapper),
                        only_read: true
                    }, res => {
                        if (typeof cb==='function') cb(null);
                    })

                    // console.log('HISTORY', res);
                    // debugger
                    //
                    // let tpl = `<div class="r-hist-log">
                    //     {{#data}}
                    //         <span>Кем: {{created_by_user}}</span>
                    //         <span>Дата: {{created}}</span>
                    //         <div class="r-hist-block">
                    //             {{#log}}
                    //                 <div class="r-hist-item">
                    //                     <div class="r-hist-col">{{ru_filed}}</div>
                    //                     <div class="r-hist-val">{{value}}</div>
                    //                 </div>
                    //             {{/log}}
                    //         </div>
                    //     {{/data}}
                    // </div>`;
                    //
                    // let mo = {
                    //     // data:[]
                    //     data: res
                    // };
                    //
                    // let ru_values = {
                    //     created: 'Создано',
                    //     created_by_user: 'Пользователем',
                    //     executor_organization: 'Организация исполнитель',
                    //     executor_user: 'Сотрудник исполнитель',
                    //     is_archived: 'Архивная',
                    //     location_description: 'Описание места',
                    //     request: 'Запрос',
                    //     status_request_work: 'Статус',
                    //     timeliness_for_request_work: 'Срочность',
                    //     type_request_for_request_work: 'Тип заявки'
                    // };
                    //
                    // for(let i in res.data){
                    //     let h = res.data[i];
                    //
                    //     mo.data.push({
                    //         fields:[]
                    //     });
                    //
                    //     for(let j in h){
                    //         let ru_col = ru_values[j];
                    //         let obj = h[j];
                    //
                    //         if(obj.new){
                    //
                    //             mo.data[i].fields.push({
                    //                 name: ru_col,
                    //                 value: obj.val
                    //             });
                    //         }
                    //     }
                    // }
                    // console.log('MOOO', mo);
                    //
                    // formWrapper.find('.r-history-log-container').html(Mustache.to_html(tpl,mo));
                    //
                    //
                    // return;
                    //
                    // wrapper.html("")
                    // for (let i in trackedColumns.columns_name_ru) {
                    //     wrapper.append('<div class="history-table-row row-tracked-' + trackedColumns.columns[i] + '">' +
                    //         '<div class="history-table-row__title">' +
                    //             trackedColumns.columns_name_ru[i] +
                    //         '</div>' +
                    //     '</div>')
                    // }
                    // for (let i in res.data) {
                    //     for (let j in res.data[i]) {
                    //         if (res.data[i][j].val === true) res.data[i][j].val = 'Да'
                    //         if (res.data[i][j].val === false) res.data[i][j].val = 'Нет'
                    //         wrapper.find('.history-table-row.row-tracked-' + j).append('<div class="history-table-row__content ' + (res.data[i][j].new ? 'active-change' : 'wwwww') + '">' +
                    //             res.data[i][j].val +
                    //         '</div')
                    //     }
                    // };
                    // if (cb) cb(null)
                    // formWrapper.find('.history-table')
                })

            },

            //таб, в котором отображаются все заявки(включая ППР), разделены внутри по табам, по типу заявки *kolhoz*
            // методы рендера для таба, в котором отображаются заявки, с помощью клика на запись в таблице
            renderCloudTags: function (cb) {
                request.data.get.allTypeRequest(res => {
                    res.unshift({
                        name: 'Все типы',
                        sysname: 'all'
                    })
                    res = {
                        name_filter: 'type_request_for_request_work',
                        arr: res
                    }
                    let lil = formWrapper.find('.tagcloud').html(Mustache.to_html(request.templates.tabs_by_type_request, res ));
                    lil.find('li.type_request_for_request_work[data-sysname="all"]').find('a').addClass('tagcloud-selected')

                    formWrapper.find('.tagcloud').find('li').off().on('click', function(el) {
                        var is_filter_have = false
                        var pos_filter = null
                        if (!request.storage.filters_request.type_request_for_request_work) request.storage.filters_request.type_request_for_request_work = []

                        for (let i in request.storage.filters_request.type_request_for_request_work)
                            if (request.storage.filters_request.type_request_for_request_work[i].val1 == $(this).data('sysname')) {
                                is_filter_have = true;
                                pos_filter = i;
                            }

                        if (is_filter_have) {
                            request.storage.filters_request.type_request_for_request_work = request.storage.filters_request.type_request_for_request_work.filter(function(value){
                                return value != request.storage.filters_request.type_request_for_request_work[pos_filter];
                            });

                            if (request.storage.filters_request.type_request_for_request_work.length == 0) $(this).parent().find('li.type_request_for_request_work[data-sysname="all"]').find('a').addClass('tagcloud-selected')

                            $(this).find('a').toggleClass('tagcloud-selected');
                        } else {
                            request.storage.filters_request.type_request_for_request_work.push({
                                key: 'type_request_for_request_work_sysname',
                                type: '=',
                                val1: $(this).data('sysname'),
                                comparisonType:'OR',
                                group: 'type_request_for_request_work_sysname'
                            })
                            if ($(this).data('sysname') == 'all') {
                                request.storage.filters_request.type_request_for_request_work = [];
                                $(this).parent().find('li.type_request_for_request_work').find('a').removeClass('tagcloud-selected')
                            } else {
                                $(this).parent().find('li.type_request_for_request_work[data-sysname="all"]').find('a').removeClass('tagcloud-selected')
                            }
                            $(this).find('a').toggleClass('tagcloud-selected')
                        }
                        request.methods.reloadTableRequestWork(request.storage.filters_request.type_request_for_request_work, res => {
                        })
                        // if (request.storage.filters_request.indexOf($(this).data('sysname')) < 0) {
                        //     //add
                        //     $(this).find('a').toggleClass('tagcloud-selected');
                        //     request.storage.filters_request.push($(this).data('sysname'));
                        //     console.log('add', request.storage.filters_request)
                        //     reloadTableRequestWork()
                        // } else {
                        //     //del
                        //     $(this).find('a').toggleClass('tagcloud-selected')
                        //     let sysname = $(this).data('sysname')
                        //     request.storage.filters_request = request.storage.filters_request.filter(function(value){
                        //         console.log(value, sysname)
                        //         return value != sysname;
                        //     });
                        //     console.log('del', request.storage.filters_request)
                        //     reloadTableRequestWork()
                        // }
                    });
                    if (cb) cb(null)
                })
            },
            renderFormFastOpenRequest: function(cb) {
                formWrapper.find('.request-work-fast-open').html(Mustache.to_html(request.templates.request_work_fast_open.main_form));
                formWrapper.find('.itt_option.fast_open_request_itt_tab').off('click').on('click', (e) => {
                    let $parent = $(e.currentTarget).parents('.in_tab_tabs_wrapper.fast_open_request_itt_tab');
                    let type = $(e.currentTarget).attr('data-tab');
                    $parent.find('.itt_tab.fast_open_request_itt_tab').removeClass('active');
                    $parent.find('.itt_option.fast_open_request_itt_tab').removeClass('active');
                    $parent.find(`.itt_tab.fast_open_request_itt_tab[data-tab=${type}]`).addClass('active');
                    $(e.currentTarget).addClass('active');
                })
                if (cb) cb(null)
            },
            renderRequestWorkFastOpen: function(data, cb) {
                // request_work_fast_open
                formWrapper.find('.itt_tab.fast_open_request_itt_tab[data-tab="main-fast-open"]').html(Mustache.to_html(request.templates.request_work_fast_open.main_info_tab, data));
                if (cb) cb(null)
            },

        },
        templates: {
            select_option_organization_applicant:
	            `<div id='select_box_org' class=\"select-box\">\n
                  <div class=\"select-box__current\" tabindex=\"1\">
                    <div class=\"select-box__value\">\n
                      <input class=\"select-box__input\" name=\"org\" type=\"radio\" id=\"0\" value=\"0\" checked=\"checked\"/>\n 
                      <p class=\"select-box__input-text\">выберите организацию</p>\n
                    </div>
                {{#.}}
                    <div class=\"select-box__value\">\n
                      <input class=\"select-box__input\" name=\"org\" type=\"radio\" id=\"{{organization_id}}orgSelect\" value=\"{{organization_id}}\" />\n
                      <p class=\"select-box__input-text\">{{organization}}</p>\n
                    </div>
                {{/.}}
                    <img class=\"select-box__icon\" src=\"http://cdn.onlinewebfonts.com/svg/img_295694.svg\" alt=\"Arrow Icon\" aria-hidden=\"true\"/>\n
                  </div>\n
                  <ul class=\"select-box__list\">\n
                {{#.}}
                    <li>\n
                      <label data-id=\"{{organization_id}}\" class=\"select-box__option  select-box__option-org\" for=\"{{organization_id}}orgSelect\" aria-hidden=\"aria-hidden\">{{organization}}</label>\n 
                    </li>\n
                {{/.}}
                  </ul>\n
                </div><br><br><br>`,
            select_option_organization_executor:
	            `<div id='select_box_org' class=\"select-box\">\n
                  <div class=\"select-box__current\" tabindex=\"1\">
                    <div class=\"select-box__value\">\n
                      <input class=\"select-box__input\" name=\"select_option_organization_executor\" type=\"radio\" id=\"0\" value=\"0\" checked=\"checked\"/>\n 
                      <p class=\"select-box__input-text\">выберите организацию</p>\n
                    </div>
                {{#.}}
                    <div class=\"select-box__value\">\n
                      <input class=\"select-box__input\" name=\"select_option_organization_executor\" type=\"radio\" id=\"{{organization_id}}orgSelect\" value=\"{{organization_id}}\" />\n
                      <p class=\"select-box__input-text\">{{organization}}</p>\n
                    </div>
                {{/.}}
                    <img class=\"select-box__icon\" src=\"http://cdn.onlinewebfonts.com/svg/img_295694.svg\" alt=\"Arrow Icon\" aria-hidden=\"true\"/>\n
                  </div>\n
                  <ul class=\"select-box__list\">\n
                {{#.}}
                    <li>\n
                      <label data-id=\"{{organization_id}}\" class=\"select-box__option  select-box__option-org\" for=\"{{organization_id}}orgSelect\" aria-hidden=\"aria-hidden\">{{organization}}</label>\n 
                    </li>\n
                {{/.}}
                  </ul>\n
                </div><br><br><br>`,
            comment: `{{#log}}<div class="comment-name">{{created_by_user}}</div>
                                <div class="comment-c">{{comment}}</div>
                                <div class="comment-date">{{created}}</div>
                        
                     {{/log}}`,
            tabs_by_type_request: `
                <ul class="{{name_filter}}-conatiner">
                {{#arr}}<li class="{{name_filter}}" data-sysname="{{sysname}}"><a>{{name}}</a></li>{{/arr}}
                </ul>
            `,
            request_work_fast_open: {
                main_form: `
                    <div class="in_tab_tabs_wrapper fast_open_request_itt_tab" header-tab="request_work_fast_open" style="height: 100%; width: 100%; display: inline-block;">
                        <div class="itt_header" style="padding-top: unset !important;">
                            <div class="itt_option fast_open_request_itt_tab" style="height: 100%" data-tab="main-fast-open">Общая</div>
                            <div class="itt_option fast_open_request_itt_tab active" style="height: 100%" data-tab="comments-fast-open">Комментарии</div>
                            <div class="itt_option fast_open_request_itt_tab" style="height: 100%" data-tab="history-status-fast-open">История изменений статуса заявки</div>
                            <div class="itt_option fast_open_request_itt_tab" style="height: 100%" data-tab="history-fast-open">История</div>
                        </div>
                        <div class="itt_tab fast_open_request_itt_tab" style="width: 100%" data-tab="main-fast-open">Общая</div>
                        <div class="itt_tab fast_open_request_itt_tab active" style="width: 100%" data-tab="comments-fast-open">
                            <div class="history-сomments" style="overflow-y: auto; height: 100%;"></div>
                            <textarea class="new-comment-field" rows="10"></textarea>
                            <button class="new-comment-upload">Сохранить</button>
                        </div>
                        <div class="itt_tab fast_open_request_itt_tab history-statuses" style="width: 100%" data-tab="history-status-fast-open">История изменений статуса заявки</div>
                        <div class="itt_tab fast_open_request_itt_tab" style="width: 100%" data-tab="history-fast-open">
                            <div class="history-table"></div>
                        </div>
                    </div>
                `,
                main_info_tab: `
                    <div class="request-id"><h1>Заявка №{{id}}</h1></div>
                    <div class="applicant">
                        <div class="user"><h4><span class="request-strong">Заявитель:</span> {{created_by_user}}</h4></div>
                        <div class="organization"><h4><span class="request-strong">Компания:</span> {{applicant_organization}}</h4></div>
                    </div>
                    <div class="executor">
                        <div class="organization"><span class="request-strong">Исполнитель орг.:</span> {{executor_organization}}</div>
                        <div class="user"><span class="request-strong">Исполнитель: </span> {{executor_user}} </div>
                    </div>
                    <div class="type-request"><span class="request-strong">Тип заявки:</span> <div style="display: inline" class="value"> {{type_request_for_request_work}} </div></div>
                    <div class="paid"><span class="request-strong">Коммерческая:</span> <div style="display: inline" class="value">{{paid}}</div></div>
                    <div class="urgency"><span class="request-strong">Срочность:</span> <div style="display: inline" class="value">{{timeliness_for_request_work}}</div></div>
                    <div class="place">
                        <div class="object_"><span class="request-strong">Объект:</span> <div style="display: inline" class="value">{{object_}}</div></div>
                        <div class="location"><span class="request-strong">Помещение: </span> <div style="display: inline" class="value">{{location}}</div></div>
                        <div class="location-description"><span class="request-strong">Описание помещения:</span> <div style="display: inline" class="value">{{location_description}}</div></div>
                    </div>
                    <div class="date">
                        <div class="date-create"><span class="request-strong">Дата создания:</span> <div style="display: inline" class="value">{{created}}</div></div>
                        <div class="date-start-plan"><span class="request-strong">Дата начала(план):</span> <div style="display: inline" class="value">{{start_time_plan}}</div></div>
                        <div class="date-end-plan"><span class="request-strong">Дата завершения(план):</span> <div style="display: inline" class="value">{{end_time_plan}}</div></div>
                    </div>
                    <div class="status"><span class="request-strong">Статус:</span> <div style="display: inline" class="value">{{status_request_work}}</div></div>                
                `
            }
        },
        init: function () {
            async.series({
                checkAccess:function(cb){

                    var o = {
                        command:'checkAccess',
                        object:'Request_work',
                        params:{
                            noToastr:true,
                            id:formInstance.activeId,
                            operations:['setReturned','setExecutor','setAccepted','setRejected','setProcessing','setSuccessful','setClosed','returnToProcessing'],
                        }
                    };
                    socketQuery(o,function(r) {
                        if (r.code) {
                            console.warn('Не удалось получить информацию о доступных операциях');
                            return cb(null);
                        }
                        request.storage.access_obj = r.data.access_obj;
                        formInstance.access_obj = request.storage.access_obj;
                        cb(null)
                    });
                },
                executor: cb => {
                    this.render.executor(res => cb(null));
                },
	            renderFields: cb => {
	                this.render.fields(cb);
	            },
                renderStatus: cb => {
                    this.render.renderStatus(res => cb(null));
                },
                // comments: cb => {
                //     this.render.comments(id, {
                //         history_comments: formWrapper.find('.history-сomments'),
                //         btn_new_comment: formWrapper.find('button.new-comment-upload'),
                //         field_new_comment: formWrapper.find('textarea.new-comment-field')
                //     }, res => cb(null));
                // },
                // buttonsChangeStatus: cb => {
                //     this.render.buttonsChangeStatus(id, res => cb(null));
                // },
                historyStatus: cb => {
                    this.render.historyStatus(id, formWrapper.find('.history-statuses'), res => cb(null));
                },
                histortyRequest: cb => {
                    this.render.histortyRequest(id, formWrapper.find('.itt_tab.itt_tab-history'), res => cb(null));
                    // return cb(null);
                },
                renderCloudTags: cb => {
                    this.render.renderCloudTags(res => cb(null));
                },
                renderFormFastOpenRequest: cb => {
                    this.render.renderFormFastOpenRequest(res => cb(null));
                }
            }, (err, res) => {
                this.setHandlers();
                for (let i in formInstance.tblInstances) if (formInstance.tblInstances[i].class == 'request_work') this.storage.table_request_work = formInstance.tblInstances[i];

            })


            //для всех заявок в табах *kolhoz*
            // for (let i in this.render) this.render[i]();


        },

        methods: {
            reloadTableRequestWork: (filters, cb) => {
                // request.storage.table_request_work.ct_instance.filterWhere[0] = {key: "type_request_for_request_work_sysname", type: "=", val1: "engineering", comparisonType:'OR', group: 'type_request_for_request_work_sysname'};
                // request.storage.table_request_work.ct_instance.filterWhere[1] = {key: "type_request_for_request_work_sysname", type: "=", val1: "security", comparisonType:'OR', group: 'type_request_for_request_work_sysname'}
                // request.storage.table_request_work.ct_instance.filterWhere[2] = {key: "type_request_for_request_work", type: "=", val1: "cleaning"}
                request.storage.table_request_work.ct_instance.filterWhere = filters
                // table_request_work.ct_instance.filterWhere[0].key = 'id';
                // MB.Tables.tables[0].ct_instance.filterWhere[0].val1 = 109
                request.storage.table_request_work.reload(res => {
                    if (cb) cb(res)
                })
            },
	        setFieldChange: (change) => {
		        //change = {
		        //    id: 123,
		        //    value1: 1,
		        //    value2: 2
		        //};

		        let wasChange = false;
		        let found = false;

		        for (let change_tmp of request.storage.fields.changes) {
			        if (change_tmp.id === change.id) {
				        if (change_tmp.value1 !== change.value1) {
					        change_tmp.value1 = change.value1;
					        wasChange = true;
				        }
				        if (change_tmp.value2 !== change.value2) {
					        change_tmp.value2 = change.value2;
					        wasChange = true;
				        }
				        found = true;
			        }
		        }

		        if (!found) {
			        change.request_id = id;
			        request.storage.fields.changes.push(change);
			        wasChange = true;
		        }

		        console.log(wasChange, request.storage.fields.changes);

		        request.methods.setHighlightFieldSave(wasChange);
	        },
	        setHighlightFieldSave: (wasChange) => {
		        formWrapper.find('.save_fields')[wasChange ? 'addClass' : 'removeClass']('enabled');
	        }
        },
        setHandlers: function(){
            //для всех заявок в табах *kolhoz*
            formWrapper.off().on('table_row_click', function(event, data){
                async.parallel({
                    // comments: cb => {
                    //     request.render.comments(data.data.data[0].id, {
                    //         history_comments: formWrapper.find('.request-work-fast-open').find('.history-сomments'),
                    //         btn_new_comment: formWrapper.find('.request-work-fast-open').find('button.new-comment-upload'),
                    //         field_new_comment: formWrapper.find('.request-work-fast-open').find('textarea.new-comment-field')
                    //     }, res => cb(null));
                    // },


                    renderRequestWorkFastOpen: cb => {
                        request.render.renderRequestWorkFastOpen(data.data.data[0], res => cb(null));
                    },
                    // buttonsChangeStatus: cb => {
                    //     request.render.buttonsChangeStatus(data.data.data[0].id, res => cb(null));
                    // },
                    historyStatus: cb => {
                        request.render.historyStatus(data.data.data[0].id, formWrapper.find('.request-work-fast-open').find('.history-statuses'), res => cb(null));
                    },
                    history: cb => {
                        request.render.histortyRequest(data.data.data[0].id, formWrapper.find('.request-work-fast-open').find('.history-table'), res => cb(null));
                    }
                }, (err, res) => {
                })
            });

            formWrapper.find('.save_fields').off('click').on('click', (e) => {
                if (!request.storage.fields.changes.length) return;

                let o = {
                    command: 'setValueByList',
                    object: 'request_field',
                    params: {
                        list: request.storage.fields.changes
                    }
                };

                socketQuery(o, this.render.fields);
            });
        }
    };

    request.init();
}());
