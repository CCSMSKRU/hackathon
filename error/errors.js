module.exports = {
    // Отрицательныные значения - отладка // Negative values - Debug
    unknow:{
        code: -1000,
        title: 'Error',
        title_en: 'Error',
        message:'Неизвестная ошибка',
        message_en:'Unknow error'
    },
    sysError:{
        code: -999,
        type: 'warning',
        title:'Debug',
        message:'Error, see console',
        message_en:''
    },
    sysCommand:{
        code: -998,
        type: 'warning',
        title:'System error',
        message:'Вы не можете использовать данную команду.',
        message_en:''
    },
    noClass:{
        code: -997,
        type: 'warning',
        title:'Parameters error',
        message:'The request does not specify an object (class)',
        message_en:''
    },
    // 0 - Все ОК / Ok
    ok:{
        code: 0,
        title:'Ок',
        message:'',
        type:'success',
        message_en:''
    },
    // Ok/ System don`t show OK message
    noToastr:{
        code: 0,
        title:'Ок',
        message:'',
        type:'success',
        message_en:''
    },
    //  -4 и от 1 до 100 ошибки доступа / Access error
    noAuth:{
        code: -4,
        message:'Пожалуйста, авторизуйтесь.',
        message_en:''
    },
    invalidSession:{
        code: 1,
        message:'Пожалуйста, авторизуйтесь.',
        message_en:''
    },
    invalidAuthData:{
        code: 2,
        message:'Неверный логин или пароль',
        message_en:''
    },
    noAccessRole:{
        code: 11,
        message:'У Вас недостаточно привилегий',
        message_en:'No access'
    },
    noAccess:{
        code: 11,
        message:'Отказано в доступе',
        message_en:'No access'
    },
    noAccessByList:{
        code: 12,
        message:'Для операции не может быть применен список доступа.',
        message_en:''
    },
    needConfirm:{
        code: 10,
        type:'warning',
        title:'Подтверждение операции.',
        title_en:'Confirm operation.',
        message:'Подтверждение операции.',
        message_en:'Confirm operation.'
    },
    invalidToken:{
        code: 50,
        type:'error',
        title:'Authentification error.',
        message:'Не верный токен.',
        message_en:''
    },
    internalError:{
        code: 70,
        type:'error',
        title:'Internal error, sorry).',
        message:'Something goes wrong, please contact us: +7 (906) 063-88-66, +7 (968) 822-20-76, alextgco@gmail.com, ivantgco@gmail.com',
        message_en:''
    },
    alertDeveloper:{
        code: 70,
        type:'error',
        title:'Something goes wrong, please contact us: +7 (906) 063-88-66, +7 (968) 822-20-76, alextgco@gmail.com, ivantgco@gmail.com.',
        message:'',
        message_en:''
    },

    // от 101 до 200 ошибки работы с данными // Data error
    invalid:{
        code: 101,
        type:'error',
        message:'Некоторые поля заполнены неверно.',
        message_en:'Some fields are not filled in correctly.'
    },
    notModified:{
        code: 102,
        type:'error',
        message:'Запись не найдена или не было изменений.',
        message_en:'The record was not found or there was no change.'
    },
    rowNotFound:{
        code: 103,
        type:'error',
        message:'Запись не найдена.',
        message_en:'The record was not found.'
    },
    requiredErr:{
        code: 104,
        type:'error',
        message:'Заполните все обязательные поля.',
        message_en:'Fill in all required fields.'
    },
    recExist:{
        code: 105,
        type:'error',
        message:'Такая запись уже есть.',
        message_en:'Such a record already exist.'
    },
    insertableErr:{
        code: 104,
        type:'error',
        message:'Поля, которые вы пытаетесь добавить не доступны для добавления.',
        message_en:'The fields you are trying to add are not available for adding.'
    },


    ER_DUP_ENTRY:{
        code: 1062,
        type:'error',
        message:'Такая запись уже существует.',
        message_en:'Such a record already exist.'
    },


    // от 2001 - ошибки site протокола // Site API err
    sysErrorSite:{
        code: -1999,
        type: 'warning',
        title:'Отладка',
        message:'Произошла системная ошибка.</br>Сообщите пожалуйста нам. </br>+7 (906) 063-88-66',
        message_en:'A system error occurred.</br>Please inform us. </br>alextgco@gmail.com'
    },
    noAuthSite:{
        code: 2001,
        message:'Не удалось идентифицировать запрос',
        message_en:'Could not identify request'
    },
    errRequest:{
        code: 2002,
        message:'Некорректно переданы параметры запроса.',
        message_en:'The query parameters are not correctly passed.'
    },
    badCommand:{
        code: 2003,
        message:'Такой команды не существует.',
        message_en:'Such a command does not exist.'
    },
    badParams:{
        code: 2004,
        message:'Неверные параметры.',
        message_en:'Invalid parameters.'
    },
    badClass:{
        code: 2005,
        message:'Такого объекта(класса) не существует.',
        message_en:'There is no such object (class).'
    }
    // от 10001 - Все прочие ошибки в системе / All others error in system


};
