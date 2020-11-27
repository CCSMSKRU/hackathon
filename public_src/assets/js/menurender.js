/**
 * menurenderer.js - complex cloud solutions, LLC
 *
 * renders main menu tree
 */

const reloadCountNewRequest = () => {
	let count;

	async.series({
		getData: cb => {
			let year = new Date().getYear() + 1900;
			let o = {
				command: 'getCount',
				object: 'request_work',
				params: {
					where: [
						{key: 'created', type: '..', val1: '9.10.' + 2019 + ' 04:00:00', val2: '31.12.' + year},
						{key: 'status_request_work_sysname', type: '=', val1: 'CREATED'}
					]
				}
			}
			socketQuery(o, res => {
				count = res.data
				cb(null)
			})
		},
		render: cb => {
			$("#request_work[data-class='request_work']").find('.bage-page').html(count)
		}
	})

}



//


(function () {
	MB = MB || {};
	MB.Core = MB.Core || {};
	MB.Core.Menu = {};
})();

(function () {
	MB.Core.Menu = {};
	MB.Core.Menu.createMenu = function () {
		let request_work_count;
		async.series({
            loadUser: cb=>{
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

                    if(user){
                        $('#user-name').html(user.fio);
                        $('#user-position').html(user.company_name);
                        // $('#user-block-holder img').attr('src', 'upload/'+user.image);
                        $('#user-block-img').attr('style', 'background-image: url(upload/'+user.image+')');
                        $('#user-block-holder').attr('data-id', user.id);
                    }



                    cb(null);



                });
            },
            loadOrganization: cb=>{

                if (!MB.User || !MB.User.default_organization_id) return cb(null);

                var o = {
                    command:'get',
                    object:'organization',
                    params:{
                        param_where:{
                            id: MB.User.default_organization_id
                        }
                    }
                };

                socketQuery(o, function(res) {

                    if (res.code) return cb(null);
                    if (!res.data[0]) return cb(null);

                    let organization = res.data[0];

                    console.log('organization', organization);


                    $('#organization-name').html(organization.name);
                    $('#organization-object').html(MB.User.object);
                    $('#organization-block-holder img').attr('src', 'upload/'+organization.image);
                    $('#organization-block-holder').attr('data-id', organization.id);

                    cb(null);
                });
            },
			getCountNewRequest: cb => {
				let year = new Date().getYear() + 1900;
				let o = {
					command: 'getCount',
					object: 'request_work',
					params: {
						where: [
							{key: 'created', type: '..', val1: '9.10.' + 2019 + ' 04:00:00', val2: '31.12.' + year},
							{key: 'status_request_work_sysname', type: '=', val1: 'CREATED'}
						]
					}
				}
				socketQuery(o, res => {
					request_work_count = res.data
					cb(null)
				})
			},
			render: cb => {
				setTimeout(() => {
					$(document).ready(function(){
						return socketQuery({
							command: "get_menu_tree",
							object: "menu"
						}, function (response) {
							if (!response) {
								//				console.log('Необходима авторизация');
								return;
							}

							var MENU, countMENU, counter, html, j, k, l, mainMenuObj, menuItemObj, subMenu, subMenuObj, subMenuParents, subMenuRu;
							mainMenuObj = {};
							menuItemObj = {};
							subMenuObj = {};
							html = "";

							for (var i in response.data) {
								var mItem = response.data[i];

                                if (mItem["menu_type"] === "main_menu_active") {

                                    mainMenuObj[mItem["menu_item"]] = {
                                        name: mItem["name"],
                                        menu_type: mItem["menu_type"],
                                        client_object: mItem["client_object"],
                                        class_name: mItem["class_name"],
                                        items: {},
                                        icon: mItem["icon"],
                                        is_visible: mItem["is_visible"]
                                    };


                                } else if (mItem["menu_type"] === "main_menu") {

									mainMenuObj[mItem["menu_item"]] = {
										name: mItem["name"],
										menu_type: mItem["menu_type"],
										items: {},
										icon: mItem["icon"],
										is_visible: mItem["is_visible"]
									};


								} else if (mItem["menu_type"] === "item" || mItem["menu_type"] === "report" || mItem["menu_type"] === "content" || mItem["menu_type"] === "modalmini" || mItem["menu_type"] === "frame") {

									if (menuItemObj.hasOwnProperty(mItem["menu_item"])) {

										menuItemObj[mItem["menu_item"]]["parent_menu"].push(mItem["parent_menu"]);

									} else {

										menuItemObj[mItem["menu_item"]] = {
											name: mItem["name"],
											menu_type: mItem["menu_type"],
											parent_menu: [mItem["parent_menu"]],
											client_object: mItem["client_object"],
											class_name: mItem["class_name"],
											is_visible: mItem["is_visible"]

										};
									}
								} else if (mItem["menu_type"] === "sub_menu") {
									if (subMenuObj.hasOwnProperty(mItem["menu_item"])) {
										subMenuObj[mItem["menu_item"]]["parent_menu"].push(mItem["parent_menu"]);
									} else {
										subMenuObj[mItem["menu_item"]] = {
											name: mItem["name"],
											menu_type: mItem["menu_type"],
											parent_menu: [mItem["parent_menu"]],
											is_visible: mItem["is_visible"]
										};
									}
								}
							}
							MENU = mainMenuObj;
							for (i in subMenuObj) {
								subMenu = i;
								subMenuRu = subMenuObj[subMenu]["name"];
								subMenuParents = subMenuObj[subMenu]["parent_menu"];
								j = subMenuParents.length - 1;
								while (j >= 0) {
									MENU[subMenuParents[j]]["items"][subMenu] = {
										name: subMenuRu,
										items: {}
									};
									j--;
								}
							}
							for (i in menuItemObj) {
								j = 0;
								while (j < menuItemObj[i]["parent_menu"].length) {
									for (k in MENU) {
										if (menuItemObj[i]["parent_menu"].indexOf(k) === -1) {
											for (l in MENU[k]["items"]) {
												if (typeof MENU[k]["items"][l] === "object") {
													if (menuItemObj[i]["parent_menu"].indexOf(l) !== -1) {
														if (!MENU[k]["items"][l]["items"]){
															console.error('Пункт меню настроен не корректно', i, 'или его родитель', k, l);
															continue;
														}
														MENU[k]["items"][l]["items"][i] = {
															name: menuItemObj[i]["name"],
															client_object: menuItemObj[i]["client_object"],
															class_name: menuItemObj[i]["class_name"],
															menu_type: menuItemObj[i]["menu_type"]
														};
													}
												}
											}
										} else {
											MENU[k]["items"][i] = {
												name: menuItemObj[i]["name"],
												client_object: menuItemObj[i]["client_object"],
												class_name: menuItemObj[i]["class_name"],
												menu_type: menuItemObj[i]["menu_type"]
											};
										}
									}
									j++;
								}
							}
							MB.Core.Menu.menuObj = MENU;
							counter = 0;
							countMENU = Object.keys(MENU);
							// countMENU = MB.Core.Menu.countObj(MENU);


							for (i in MENU) {

								if(MENU[i]['is_visible']) {


                                    if(MENU[i]["menu_type"] == 'main_menu_active'){

                                        // console.log('ADASDASD', MENU[i]);

                                        if (counter === 0) {
                                            // html += "<li class='start active open main_menu_active menu-item' data-type='main_menu_active' id='main_menu_active'>\n"; //active
                                            // data-objectname='" + MENU[i]['items'][j]['client_object'] + "'
                                            html += "<li class='start active open main_menu_active menu-item' " +
                                                "data-type='main_menu_active' " +
                                                "data-class='" + MENU[i]['class_name'] + "' " +
                                                "data-objectname='" + MENU[i]['client_object'] + "' " +
                                                "id='main_menu_active'>\n"; //active
                                        } else if (counter === countMENU) {
                                            html += "<li class='last main_menu_active menu-item' " +
                                                "data-type='main_menu_active' " +
                                                "data-class='" + MENU[i]['class_name'] + "' " +
                                                "data-objectname='" + MENU[i]['client_object'] + "' " +
                                                "id='main_menu_active'>\n";
                                        } else {
                                            html += "<li class='main_menu_active menu-item' " +
                                                "data-type='main_menu_active' " +
                                                "data-class='" + MENU[i]['class_name'] + "' " +
                                                "data-objectname='" + MENU[i]['client_object'] + "' " +
                                                "id='main_menu_active'>\n";
                                        }

                                    }else{

                                        if (counter === 0) {
                                            html += "<li class='start active open'>\n"; //active
                                        } else if (counter === countMENU) {
                                            html += "<li class='last'>\n";
                                        } else {
                                            html += "<li>\n";
                                        }

                                    }





									html += "\t<a class='menu-parent-node' href='#'>\n";
									html += "\t\t<i class='fa fa-" + MENU[i]["icon"] + "'></i>\n";
									html += "\t\t<span class='title'>" + MENU[i]["name"] + "</span>\n";
									html += "\t</a>\n";



									if(MENU[i]["menu_type"] != 'main_menu_active'){

                                        html += "\t<ul class='sub-menu'>\n";

                                        for (j in MENU[i]["items"]) {

                                            if (MENU[i]["items"][j].hasOwnProperty("client_object")) {
                                                if (MENU[i]["items"][j]["client_object"] == 'table_request_work') {
                                                    MENU[i]["items"][j]["name"] = MENU[i]["items"][j]["name"] + '<div class="bage-page">' + request_work_count + '</div>'
                                                    // console.log(MENU[i]["items"][j])
                                                    // debugger
                                                }
                                                if (MENU[i]["items"][j]["client_object"] && typeof MENU[i]["items"][j]["client_object"] === "string") {
                                                    html += "\t\t<li id='" + j + "' data-class='" + MENU[i]["items"][j]["class_name"] + "' data-contenttype='" + MENU[i]["items"][j]["content_type"] + "' data-objectname='" + MENU[i]["items"][j]["client_object"] + "' data-type='" + MENU[i]["items"][j]["menu_type"] + "' class='menu-item'><a href='#' class='expanded-hint' onclick='return false;'><i class='fa fa-shopping-cart'></i>" + MENU[i]["items"][j]["name"] + "</a><a href='#' class='collapsed-hint'></a></li>\n";
                                                } else {
                                                    html += "\t\t<li id='" + j + "' data-class='" + MENU[i]["items"][j]["class_name"] + "' data-contenttype='" + MENU[i]["items"][j]["content_type"] + "' data-type='" + MENU[i]["items"][j]["menu_type"] + "' class='menu-item'><a class='expanded-hint' href='#' onclick='return false;'><i class='fa fa-shopping-cart'></i>" + MENU[i]["items"][j]["name"] + "</a><a href='#' class='collapsed-hint'></a></li>\n";
                                                }
                                            } else if (MENU[i]["items"][j].hasOwnProperty("items")) {
                                                html += "\t\t<li>\n";
                                                html += "\t\t\t<a href='#' onclick='return false;'>" + MENU[i]["items"][j]["name"] + "<span class='arrow'></span></a>\n";
                                                html += "\t\t\t<ul class='sub-menu'>\n";
                                                for (k in MENU[i]["items"][j]["items"]) {
                                                    if (MENU[i]["items"][j]["items"][k]["client_object"] && typeof MENU[i]["items"][j]["items"][k]["client_object"] === "string") {
                                                        html += "\t\t<li id='" + k + "' data-class='" + MENU[i]["items"][j]["items"][k]["class_name"] + "' data-objectname='" + MENU[i]["items"][j]["items"][k]["client_object"] + "' data-type='" + MENU[i]["items"][j]["items"][k]["menu_type"] + "' class='menu-item'><a href='#' onclick='return false;'><i class='fa fa-shopping-cart'></i>" + MENU[i]["items"][j]["items"][k]["name"] + "</a></li>\n";
                                                    } else {
                                                        html += "\t\t<li id='" + k + "' class='menu-item'><a href='#' onclick='return false;'><i class='fa fa-shopping-cart'></i>" + MENU[i]["items"][j]["items"][k]["name"] + "</a></li>\n";
                                                    }
                                                }
                                                html += "\t\t\t</ul>\n";
                                                html += "\t\t</li>\n";
                                            } else {


                                                html += "\t\t<li id='" + j + "' data-class='" + MENU[i]["items"][j]["class_name"] + "' data-objectname='" + MENU[i]["items"][j]["client_object"] + "' data-type='" + MENU[i]["items"][j]["menu_type"] + "' class='menu-item'><a href='#' onclick='return false;'><i class='fa fa-shopping-cart'></i>" + MENU[i]["items"][j]["name"] + "</a></li>\n";
                                            }

                                        }
                                        html += "\t</ul>\n";

                                    }



									html += "</li>\n";
									counter++;
								}
							}
							$("#mainMenu").append(html);

							MB.loader(false, 'Секундочку, Запускаем систему...');

							window.setTimeout(function(){

							    let is_storekeeper;

							    for(let i in MB.User.roles.organization_obj_byRoleSysname){
							        if(i == 'STOREKEEPER' && Object.keys(MB.User.roles.organization_obj_byRoleSysname).length == 1){
                                        is_storekeeper = true;
                                    }
                                }

                                if(is_storekeeper){
							        $('li#tangibles').click();

                                }else{

                                    $('#main_menu_active').click();
                                }
							    // if(MB.User.)


							}, 500);

							return $("#mainMenu").on("click", ".menu-item", function () {

								var menuType, objectname, liId;$(document).scrollTop(0);
								objectname = $(this).data("objectname");
								menuType = $(this).data("type");
								var menu_item_id = $(this).attr('id');
								var rep_name = (menuType == 'report')? $(this).attr('id') : '';
								liId = $(this).attr('id');
								var menu_class = $(this).data("class");

								if (!menuType) return;

								if (menuType === "content") {
									if (liId == 'menu_afisha') {
										MB.Core.afisha.init();
										return;
									}

									return MB.Core.switchPage({
										isNew: true,
										type: menuType,
										filename: liId
									});

								} else if (menuType === "item") {



								    MB.Core.spinner.start($('.page-content-wrapper'));

									if(menu_item_id == 'dashboard_init'){


										MB.Core.dashboard.init();
										return;

									}

									return MB.Core.switchPage({
										type: menuType,
										name: objectname,
										client_object: objectname,
										class: menu_class,
										isNewTable: true
									});

								}else if(menuType === "main_menu_active"){


                                    MB.Core.spinner.start($('.page-content-wrapper'));

                                    if(menu_item_id == 'main_menu_active'){

                                        // MB.Core.dashboard.init();
                                        menuType = "frame";
                                        return MB.Core.switchPage({
                                            type: menuType,
                                            name: objectname,
                                            client_object: objectname,
                                            class: menu_class
                                        });
                                        // return;

                                    }



                                } else if (menuType === "modalmini") {
									if (liId == 'menu_generate_repertuar') {
										return MB.Core.switchPage({
											isNew: true,
											type: menuType,
											name: objectname
										});
									} else {
										return MB.Core.switchPage({
											type: menuType,
											name: objectname
										});
									}

								} else if (menuType === "report") {


									var o = {
										params: {}
									};



									if (rep_name == 'report_investor'){
										o.object = 'investor';
										o.command = 'report1';
									}else if(rep_name == 'report_vg'){
										o.object = 'merchant_financing';
										o.command = 'report_vg';
									}else if(rep_name == 'report_test'){
										o.object = 'investor';
										o.command = 'testReport';
									}

									if (rep_name!=="report_vg" && rep_name!=="report_investor" && rep_name!=="report_test") return;

									var html =  '<div class="row">' +
										'<div class="col-md-12">' +
										'<div class="form-group">' +
										'<label>Укажите дату отчета:</label>' +
										'<input type="text" id="report-date" class="form-control" />' +
										'</div>' +
										'</div></div>';

									var selInstance;

									if(rep_name == "report_investor"){



										html +=  '<div class="row">' +
											'<div class="col-md-12">' +
											'<div class="form-group">' +
											'<div class="bootbox-label">Инвестор:</div>' +
											'<div  id="choose-investor" class="deny-select-3-wrapper"></div>' +
											'</div>' +
											'</div>'+
											'</div>';


									}



									bootbox.dialog({
										title: 'Формирование отчета',
										message: html,
										buttons: {
											success: {
												label: 'Подтвердить',
												callback: function(){
													o.params.report_date = $("#report-date").val();

													o.params.id = selInstance.value.id;

													socketQuery(o, function(res){



														if(!res.code){
															var fileName = res.path + res.filename;
															var linkName = 'my_download_link' + MB.Core.guid();

															var nameRu = res.name_ru || res.filename;

															$("body").prepend('<a id="'+linkName+'" href="' + res.path + res.filename +'" download="'+ nameRu+'" style="display:none;"></a>');
															var jqElem = $('#'+linkName);
															jqElem[0].click();
															jqElem.remove();
														}


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

									var denySelId = MB.Core.guid();

									selInstance = MB.Core.select3.init({
										id :                denySelId,
										wrapper:            $('#choose-investor'),
										column_name:        'id',
										class:              'investor',
										client_object:      'investor',
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

									$('#report-date').datepicker({
										language: 'ru',
										format: 'dd.mm.yyyy',
										autoclose: true,
										todayBtn: 'linked'
									});




									//return MB.Core.switchPage({
									//	type: menuType,
									//	name: objectname
									//});
								}else if (menuType === "frame") {

									MB.Core.spinner.start($('.page-content-wrapper'));

									return MB.Core.switchPage({
										type: menuType,
										name: objectname,
										client_object: objectname,
										class: menu_class
									});

								}
								return false;
							});



						});
					});
				}, 1000)
			}
		})
	};

	MB.Core.Menu.createMenu();

    //$('#userBlock').off('click').on('click', function () {
    //    socketQuery({
    //        command: '_CLEAR',
    //        object: 'cleatr'
    //    }, function(){});
    //});

}).call(this);
