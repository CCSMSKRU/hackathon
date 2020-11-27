(function(){

    var frameID = MB.Frames.justLoadedId;
    var frameInstance = MB.Frames.getFrame('frame_request_dashboard_NO_ROLE', frameID);
    // var frameWrapper = $('#mw-'+frameInstance.id);

    var frameWrapper = frameInstance.container;


    var id = frameInstance.activeId;

    var frameEditor = {
        changes: [],
        tree: [],
        role_alias:frameInstance.parent.role_alias,
        favorites:{
            items: [
                {
                id: 'create_request',
                icon: 'fa-plus',
                className: 'blue_db_btn',
                title: 'Создать заявку',
                desc: 'Быстрый доступ',
                // disabled: (checkRoleAccess(toAddRoles))? '' : 'disabled',
                callback: function(){
                    toastr.info('Метод не реализован')
                    return
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
                    })
                }
            }]
        },
        getFavoriteById: function(id){
            for (let i in frameEditor.favorites.items){
                if(String(frameEditor.favorites.items[i].id) === String(id)) return frameEditor.favorites.items[i];
            }
            return false;
        },
        news: {},
        init: function (cb) {
            async.series({
                load:cb => {
                    frameEditor.load(cb)
                }
            }, cb);
        },
        load: function(cb){
            async.series({
                initFavorites:cb => {
                    frameEditor.initFavorites(cb);
                },
                // initNews:cb => {
                //     cb(null); // Не будем ждать
                //     async.series({
                //         getNews:cb => {
                //             frameEditor.getNews(cb);
                //         },
                //         init: cb => {
                //             frameEditor.initNews(cb);
                //         }
                //     }, (err)=>{
                //         if (err) console.error(err);
                //     });
                //
                // },
                setHandlers:cb => {
                    frameEditor.setHandlers(cb)
                }
            }, cb);
        },
        reload: function(cb){
            async.series({
                load:cb => {
                    frameEditor.load(cb)
                }
            }, cb);
        },
        initFavorites: cb => {
            var favoritesTpl = `<div class="dbrd-block"><div class="dbrd-title">Избранное</div>
                       <div class="dbrd-items-list">{{#items}}<div class="dbrd-item dbrd-favorite {{className}} {{disabled}}" data-id="{{id}}">
                                <div class="dbrd-item-icon-holder"><i class="fa {{icon}}"></i></div>
                                <div class="dbrd-item-title" data-id="{{id}}">{{title}}</div>
                                <div class="dbrd-item-content">
                                    <div class="dbrd-item-desc">{{desc}}</div>
                                </div>
                            </div>
                    {{/items}}</div></div>`;

            let fav_holder = frameWrapper.find('.dbrd-favorites-container');
            fav_holder.html(Mustache.to_html(favoritesTpl, frameEditor.favorites));
            // for (let i = 0; i < fav_holder.find('.dbrd-item.dbrd-favorite').find('.dbrd-item-content .dbrd-item-desc').length; i++ ){
            //     let desc = $(fav_holder.find('.dbrd-item.dbrd-favorite').find('.dbrd-item-content .dbrd-item-desc')[i])
            //     if ($(fav_holder.find('.dbrd-item.dbrd-favorite').find('.dbrd-item-content .dbrd-item-desc')[i]).html() == "") {
            //         desc.parent().prev().css('margin-top','15px')
            //         desc.remove()
            //     }
            // }
            frameWrapper.find('.dbrd-favorite').off('click').on('click', function(){

                let id = $(this).attr('data-id');
                let fav = frameEditor.getFavoriteById(id);
                if (fav) fav.callback();

            });
            cb(null);
        },
        initNews:cb => {
            var newsTpl = `<div class="dbrd-block"><div class="dbrd-title">Новости</div>
                    {{#items}}<div class="dbrd-item dbrd-news" data-id="{{id}}">
                                <div class="dbrd-item-title" data-id="{{id}}">{{header}}</div>
                                <div class="dbrd-item-content">
                                    <div class="dbrd-item-img-holder"><img class="dbrd-item-img" src="upload/{{image}}" /></div>
                                    <div class="dbrd-item-desc">{{news}}</div>                                    
                                </div>
                                <div class="dbrd-item-date">{{published}}</div>
                            </div>
                    {{/items}}</div>`;
            let news_holder = frameWrapper.find('.dbrd-news-container');
            news_holder.html(Mustache.to_html(newsTpl, frameEditor.news));

            frameWrapper.find('.dbrd-news-container .dbrd-item-title').off('click').on('click', function(){


                let id = $(this).attr('data-id');
                let single_news = frameEditor.getNewsById(id);
                if (!single_news) return;
                bootbox.dialog({
                    title: single_news.header,
                    message: '<div class="in-dialog-news-image-holder"><img src="upload/'+single_news.image+'"></div>' + single_news.news + '<br/><br/>' + single_news.published,
                    buttons: {}
                });
            });

            cb(null);
        },
        setHandlers: function (cb) {
            cb(null);
        }


    };

    frameInstance.afterLoad = function(cb){
        frameEditor.init();
        cb(null);
    }
    frameInstance.afterReload = function(cb){
        // Можно запихнуть все что нужно вызвать при релоаде без загрузки нового скрипта.
        frameEditor.reload(cb);
    };
    frameInstance.afterAdd = function(cb){
        var _t = this;
        return cb(null);
    };

}());
