let MyError = require('../error').MyError;
let sendMail = require('../libs/sendMail');
let config = require('../config');
const api = require('../libs/api');
var User = require('../classes/User');
var sys_user = new User({ name:'user'});
var async = require('async');
// const fs = require('fs');
const mustache = require('mustache')
const fs = require('fs').promises;


class EventNotification {

    constructor(obj, cb) {
        if (!obj.object || !obj.object_id || !obj.event) return cb(new MyError('Не корректно переданы параметры.'))
        if (!obj.event.name) return cb(new MyError('Не корректно переданы параметры.'))
        let _t = this;
        _t.event = obj.event
        _t.object = obj.object
        _t.object_id = obj.object_id
        _t.params = obj.params

        _t.users_roles = {}
        _t.observable_object = undefined


        _t.template_message = {
            main_phone: '+7 (963) 992-72-01',
            // link: 'http://137.74.236.116:8080/',
            link: 'https://portal.pro-fm.com/'
        }

        const doNotSetEmail = config.get('doNotSetEmail')
        if (typeof doNotSetEmail !== 'undefined'){
            if (!doNotSetEmail) _t.init(cb);
            else cb(null)
        } else {
            _t.init(cb);
        }

    }
    init(cb) {
        let _t = this;
        async.series({
            loadSysUser: cb => {
                sys_user.loadSysUser(cb);
            },
            // getInfoObservableObject: cb => {
            //     _t.getInfoObservableObject(res => {
            //         if (cb) cb(res)
            //     })
            // },
            // getUsers: cb => {
            //     _t.getUsers(res => {
            //         if (cb) cb(res)
            //     })
            // },
            selectCaseModelEvent: cb => {
                _t.selectCaseModelEvent(res => {
                    if (cb) cb(res);
                })
            }
        }, (err, res) => {
            if (err) return cb(err)
            cb(null)
        })
    }

    ///////////////////////////////////////////////////////////// ОБЩИЕ МЕТОДЫ УВЕДОМЛЕНИЙ

    //обёртка апи
    async api(params) {
        return new Promise((resolve, reject) => {
            api(params, (err, res) => {
                if (err) reject(err)
                resolve(res)
            }, sys_user)
        })
    }

    //получить инстанс пользователя по id
    async getUserById(id) {
        const _t = this;
        let res = await _t.api({
            object: 'user',
            command: 'getById',
            params: {
                id: id
            }
        })
        return res[0]
    }

    // получить массив emails пользовтаелей, которые передаются массивом id
    async getEmailUsersByIds(ids) {
        const _t = this
        let o = {
            object: 'user',
            command: 'get',
            params: {
                where: [{
                    key: 'id',
                    type: 'in',
                    val1: ids
                }],
                collapseData: false
            }
        }
        if (ids == 'ALL') o.params = { collapseData: false }

        let users = await _t.api(o)
        return users.map(user => user.email_notification)

    }

    //получить массив всех пользователей
    async getEmailAllUsers() {
        const _t = this
        let o = {
            object: 'user',
            command: 'get',
            params: {
                columns: ['email'],
                collapseData: false
            }
        }
        let users = await _t.api(o)
        return users.map(user => user.email_notification)
    }

    //получить массив всех пользователей на объекте
    async getEmailAllUsersByOnObject(id) {

        const _t = this
        let users = await _t.execCustomMethodClass('object_', 'getUsersRolesByObject', {
            id: id,
            roles: ['ALL']
        })
        users = users.map(user => user.user_id)


        let o = {
            object: 'user',
            command: 'get',
            params: {
                where: [{
                    key: 'id',
                    type: 'in',
                    val1: users
                }],
                collapseData: false
            }
        }

        users = await _t.api(o)
        return users.map(user => user.email_notification)



    }

    //получить экземпляр какой либо сущности по id
    async getInstanceClassById(object, id) {
        const _t = this;
        let res = await _t.api({
            object: object,
            command: 'getById',
            params: {
                id: id
            }
        })
        return res[0]
    }

    //кастомные методы классов
    async execCustomMethodClass(object, method, params) {
        const _t = this;
        let res = await _t.api({
            object: object,
            command: method,
            params: params
        })
        return res.data
    }

    // находит email пользователя, id которого указан в поле(field) в записи таблице(struct) по id
    async findUserMailByField(struct, instance, field) {
        const _t = this;
        let instance_struct = await _t.api({
            command: 'getById',
            object: struct,
            params: {
                id: instance
            }
        })
        let user = await _t.getUserById(instance_struct[0][field])
        return user.email_notification
    }

    //получить массив ids массив пользователей, которые есть в объекте, можно передать массив ролей
    async findUsersObjectByRoles(id, roles) {
        const _t = this
        // con
        //['ALL']
        let users = await _t.execCustomMethodClass('object_', 'getUsersRolesByObject', {
            id: id,
            roles: roles
        })
        return users.map(user => user.user_id)
    }


    async sendMessage(email, message) {
        return new Promise((resolve, reject) => {
            sendMail({
                subject: message.subject,
                html: message.html,
                // html: 'Долнжо было придти на: ' + email + '<br><hr>' + message.html,
                // email: 'maparilov@gmail.com' //TODO
                email: email
            }, (err, res) => {
                resolve([err, res])
            })
            // resolve(null, null)
        })
    }

    async sendMessages(emails, message) {
        const _t = this
        if (!Array.isArray(emails)) emails = [emails]
        for (let i in emails) {
            let iter = i
            await _t.sendMessage(emails[i], message)
        }

    }

    async getTemplateHTML(name) {
        let _t = this;
        return await fs.readFile('./templates/' + name + '.html', "utf-8");
    }



    /////////////////////////////////////////////////////////////
    // ЗДЕСЬ НАЧИНАЕТСЯ ВСЯ МАГИЯ ПО РАЗДЕЛЕНИЮ НА КЕЙСЫ

    // В ЭТОЙ ФУНКЦИИ ВЫЗЫВАЕТСЯ ВЫБИРАЕТСЯ ФУНКЦИЯ ИСХОДЯ ИЗ ТОГО С КАКОЙ СУЩНОСТЬЮ ПРОИЗОШЛО СОБЫТИЕ
    async selectCaseModelEvent(cb) {
        let _t = this;
        if (_t.object.toLowerCase() == 'request_work') await _t.caseModelRequestWork()
        if (_t.object.toLowerCase() == 'tangibles')    await _t.caseModelTangibles()
        if (_t.object.toLowerCase() == 'ppr') await _t.caseModelPpr()
        if (_t.object.toLowerCase() == 'news') await _t.caseModelNews()
        if (_t.object.toLowerCase() == 'user') await _t.caseModelUser(cb)
    }


    async caseModelRequestWork() {
        const _t = this;
        if (_t.event.name == 'create') {

            if (_t.event.type == 'engineering') await _t.requestWorkCreateEngineering()
            if (_t.event.type == 'cleaning') await _t.requestWorkCreateCleaning()
            if (_t.event.type == 'security') await _t.requestWorkCreateSecurity()

            //administration
            if (_t.event.type == 'parking') await _t.requestWorkCreateParking()
            if (_t.event.type == 'visit') await _t.requestWorkCreateVisit()
            if (_t.event.type == 'iotmc') await _t.requestWorkCreateIotmc()
            if (_t.event.type == 'elevator') await _t.requestWorkCreateElevator()
        }

        if (_t.event.name == 'setExecutor') {
            if (_t.event.type == 'engineering') await _t.requestWorkSetExecutorEngineering()
            if (_t.event.type == 'cleaning') await _t.requestWorkSetExecutorCleaning()
            if (_t.event.type == 'security') await _t.requestWorkSetExecutorSecurity()
        }

        if (_t.event.name == 'setAccepted') {
            await _t.requestWorkSetConfirm()
        }

        if (_t.event.name == 'setRejected') {
            await _t.requestWorkSetRejected()
        }

        if (_t.event.name == 'setClosed') {

            if (_t.event.type == 'engineering') await _t.requestWorkSetClosed()
            if (_t.event.type == 'cleaning') await _t.requestWorkSetClosed()
            if (_t.event.type == 'security') await _t.requestWorkSetClosed()

            //administration
            if (_t.event.type == 'parking') await _t.requestWorkSetClosedAdministration()
            if (_t.event.type == 'visit') await _t.requestWorkSetClosedAdministration()
            if (_t.event.type == 'iotmc') await _t.requestWorkSetClosedAdministration()
            if (_t.event.type == 'elevator') await _t.requestWorkSetClosedAdministration()
        }

        if (_t.event.name == 'setProcessing') {
            _t.requestWorkSetProcessing()
        }

        if (_t.event.name == 'setSuccessful') {
            if (_t.event.type == 'engineering') await _t.requestWorkSetSuccessfulEngineering()
            if (_t.event.type == 'cleaning') await _t.requestWorkSetSuccessfulCleaning()
            if (_t.event.type == 'security') await _t.requestWorkSetSuccessfulSecurity()

            //administration
            if (_t.event.type == 'parking') await _t.requestWorkSetSuccessfulAdministration()
            if (_t.event.type == 'visit') await _t.requestWorkSetSuccessfulAdministration()
            if (_t.event.type == 'iotmc') await _t.requestWorkSetSuccessfulAdministration()
            if (_t.event.type == 'elevator') await _t.requestWorkSetSuccessfulAdministration()
        }

        if (_t.event.name == 'setReturned') {
            if (_t.event.type == 'engineering') await _t.requestWorkSetReturned()
            if (_t.event.type == 'cleaning') await _t.requestWorkSetReturned()
            if (_t.event.type == 'security') await _t.requestWorkSetReturned()

            //administration
            if (_t.event.type == 'parking') await _t.requestWorkSetReturnedAdministration()
            if (_t.event.type == 'visit') await _t.requestWorkSetReturnedAdministration()
            if (_t.event.type == 'iotmc') await _t.requestWorkSetReturnedAdministration()
            if (_t.event.type == 'elevator') await _t.requestWorkSetReturnedAdministration()
        }

        if (_t.event.name == 'setReturnToProcessing') {
            if (_t.event.type == 'engineering') await _t.requestWorkSetReturnToProcessingEngineering()
            if (_t.event.type == 'cleaning') await _t.requestWorkSetReturnToProcessingCleaning()
            if (_t.event.type == 'security') await _t.requestWorkSetReturnToProcessingSecurity()
        }

        if (_t.event.name == 'setComment') {
            _t.requestWorkSetComment()
        }

    }
    async caseModelNews() {
        const _t = this;

        if (_t.event.type == 'for_all') _t.newsForAll()
        if (_t.event.type == 'for_object') _t.newsForObject()
    }

    async caseModelUser(cb) {
        const _t = this;

        if (_t.event.name == 'add_user_to_organization') await _t.add_user_to_organization()
        if (_t.event.name == 'add_user') await _t.add_user()
        if (_t.event.name == 'changePassword') await  _t.change_password(cb)
        if (_t.event.name == 'set_new_password') await  _t.setNewPassword()
    }

    async caseModelTangibles() {
        const _t = this;
        if (_t.event.name == 'setRequest')       _t.tangiblesSetRequest()
        if (_t.event.name == 'setAccessRequest') _t.tangiblesSetAccessRequest()
        if (_t.event.name == 'setDeniedRequest') _t.tangiblesSetDeniedRequest()
        if (_t.event.name == 'setReturn')        _t.tangiblesSetReturn()
        if (_t.event.name == 'setComment')       _t.tangiblesSetComment()
    }

    async caseModelPpr() {
        const _t = this;

        if (_t.event.name == 'setExecutor')         _t.pprSetExecutor()
        if (_t.event.name == 'changeWeek')          _t.pprChangeWeek()
        if (_t.event.name == 'returnToProcessing')  _t.pprReturnToProcessing()
        if (_t.event.name == 'setComment')          _t.pprSetComment()
    }


    ///////////ppr
    async pprSetExecutor() {
        const _t = this


        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);
        if (!intance_object.executor_id) return

        let user_executor = await  _t.getUserById(intance_object.executor_id)
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Вы назначены на заявку ппр № ' + intance_object.id,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Вы назначены на заявку',
            html: mustache.to_html(template, data),
        })
    }
    async pprChangeWeek() {
        const _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);
        if (!intance_object.executor_id) return

        let user_executor = await  _t.getUserById(intance_object.executor_id)
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка ппр № ' + intance_object.id + ' назначенная на вас - перенесена.',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Заявка ппр № ' + intance_object.id + ' - перенесена.',
            html: mustache.to_html(template, data),
        })

        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['LEAD_ENGINEER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка ппр № ' + intance_object.id + ' - перенесена.',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка ппр №' + intance_object.id + ' - перенесена.',
            html: mustache.to_html(template, data),
        })



    }

    async pprReturnToProcessing() {
        const _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);
        if (!intance_object.executor_id) return

        let user_executor = await  _t.getUserById(intance_object.executor_id)
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка ппр № ' + intance_object.id + ' назначенная на вас - возвращена в исполнение.',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Заявка ппр № ' + intance_object.id + ' - возвращена в исполнение.',
            html: mustache.to_html(template, data),
        })
    }
    async pprSetComment() {
        const _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);
        if (!intance_object.executor_id) return

        let user_executor = await  _t.getUserById(intance_object.executor_id)
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка ппр № ' + intance_object.id + ' назначенная на вас - появился новый комментарий.',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Заявка ппр № ' + intance_object.id + ' - появился нвоый комментарий.',
            html: mustache.to_html(template, data),
        })
    }


    ///////////tangibles
    async tangiblesSetRequest() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = _t.params.request_tangibles_user_email

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Вы запросили ТМЦ ' + intance_object.name + '(' + intance_object.id + ')',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Вы запросили ТМЦ',
            html: mustache.to_html(template, data),
        })

        let users_object = await _t.findUsersObjectByRoles(intance_object.object_owner_id, ['STOREKEEPER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Новая заявка ТМЦ ' + intance_object.name + '(' + intance_object.id + ')',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка ТМЦ',
            html: mustache.to_html(template, data),
        })
    }
    async tangiblesSetAccessRequest() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);

        let intance_object_request_tangibles = await _t.getInstanceClassById('Request_tangible', _t.params.request_id);
        let user_created_request_tangibles = await _t.getUserById(intance_object_request_tangibles.created_by_user_id)
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваш запрос ТМЦ ' + intance_object.name + '(' + intance_object.id + ') - одобрен',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(user_created_request_tangibles.email_notification, {
            subject: 'Вам одобрили ТМЦ',
            html: mustache.to_html(template, data),
        })
    }
    async tangiblesSetDeniedRequest() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);

        let intance_object_request_tangibles = await _t.getInstanceClassById('Request_tangible', _t.params.request_id);
        let user_created_request_tangibles = await _t.getUserById(intance_object_request_tangibles.created_by_user_id)

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваш запрос ТМЦ ' + intance_object.name + '(' + intance_object.id + ') - отклонён',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(user_created_request_tangibles.email_notification, {
            subject: 'Вам отклонили ТМЦ',
            html: mustache.to_html(template, data),
        })
    }


    async tangiblesSetReturn() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);



        let user_created_request = await _t.getUserById(_t.params.request_tangibles_user_id)

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Вы вернули ТМЦ ' + intance_object.name + '(' + intance_object.id + ')',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(user_created_request.email_notification, {
            subject: 'Вы вернули ТМЦ',
            html: mustache.to_html(template, data),
        })


        let users_object = await _t.findUsersObjectByRoles(intance_object.object_owner_id, ['STOREKEEPER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'ТМЦ ' + intance_object.name + '(' + intance_object.id + ') - вернулось на объект.',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'ТМЦ - вернулось на объект',
            html: mustache.to_html(template, data),
        })
    }
    async tangiblesSetComment() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let users_object = await _t.findUsersObjectByRoles(intance_object.object_owner_id, ['STOREKEEPER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Новый комментарий ТМЦ ' + intance_object.name + '(' + intance_object.id + ')',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Новый комментарий ТМЦ',
            html: mustache.to_html(template, data),
        })
    }




    ///////////news
    async newsForAll() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);

        // let emails = await _t.findUsersObjectByRoles(intance_object.object_id, ['DISPATCHER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails = await _t.getEmailAllUsers();
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: intance_object.news,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails, {
            subject: 'Новость: ' + intance_object.header,
            html: mustache.to_html(template, data),
        })
    }


    async newsForObject() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);

        let emails = await _t.getEmailAllUsersByOnObject(intance_object.for_object_id); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: intance_object.news,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails, {
            subject: 'Новость: ' + intance_object.header,
            html: mustache.to_html(template, data),
        })
    }


    //////////////user
    async add_user_to_organization() {
        let _t = this

        let emails = _t.params.email_notification
        let template = await _t.getTemplateHTML('notify')

        let data = {
            header_message: 'Вас добавили в организацию!',
            text_message: 'Вы успешно добавлены в организацию: ' + _t.params.organization,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails, {
            subject: 'YES - Вас добавили в организацию!',
            html: mustache.to_html(template, data),
        })
    }

    async add_user() {
        let _t = this


        let emails = _t.params.email_notification
        let template = await _t.getTemplateHTML('notify')


        let data = {
            header_message: 'Добро пожаловать в YES!',
            text_message: 'Ваша ученая запись создана,<br><br>Логин: ' + _t.params.login+'<br>Пароль: ' + _t.params.password + '<br>' +
                '<br>! Обязательно <b style="color: red;">смените пароль</b> после авторизации в системе, для этого зайдите в профиль пользователя в правом верхнем углу экрана.',
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails, {
            subject: 'YES - Ваша учетная запись создана.',
            html: mustache.to_html(template, data),
        })
    }

    //уведомление пользователю о том, что ему необходимо сменить пароль на новый
    async change_password(cb) {
        const _t = this

        let template = await _t.getTemplateHTML('notify')
        let data = {
            header_message: 'Данные для входа в систему:',
            text_message: `Логин: ${_t.params.email} <br> Пароль: ${_t.params.password}`,
            link: _t.template_message.link

        }

        let [err, res] = await _t.sendMessage(_t.params.email, {
            subject: 'YES - Данные для входа в систему.',
            html: mustache.to_html(template, data),
        })

        if (cb) cb(err, res)
    }

    async setNewPassword() {
        let _t = this
        let template = await _t.getTemplateHTML('notify')
        let data = {
            header_message: 'YES - Временный пароль.',
            text_message: `Ваш временный пароль: ${_t.params.password} <br>Смените его после авторизации.`

        }
        await _t.sendMessages([_t.params.email], {
            subject: 'YES - Временный пароль.',
            html: mustache.to_html(template, data),
        })
    }



    ///////////request_work

    //create
    async requestWorkCreateEngineering() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        //нужно отправить уведомление создателю заявки
        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Вы создали заявку № ' + intance_object.id,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Вы создали заявку с №' + intance_object.id,
            html: mustache.to_html(template, data),
        })


        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['DISPATCHER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом

        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' поступила от ' + intance_object.applicant_organization,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Новая заявка, №' + intance_object.id + ' - Инженерия',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkCreateCleaning() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Вы создали заявку № ' + intance_object.id,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Вы создали заявку с №' + intance_object.id,
            html: mustache.to_html(template, data),
        })


        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['DISPATCHER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' поступила от ' + intance_object.applicant_organization,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Новая заявка, №' + intance_object.id + ' - Клининг',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkCreateSecurity() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Вы создали заявку № ' + intance_object.id,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Вы создали заявку с №' + intance_object.id,
            html: mustache.to_html(template, data),
        })


        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['DISPATCHER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' поступила от ' + intance_object.applicant_organization,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Новая заявка, №' + intance_object.id + ' - Безопасность',
            html: mustache.to_html(template, data),
        })
    }

    async requestWorkCreateParking() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['RECEPTION']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка № ' + intance_object.id + ' поступила от ' + intance_object.applicant_organization,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Новая заявка, №' + intance_object.id + ' - Паркинг',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkCreateVisit() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['RECEPTION']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка № ' + intance_object.id + ' поступила от ' + intance_object.applicant_organization,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Новая заявка, №' + intance_object.id + ' - Гостевой визит',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkCreateIotmc() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['RECEPTION']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка № ' + intance_object.id + ' поступила от ' + intance_object.applicant_organization,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Новая заявка, №' + intance_object.id + ' - Внос/Вынос ТМЦ',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkCreateElevator() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['RECEPTION']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка № ' + intance_object.id + ' поступила от ' + intance_object.applicant_organization,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Новая заявка, №' + intance_object.id + ' - Грузовой лифт',
            html: mustache.to_html(template, data),
        })
    }

    // setExecutor
    async requestWorkSetExecutorEngineering() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);
        let user_executor = await  _t.getUserById(intance_object.executor_user_id)


        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Вы назначены на заявку № ' + intance_object.id,
            // text_message: 'Заявка № ' + intance_object.id + ' поступила от ' + intance_object.applicant_organization,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }


        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Вы назначены на заявку № ' + intance_object.id + ' - Инженерия',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkSetExecutorCleaning() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);
        let user_executor = await  _t.getUserById(intance_object.executor_user_id)


        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Вы назначены на заявку № ' + intance_object.id,
            // text_message: 'Заявка № ' + intance_object.id + ' поступила от ' + intance_object.applicant_organization,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }


        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Вы назначены на заявку № ' + intance_object.id + ' - Клининг',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkSetExecutorSecurity() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);
        let user_executor = await  _t.getUserById(intance_object.executor_user_id)


        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Вы назначены на заявку № ' + intance_object.id,
            // text_message: 'Заявка № ' + intance_object.id + ' поступила от ' + intance_object.applicant_organization,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }


        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Вы назначены на заявку № ' + intance_object.id + ' - Безопасность',
            html: mustache.to_html(template, data),
        })
    }

    //setAccepted(setConfirm)
    async requestWorkSetConfirm() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваша заявка № ' + intance_object.id + ' - принята.',
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Ваша заявка № ' + intance_object.id + ' - принята.',
            html: mustache.to_html(template, data),
        })
    }

    //setDenied(setRejected)
    async requestWorkSetRejected() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваша заявка № ' + intance_object.id + ' - была отклонена. ',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Ваша заявка № ' + intance_object.id + ' - была отклонена.',
            html: mustache.to_html(template, data),
        })
    }

    //setClosed
    async requestWorkSetClosed() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваша заявка № ' + intance_object.id + ' - закрыта.',
            main_phone: _t.template_message.main_phone,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Ваша заявка № ' + intance_object.id + ' - закрыта.',
            html: mustache.to_html(template, data),
        })


        let user_executor = await  _t.getUserById(intance_object.executor_user_id)


        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' - закрыта.',
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }


        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Заявка № ' + intance_object.id + ' - закрыта.',
            html: mustache.to_html(template, data),
        })

    }
    async requestWorkSetClosedAdministration() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваша заявка № ' + intance_object.id + ' - закрыта.',
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Ваша заявка № ' + intance_object.id + ' - закрыта.',
            html: mustache.to_html(template, data),
        })
    }

    //setProcessing
    async requestWorkSetProcessing() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваша заявка № ' + intance_object.id + ' - выполняется.',
            main_phone: _t.template_message.main_phone,
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Ваша заявка № ' + intance_object.id + ' - выполняется.',
            html: mustache.to_html(template, data),
        })


        let user_executor = await  _t.getUserById(intance_object.executor_user_id)


        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' - выполняется.',
            post_scriptum: `
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }


        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Заявка № ' + intance_object.id + ' - выполняется.',
            html: mustache.to_html(template, data),
        })

    }

    //setSuccessful
    async requestWorkSetSuccessfulEngineering() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваша заявка № ' + intance_object.id + ' - исполнена.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Ваша заявка № ' + intance_object.id + ' - исполнена.',
            html: mustache.to_html(template, data),
        })



        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['LEAD_ENGINEER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' - исполнена.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка №' + intance_object.id + ' - исполнена.',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkSetSuccessfulCleaning() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваша заявка № ' + intance_object.id + ' - исполнена.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Ваша заявка № ' + intance_object.id + ' - исполнена.',
            html: mustache.to_html(template, data),
        })



        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['CLEANING']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' - исполнена.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка №' + intance_object.id + ' - исполнена.',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkSetSuccessfulSecurity() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваша заявка № ' + intance_object.id + ' - исполнена.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Ваша заявка № ' + intance_object.id + ' - исполнена.',
            html: mustache.to_html(template, data),
        })



        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['SECURITY']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' - исполнена.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка №' + intance_object.id + ' - исполнена.',
            html: mustache.to_html(template, data),
        })
    }

    async requestWorkSetSuccessfulAdministration() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваша заявка № ' + intance_object.id + ' - исполнена.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Ваша заявка № ' + intance_object.id + ' - исполнена.',
            html: mustache.to_html(template, data),
        })



        let user_fio_created = await _t.getUserById(intance_object.created_by_user_id)
        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['RECEPTION']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' - исполнена.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка №' + intance_object.id + ' - исполнена.',
            html: mustache.to_html(template, data),
        })
    }


    //setReturned
    async requestWorkSetReturned() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);




        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['DISPATCHER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка № ' + intance_object.id + ' - отозвана.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка №' + intance_object.id + ' - отозвана.',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkSetReturnedAdministration() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);

        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['RECEPTION']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка № ' + intance_object.id + ' - отозвана.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка №' + intance_object.id + ' - отозвана.',
            html: mustache.to_html(template, data),
        })
    }

    //setReturnToProcessing
    async requestWorkSetReturnToProcessingEngineering() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);

        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['LEAD_ENGINEER']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка № ' + intance_object.id + ' - возвращена в исполнение.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка №' + intance_object.id + ' - возвращена в исполнение.',
            html: mustache.to_html(template, data),
        })




        let user_executor = await  _t.getUserById(intance_object.executor_user_id)


        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' - возвращена в исполнение.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }


        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Заявка № ' + intance_object.id + ' - возвращена в исполнение.',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkSetReturnToProcessingCleaning() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);

        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['CLEANING']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка № ' + intance_object.id + ' - возвращена в исполнение.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка №' + intance_object.id + ' - возвращена в исполнение.',
            html: mustache.to_html(template, data),
        })




        let user_executor = await  _t.getUserById(intance_object.executor_user_id)


        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' - возвращена в исполнение.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }


        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Заявка № ' + intance_object.id + ' - возвращена в исполнение.',
            html: mustache.to_html(template, data),
        })
    }
    async requestWorkSetReturnToProcessingSecurity() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);

        let users_object = await _t.findUsersObjectByRoles(intance_object.object_id, ['SECURITY']) // получить id пользовтелей, которые есть в объекте по переданной роли
        let emails_users_on_object_by_roles = await _t.getEmailUsersByIds(users_object); // получить почты пользовтпелей, id которых переданы аргументом
        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Заявка № ' + intance_object.id + ' - возвращена в исполнение.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }

        await _t.sendMessages(emails_users_on_object_by_roles, {
            subject: 'Заявка №' + intance_object.id + ' - возвращена в исполнение.',
            html: mustache.to_html(template, data),
        })




        let user_executor = await  _t.getUserById(intance_object.executor_user_id)


        template = await _t.getTemplateHTML('notify')
        data = {
            text_message: 'Заявка № ' + intance_object.id + ' - возвращена в исполнение.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }


        await _t.sendMessage(user_executor.email_notification, {
            subject: 'Заявка № ' + intance_object.id + ' - возвращена в исполнение.',
            html: mustache.to_html(template, data),
        })
    }


    //setComment
    async requestWorkSetComment() {
        let _t = this
        let intance_object = await _t.getInstanceClassById(_t.object, _t.object_id);


        let email_user_created = await _t.findUserMailByField(_t.object, _t.object_id, 'created_by_user_id'); // получить почту создателя заявкм

        let template = await _t.getTemplateHTML('notify')
        let data = {
            text_message: 'Ваша заявка № ' + intance_object.id + ' - прокомментирована.',
            post_scriptum: `
                Комментарий: ${_t.params.comment} <br>  ${_t.params.user_fio_answer} <br><br>
                Дата создания: ${intance_object.created} <br>
                Сроки выполнения заявки: ${intance_object.end_time_plan} <br>
                Инициатор: ${intance_object.created_by_user_fio} <br>
                Арендатор: ${intance_object.applicant_organization} <br>
                Вид заявки: ${intance_object.type_request_for_request_work} <br>
                Содержание заявки: ${intance_object.request} <br>
                Тип заявки: ${intance_object.timeliness_for_request_work} <br>
            `,
            main_phone: _t.template_message.main_phone,
            link: _t.template_message.link
        }
        await _t.sendMessage(email_user_created, {
            subject: 'Ваша заявка № ' + intance_object.id + ' - прокомментирована.',
            html: mustache.to_html(template, data),
        })
    }
    //----------------------------------------------------------------------------

    // getUsers(cb) {
    //     let _t = this
    //     let object_id = undefined;
    //     async.series({
    //         getObjectId: cb => {
    //             let o = {
    //                 command: 'get',
    //                 object: _t.object,
    //                 params: {
    //                     param_where: {
    //                         id: _t.object_id
    //                     },
    //                     collapseData: false
    //                 }
    //             }
    //             api(o, (err, res) => {
    //                 if (err) return cb(err)
    //
    //
    //                 if (_t.object == 'news') {
    //                     object_id = res[0].for_object_id;
    //                 } else if (_t.object == 'tangibles') {
    //                     object_id = res[0].object_owner_id
    //                 } else {
    //                     object_id = res[0].object_id;
    //                 }
    //                 cb(null)
    //             }, sys_user)
    //         },
    //         getUsersRoles: cb => {
    //             let o = {
    //                 command: 'getUsersRolesByObject',
    //                 object: 'object_',
    //                 params: {
    //                     id: object_id,
    //                 }
    //             }
    //             api(o, (err, res) => {
    //                 if (err) return cb(err)
    //                 res = res.data
    //                 for (let i in res) {
    //                     let user_id = res[i].user_id;
    //                     if (!_t.users_roles[user_id]) {
    //                         _t.users_roles[user_id] = {
    //                             roles: [],
    //                             email: res[i].email
    //                         }
    //                     }
    //                     _t.users_roles[user_id].roles.push(res[i].email_role)
    //                 }
    //
    //                 cb(null)
    //             }, sys_user)
    //         }
    //     }, (err, res) => {
    //         if (err) return cb(err);
    //         if (cb) cb(null)
    //     })
    // }
    // getInfoObservableObject(cb) {
    //     let _t = this
    //
    //     let o = {
    //         command: 'get',
    //         object: _t.object,
    //         params: {
    //             param_where: {
    //                 id: _t.object_id
    //             },
    //             collapseData: false
    //         }
    //     }
    //
    //
    //     if (_t.object == 'tangibles') {
    //         o.params = {
    //             id: _t.object_id
    //         }
    //         if (_t.event.name == 'request') {
    //             o.command = 'getInfoAboutRequest';
    //         } else if (_t.event.name == 'return') {
    //             o.command = 'getInfoAboutReturn';
    //         }
    //     }
    //
    //     api(o, (err, res) => {
    //         if (err) return cb(err)
    //         if (_t.object == 'tangibles' && _t.event.name == 'request') _t.object_id = res.data.id
    //         _t.observable_object = (_t.object == 'tangibles' ? res.data : res[0])
    //         cb(null)
    //     }, sys_user)
    //
    // }
    // sendMailDec(emails, message, cb) {
    //     if (typeof emails === 'string')
    //         emails = [emails]
    //     if (typeof emails === 'object' && emails.length == 0)
    //         return cb(null)
    //
    //     async.eachSeries(emails, (email, cb) => {
    //         setTimeout(() => {
    //             cb(null)
    //         }, 100)
    //         // sendMail({
    //         //     message: message,
    //         //     email: email
    //         // }, res => {
    //         //     cb(null)
    //         // })
    //     }, cb);
    // }
    // findUsersByRoles(roles) {
    //     let mails_to_send = []
    //     let where_roles = roles
    //     let _t = this
    //     for (let i in _t.users_roles) {
    //         let roles = _t.users_roles[i].roles
    //         let email = _t.users_roles[i].email
    //         for (let j in where_roles) {
    //             if (roles.indexOf(where_roles[j]) > -1) mails_to_send.push(email)
    //         }
    //     }
    //     return mails_to_send
    // }




}


module.exports = EventNotification;
