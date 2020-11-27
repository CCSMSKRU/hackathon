(function () {
    var modal = $('.mw-wrap').last();
    var formID = MB.Forms.justLoadedId;
    var formInstance = MB.Forms.getForm('form_request_work', formID);
    var formWrapper = $('#mw-'+formInstance.id);
    var id = formInstance.activeId;

    function isClientCheck(){
        let client_roles = ['COMPANY_EMPLOYEE','COMPANY_ADMIN'];
        let isClient = false;
        for(let i in MB.User.user_role){
            let r = MB.User.user_role[i];
            if(client_roles.indexOf(r.email_role) > -1){
                isClient = true;
            }
        }

        return isClient;
    }

    let request = {
        storage: {
            from_local: {},
            from_remote: {},
        },
        data: {
            session_attach_new_files_id: undefined,
            fileHandlerAttachNewFiles: undefined,
            checkIsActual: (obj_name, type, cb) => {
                if (!request.storage.from_remote[obj_name]) {
                    request.storage.from_remote[obj_name] = {
                        obj: (type === 'obj' ? {} : []),
                        watch: [],
                    }
                };
                if (cb) cb(true)
            },
            checkData: (ret) => {
                // console.log(request.storage.from_local, formInstance.id)
                let check = true;


                if (!request.storage.from_local.applicant_organization
                    || !request.storage.from_local.object_
                    || !request.storage.from_local.description
                    || !request.storage.from_local.timeliness
                    || !request.storage.from_local.typeRequest
                ) {

                    if (!check) $(formWrapper).find('.create-request').removeClass('create-request-active').addClass('create-request-disable');
                    if (ret) return check;
                    if (!ret) request.render.createRequest();
                    return;
                }

                if (!request.storage.from_local.applicant_organization.obj.id) {
                    check = false;
                }

                if (!request.storage.from_local.object_.obj.id) {
                    check = false;
                }

                if (!request.storage.from_local.description.obj.value) {
                    check = false;
                }

                if (!request.storage.from_local.timeliness.obj.id) {
                    check = false;
                }

                if (!request.storage.from_local.typeRequest.obj.id) {
                    check = false;
                }


                console.log('asdaskdjas', request.storage.from_local.timeliness, check);

                if (check) $(formWrapper).find('.create-request').removeClass('create-request-disable').addClass('create-request-active')
                if (!check) $(formWrapper).find('.create-request').removeClass('create-request-active').addClass('create-request-disable')


                if (ret) return check
                if (!ret) request.render.createRequest();
            },
            set: {
                applicantOrganization: (id) => {
                    // console.log('applicantOrganization');
                    request.storage.from_local.applicant_organization = {
                        obj: {
                            id: id
                        }
                    }
                    request.data.checkData();
                },
                object_: (id) => {
                    // console.log('object_');
                    if (!request.storage.from_local.object_) {
                        request.storage.from_local.object_ = {
                            obj: {
                                id: id
                            },
                            watch: []
                        }
                    } else {
                        request.storage.from_local.object_.obj.id = id
                    };
                    for (let i in request.storage.from_local.object_.watch) {
                        let method_name = request.storage.from_local.object_.watch[i];
                        // console.log(method_name);
                        request.render[method_name]();
                    }
                    request.data.checkData();
                },
                location: (id) => {
                    // console.log('location');
                    if (!request.storage.from_local.location) {
                        request.storage.from_local.location = {
                            obj: {
                                id: id
                            },
                            watch: []
                        }
                    } else {
                        request.storage.from_local.location.obj.id = id
                    };
                    for (let i in request.storage.from_local.location.watch) {
                        let method_name = request.storage.from_local.location.watch[i];
                        request.render[method_name]();
                    }
                    request.data.checkData();
                },
                descriptionLocation: (value) => {
                    // console.log('descriptionLocation');
                    if (!request.storage.from_local.descriptionLocation) {
                        request.storage.from_local.descriptionLocation = {
                            obj: {
                                value: value
                            },
                            watch: []
                        }
                    } else {
                        request.storage.from_local.descriptionLocation.obj.value = value
                    };
                    for (let i in request.storage.from_local.descriptionLocation.watch) {
                        let method_name = request.storage.from_local.descriptionLocation.watch[i];
                        request.render[method_name]();
                    }
                    request.data.checkData();
                },
                timePlanStart: (value) => {
                    // console.log('timePlanStart');
                    if (!request.storage.from_local.timePlanStart) {
                        request.storage.from_local.timePlanStart = {
                            obj: {
                                value: value
                            },
                            watch: []
                        }
                    } else {
                        request.storage.from_local.timePlanStart.obj.value = value
                    };
                    for (let i in request.storage.from_local.timePlanStart.watch) {
                        let method_name = request.storage.from_local.timePlanStart.watch[i];
                        request.render[method_name]();
                    }
                    request.data.checkData();
                },
                timePlanEnd: (value) => {
                    // console.log('timePlanStart');
                    if (!request.storage.from_local.timePlanEnd) {
                        request.storage.from_local.timePlanEnd = {
                            obj: {
                                value: value
                            },
                            watch: []
                        }
                    } else {
                        request.storage.from_local.timePlanEnd.obj.value = value
                    };
                    for (let i in request.storage.from_local.timePlanEnd.watch) {
                        let method_name = request.storage.from_local.timePlanEnd.watch[i];
                        request.render[method_name]();
                    }
                    request.data.checkData();
                    // console.log(request.storage.from_local)
                },
                // executorOrganization: (id) => {
                //     console.log('executorOrganization');
                //     if (!request.storage.from_local.executor_organization) {
                //         request.storage.from_local.executor_organization = {
                //             obj: {
                //                 id: id
                //             },
                //             watch: []
                //         }
                //     } else {
                //         request.storage.from_local.executor_organization.obj.id = id
                //     };
                //     for (let i in request.storage.from_local.executor_organization.watch) {
                //         let method_name = request.storage.from_local.executor_organization.watch[i];
                //         request.render[method_name]();
                //     }
                //     request.data.checkData();
                // },
                // executorUser: (id) => {
                //     console.log('executorUser');
                //     if (!request.storage.from_local.executor_user) {
                //         request.storage.from_local.executor_user= {
                //             obj: {
                //                 id: id
                //             },
                //             watch: []
                //         }
                //     } else {
                //         request.storage.from_local.executor_user.obj.id = id
                //     };
                //     for (let i in request.storage.from_local.executor_user.watch) {
                //         let method_name = request.storage.from_local.executor_user.watch[i];
                //         request.render[method_name]();
                //     }
                //     request.data.checkData();
                // },
                pay: (value) => {
                    // console.log('pay');
                    if (!request.storage.from_local.pay) {
                        request.storage.from_local.pay = {
                            obj: {
                                value: value
                            },
                            watch: []
                        }
                    } else {
                        request.storage.from_local.pay.obj.value = value
                    };
                    request.data.checkData();
                },
                description: (value) => {
                    // console.log('description')
                    if (!request.storage.from_local.description) {
                        request.storage.from_local.description= {
                            obj: {
                                value: value
                            },
                            watch: []
                        }
                    } else {
                        request.storage.from_local.description.obj.value = value
                    };
                    request.data.checkData();
                },
                typeRequest: (id) => {
                    // console.log('typeRequest')
                    if (!request.storage.from_local.typeRequest) {
                        request.storage.from_local.typeRequest = {
                            obj: {
                                id: id
                            },
                            watch: []
                        }
                    } else {
                        request.storage.from_local.typeRequest.obj.id = id
                    };
                    for (let i in request.storage.from_local.typeRequest.watch) {
                        let method_name = request.storage.from_local.typeRequest.watch[i];
                        // console.log(method_name);
                        request.render[method_name]();
                    }
                    request.data.checkData();
                },
                timeliness: (id) => {
                    // console.log('timeliness')
                    if (!request.storage.from_local.timeliness) {
                        request.storage.from_local.timeliness = {
                            obj: {
                                id: id
                            },
                            watch: []
                        }
                    } else {
                        request.storage.from_local.timeliness.obj.id = id
                    }

                    for (let i in request.storage.from_local.timeliness.watch) {
                        let method_name = request.storage.from_local.timeliness.watch[i];
                        // console.log(method_name);
                        request.render[method_name]();
                    }
                    request.data.checkData();
                },

                request: (obj, cb) => {
                    let o = {
                        command: 'add',
                        object: 'request_work',
                        params: {
                            object_id: obj.object_.obj.id,
                            location_id: obj.location.obj.id,
                            location_description: obj.descriptionLocation.obj.value,
                            request: obj.description.obj.value,
                            start_time_plan: obj.timePlanStart.obj.value,
                            end_time_plan: obj.timePlanEnd.obj.value,
                            paid: obj.pay.obj.value,
                            type_request_for_request_work_id: obj.typeRequest.obj.id,
                            timeliness_id: obj.timeliness.obj.id,
                            applicant_organization_id: obj.applicant_organization.obj.id,
                            // executor_organization_id: obj.executor_organization.obj.id,
                            // executor_user_id: obj.executor_user.obj.id,
                        }
                    }
                    socketQuery(o, res => {
                        if (res.code) return;
                        reloadCountNewRequest()
                        if (cb) cb(res.data.id);
                        // for (let i in request.render) request.render[i]();

                    });

                },
            },
            get: {
                user: (cb) => {
                    request.data.checkIsActual('user','obj', res => {
                        let o = {
                            command:'get_me',
                            object:'User'
                        };
                        socketQuery(o, function(res){
                            request.storage.from_remote.user.obj = res.user;
                            if (cb) cb(request.storage.from_remote.user.obj);
                        });
                    })
                },
                applicantOrganizations: (user_id, cb) => {
                    request.data.checkIsActual('applicant_organizations','arr',res => {

                        // let o = {
                        //     command: 'getOrganization',
                        //     object: 'Request_work',
                        //     params: {
                        //
                        //     }
                        // };
                        // socketQuery(o, function(res){
                        //     if (res.code) {
                        //         if (cb) cb(null);
                        //         return;
                        //     }
                        //     // console.log('org_res_', res);
                        //
                        //     request.storage.from_remote.applicant_organizations.obj = Object.values(res.data);
                        //
                        //     if (cb) cb(request.storage.from_remote.applicant_organizations.obj);
                        // });


                        let o = {
                            command: 'get',
                            object: 'organization_relation_user',
                            params: {
                                where: [{key: 'user_id', type: '=', val1: user_id}]
                            }
                        };
                        socketQuery(o, function(res){

                            // console.log('org_res_', res);

                            request.storage.from_remote.applicant_organizations.obj = Object.values(res.data);

                            if (cb) cb(request.storage.from_remote.applicant_organizations.obj);
                        });
                    })
                },
                objects_: (cb) => {
                    request.data.checkIsActual('objects_','arr',res => {
                        let o = {
                            command: 'getByRelationUser',
                            object: 'object_',
                        }
                        // socketQuery(o, res => {
                        //     res.data = Object.values(res.data);
                        //     if (cb) cb(res.data)
                        // })
                        // let o = {
                        //     command: 'get',
                        //     object: 'object_',
                        // };
                        socketQuery(o, function(res){

                            for (let i in res.data) res.data[i].id = res.data[i].object_id
                            request.storage.from_remote.objects_.obj = Object.values(res.data);
                            if (cb) cb(request.storage.from_remote.objects_.obj);
                        });
                    })
                },
                object_: (watch, cb) => {
                    if (arguments.length == 1) cb = arguments[0];
                    if (!request.storage.from_local.object_) {
                        request.storage.from_local.object_ = {
                            obj: {
                                id: null
                            },
                            watch: []
                        }
                    }
                    if (request.storage.from_local.object_.watch.indexOf(watch) < 0) request.storage.from_local.object_.watch.push(watch)
                    if (cb) cb(request.storage.from_local.object_.obj)
                },
                locations: (object_id, cb) => {
                    // console.log(object_id)

                    request.data.checkIsActual('locations','arr',res => {
                        let o = {
                            command: 'getLocationsByRelationObjects',
                            object: 'object_location',
                            params: {
                                object_id: object_id
                                // where: [{key: 'object_id', type: '=', val1: object_id}],
                            },
                        };
                        socketQuery(o, function(res){
                            request.storage.from_remote.locations.obj = Object.values(res.data);
                            if (cb) cb(request.storage.from_remote.locations.obj);
                        });
                    })
                },
                // executorOrganizations: (object_id, cb) => {
                //     request.data.checkIsActual('executor_organizations','arr',res => {
                //         let o = {
                //             command: 'getByTypeAndObject',
                //             object: 'organization',
                //             params: {
                //                 where: [
                //                     {key: 'role_sysname', type: '=', val1: 'service_provider'},
                //                     {key: 'object_id', type: '=', val1: object_id}
                //                 ],
                //             },
                //         };
                //         socketQuery(o, function(res){
                //             res.data = [];
                //             for (let i in res) if(res[i].id) res.data.push({ i: i, id: res[i].organization_id, name: res[i].name});
                //             console.log(request.storage.from_remote, res)
                //             request.storage.from_remote.executor_organizations.obj = Object.values(res.data);
                //             if (cb) cb(request.storage.from_remote.executor_organizations.obj);
                //         });
                //     })
                // },
                // executorOrganization: (watch, cb) => {
                //     if (!request.storage.from_local.executor_organization) {
                //         request.storage.from_local.executor_organization = {
                //             obj: {
                //                 id: null
                //             },
                //             watch: []
                //         }
                //     }
                //     if (request.storage.from_local.executor_organization.watch.indexOf(watch) < 0) request.storage.from_local.executor_organization.watch.push(watch)
                //     if (cb) cb(request.storage.from_local.executor_organization.obj)
                // },
                // executorUsers: (org_id,cb) => {
                //     request.data.checkIsActual('executor_users','arr',res => {
                //         // console.log('lil', org_id)
                //         if (org_id == null) {
                //             request.storage.from_remote.executor_users.obj = []
                //             if (cb) cb(request.storage.from_remote.executor_users.obj);
                //         } else {
                //             let o = {
                //                 command: 'get',
                //                 object: 'type_for_organization',
                //                 params: {
                //                     where: [{key: 'sysname', type: '=', val1: 'service_provider'}]
                //                 }
                //             };
                //             socketQuery(o, res => {
                //                 console.log(res.data[0])
                //                 let o = {
                //                     command: 'getByOrgByType',
                //                     object: 'organization_relation_user',
                //                     params: {
                //                         where: [
                //                             {
                //                                 idOrg: org_id,
                //                                 typeOrg: res.data[0].id
                //                             }
                //                         ]
                //                     }
                //                 };
                //                 socketQuery(o, function(res){
                //                     res.data = [];
                //                     for (let i in res) if(res[i].fio) res.data.push({ i: i, id: i, name: res[i].fio});
                //                     request.storage.from_remote.executor_users.obj = Object.values(res.data);
                //                     if (cb) cb(request.storage.from_remote.executor_users.obj);
                //                 });
                //             })
                //         }
                //     })
                // },
                typesRequest: (cb) => {
                    request.data.checkIsActual('types_request','arr',res => {
                        let o = {
                            command: 'get',
                            object: 'type_request_for_request_work',
                        };
                        socketQuery(o, function(res){
                            for (let i in res.data) {
                                res.data[i].formInstance_id = formInstance.id
                            }
                            request.storage.from_remote.types_request.obj = Object.values(res.data);
                            if (cb) cb(request.storage.from_remote.types_request.obj);
                        });
                    })
                },
                timeliness: (cb) => {
                    request.data.checkIsActual('timeliness','arr',res => {
                        let o = {
                            command: 'get',
                            object: 'timeliness_for_request_work',
                        };
                        socketQuery(o, function(res){
                            for (let i in res.data) {
                                res.data[i].checked = res.data[i].sysname == 'green' ? true : false
                                // res.data[i].checked = false;
                                res.data[i].formInstance_id = formInstance.id
                            }

                            request.storage.from_remote.timeliness.obj = Object.values(res.data);
                            if (cb) cb(request.storage.from_remote.timeliness.obj);
                        });
                    })
                }
            }
        },

        render: {
            applicantOrganization: function(cb) {
                request.data.get.user(res => {

                    request.data.get.applicantOrganizations(res.id,  res => {
                        // request.data.set.applicantOrganization(null)

                        for (let i in res)
                            if (res[i].is_default)
                                request.data.set.applicantOrganization(res[i].organization_id)


                        // request.data.set.applicantOrganization(null)
                        let selector = $(formWrapper).find('.applicant').html(Mustache.to_html(request.templates.applicant_organizations, res)).find('select');
                        selector.off()
                        selector.select2();

                        selector.on('change', function() {
                            request.data.set.applicantOrganization(this.value)
                        })
                        if (cb) cb(null)
                    });

                    request.data.set.applicantOrganization(null)
                });
            },
            objects_: function(cb) {
                // request.data.set.object_(null)
                request.data.get.objects_(res => {
                    for (let i in res)
                        if (res[i].is_default)
                            request.data.set.object_(res[i].id)

                    let selector = $(formWrapper).find('.place').find('.object_').html(Mustache.to_html(request.templates.objects_, res)).find('select');

                    for (let i in res) if (res[i].is_default) request.data.set.object_(res[i].id)
                    // selector.off().on('change', function() {
                    //     request.data.set.object_(this.value)
                    // })

                    // console.log('OOOKOKO', res);

                    selector.off()
                    selector.select2()
                    selector.on('change', function() {
                        request.data.set.object_(this.value)
                    })

                    if (cb) cb(null)
                })
            },
            locations: function(cb) {
                request.data.set.location(null)
                request.data.get.object_('locations', res => {
                    request.data.get.locations(res.id, res => {
                        let selector = $(formWrapper).find('.place').find('.location').html(Mustache.to_html(request.templates.locations, res)).find('select');
                        // selector.off().on('change', function() { request.data.set.location(this.value)})
                        for (let i in res) if (res[i].is_default) request.data.set.location(res[i].id)

                        selector.off()
                        selector.select2()
                        selector.on('change', function() {
                            request.data.set.location(this.value)
                        })
                        if (cb) cb(null)
                    })
                })
            },
            descriptionLocation: function(cb) {
                request.data.set.descriptionLocation(null)
                $(formWrapper).find('.place').find('.description-location').html(Mustache.to_html(request.templates.description_location)).find('textarea').on('input', function() {
                    request.data.set.descriptionLocation(this.value)
                });
                if (cb) cb(null)
            },
            // executorOrg: function() {
            //     request.data.set.executorOrganization(null)
            //     request.data.get.object_('executorOrg', res => {
            //         request.data.get.executorOrganizations(res.id, res => {
            //             let selector = $(formWrapper).find('.executor').find('.organization').html(Mustache.to_html(request.templates.executor_organizations, res)).find('select');
            //             selector.off()
            //             selector.select2()
            //             selector.on('change', function() {
            //                 request.data.set.executorOrganization(this.value)
            //             })
            //         })
            //     })
            // },
            // executorUser: function() {
            //     request.data.set.executorUser(null)
            //     request.data.get.executorOrganization('executorUser', res => {
            //         request.data.get.executorUsers(res.id, res => {
            //             let selector = $(formWrapper).find('.executor').find('.user').html(Mustache.to_html(request.templates.executor_users, res)).find('select');
            //             // selector.off().on('change', function() { request.data.set.executorUser(this.value)})
            //             selector.off()
            //             selector.select2()
            //             selector.on('change', function() {
            //                 request.data.set.executorUser(this.value)
            //             })
            //         })
            //     })
            // },
            timePlan: function(cb) {
                request.data.set.timePlanStart(null)
                let plan_time_cont = $(formWrapper).find('.plan-time');


                var is_time = true; // $elem.hasClass('time');
                var is_date = true; // $elem.hasClass('date');
                var is_datetime = (!is_date && !is_time); // Никакой класс не указан - полная дата

                plan_time_cont.find('.start').flatpickr(
                    {
                        minDate: "today",
                        dateFormat: "d.m.Y",
                        formatDate: (date, format)=>{
                            return moment(date).format('DD-MM-YYYY');
                        },
                        parseDate: (date, format)=>{
                            return moment(date,'DD.MM.YYYY').toDate();
                        },
                        enableTime: false,
                        time_24hr: true,
                        enableSeconds:true,
                        noCalendar: false,
                        onChange: (selectedDates, dateStr, instance) => {
                            request.data.set.timePlanStart(dateStr)

                            let time_plane_start = moment(dateStr, "DD-MM-YYYY")
                            let day = time_plane_start.date() + 1
                            let month = time_plane_start.month() + 1
                            let year = time_plane_start.year()

                            plan_time_cont.find('.end').flatpickr(
                                {
                                    minDate: day + '-' + month + '-' + year,
                                    dateFormat: "d.m.Y",
                                    formatDate: (date, format)=>{
                                        return moment(date).format('DD-MM-YYYY');
                                    },
                                    parseDate: (date, format)=>{
                                        return moment(date,'DD.MM.YYYY').toDate();
                                    },
                                    enableTime: false,
                                    time_24hr: true,
                                    enableSeconds:true,
                                    noCalendar: false,
                                    onChange: (selectedDates, dateStr, instance) => {
                                        request.data.set.timePlanEnd(dateStr)
                                    }
                                }
                            );
                            moment("20111031", "YYYYMMDD")
                        }
                    }
                );
                plan_time_cont.find('.end').flatpickr(
                    {
                        minDate: "today",
                        dateFormat: "d.m.Y",
                        formatDate: (date, format)=>{
                            return moment(date).format('DD-MM-YYYY');
                        },
                        parseDate: (date, format)=>{
                            return moment(date,'DD.MM.YYYY').toDate();
                        },
                        enableTime: false,
                        time_24hr: true,
                        enableSeconds:true,
                        noCalendar: false,
                        onChange: (selectedDates, dateStr, instance) => {
                            request.data.set.timePlanEnd(dateStr)
                        }
                    }
                );
                // let input_start_datepicker = plan_time_cont.find('.start').datepicker({format: 'yyyy-mm-dd'}).on('change', function() {
                //     request.data.set.timePlanStart(this.value)
                //     console.log(this.value);
                // });
                // plan_time_cont.find('.start').on('click', function (event) {
                //     let datepicker = $('.datepicker.datepicker-dropdown.dropdown-menu')
                //     if (datepicker.css('left').replace('px','') < 0) datepicker.css('left', '0px')
                //     if (datepicker.css('right').replace('px','') < 0) {
                //         let left_margin = datepicker.css('left').replace('px','');
                //         let right_magin = datepicker.css('right').replace('px','')
                //         let to_l = parseInt(left_margin, 10)+ parseInt(right_magin, 10)
                //         datepicker.css('left', to_l + 'px')
                //     }
                //     if (datepicker.css('bottom').replace('px','') < 0) {
                //         let top_margin = datepicker.css('top').replace('px','');
                //         let bottom_magin = datepicker.css('bottom').replace('px','')
                //         let to_up = parseInt(top_margin, 10)+ parseInt(bottom_magin, 10)
                //         datepicker.css('top', to_up + 'px')
                //     }
                // })
                request.data.set.timePlanEnd(null)
                // plan_time_cont.find('.end').datepicker({format: 'yyyy-mm-dd'}).on('change', function() {
                //     request.data.set.timePlanEnd(this.value)
                //     console.log(request.storage.from_local);
                // });
                // plan_time_cont.find('.end').on('click', function (event) {
                //     let datepicker = $('.datepicker.datepicker-dropdown.dropdown-menu')
                //     if (datepicker.css('left').replace('px','') < 0) datepicker.css('left', '0px')
                //     if (datepicker.css('right').replace('px','') < 0) {
                //         let left_margin = datepicker.css('left').replace('px','');
                //         let right_magin = datepicker.css('right').replace('px','')
                //         let to_l = parseInt(left_margin, 10)+ parseInt(right_magin, 10)
                //         datepicker.css('left', to_l + 'px')
                //     }
                //     if (datepicker.css('bottom').replace('px','') < 0) {
                //         let top_margin = datepicker.css('top').replace('px','');
                //         let bottom_magin = datepicker.css('bottom').replace('px','')
                //         let to_up = parseInt(top_margin, 10)+ parseInt(bottom_magin, 10)
                //         datepicker.css('top', to_up + 'px')
                //     }
                // })

                if (cb) cb(null)
            },
            pay: function(cb) {
                request.data.set.pay(false)

                // console.log(isClientCheck())
                // debugger

                // if(isClientCheck()){
                //     if (cb) cb(null)
                // } else {
                    let selector = $(formWrapper).find('.ispay').html(Mustache.to_html(request.templates.pay, {
                        formInstance_id: formInstance.id
                    }));
                    // console.log(selector)
                    // debugger
                    selector.find('input').off().on('change', function() {
                        request.data.set.pay( this.value == 'on' ? true : false)
                    })
                    if (cb) cb(null)
                // }
            },
            description: function(cb) {
                request.data.set.description(null)
                $(formWrapper).find('.request').html(Mustache.to_html(request.templates.description))
                    .find('textarea').on('input', function() {
                    request.data.set.description(this.value)
                });
                if (cb) cb(null)
            },
            typeRequest: function(cb) {
                request.data.set.typeRequest(null)
                request.data.get.typesRequest(res => {
                    let selector = $(formWrapper).find('.type-request').html(Mustache.to_html(request.templates.types_request, res));
                    selector.find('input').on('change', function() {
                        request.data.set.typeRequest($('input[name=contact]:checked').val())
                        // alert($('input[name=contact]:checked').val());attach_files:
                    });
                    if (cb) cb(null)
                })
            },
            timeliness: function(cb) {
                request.data.get.timeliness(res => {


                    for (let i in res)
                        if (res[i].checked)
                            request.data.set.timeliness(res[i].id);
                    let selector = $(formWrapper).find('.timeliness').html(Mustache.to_html(request.templates.timeliness, res)).find('input').off('change').on('change', function() {


                        console.log('SELECTOR', $(selector));

                        let checked_id = undefined;

                        for(var i = 0; i < $(selector).length; i++){

                            let elem = $(selector).eq(i);

                            if(elem.attr('checked')){

                                checked_id = elem.attr('value');
                            }

                            console.log('checked_id', checked_id);
                        }

                        request.data.set.timeliness(checked_id);
                    });
                    if (cb) cb(null)
                });

            },
            attachFiles: function(cb){

                let concat = []

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
                    wrapper: $(formWrapper).find('.add-attach-container'),
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
                        request.data.fileHandlerAttachNewFiles = new FileHandler(constructor, cb(null))
                    })
                } else {
                    constructor.id = request.data.session_attach_new_files_id;
                    request.data.fileHandlerAttachNewFiles = new FileHandler(constructor, cb(null))
                }

            },
            createRequest: function (cb) {
                $(formWrapper).find('.create-request-active').off().on('click', function() {
                    // console.log(request.storage.from_local);
                    if (request.data.checkData(true)) {
                        request.data.set.request(request.storage.from_local, id => {
                            formInstance.remove();
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

                                MB.loader(true, 'Создаем заявку');

                                let co = {
                                    command: 'add',
                                    object: 'request_work_comment',
                                    params: {
                                        request_work_id: id,
                                        text: ''
                                    }
                                };

                                socketQuery(co,function(res){

                                    let comment_id = res.id;

                                    let files = request.data.fileHandlerAttachNewFiles.files.items;

                                    async.eachSeries(files, function (item, cb) {

                                        let o = {
                                            command: 'add',
                                            object: 'file_comment_request_work',
                                            params: {
                                                request_work_comment_id: comment_id,
                                                file_id: item.data.file_id,
                                                name: item.data.name
                                            }
                                        };

                                        socketQuery(o, function(res){

                                            if(res.code == 0){
                                                cb(null);
                                            }
                                        });

                                    });




                                    form.reload(function(){
                                        MB.loader(false, 'Создаем заявку');
                                    });

                                    let modal = MB.Core.modalWindows.windows.getWindow(formId);
                                    $(modal).on('close', function () {});
                                    $(form).on('update', function () {});

                                });
                            });
                        })
                    }
                });
                if (cb) cb(null)
            }
        },
        templates: {
            // applicant_organizations: `Выберите вашу организацию: <select name="applicant_organizations"></select><br><br><br>`,
            applicant_organizations: `
                <div class="label-lil">Выберите вашу организацию:</div>
                <i class="fa fa-asterisk necessary-field" aria-hidden="true"></i>
                <div class="select-cont-lil">
                    <select name="applicant_organizations">
                    <option selected disabled>Выберите вашу организацию</option>
                    {{#.}}
                        <option value="{{organization_id}}" {{#is_default}}selected{{/is_default}}>{{organization}}</option>
                    {{/.}}
                    </select>
                </div>`,
            executor_organizations: `
                <div class="label-lil">Выберите организацию исполнителя:</div> 
                <div class="select-cont-lil">
                    <select name="executor_organizations">
                    <option selected disabled>Выберите организацию исполнителя</option>
                    {{#.}}
                        <option value="{{id}}" >{{name}}</option>
                    {{/.}}
                    </select>
                </div>`,
            executor_users: `
                <div class="label-lil">Выберите исполнителя:</div>
                <div class="select-cont-lil">
                    <select name="executor_users">
                        <option selected disabled>Выберите исполнителя</option>
                        {{#.}}
                            <option value="{{id}}" >{{name}}</option>
                        {{/.}}
                    </select>
                </div>`,
            objects_: `
                <div class="label-lil">Выберите объект:</div>
                <i class="fa fa-asterisk necessary-field" aria-hidden="true"></i>
                <div class="select-cont-lil"> 
                    <select name="object_">
                    <option selected disabled>Выберите объект</option>
                    {{#.}}
                        <option value="{{id}}" {{#is_default}}selected{{/is_default}} >{{name}}</option>
                    {{/.}}
                    </select>
                </div>`,
            locations: `
                <div class="label-lil">Выберите помещение:</div>
                <div class="select-cont-lil"> 
                    <select name="location">
                        <option selected disabled>Выберите помещение</option>
                        {{#.}}
                            <option value="{{id}}" {{#is_default}}selected{{/is_default}}>{{name}}</option>
                        {{/.}}
                    </select>
                </div>`,
            description_location: `
            <div class="label-lil">Описание помещения: </div> 
            <div class="select-cont-lil"><textarea placeholder="Опишите помещение" class="description-location" rows="3"></textarea></div> `,
            pay: `<div class="label-lil">Платная заявка</div> <div class="tcon-checkbox">
            <input type="checkbox" id="option_{{formInstance_id}}" aria-checked="false" role="checkbox">
            <label for="option_{{formInstance_id}}">Label Text</label></div>`,
            description: `
            <div class="label-lil">Описание заявки: </div>
            <i class="fa fa-asterisk necessary-field" aria-hidden="true"></i>
            <div class="select-cont-lil"><textarea rows="3" placeholder="Опишите заявку"></textarea></div> `,
            types_request: `<div class="type-title label-lil">Тип заявки:</div>
                 <i class="fa fa-asterisk necessary-field" aria-hidden="true"></i>  
                 <form>
                    {{#.}}
                        <div style="padding: 0px 10px; margin-bottom: 14px;">
                            <input type="radio"  id="contact{{id}}}_{{formInstance_id}}"  value="{{id}}" name="contact" class="regular-radio" >
                            <label for="contact{{id}}}_{{formInstance_id}}">{{name}}</label>
                        </div>
                    {{/.}}
                </form>`,
            timeliness: `<div class="type-title label-lil">Срочность:</div>
                <i class="fa fa-asterisk necessary-field" aria-hidden="true"></i> 
                <form>
                    {{#.}}
                        <div style="padding: 0px 10px;margin-bottom: 14px;">
                            <input type="radio" {{#checked}}checked{{/checked}} id="timeliness{{id}}_{{formInstance_id}}" name="timeliness" value="{{id}}"  class="regular-radio"">
                            <label for="timeliness{{id}}_{{formInstance_id}}">{{name}}</label>
                        </div>
                    {{/.}}
                </form>`,
            boot_box_attach_file: `<div class="upload-new-file"></div>`
        },
        init: function () {
            let _t = this;

            async.series({
                render: cb => {
                    async.parallel({
                        applicantOrganization: cb => {
                            _t.render.applicantOrganization(res => {
                                cb(res)
                            })
                        },
                        objects_: cb => {
                            _t.render.objects_(res => {
                                cb(res)
                            })
                        },
                        locations: cb => {
                            _t.render.locations(res => {
                                cb(res)
                            })
                        },
                        descriptionLocation: cb => {
                            _t.render.descriptionLocation(res => {
                                cb(res)
                            })
                        },
                        timePlan: cb => {
                            _t.render.timePlan(res => {
                                cb(res)
                            })
                        },
                        pay: cb => {
                            _t.render.pay(res => {
                                cb(res)
                            })
                        },
                        description: cb => {
                            _t.render.description(res => {
                                cb(res)
                            })
                        },
                        typeRequest: cb => {
                            _t.render.typeRequest(res => {
                                cb(res)
                            })
                        },
                        timeliness: cb => {
                            _t.render.timeliness(res => {
                                cb(res)
                            })
                        },
                        attachFiles: cb => {
                            _t.render.attachFiles(res => {
                                cb(res)
                            })
                        },
                        createRequest: cb => {
                            _t.render.createRequest(res => {
                                cb(res)
                            })
                        },
                    }, (err, res) => {
                        cb(null)
                    })
                },
                selectDefaultValue: cb => {

                    // console.log('TUT')
                    // debugger
                    cb(null)
                }
            }, (err, res) => {

            })


            // for (let i in this.render) this.render[i]();
        }
    };

    request.init();
}())
