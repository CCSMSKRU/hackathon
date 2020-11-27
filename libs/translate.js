/**
 * Created by iig on 17.07.2018.
 */
// var async = require('async');
const translate = require('google-translate-api');
var funcs = require('./functions');

var async = require('async');


/**
 * Найдет перевод в кеш или запросит перевод по API Google translate
 * Find a translation in the cache or request an API translation
 * @param obj
 * @param cb
 * @returns {*}
 */

module.exports = function(obj, cb){
    if (arguments.length == 1) {
        cb = arguments[0];
        obj = {};
    }
    if (typeof cb !== 'function') throw new MyError('В метод не передан cb');
    if (typeof obj !== 'object') return cb(new MyError('В метод не переданы obj'));

    var text = obj.text;
    var lang = obj.lang;
    if (!lang) return cb(null, {text: text});

    var api = require('../libs/api');
    var apiPrototype = api;
    api = function (o, cb) {
        apiPrototype(o, cb, obj.user);
    };


    async.series({
        load:function(cb){
            if (global.translations) return cb(null);
            global.translations = {};
            var o = {
                command:'load',
                object:'translate_cache',
                params:{}
            };
            api(o, function(err, res){
                if (err){
                    console.log('Failed to load the translation from the database', err, o);
                }
                cb(null);
            });
        },
        getTranslate:function(cb){
            if (!global.translations[lang]) global.translations[lang] = {};
            var alias = funcs.hashCode(text);
            if (global.translations[lang][alias]){
                return cb(null, global.translations[lang][alias]);
            }

            return cb(null, text); // Ignore error
            translate(text, {to: lang}).then(res => {
                global.translations[lang][alias] = res.text;

                // Call callback
                cb(null, res.text);
                // Save to DB after callback
                var o = {
                    command:'add',
                    object:'translate_cache',
                    params:{
                        lang:lang,
                        alias:alias,
                        text_:res.text
                    }
                };
                api(o, function(err, res){
                    if (err){
                        console.log('Failed to save the translation to the database', err, o);
                    }
                    // Do not do anything
                });
                ///////////////////////
            }).catch(err => {
                console.error('Error then translate text->', text, err);
                return cb(null, text); // Ignore error
            });
        }
    }, function(err, res){
        if (err){
            console.log(err);
        }
        return cb(null, res.getTranslate); // Ignore error
    });




};
