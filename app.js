var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var config = require('./config');
var sendMail = require('./libs/sendMail');
var moment = require('moment');


// let jobs = require('./modules/backgroundJobs');
const RequestWork = require('./modules/Request_work')
let BJRequestWork = require('./modules/bj_request_work');




console.logPrototype = console.log;
var app = express();


setTimeout(function () {
    //var backgrounds = require('./modules/background_process');
},10000);



global.pool = require('./libs/mysqlConnect');
global.models = [];
global.classes = {};
global.classesCache = {};
global.requiredClasses = {};
global.downloads = {};

global.times = {
    start_system:moment(),
    log_time:0
};

process.on('exit', function(code) {
    console.log('process exit', code);
    pool.end(function(err){
        console.log('poolEnd');
        console.log(err);
    });
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
var HttpError = require('./error').HttpError;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
var osObj = require('os');
global.platform = osObj.platform();
require('dns').lookup(osObj.hostname(), function (err, add, fam) {
    console.log('addr: '+add);
});
var sessionStore = require('./libs/sessionStore');
app.use(session({
    secret: config.get('session:secret'),
    key: config.get('session:key'),
    cookie: config.get('session:cookie'),
    store: sessionStore,
    resave: true,
    saveUninitialized: true
}));
app.use(require('./middleware/sendHttpError'));
app.use(require('./middleware/globalFuncs'));

require('./routes')(app);

/**/
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: function(res, path) {
        res.set({
            'Access-Control-Allow-Origin': '*'
        })
    }
}));


// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {

}
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    console.log(err.stack);
    res.render('error', {
        message: err.message,
        error: err
    });
});
console.log('-------------------------------------------------');
console.log('SERVER STARTED');

//автозакртыие исполненых заявок
//проставление статуса "просрочено" заявкам ппр
setTimeout(() => {
    var async = require('async');
    var User = require('./classes/User');
    var sys_user = new User({ name:'user' });

    const QUANTITY_MS_DAY= 86400000;
    //модуль автозакртыия обычных заявок
    const BJRequestWork = require('./modules/bj_request_work');
    const automaticClosingRequestWork = new BJRequestWork({user: sys_user})
    //модуль по работе с заявками ппр
    //(в данном блоке будет использоваться только метод по автоматическому проставлению статуса "просрочено"
    //всеи заявкам, что не выполнены в срок)
    let request_ppr_jobs = require('./modules/request_ppr').request_ppr
    async.series({
        loadSysUser: cb => {
            sys_user.loadSysUser(cb);
        },
        jobs: cb => {
            function wrapper_jobs_ppr (sys_user) {
                request_ppr_jobs.autoExpiredQuery(sys_user, (err, res) => {
                    console.log(err, res)
                })
                request_ppr_jobs.activateQuery(sys_user, (err, res) => {
                    console.log(err, res)
                })
            }
            function wrapper_jobs_request_work () {
                automaticClosingRequestWork.init()
            }

            async.parallel({
                callJobsAfterStartServer: cb => {
                    // wrapper_jobs_ppr(sys_user)
                    // wrapper_jobs_request_work()
                    //cb(null)
                    setTimeout(()=>{
                        console.log('callJobsAfterStartServer')
                        wrapper_jobs_ppr(sys_user)
                        wrapper_jobs_request_work()
                    },60000 * 60) // hour
                    // },6000) // hour
                    cb(null)
                },
                automaticClosingRequestWork: cb => {
                    setInterval(() => {
                        wrapper_jobs_request_work()
                    }, QUANTITY_MS_DAY)
                },
                autoExpiredQuery: cb => {
                    //таймаут постален, чтобы эти процессы выполнялись не одновременно
                    setTimeout(() => {
                        setInterval(() => {
                            wrapper_jobs_ppr()
                        }, QUANTITY_MS_DAY)
                    }, 300000)
                }
            })
        }
    })
}, 3000)


//разовое выполнекение, используется для загузки ролей в тип организации
// setTimeout(() => {
//     var async = require('async');
//     var User = require('./classes/User');
//     var sys_user = new User({ name:'user' });
//     let ConformityRolesTypes = require('./modules/role_for_org_type_conformity');
//
//     async.series({
//         loadSysUser: cb => {
//             sys_user.loadSysUser(cb);
//         },
//         conformityInit: cb => {
//             let conformity = new ConformityRolesTypes(sys_user);
//             conformity.init(res => {
//                 cb(res)
//             })
//         }
//     }, (err, res) => {
//         debugger
//     })
// }, 3000)



// const QUANTITY_MS_DAY= 6000;
//
// setTimeout(() => {
//     // return
//     var async = require('async');
//     var User = require('./classes/User');
//     var sys_user = new User({ name:'user' });
//
//
//     let request_work_jobs = undefined
//     let request_ppr_jobs = require('./modules/request_ppr').request_ppr
//
//
//
//
//     async.series({
//         loadSysUser: cb => {
//             sys_user.loadSysUser(cb);
//         },
//         initJobs: cb => {
//             async.parallel({
//                 requestWork: cb => {
//                     request_work_jobs = new RequestWork({
//                         user: sys_user
//                     }, res => {
//                         if (res) return cb(null)
//                         cb(null)
//                     })
//                     // request_work_jobs = new RequestWork({
//                     //
//                     // })
//                     // request_work_jobs = new BJRequestWork({
//                     //     user: sys_user
//                     // }, res => {
//                     //     if (res) return cb(null)
//                     //     cb(null)
//                     // })
//                 },
//                 requestPPR: cb => {
//                     cb(null)
//                 }
//             }, (err, res) => {
//                 if (err) return cb(err)
//                 cb(null)
//             })
//         },
//         setIntervalJobs: cb => {
//             async.parallel({
//                 // requestWork: cb => {
//                 //     async.parallel({
//                 //         request_work: cb => {
//                 //             setInterval(() => {
//                 //                 request_work_jobs.automaticClosingRequestWork(res => {
//                 //                     cb(null)
//                 //                 })
//                 //             }, QUANTITY_MS_DAY)
//                 //         },
//                 //         request_ppr: cb => {
//                 //             setInterval(() => {
//                 //                 request_work_jobs.automaticClosingVisitAndParking(res => {
//                 //                     cb(null)
//                 //                 })
//                 //             }, QUANTITY_MS_DAY)
//                 //         }
//                 //     }, cb)
//                 // },
//                 requestPPR: cb => {
//                     setInterval(() => {
//                         async.series({
//                             // formationPPR: cb => {
//                             //     request_ppr_jobs.formationQuery(sys_user,res => {
//                             //         cb(res)
//                             //     })
//                             // },
//                             activatePPR: cb => {
//                                 request_ppr_jobs.activateQuery(sys_user, res => {
//                                     cb(res)
//                                 })
//
//                             },
//                             autoExpiredQuery: cb => {
//                                 request_ppr_jobs.autoExpiredQuery(sys_user, res => {
//                                     cb(res)
//                                 })
//                             }
//                         }, (err, res) => {
//                             if (err) return cb(null)
//                         })
//                     }, QUANTITY_MS_DAY)
//                 }
//             }, (err, res) => {
//                 //TODO тут вс падает каждый тик
//                 if (res) return cb(res)
//                 cb(null)
//             })
//         }
//     })
// }, 3000)
//
// // request_work_jobs.formationQuery()
// setTimeout(function () {
//     var async = require('async');
//     var User = require('./classes/User');
//     var sys_user = new User({ name:'user' });
//     async.series({
//         loadSysUser: function (cb) {
//             sys_user.loadSysUser(cb);
//         },
//         startBJ: function (cb) {
//             const fs = require("fs");
//             // setInterval(()=>{
//                 fs.appendFile("time.txt", ' \n app.js: ' + Date() , (error)=>{});
//                 // jobs.requestPPR.formationQuery(sys_user);
//                 // setTimeout(() => {
//                 // jobs.requestPPR.activateQuery(sys_user);
//                 // }, 3000)
//             // }, 6000)
//         }
//     });
//     // setInterval(function () { jobs.requestPPR.formationQuery(sys_user); },1000)
//
// },500);

module.exports = app;
