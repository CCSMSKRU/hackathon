var api = require('../libs/api');
var async = require('async');
const fs = require("fs");
const moment = require("moment");

const requestPPR = {
    //
    // //методы для формирования ППР
    // addPPR: function (res) {
    //     fs.appendFile("deb.txt", 'ADDPPD:\n' +JSON.stringify(res.newRequestPPR) + '\n\n\n\n\n', (error)=>{});
    //     for (let i in res.newRequestPPR) {
    //         // TODO не работает, если выполнять параллельно
    //         // async.parallel([
    //         async.series([
    //             (cbReglamentEquip) => {
    //
    //                 console.log(res.newRequestPPR[i])
    //                 const id = res.newRequestPPR[i].id;
    //                 let o = {
    //                     command: 'get',
    //                     object: 'reglament_r_equipment',
    //                     params: {
    //                         where: [
    //                             {
    //                                 key: 'id',
    //                                 val1: id
    //                             }
    //                         ],
    //                         collapseData: false
    //                     }
    //                 };
    //                 console.log(JSON.stringify(o), this.user);
    //                 api(o, function(err, resApi) {
    //                     console.log(JSON.stringify(o));
    //                     res.newRequestPPR[i].weeks = resApi[0].weeks;
    //                     cbReglamentEquip(null)
    //                 }, this.user)
    //             },
    //             (cbDescHour) => {
    //                 const id = res.newRequestPPR[i].system_reglament_work_id;
    //                 let o = {
    //                     command: 'get',
    //                     object: 'system_reglament_work',
    //                     params: {
    //                         where: [
    //                             {
    //                                 key: 'id',
    //                                 val1: id
    //                             }
    //                         ],
    //                         collapseData: false
    //                     }
    //                 };
    //                 api(o, function (err, resApi) {
    //                     // fs.appendFile("deb.txt", ':103 \n ' +JSON.stringify({o: o, resApi: resApi}) + '\n\n\n\n\n', (error)=>{});
    //                     const a = {
    //                         'resApi': resApi,
    //                         'o': o,
    //                         'err': err
    //                     }
    //                     fs.appendFile("time.txt", '\n' + JSON.stringify(a), (error)=>{});
    //                     res.newRequestPPR[i].reglament_working_hour = resApi[0].working_hour;
    //                     res.newRequestPPR[i].reglament_description = resApi[0].description;
    //                     cbDescHour(null)
    //
    //
    //                 },this.user);
    //             }, //get reglament_description, reglament_working_hour
    //             (cbLocation) => {
    //                 const id = res.newRequestPPR[i].equipment_id;
    //                 let o = {
    //                     command: 'get',
    //                     object: 'equipment',
    //                     params: {
    //                         where: [
    //                             {
    //                                 key: 'id',
    //                                 val1: id
    //                             }
    //                         ],
    //                         collapseData: false
    //                     }
    //                 };
    //                 api(o, function (err, resApi) {
    //                     // fs.writeFile("deb.txt", JSON.stringify(resApi) + '\n\n\n\n\n', (error)=>{});
    //                     res.newRequestPPR[i].object_location_id = resApi[0].object_location_id;
    //                     cbLocation(null)
    //                 }, this.user);
    //             }, //get location_id
    //             (cbGetObjectId) => {
    //                 async.waterfall([
    //                     (cbGetEquipment) => {
    //                         const id = res.newRequestPPR[i].equipment_id;
    //                         let o = {
    //                             command: 'get',
    //                             object: 'equipment',
    //                             params: {
    //                                 where: [
    //                                     {
    //                                         key: 'id',
    //                                         val1: id
    //                                     }
    //                                 ],
    //                                 collapseData: false
    //                             }
    //                         };
    //                         console.log('-------------------------------', o)
    //                         api(o, function (err, resApi) {
    //                             // fs.appendFile("deb.txt", ':103 \n ' +JSON.stringify({o: o, resApi: resApi}) + '\n\n\n\n\n', (error)=>{});
    //                             cbGetEquipment(null, resApi)
    //                         }, this.user);
    //                     },
    //                     (resBefcb, cbGetObjectSystem) => {
    //                         const id = resBefcb[0].object_system_id;
    //                         let o = {
    //                             command: 'get',
    //                             object: 'object_system',
    //                             params: {
    //                                 where: [
    //                                     {
    //                                         key: 'id',
    //                                         val1: id
    //                                     }
    //                                 ],
    //                                 collapseData: false
    //                             }
    //                         };
    //                         api(o, function (err, resApi) {
    //                             cbGetObjectSystem(null, resApi)
    //                         }, this.user);
    //                     },
    //                     (resBefcb, cbGetObject) => {
    //                         const id = resBefcb[0].group_system_id;
    //                         let o = {
    //                             command: 'get',
    //                             object: 'group_system',
    //                             params: {
    //                                 where: [
    //                                     {
    //                                         key: 'id',
    //                                         val1: id
    //                                     }
    //                                 ],
    //                                 collapseData: false
    //                             }
    //                         };
    //                         api(o, function (err, resApi) {
    //                             // fs.appendFile("deb.txt", ':103 \n ' +JSON.stringify({o: o, resApi: resApi}) + '\n\n\n\n\n', (error)=>{});
    //                             // console.log(res.newRequestPPR[i].object_id, resApi[0].object_id);
    //                             res.newRequestPPR[i].object_id = resApi[0].object_id;
    //                             cbGetObject(null, resApi);
    //                         }, this.user)
    //                     }
    //                 ], (cb) => {
    //                     cbGetObjectId(null)
    //                 })
    //             },//get object_id
    //         ], (cb) => {
    //             let o = {
    //                 command: 'add',
    //                 object: 'request_ppr_third',
    //                 params: {
    //                     reglament_r_equipment_id:  res.newRequestPPR[i].id,
    //                     equipment_id: res.newRequestPPR[i].equipment_id,
    //                     weeks: res.newRequestPPR[i].weeks,
    //                     reglament_name: res.newRequestPPR[i].system_reglament_work,
    //                     reglament_description: res.newRequestPPR[i].reglament_description, // need get
    //                     reglament_working_hour: res.newRequestPPR[i].reglament_working_hour, // need get
    //                     reglament_id: res.newRequestPPR[i].system_reglament_work_id,
    //                     location_id: res.newRequestPPR[i].object_location_id, //need get
    //                     object_id: res.newRequestPPR[i].object_id, //need get
    //                     is_active: false,
    //                     is_archived: false //need get
    //                 }
    //             };
    //             api(o, function (err, res) {},this.user);
    //         });
    //     }
    // },
    // removePPR: function (res) {
    //     fs.appendFile("deb.txt", 'DELPPR:\n' + JSON.stringify(res.forDeleteRequestPPR) + '\n\n\n\n\n', (error)=>{});
    //     for (let i in res.forDeleteRequestPPR) {
    //         let o = {
    //             command: 'remove',
    //             object: 'request_ppr_third',
    //             params:{
    //                 id: res.forDeleteRequestPPR[i].id
    //             }
    //         };
    //         api(o,(cb)=> {},this.user);
    //     }
    // },
    // changePropPPR: function(res) {
    //     fs.appendFile("deb.txt", 'CHANGEPPR:\n', (error)=>{});
    //     for (let i in res.created_obj_indexOfId) {
    //
    //         if(res.forDeleteRequestPPR[i]) continue
    //         // if(res.planned_obj_indexOfId[i]) continue
    //         async.waterfall([
    //             (cbReglamentEquip) => {
    //
    //                 const id = res.created_obj_indexOfId[i].reglament_r_equipment_id;
    //                 let o = {
    //                     command: 'get',
    //                     object: 'reglament_r_equipment',
    //                     params: {
    //                         where: [
    //                             {
    //                                 key: 'id',
    //                                 val1: id
    //                             }
    //                         ],
    //                         collapseData: false
    //                     }
    //                 };
    //                 console.log(JSON.stringify(o), this.user)
    //                 api(o, function(err, resApi) {
    //                     res.created_obj_indexOfId[i].weeks = resApi[0].weeks;
    //                     cbReglamentEquip(null, resApi)
    //                 }, this.user)
    //             },
    //             (resReglamentEquip,cbDescHour) => {
    //                 // console.log(oo)
    //                 const systemReglamentWorkId = resReglamentEquip[0].system_reglament_work_id;
    //                 let o = {
    //                     command: 'get',
    //                     object: 'system_reglament_work',
    //                     params: {
    //                         where: [
    //                             {
    //                                 key: 'id',
    //                                 val1: systemReglamentWorkId
    //                             }
    //                         ],
    //                         collapseData: false
    //                     }
    //                 };
    //                 // const oo = o;
    //                 console.log(JSON.stringify(o), this.user)
    //                 api(o, function (err, resApi) {
    //                     const a = {
    //                         'resApi': resApi,
    //                         'o': o,
    //                         'err': err
    //                     }
    //                     fs.appendFile("time.txt", '\n' + JSON.stringify(a), (error)=>{});
    //                     // try {
    //                     res.created_obj_indexOfId[i].reglament_working_hour = resApi[0].working_hour;
    //                     res.created_obj_indexOfId[i].reglament_description = resApi[0].description;
    //                     res.created_obj_indexOfId[i].system_reglament_work = resApi[0].name;
    //                     res.created_obj_indexOfId[i].system_reglament_work_id = resApi[0].id;
    //
    //                     cbDescHour(null)
    //                     // } catch (err) {
    //                     //     fs.appendFile("time.txt", '\n\n\n  ERR: ' + JSON.stringify(a) + '\n\n\n\n\n\n', (error)=>{});
    //                     // }
    //                     // console.log(resApi, JSON.stringify(o), err)
    //                     // console.log(oo);
    //
    //                 }, this.user);
    //             }, //get reglament_description, reglament_working_hour
    //             (cbLocation) => {
    //                 const equipmentId = res.created_obj_indexOfId[i].equipment_id;
    //                 let o = {
    //                     command: 'get',
    //                     object: 'equipment',
    //                     params: {
    //                         where: [
    //                             {
    //                                 key: 'id',
    //                                 val1: equipmentId
    //                             }
    //                         ],
    //                         collapseData: false
    //                     }
    //                 };
    //                 api(o, function (err, resApi) {
    //                     res.created_obj_indexOfId[i].object_location_id = resApi[0].object_location_id;
    //                     cbLocation(null)
    //                 }, this.user);
    //             }, //get location_id
    //             (cbGetObjectId) => {
    //                 async.waterfall([
    //                     (cbGetEquipment) => {
    //                         const id = res.created_obj_indexOfId[i].equipment_id;
    //                         let o = {
    //                             command: 'get',
    //                             object: 'equipment',
    //                             params: {
    //                                 where: [
    //                                     {
    //                                         key: 'id',
    //                                         val1: id
    //                                     }
    //                                 ],
    //                                 collapseData: false
    //                             }
    //                         };
    //                         console.log('-------------------------------', o)
    //                         api(o, function (err, resApi) {
    //                             cbGetEquipment(null, resApi)
    //                         }, this.user);
    //                     },
    //                     (resBefcb, cbGetObjectSystem) => {
    //                         const id = resBefcb[0].object_system_id;
    //                         let o = {
    //                             command: 'get',
    //                             object: 'object_system',
    //                             params: {
    //                                 where: [
    //                                     {
    //                                         key: 'id',
    //                                         val1: id
    //                                     }
    //                                 ],
    //                                 collapseData: false
    //                             }
    //                         };
    //                         api(o, function (err, resApi) {
    //                             cbGetObjectSystem(null, resApi)
    //                         }, this.user);
    //                     },
    //                     (resBefcb, cbGetObject) => {
    //                         const id = resBefcb[0].group_system_id;
    //                         let o = {
    //                             command: 'get',
    //                             object: 'group_system',
    //                             params: {
    //                                 where: [
    //                                     {
    //                                         key: 'id',
    //                                         val1: id
    //                                     }
    //                                 ],
    //                                 collapseData: false
    //                             }
    //                         };
    //                         api(o, function (err, resApi) {
    //                             res.created_obj_indexOfId[i].object_id = resApi[0].object_id;
    //                             cbGetObject(null, resApi);
    //                         }, this.user)
    //                     }
    //                 ], (cb) => {
    //                     cbGetObjectId(null)
    //                 })
    //             },//get object_id
    //         ], (cb) => {
    //             let o = {
    //                 command: 'modify',
    //                 object: 'request_ppr_third',
    //                 params: {
    //                     id: res.created_obj_indexOfId[i].id,
    //                     reglament_r_equipment_id:  res.created_obj_indexOfId[i].reglament_r_equipment_id,
    //                     equipment_id: res.created_obj_indexOfId[i].equipment_id,
    //                     reglament_weeks: res.created_obj_indexOfId[i].weeks,
    //                     reglament_name: res.created_obj_indexOfId[i].system_reglament_work,
    //                     reglament_description: res.created_obj_indexOfId[i].reglament_description, // need get
    //                     reglament_working_hour: res.created_obj_indexOfId[i].reglament_working_hour, // need get
    //                     reglament_id: res.created_obj_indexOfId[i].system_reglament_work_id,
    //                     location_id: res.created_obj_indexOfId[i].object_location_id, //need get
    //                     object_id: res.created_obj_indexOfId[i].object_id, //need get
    //                     weeks: res.created_obj_indexOfId[i].weeks,
    //                     is_active: false,
    //                     is_archived: false //need get
    //                 }
    //             };
    //             api(o, function (err, res) {},this.user);
    //         });
    //     }
    //     fs.appendFile("deb.txt", '\n\n\n\n\n', (error)=>{});
    // },
    //
    // //формирование ППР
    // formationQuery: function (user) {
    //     // const _t = this;
    //     // this.user = user;
    //     // async.waterfall([
    //     //     // получение активных регламентных работ оборудования и получение всех неактивных и не архивных ППР
    //     //     (cbRequestPPR) => {
    //     //         let createdRequestsPPR, plannedRequestPPR;
    //     //         async.parallel([
    //     //             (cb) => {
    //     //                 let o = {
    //     //                     command: 'get',
    //     //                     object: 'request_ppr_third',
    //     //                     params: {
    //     //                         where: [
    //     //                             { key: 'is_active', type: '=',  val1: false},
    //     //                             { key: 'is_archived', type: '=',  val1: false },
    //     //                         ],
    //     //                         collapseData: false
    //     //                     }
    //     //                 };
    //     //                 api(o, function (err, res) {
    //     //                     createdRequestsPPR = res;
    //     //                     cb(null);
    //     //                 },user);
    //     //             },
    //     //             (cb) => {
    //     //                 let o = {
    //     //                     command: 'get',
    //     //                     object: 'reglament_r_equipment',
    //     //                     params: {
    //     //                         where: [
    //     //                             { key: 'is_active', val1: true },
    //     //                         ],
    //     //                         collapseData: false
    //     //                     }
    //     //                 };
    //     //                 api(o, function (err, res) {
    //     //                     plannedRequestPPR = res;
    //     //                     cb(null);
    //     //                 },user);
    //     //             }
    //     //         ], (cb) => {
    //     //             cbRequestPPR(null, {createdRequestsPPR: createdRequestsPPR, plannedRequestPPR: plannedRequestPPR})
    //     //         });
    //     //     },
    //     //     // формирование хэш-таблиц
    //     //     (res, cbRequestPPR) => {
    //     //         let planned_obj_indexOfId = {},
    //     //             created_obj_indexOfId = {},
    //     //             createdRequestsPPR = res.createdRequestsPPR,
    //     //             plannedRequestPPR = res.plannedRequestPPR;
    //     //
    //     //
    //     //         createdRequestsPPR.forEach(record => {
    //     //             created_obj_indexOfId[record.reglament_r_equipment_id] = {...record}
    //     //         });
    //     //
    //     //         plannedRequestPPR.forEach(record => {
    //     //             planned_obj_indexOfId[record.id] = {...record}
    //     //         });
    //     //
    //     //         cbRequestPPR(null, {
    //     //             planned_obj_indexOfId: planned_obj_indexOfId,
    //     //             created_obj_indexOfId: created_obj_indexOfId,
    //     //             plannedRequestPPR: plannedRequestPPR})
    //     //     },
    //     //     // сравнение двух хэш таблиц, чтобы найти недобавленные ППР и создание новой хэш-таблицы ППР, которые необходимо занести в бд
    //     //     // сравнение двух хэш таблиц, чтобы найти несуществующие регламентные работы и создание хэш-таблицы ППР, которые необходимо удалить их из ППР
    //     //     (res, cbRequestPPR) => {
    //     //         let newRequestPPR = {};
    //     //         for (let i in res.planned_obj_indexOfId) {
    //     //             if (!res.created_obj_indexOfId[i]) {
    //     //                 newRequestPPR[i] = res.planned_obj_indexOfId[i]
    //     //             }
    //     //         }
    //     //
    //     //         let forDeleteRequestPPR = {};
    //     //         for (let i in res.created_obj_indexOfId) {
    //     //             if (!res.planned_obj_indexOfId[i]) {
    //     //                 forDeleteRequestPPR[i] = res.created_obj_indexOfId[i]
    //     //             }
    //     //         }
    //     //         console.log(forDeleteRequestPPR)
    //     //         cbRequestPPR(null, {
    //     //             planned_obj_indexOfId: res.planned_obj_indexOfId,
    //     //             created_obj_indexOfId: res.created_obj_indexOfId,
    //     //             newRequestPPR: newRequestPPR,
    //     //             forDeleteRequestPPR: forDeleteRequestPPR,
    //     //             plannedRequestPPR: res.plannedRequestPPR,
    //     //         })
    //     //     },
    //     // ], (err, res) => {
    //     //     this.addPPR(res);
    //     //     this.removePPR(res);
    //     //     this.changePropPPR(res);
    //     //     console.log(res);
    //     // });
    // },
    // //активация существующих ППР
    // activateQuery: function (user) {
    //     moment.locale();
    //     let _t = this;
    //     //все ППР, кроме архивных
    //     _t.requestPPR = {
    //         allArr : [],
    //         NotActivatedArr: [],
    //         ActivatedArr: [],
    //         NotActivatedHT: {
    //             byReglamentEquipmentId: {
    //
    //             }
    //         },
    //         ActivatedHT: {
    //             byReglamentEquipmentId: {
    //
    //             }
    //         },
    //     };
    //     async.waterfall([
    //         (getQuery) => {
    //             let o = {
    //                 command: 'get',
    //                 object: 'request_ppr_third',
    //                 params: {
    //                     where: [
    //                         { key: 'is_active', type: '=',  val1: false},
    //                         { key: 'is_archived', type: '=',  val1: false},
    //                     ],
    //                     collapseData: false
    //                 }
    //             };
    //             api(o, (err, res) => getQuery(null, res), user);
    //         },
    //         (notActivatedPPR, cb) => {
    //             // перебор всех неактивизрованных ППР
    //             notActivatedPPR.forEach( (PPR, i, notActivatedPPR) => {
    //                 let weeks = PPR.weeks.replace(/[^0-9]/g, " ").replace(/  +/g, ' ').split(' ');
    //                 //перебор массива со списком недель итерируемой ППР
    //                 for (let j in weeks) {
    //                     // если в списке недель итерируемой ППР есть действующая неделя
    //                     if (weeks[j] == moment().isoWeek()) {
    //
    //                         //проверить: была ли на ЭТОЙ неделе активированна данная (reglament_r_equipment_id) ППР
    //                         let o = {
    //                             command: 'get',
    //                             object: 'request_ppr_third',
    //                             params: {
    //                                 where: [
    //                                     { key: 'reglament_r_equipment_id', type: '=', val1: PPR.reglament_r_equipment_id},
    //                                     { key: 'is_active', type: '=', val1: true},
    //                                     { key: 'year_activate', type: '=', val1: moment().format('YYYY')},
    //                                     { key: 'week_activate', type: '=',  val1: moment().isoWeek()}
    //                                 ],
    //                                 collapseData: false
    //                             }
    //                         };
    //                         api(o, (err, activatedPPR) => {
    //                             console.log(activatedPPR, err)
    //                             if(activatedPPR.length == 0) cb(null, PPR)
    //                         }, user);
    //                         // если нет, то активировать
    //                         break;
    //                     }
    //                 }
    //             });
    //             // notActivatedPPR.forEach( (PPR, i, notActivatedPPR) => {
    //             //     // let weeks = PPR.weeks().replace(/[^0-9]/g, " ").replace(/  +/g, ' ').split(' ');
    //             //     let weeks = PPR.weeks.replace(/[^0-9]/g, " ").replace(/  +/g, ',').split(',').map(function(el) {
    //             //         return { key: 'week_activate', type: '!=',  val1: el, comparsionType: 'AND', group: 'groupWeek'}
    //             //     });
    //             //     let o = {
    //             //         command: 'get',
    //             //         object: 'request_ppr_third',
    //             //         params: {
    //             //             where: [
    //             //                 { key: 'reglament_r_equipment_id', type: '=', val1: PPR.reglament_r_equipment_id},
    //             //                 { key: 'is_active', type: '=', val1: true},
    //             //                 { key: 'year_active', type: '=', val1: moment().format('YYYY')},
    //             //             ],
    //             //             collapseData: false
    //             //         }
    //             //     };
    //             //     o.params.where = o.params.where.concat(weeks)
    //             //
    //             //     // console.log(o)
    //             //     // api(o, (err, activatedPPR) => {
    //             //     //     activatedPPR
    //             //     // }, user);
    //             //     // console.log(PPR, i, notActivatedPPR)
    //             // })
    //         },
    //         (activatedPPR, cb) => {
    //             // console.log(activatedPPR.id)
    //             let o = {
    //                 command: 'modify',
    //                 object: 'request_ppr_third',
    //                 params: {
    //                     id: activatedPPR.id,
    //                     is_active: true,
    //                     week_activate: moment().isoWeek(),
    //                     year_activate: moment().format('YYYY')
    //                 }
    //             };
    //             api(o, (err, res) => {
    //                 console.log(res);
    //             }, user)
    //         },
    //     ], (err, res) => {
    //         console.log(res);
    //
    //     });
    // },
};
module.exports.requestPPR = requestPPR;
