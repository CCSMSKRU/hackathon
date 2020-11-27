var paramExample = {
    required: true,
    default: 'test',
    valueMethod:'val', // html() ...
    validation: { // Здесь может быть объект, массив или значение. Объект использует format, func
        format: [
            {
                func: 'addToEnd',
                args: ['Добавим текст в конец']
            },
            {
                func: 'addToEnd',
                args: ['Еще добавим.']
            }
        ],
        func: 'notNull'
    }
};


var methodos = {
    test: {
        name:'test',
        name_ru:'Test',
        description:'Вернет массив с тестами',
        responseJSON:
            '' +
            '\nНет примера\n' +
            '',
        o:{
            command:'test',
            params:{

            }
        }
    },
    login_: {
        name: 'login_',
        name_ru: 'Login',
        description: 'Авторизация',
        responseJSON: '' + '\nНет примера\n' + '',
        o: {
            command: "login",
            object: "User",
            params: {
                login:{
                    required:true,
                    default:'ivantgco@gmail.com',
                    validation:'',
                    description: 'example@mail.ru'
                },
                password:{
                    required:true,
                    default:'123',
                    validation:'',
                    description: '*'
                }
            }
        }
    }
};
