var funcs = require('./functions');
var log = function(obj, user, api){

    if (typeof obj !== 'object') throw new MyError('В метод не передан obj');
    if (typeof user !== 'object') throw new MyError('В метод не передан user');

    var o = {
        command:'add',
        object:'access_denied_log',
        params:{
            user_id:user.user_data.id,
            class_:obj.object,
            client_object_:obj.client_object || '',
            command_:obj.command,
            date:funcs.getDateTimeMySQL(),

        }
    };

    api(o, function (err, res) {
        if (err) console.log('Не удалось добавить лог', o, err);
    }, user);

};

module.exports.log = log;