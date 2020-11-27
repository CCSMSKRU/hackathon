// "user_favorite_document": {
//     "profile": {"name": "user_favorite_document", "name_ru": "Избранные документы пользователя", "ending": ""},
//     "structure": {
//         "id": {"type": "bigint", "length": "20", "notNull": true, "autoInc": true, "primary_key": true},
//         "file_object_id": {"type": "bigint", "length": "20", "visible": false},
//         "user_id": {"type": "bigint", "length": "20", "visible": false}
//     }
// },

(function(){
    // debugger;
    let checkRoleAccess = function (roleAccess) {

        return;

            let rolesList = MB.User.user_role;
            let rolesFlat = [];
            let access = false;

            for(let i in rolesList){
                let item = rolesList[i];
                rolesFlat.push(item.email_role);
            }

            for(let cl in roleAccess){
                let cl_item = roleAccess[cl];

                if(rolesFlat.indexOf(cl_item) > -1 || rolesFlat.indexOf('SUPERADMIN') > -1){
                    access = true;
                }
            }

            // console.log('access',rolesList, access);
            return access;

    };

    let dashboard = {
        parentBlock: undefined,
        dashboardTpl: `<div class="dbrd-container">
                        <div class="row-fluid">
                            <div class="dbrd-favorites-container"></div>                  
                        </div>
                        <div class="row">                      
                            <div class="dbrd-news-container col-md-3"></div>
                            <div class="dbrd-requests-container col-md-9"></div>
                        </div>
                       </div>`,
        news: {},
        newsTpl: `<div class="dbrd-block"><div class="dbrd-title">Новости</div>
                    <div class="dbrd-flex">
                    {{#items}}<div class="dbrd-item dbrd-news" data-id="{{id}}">
                                <div class="dbrd-item-title" data-id="{{id}}">{{header}}</div>
                                <div class="dbrd-item-content">
                                    <div class="dbrd-item-img-holder"><img class="dbrd-item-img" src="upload/{{image}}" /></div>
                                    <div class="dbrd-item-desc">{{news}}</div>                                    
                                </div>
                                <div class="dbrd-item-date">{{published}}</div>
                            </div>
                    {{/items}}</div>
                    </div>`,
        favorites: {},
        favoritesTpl: `<div class="dbrd-block"><div class="dbrd-title">Избранное</div>
                       <div class="dbrd-items-list">{{#items}}<div class="dbrd-item dbrd-favorite {{className}} {{disabled}}" data-id="{{id}}">
                                <div class="dbrd-item-icon-holder"><i class="fa {{icon}}"></i></div>
                                <div class="dbrd-item-title" data-id="{{id}}">{{title}}</div>
                                <div class="dbrd-item-content">
                                    <div class="dbrd-item-desc">{{desc}}</div>
                                </div>
                            </div>
                    {{/items}}</div></div>`,

        init: function(cb){

            dashboard.clear();

            dashboard.prePopulate();

            dashboard.populateRequests();

            dashboard.getData(function () {

                dashboard.populate();
                dashboard.setHandlers();

                if(typeof cb == 'function'){
                    cb();
                }

            });

        },
        getData: function(cb){

            async.series({
                getMe:cb => {
                    var o = {
                        command:'get_me',
                        object:'User',
                        params:{
                            getRoles:true
                        }
                    };

                    socketQuery(o, function(res) {

                        MB.User = res.user;

                        //init user data to top panel

                        let user = MB.User;

                        $('#user-name').html(user.fio);
                        $('#user-position').html(user.company_name);
                        $('#user-block-img').attr('style', 'background-image: url(upload/'+user.image+')');
                        $('#user-block-holder').attr('data-id', user.id);

                        cb(null);
                    });
                },
                // checkAccess: cb => {
                //     var o = {
                //         command:'add',
                //         object:'Request_work',
                //         params:{
                //             checkAccess:true
                //         }
                //     };
                //     socketQuery(o,function(r) {
                //         if (r.code) {
                //             toastr['info']('У Вашей роли нет прав на создание заявки.');
                //             return cb(null);
                //         }
                //         cb(null);
                //
                //     });
                // },
                getFavorits:cb => {

                    let toAddRoles = ['GENERAL_DIRECTOR', 'FACILITY_MANAGER', 'RENT_MANAGER', 'LEAD_ENGINEER', 'SECRETARY', 'ENGINEER', 'COMPANY_ADMIN', 'COMPANY_EMPLOYEE', 'DISPATCHER'];

                    dashboard.favorites = {
                        items: [{
                            id: 15,
                            icon: 'fa-plus',
                            className: 'blue_db_btn',
                            title: 'Создать заявку',
                            desc: 'Быстрый доступ',
                            disabled: (checkRoleAccess(toAddRoles))? '' : 'disabled',
                            callback: function(){
                                // if(this.disabled){
                                //     toastr['info']('У Вашей роли нет прав для создания заявки.');
                                //     return;
                                // }

                                var o = {
                                    command:'add',
                                    object:'Request_work',
                                    params:{
                                        checkAccess:true
                                    }
                                };
                                socketQuery(o,function(r){
                                    if (r.code) {
                                        toastr['info']('У Вашей роли нет прав на создание заявки.');
                                        return;
                                    }

                                    var form = new MB.FormN({
                                        id: MB.Core.guid(),
                                        name: 'form_request_work_new',
                                        class: 'Request_work',
                                        client_object: 'form_request_work_new',
                                        type: 'form',
                                        ids: [],
                                        position: 'center',
                                        read_only:true,
                                        hideReloadButton:true
                                    });
                                    form.create();

                                    // var formId = MB.Core.guid();
                                    // var form = new MB.FormN({
                                    //     id: formId,
                                    //     name: 'form_request_work',
                                    //     class: 'request_work',
                                    //     client_object: 'form_request_work',
                                    //     type: 'form',
                                    //     ids: ['new'],
                                    //     position: 'center'
                                    // });
                                    // form.create(function () {
                                    //     var modal = MB.Core.modalWindows.windows.getWindow(formId);
                                    //
                                    // });
                                })



                            }
                        },{
                            id: 1,
                            title: 'Менеджер заявок',
                            desc: 'Управление',
                            callback: function(){

                                // hell kolhz

                                let o = {
                                    command: 'get',
                                    object: 'request_work',
                                    client_object: 'table_request_work',
                                    params: {
                                        limit: 1
                                    }
                                };

                                socketQuery(o, function(res) {
                                    if (res.code) return;
                                    if (!Object.keys(res.data).length) {
                                        toastr.info('Еще нет ни одной заявки.');
                                        return;
                                    }
                                    let any_id = res.data[0].id;
                                    // console.log(any_id)
                                    // debugger
                                    var formId = MB.Core.guid();
                                    var form = new MB.FormN({
                                        id: formId,
                                        name: 'form_all_request_manager',
                                        // name: 'form_request_work',
                                        class: 'request_work',
                                        client_object: "form_all_request_manager",
                                        // client_object: "form_request_work",
                                        type: 'form',
                                        ids: [any_id],
                                        position: 'center'
                                    });
                                    form.create(function () {
                                        var modal = MB.Core.modalWindows.windows.getWindow(formId);
                                        $(modal).on('close', function () {});
                                        $(form).on('update', function () {});
                                    });

                                });



                            }
                        }]
                    };
                    cb(null);

                },
                getNews:cb => {
                    let o_news = {
                        command: 'get',
                        object: 'news',
                        params: {
                            limit: 3
                        }
                    };
                    socketQuery(o_news, function(res){

                        // console.log('Dashboard -->', res);
                        dashboard.news.items = [];

                        for(var i in res.data){
                            dashboard.news.items.push(res.data[i]);
                        }

                        cb(null);
                    });
                }
            }, function(err, res){
                if (typeof cb === 'function') cb(err, res);
            });



        },
        populateRequests: function(cb){

            let req_holder = dashboard.parentBlock.find('.dbrd-requests-container');

            let req_table = new MB.TableN({
                name: 'Заявки',
                client_object: 'table_request_work_dashboard',
                class: 'request_work',
                id: MB.Core.guid(),
                externalWhere: []
            });



            req_table.create(req_holder, function () {
                // console.log('bashboard table rendered');
            });

        },

        prePopulate: function(){

            MB.Core.$pageswrap.append(dashboard.dashboardTpl);
            dashboard.parentBlock = $('.dbrd-container');

        },

        populate: function(){

            let fav_holder = dashboard.parentBlock.find('.dbrd-favorites-container');
            let news_holder = dashboard.parentBlock.find('.dbrd-news-container');


            fav_holder.html(Mustache.to_html(dashboard.favoritesTpl, dashboard.favorites));

            // console.log(dashboard.news);

            news_holder.html(Mustache.to_html(dashboard.newsTpl, dashboard.news));


        },

        setHandlers: function(){

            dashboard.parentBlock.find('.dbrd-favorite').off('click').on('click', function(){

                let id = $(this).attr('data-id');
                let fav = dashboard.getFavoriteById(id);

                fav.callback();

            });

            dashboard.parentBlock.find('.dbrd-news-container .dbrd-item-title').off('click').on('click', function(){


                let id = $(this).attr('data-id');
                let single_news = dashboard.getNewsById(id);

                bootbox.dialog({
                    title: single_news.header,
                    message: '<div class="in-dialog-news-image-holder"><img src="upload/'+single_news.image+'"></div>' + single_news.news + '<br/><br/>' + single_news.published,
                    buttons: {}
                });


            });

        },

        getFavoriteById: function(id){

            for(let i in dashboard.favorites.items){

                if(dashboard.favorites.items[i].id == id){
                    return dashboard.favorites.items[i];
                }

            }

            return false;

        },

        getNewsById: function(id){

            for(let i in dashboard.news.items){

                if(dashboard.news.items[i].id == id){
                    return dashboard.news.items[i];
                }

            }

            return false;

        },

        clear: function(){
            MB.Core.$pageswrap.html('');
        },

        devOnLoadOpenForm: function(){
            var formId = MB.Core.guid();

            var openInModalO = {
                id: formId,
                name: 'form_canvas',
                class: 'tangibles',
                client_object: 'form_canvas',
                type: 'form',
                ids: [39],
                position: 'center',
                tablePKeys: []
            };

            var form = new MB.FormN(openInModalO);

            form.create(function () {});
        }


    };

    dashboard.init(function(){

        // dashboard.devOnLoadOpenForm();

    });

    MB.Core.dashboard = dashboard;

}());
