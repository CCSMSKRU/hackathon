/*
* Frame.js - complex cloud solutions, LLC
* This client-side class provides work with frames (frames (content only)) in the system, is responsible for obtaining,
* displaying and editing data.
* */

(function () {
	MB = MB || {};



    /**
	 * Class initialization, see params inside.
     * @param params
     * @constructor
     */
	MB.Frame = function (params) {

        // console.log('New frame init', params);

		this.id = params.id || MB.Core.guid();
		this.class = params.class;
		this.client_object = params.client_object;
		this.co_type = 'FRAME';
		this.container = params.container;

		// Переопределим find
		if (!this.container.hasClass('fn-child-frm-holder')) this.container.addClass('fn-child-frm-holder');
		// FIND
		this.container.findPrototype = this.container.find;
		this.container.find = (a)=>{
			return this.container.findPrototype(a).not(this.container.findPrototype('.fn-child-frm-holder *'));
		}
		// CHILDREN
		this.container.childrenPrototype = this.container.children;
		this.container.children = (a)=>{
			return this.container.childrenPrototype(a).not(this.container.findPrototype('.fn-child-frm-holder *'));
		}
		// // PARENTS
		// this.container.parentsPrototype = this.container.parents;
		// this.container.parents = (a)=>{
		// 	return this.container.parentsPrototype(a).not(this.container.parentsPrototype('.fn-child-frm-holder:first').parents('*'));
		// }
		// // PARENT
		// this.container.parentPrototype = this.container.parent;
		// this.container.parent = (a)=>{
		// 	return this.container.parentPrototype(a).not(this.container.parentsPrototype('.fn-child-frm-holder:first').parents('*'));
		// }
		if (debugMode) console.log('Для фрейма переопределенs методы jQuery find|children. Ищет только в своем контейнере исключая дочерние фреймы');

		if (!(this.container instanceof jQuery)) return new Error('в new Frame не передан контейнер или он не jQuery');
		// this.container.old_html = this.container.html();
		this.old_element = this.container.clone();
		this.old_html = this.container.html();
		this.name = params.name;
		this.type = params.type;
		this.attr = params.attr || {};
		// this.activeId = (params.ids && typeof params.ids === 'object' && params.ids[0] && !isNaN(+params.ids[0].replace(/\s/ig,'')))? +params.ids[0].replace(/\s/ig,'') : undefined;
		this.activeId = (()=>{
			if (!params.ids || typeof params.ids !== 'object' || !params.ids[0]) return undefined;
			if (params.ids[0] === 'new') return 'new';
			if (typeof params.ids[0] === 'string') return +params.ids[0].replace(/\s/ig,'');
			return +params.ids[0]

		})();
		// this.activeId = (params.ids && typeof params.ids === 'object' && params.ids[0])? (typeof params.ids[0] === 'string'? +params.ids[0].replace(/\s/ig,'') : +params.ids[0]) : undefined;
		if (!this.activeId && this.attr.new_if_not_id) this.activeId = 'new';
		this.parent = params.parent;
		// this.position = params.position || 'fullscreen';
		this.fields = [];
		this.changes = [];
		this.tblInstances = [];
		this.frmInstances = [];
		this.select3ids = [];
		this.params = params.params || {};
		this.add_params = params.add_params || {};
		this.isMaster = params.master || false;
		this.modalInstance = undefined;
		this.tablePKeys = params.tablePKeys;
		this.wysiwyg_list = [];
		this.scriptsLoaded = false;
		this.dont_open_after_add = params.dont_open_after_add || false;
		this.after_save_trigger = params.after_save_trigger || undefined;
        this.virtual_data = params.virtual_data || '';
        if (typeof this.virtual_data === 'object' && this.virtual_data !== null){
            for (var i in this.virtual_data) {
                this.coAndClass += i + this.virtual_data[i] + '_';
            }
        }
        this.doNotUseCache = params.doNotUseCache;
        // this.getParentField = function(field_name, perent_class, parent_co, instance){
		// 	field_name = field_name || 'id';
		// 	if (!perent_class) throw 'В метод getParentField не передан perent_class';
		// 	parent_co = parent_co || '';
        // 	if (!instance) instance = this;
		// 	var parent = instance.parent;
		// 	if (!parent) return null;
		// 	if (parent.class.toLowerCase() !== perent_class.toLowerCase() || parent.client_object.toLowerCase() !== parent_co.toLowerCase()){
		// 		return instance.getParentField(field_name, parent_class, parent_co, parent);
		// 	}
		// 	if (!parent.data || !parent.data.data) return null;
		// 	return (parent.data.data[0])? parent.data.data[0][field_name] : null;
		//
		// }
		// this.getParentId = function(perent_class, parent_co){
        // 	return this.getParentField('id', perent_class, parent_co);
		// }
	};



	MB.Frame.prototype.getParentField = function(field_name, perent_class, parent_co, instance){
		field_name = field_name || 'id';
		if (!perent_class) throw 'В метод getParentField не передан perent_class';
		parent_co = parent_co || '';
		if (!instance) instance = this;
		var parent = instance.parent;
		if (!parent) return null;
		if (parent.class.toLowerCase() !== perent_class.toLowerCase() || parent.client_object.toLowerCase() !== parent_co.toLowerCase()){
			return instance.getParentField(field_name, parent_class, parent_co, parent);
		}
		if (!parent.data || !parent.data.data) return null;
		return (parent.data.data[0])? parent.data.data[0][field_name] : null;

	};

	MB.Frame.prototype.getParentId = function(perent_class, parent_co){
		return this.getParentField('id', perent_class, parent_co);
	};

    /**
	 * Get instance data profile from server
     * @param name
     * @param callback
     * @returns {boolean}
     */
	MB.Frame.prototype.getProfile = function (obj, cb) {
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;
		var name = _t.name;
		if (!name) return cb(new MyError('Для фрейма незадано имя. Не будет инициирован',{frame:_t}));

		// if (localStorage.getItem('frame_' + name) !== null && !_t.doNotUseCache) {
		//
		// 	_t.profile = JSON.parse(localStorage.getItem('frame_' + name));
		//
		// 	return cb(null, _t);
		// }
		// Если не указан класс, то профайл будет пустой
		if (!_t.class){
			_t.profile = {};
			return cb(null);
		}
		// Если не закешировано или если не используем кэш
		var o = {
			command: 'getProfile',
			object: _t.class,
			client_object: _t.client_object
		};
		o.params = obj.params;

		// if (typeof _t.virtual_data === 'object') o.params = _t.virtual_data;

		socketQuery(o, function (r) {
			_t.profile = r;
			// localStorage.setItem('frame_' + name, JSON.stringify(r));
			return cb(null, _t);
		});
	};

    /**
	 * Get instance data from server
     * @param callback
     */
	MB.Frame.prototype.getData = function (obj, cb) {
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;

		// var activeIdStr = (isNaN(+_t.activeId)) ? "'" + _t.activeId + "'" : _t.activeId;
		if (!_t.activeId) return cb(null); // Пустой фрейм, без привязки к данным

		if (_t.activeId === 'new') {
			_t.data = 'new';
			_t.wasNew = true;
			if (typeof cb == 'function') {
				cb();
			}
			return;
		}

		var where = [];
		where.push({
			key:_t.profile['extra_data']['object_profile']['primary_key'],
			val1:_t.activeId
		})

		// if (_t.tablePKeys) {
		// 	for (var i in _t.tablePKeys['data_columns']) {
		// 		var wo = {
		// 			key: (typeof _t.tablePKeys['data_columns'][i] == 'object')? _t.tablePKeys['data_columns'][i][0] : _t.tablePKeys['data_columns'][i],
		// 			val1: (typeof _t.tablePKeys['data'][i] == 'object')? _t.tablePKeys['data'][i] : _t.tablePKeys['data'][i]
		// 		};
		// 		where.push(wo);
		// 	}
		//
		//
		// } else {
		// 	var wo2 = {
		// 		key: _t.profile['extra_data']['object_profile']['primary_key'],
		// 		val1: activeIdStr
		// 	};
		//
		// 	where.push(wo2);
		//
		// }

		var o = {
			command: 'get',
			object: _t.class,
			params: {
				where: where
			}
		};

		if(_t.client_object){
			o.client_object = _t.client_object;
		}

		socketQuery(o, function (r) {
			_t.data = r;
			_t.data_ = _t.data.data[0];
			cb(null);
		});

	};

    MB.Frame.prototype.getFieldByName = function(name){
        var _t = this;
        if (!_t.fields) return false;
        for (var i in _t.fields) {
            if (_t.fields[i].name === name) return _t.fields[i];
        }
        return false;
    }

	MB.Frame.prototype.setFieldValue = function(obj, cb){
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;
		if (!_t.fields) return cb(null);
		var column_name = obj.column_name;
		var field = _t.getFieldByName(column_name);

		var value = obj.val || obj.value;
		if (typeof value === 'undefined') return cb(null);
		if (!field) return cb(null);
		var field_profile = field.profile? field.profile[0] : false;
		switch (field_profile.type_of_editor) {
			case 'select2':
			case 'select2withEmptyValue':
			case 'select2FreeType':
				var now = {
					id:value,
					name:obj.name,
					sysname:obj.sysname,
				}
				var chO = {
					column_name: (field_profile['lov_return_to_column'] !== "") ? field_profile['lov_return_to_column'] : field_profile['column_name'],
					type: field_profile.type_of_editor,
					value: {
						value: now.id,
						selValue: now.id
					}
				};
				// if (_t.data !== "new") dataValue = _t.data.data[0][field_profile['column_name']];
				_t.addChange(chO);

				field.value = obj.name;

				// Enable/Disable depend_fields
				// if (typeof now.id === "undefined" || now.id === "") return;

				// var field_html = _t.createField(_t.populateFieldByName(field_profile.column_name),null);
				// _t.container.find(`.fn-field[data-column=${field_profile.column_name}]:first`).replaceWith(field_html);

				// field_profile.visible = false;
				_t.reSetDependField(field_profile['column_name'], now, cb, {reload_self:true});
				break;
			default:
				console.warn('Метод setFieldValue еще не реализован для этого типа поля', field_profile.type_of_editor);
				cb(null);
				break;
		}
		// if (field_profile.type_of_editor === 'select2') {
		//
		// }
		// _t.container.find(`.fn-field[data-column=${field_profile.column_name}] .select3-select:first`).click();




		return false;
	}
	/**
	 *
	 * @param obj
	 * @param cb
	 */
	MB.Frame.prototype.create = function (obj, cb) {
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;


		// const getData = await _t.getData()
		// Здесь будет лесенка функций, можно переписать на промисы но незачем ИМХО

		async.series({
			getProfile:cb => _t.getProfile({}, cb),
			getData:cb => _t.getData({}, cb),
			getTemplate:cb => _t.getTemplate({}, cb),
			getScript:cb => _t.getScript({}, cb),
			createContent:cb => _t.createContent({}, cb),
			createChildTablesSplited:cb => _t.createChildTablesSplited({}, cb),
			initControllers:cb => _t.initControllers({}, cb),
			createChildFrames:cb => _t.createChildFrames({}, cb),
            reSetDependField: cb => {
                // reSetDependField
				if (!_t.activeId) return cb(null);
				if (_t.activeId ==='new') return cb(null);
				async.eachSeries(Object.keys(_t.data.data[0]), function(i, cb){

					var kItem = _t.getProfileByName(i);
					var val = kItem.keyword? _t.getFieldByName(kItem.keyword).value : _t.data.data[0][i];
					if (typeof val === "undefined" || val === "") return cb(null);
					_t.reSetDependField(i, {id:val}, cb, {re_render:true, set_handlers:true, set_child:true});
				}, cb);
            },
			createButtons: cb => {
				if (!_t.buttons || typeof _t.buttons !== 'object') return cb(null);
				async.series({
					prepare:cb => {
					    if (typeof _t.buttons.prepare !== 'function') return cb(null);
						_t.buttons.prepare(cb);
					},
					createBtns:cb => {
						MB.Core.createButtons(_t);
						cb(null);
					}
				}, cb);

			},
			setHandlers:cb => _t.setHandlers({}, cb),
			afterLoad: cb => {
				if (typeof _t.afterLoad !== 'function') return cb(null);
				_t.afterLoad(function(cb2){
					if (typeof cb2 === 'function'){
						cb2(function(){
							cb(null);
						});
						return;
					}
					cb(null);
				})
			},
		}, function(err, res){
		    if (err) return cb(new MyError('При создании фрейма возниклиа ошибка.',{err:err, _t:_t}));
		    cb(null, _t);
		});

		// _t.getProfile({}, (err) => {
		// 	if (err) return cb(err);
		// 	_t.getData({}, (err)=>{
		// 		if (err) return cb(err);
		// 		_t.getTemplate({}, (err)=>{
		// 			if (err) return cb(err);
		// 			_t.createContent({}, (err)=>{
		// 				if (err) return cb(err);
		// 				_t.createChildTablesSplited({}, (err)=>{
		// 					if (err) return cb(err);
		// 					_t.initControllers({}, (err)=>{
		// 						if (err) return cb(err);
		// 						_t.getScript({}, (err)=>{
		// 							if (err) return cb(err);
		// 							// MB.Core.createButtons(_t);
		// 							_t.setHandlers({}, (err)=>{
		// 								if (err) return cb(err);
		// 								// Все готово
		// 								return cb(null, _t);
		// 							})
		// 						})
		// 					})
		// 				})
		// 			})
		// 		})
		// 	})
		// });

		// _t.getProfile(_t.name, function () {
		// 	_t.getData(function () {
		// 		_t.getTemplate(function () {
		// 			_t.createContent(function () {
		// 				//_t.createChildTables('', function () {
		// 				_t.createChildTablesSplited(function () {
		// 					_t.initControllers(function () {
		// 						MB.Frames.addFrame(_t);
		// 						_t.getScript(function () {
		// 							MB.Core.createButtons(_t);
		// 							_t.setHandlers(function () {
		// 								if (typeof callback == 'function') {
		// 									callback(_t);
		// 								}
		// 							});
		// 						});
		// 					});
		// 				});
		// 			});
		// 		});
		// 	});
		// });
	};

    /**
	 *
     * @param fieldName
     */
	MB.Frame.prototype.populateFieldByName = function (fieldName) {
		var _t = this,
			field = {};
		var idx = 0;
		field.profile = [];

		for (var i in _t.profile.data) {
			var item = _t.profile.data[i];
			if (item['column_name'] == fieldName) {

				field.profile.push(item);
				field.id = item.id;
				idx++;
				break;
			}

		}

		if (_t.activeId !== 'new') {
			field.value = _t.data.data[0][fieldName];
			// console.log('=====>', fieldName);
			field.selValue = (field.profile[0]['lov_columns'].length > 0)? _t.data.data[0][field.profile[0]['lov_columns'].split(',')[0]] : '';
		} else {
			field.value = '';
			field.selValue = '';
		}

		field.id = fieldName;
		field.name = fieldName;
		return field;
	};


	MB.Frame.prototype.afterReInitFields = function(cb) {
		cb()
	};

	/**
	 * init filed editors for each field by profile
	 * @param obj
	 * @param cb
	 * @returns {*}
	 */
	MB.Frame.prototype.initControllers = function (obj, cb) {
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;
		if (!_t.activeId) return cb(null); // Пустой фрейм, без привязки к данным

		var container = _t.container;

		let fields = obj.fields || _t.fields;
		async.eachSeries(fields, function(f, cb){
			var profData = f.profile[0];
		    async.series({
				doDependFunc:cb => {
				   	if (!profData.is_depend_where_func) return cb(null);

					var doDependFuncAlias = `prepareSelfWhere_${f.name}`;
					if (typeof _t[doDependFuncAlias] !== 'function') return cb(null);

					_t[doDependFuncAlias]({column_profile:profData, value:((f.value)? f.value.id : null)}, function(err, res){
						if (err) {
							console.error('Пользовательская функция по формированию (depend) where вернула ош.', err, doDependFuncAlias);
							return cb(err);
						}
						if (res && !Array.isArray(res)){
							console.error('Пользовательская функция по формированию (depend) where вернула некорректный результат. Должен быть массив типа where ( [{key:"",val1:""}] )', res, doDependFuncAlias);
							return cb(null);
						}
						f.depend_where = (Array.isArray(f.depend_where))? [...f.depend_where, ...res] : res;
						cb(null);
					})
				},
				// doDependProfileFunc:function(cb){
				// 	// Функция изменяющая профайл
				// 	var doDependFuncAlias = `prepareProfile_${d_Cname}`;
				// 	// console.log('doDependFuncAlias', doDependFuncAlias);
				// 	if (typeof _t[doDependFuncAlias] !== 'function') return cb(null);
				//
				// 	_t[doDependFuncAlias]({column_profile:self_profile, value:((value)? value.id : null)}, function(err, res){
				// 		if (err) {
				// 			console.error('Пользовательская функция по формированию (depend) where вернула ош.', err);
				// 			return cb(err);
				// 		}
				// 		if (res && typeof res !== 'object'){
				// 			console.error('Пользовательская функция по формированию (depend) where вернула некорректный результат. Должен быть массив типа where ( [{key:"",val1:""}] )', res);
				// 			return cb(null);
				// 		}
				// 		self_profile = {...self_profile, ...res};
				// 		cb(null);
				// 	})
				// },
				another:cb => {
					var depend_where = f.depend_where;

					var type = profData['type_of_editor'];
					var columnName = profData['column_name'];

					if (container.find('.fn-field[data-column="' + f.name + '"]').length > 0) {

						var parent = container.find('.fn-field[data-column="' + f.name + '"]');
						var checkboxWrapper = parent.find('.checkbox-wrapper');
						//var wysiwygWrapper = parent.find('.wysiwyg-wrapper');
						var selectWrapper = parent.find('.fn-select3-wrapper');
						var phoneInput = parent.find('input');

						var queryObject = f.profile[0]['lov_command'];
						var forSelectId = f.profile[0]['column_name'];
						var column_name = f.profile[0]['column_name'];
						var forSelectName = f.profile[0]['lov_columns'].split(',')[1];
						var return_id = f.profile[0]['return_id'];
						var return_name = f.profile[0]['return_name'];
						var forSelectViewName = f.profile[0]['reference_client_object'];
						var forSelectLovWhere = f.profile[0]['lov_where'];

						var selInstance = undefined;
						switch (type) {
							case 'text':
								break;
							case 'wysiwyg':
								tinymce.init({
									selector: '.wysiwyg-wrapper',
									height: 320,
									//language: 'ru',
									init_instance_callback: function (editor) {
										editor.on('KeyUp', function (e) {

											var block = $(editor.editorContainer).parents('.fn-field').eq(0);
											var columnName = block.attr('data-column');
											var type = block.attr('data-type');
											var dataValue = "";
											var value = editor.getContent();

											var chO = {
												column_name: columnName,
												type: type,
												value: {
													value: value,
													selValue: ''
												}
											};

											if (_t.data != "new") dataValue = _t.data.data[0][columnName];

											if (value != dataValue) {
												_t.addChange(chO);
											}
											else {
												_t.removeChange(chO);
											}


										});
									}
								});

								break;
							case 'select2':
								//class & column_name

								_t.select3({
									wrapper:            selectWrapper,
									column_name:        column_name,
									return_id:          return_id,
									return_name:        return_name,
									withSearch:         true,
									withEmptyValue:     false,
									absolutePosition:   true,
									isFilter:           false,
									// parentObject:       _t,
									value: {
										id: (f.selValue === '') ? 'empty' : f.selValue,
										name: (f.value === '') ? '' : f.value
									},
									default_where:depend_where,
									depend_value:f.depend_value
								});

								break;
							case 'select2withEmptyValue':
								_t.select3({

									wrapper:            selectWrapper,
									column_name:        column_name,
									return_id:          return_id,
									return_name:        return_name,
									withSearch:         true,
									withEmptyValue:     true,
									absolutePosition:   true,
									isFilter:           false,
									// parentObject:       _t,
									value: {
										id: (f.selValue == '') ? 'empty' : f.selValue,
										name: (f.value == '') ? '' : f.value
									},
									default_where:depend_where

									//id: MB.Core.guid(),
									//wrapper: selectWrapper,
									//getString: queryObject,
									//column_name: forSelectId,
									//view_name: forSelectViewName,
									//value: {
									//	id: (f.selValue == '') ? 'empty' : f.selValue,
									//	name: (f.value == '') ? '' : f.value
									//},
									//data: [],
									//isSearch: true,
									//fromServerIdString: forSelectId,
									//fromServerNameString: forSelectName,
									//searchKeyword: forSelectName,
									//withEmptyValue: true,
									//absolutePosition: true,
									//parentObject: _t,
									//dependWhere: (forSelectLovWhere.indexOf('[:') != -1) ? forSelectLovWhere : '',
									//profile_column_name: f.name
								})

								break;
							case 'select2FreeType':
								_t.select3({
									id :                MB.Core.guid(),
									wrapper:            selectWrapper,
									column_name:        column_name,
									return_id:          return_id,
									return_name:        return_name,
									withSearch:         true,
									withEmptyValue:     true,
									absolutePosition:   true,
									isFilter:           false,
									// parentObject:       _t,
									value: {
										id: (f.selValue == '') ? 'empty' : f.selValue,
										name: (f.value == '') ? '' : f.value
									},
									default_where:depend_where

								});

								break;
							case 'checkbox':
								checkboxWrapper.checkboxIt();
								break;
							case 'phone':
								phoneInput.phoneIt();
								break;
							default:
								break;
						}
					}
					cb(null);
				},
			}, cb);
		}, cb);

	};

    /**
	 * Create field editors, returns html
     * @param field
     * @returns {*}
     */
	MB.Frame.prototype.createField = function (field, depend_field_profile) {
		// console.log(field, depend_field_profile)
		// if (field.profile[0].hint) {
		// 	console.log(field)
		// 	debugger
		// }

		// debugger

		var _t = this;
		_t.fields.push(field);
		var html = '';
		var nameRu = field.profile[0]['name'];
		var typeOfEditor = field.profile[0]['type_of_editor'];

		var required = (field.profile[0]['required']) ? 'required' : '';

		// set required by field LOV_RETURN_TO_COLUMN required value;
		var returnToColumnValue = (field.profile[0]['lov_return_to_column'] != "") ? field.profile[0]['lov_return_to_column'] : field.profile[0]['column_name'];
		if (returnToColumnValue != "") {
			for (var i in _t.profile.data) {
				var fld = _t.profile.data[i];
				var cellName = fld['column_name'];
				if (returnToColumnValue == cellName) {
					if (fld['required']) {
						required = 'required';
					}
				}
			}
		}

		var isVisible = field.profile[0]['visible'];

		if (!isVisible) {
			return html;
		}

		// if (field.name === 'object_'){
		// 	debugger;
		// 	// field.profile[0]['depend_column'] = null;
		// }

        var depend_field = depend_field_profile? _t.getFieldByName(depend_field_profile.column_name) : false;
        // if (depend_field_profile && !depend_field){
        //     console.error('Некоректно задан depend_column',depend_field_profile, _t.fields);
        // }
        var depend_field_value = depend_field? depend_field.value : false;
        // var field_disable_by_depend = (depend_field_profile)? !depend_field_profile.value : false;
		var field_disable_by_depend = (depend_field_profile)? !(depend_field_value || depend_field_profile.value) : false;

		// doDependProfileFunc:function(cb){
		// 	// Функция изменяющая профайл
		// 	var doDependFuncAlias = `prepareProfile_${d_Cname}`;
		// 	// console.log('doDependFuncAlias', doDependFuncAlias);
		// 	if (typeof _t[doDependFuncAlias] !== 'function') return cb(null);
		//
		// 	_t[doDependFuncAlias]({column_profile:self_profile, value:((value)? value.id : null)}, function(err, res){
		// 		if (err) {
		// 			console.error('Пользовательская функция по формированию (depend) where вернула ош.', err);
		// 			return cb(err);
		// 		}
		// 		if (res && typeof res !== 'object'){
		// 			console.error('Пользовательская функция по формированию (depend) where вернула некорректный результат. Должен быть массив типа where ( [{key:"",val1:""}] )', res);
		// 			return cb(null);
		// 		}
		// 		kItem = {...self_profile, ...res};
		// 		cb(null);
		// 	})
		// },
		// if (field.profile[0].column_name === 'add_field_auto_number'){
		// 	debugger;
		// }

		// Выполним функцию prepareProfile для колонки (можно скрыть поле в зависимости от условий. ТОЛЬКО СИНХРОННЫЕ ФУНКЦИИ
		var doDependFuncAlias = `prepareProfile_${field.profile[0].column_name}`;
		var parent_depend_field = (field.profile[0].depend_column)? _t.getFieldByName(field.profile[0].depend_column) : null;
		var depend_sysname_field = (depend_field_profile)? _t.getFieldByName(depend_field_profile.column_name + '_sysname') : {};
		// var modified_profile = (typeof _t[doDependFuncAlias] !== 'function' || !parent_depend_field) ?
		// var modified_profile = (typeof _t[doDependFuncAlias] !== 'function' || !depend_field_profile) ?
		var modified_profile = (typeof _t[doDependFuncAlias] !== 'function') ?
			// {} : _t[doDependFuncAlias]({field:field, parent_field:parent_depend_field});
			{} : _t[doDependFuncAlias]({field:field, depend_field_profile:depend_field_profile || {}, depend_field:depend_field, depend_sysname_field:depend_sysname_field});



		// field.profile[0] = {...field.profile[0], ...modified_profile}; microsoft EDGE - suck balls, поэтому вариант ниже
		for (let i in modified_profile) field.profile[0][i] = modified_profile[i]


		// if (!field.profile[0]['visible']) return '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span></label><input type="text" class="fn-control" data-column="' + field.name + '" value="' + field.value + '" /></div>';
		if (!field.profile[0]['visible']) {
			// Сохраним значение и удалим из changes
			var ch = _t.getChangesByName(field.name);
			if (ch) field.stored_value = ch.value.value;
			_t.removeChange({column_name:field.name});
			return '<div style="display: none;" data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span></label><input type="text" class="fn-control" data-column1="' + field.name + '" value="asdsaad' + field.value + '" /></div>';
		}else if (field.profile[0].restore_stored_value){
			field.value = (typeof field.stored_value !== 'undefined')? field.stored_value : field.value;
		}


		if ((field.profile[0]['editable'] || ((_t.activeId !== 'new' && field.profile[0]['updatable']) || (_t.activeId === 'new' && field.profile[0]['insertable']))) && !field_disable_by_depend) {
            if (typeof field.value==='string'){
                field.value = field.value.replaceAll('"','&#34;');
            }


			let hint = '';
            if (required || field.profile[0]['hint']) {
				hint = '<i class="far fa-question-circle"></i> <div style="display: none" class="hint">'
				if (required) hint += 'Поле обязательно для заполнения. <br>'
				if (field.profile[0]['hint']) hint += field.profile[0]['hint']
				hint += '</div>'
			}
			switch (typeOfEditor) {
				case 'text':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><input type="text" class="fn-control" data-column="' + field.name + '" value="' + field.value + '" /></div>';
					break;
                case 'plain_text':
                    html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span> ' + hint + '</label><textarea class="fn-control" data-column="' + field.name + '" value="' + field.value + '" >' + field.value + '</textarea></div>';
                    break;
				case 'textarea':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><textarea class="fn-control" data-column="' + field.name + '" value="' + field.value + '">' + field.value + '</textarea></div>';
					break;
                case 'wysiwyg':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><textarea rows="10" class="fn-control wysiwyg-wrapper" data-column="' + field.name + '" value="' + field.value + '">' + field.value + '</textarea></div>';
                    //html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span></label><textarea class="fn-control wysiwyg-wrapper" data-column="' + field.name + '" value="' + field.value + '">' + field.value + '</textarea></div>';
                    break;
				case 'checkbox':
					var checkedClass = (field.value == 'true') ? 'checked' : '';
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label class="fn-checkbox-label">' + nameRu + ' <span class="required-star">*</span>' + hint + '</label><div data-id="' + MB.Core.guid() + '" data-type="inline" class="fn-control checkbox-wrapper ' + checkedClass + '" data-value="' + field.value + '" data-column="' + field.name + '" ></div></div>';
					break;
				case 'select2':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><div data-value="' + field.value + '" data-select-type="select2" data-column="' + field.name + '" class="fn-control fn-select3-wrapper"></div></div>';
					break;
				case 'select2withEmptyValue':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><div data-value="' + field.value + '" data-select-type="select2withEmptyValue" data-column="' + field.name + '" class="fn-control fn-select3-wrapper"></div></div>';
					break;
				case 'select2FreeType':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><div data-value="' + field.value + '" data-select-type="select2FreeType" data-column="' + field.name + '" class="fn-control fn-select3-wrapper"></div></div>';
					break;
				case 'datetime':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><input type="text" class="fn-control fn-datetime-wrapper" data-column="' + field.name + '" value="' + field.value + '" data-date-format="dd.mm.yyyy hh:ii:ss"></div>';
					break;
				case 'datetime_wo_sec':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><input type="text" class="fn-control fn-datetime-wrapper" data-column="' + field.name + '" value="' + field.value.substr(0, 16) + '" data-date-format="dd.mm.yyyy hh:ii"></div>';
					break;
				case 'date':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><input type="text" class="fn-control fn-date-wrapper" data-column="' + field.name + '" value="' + field.value + '" data-date-format="dd.mm.yyyy"></div>';
					break;
				case 'time':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span></label>' + hint + '<input type="text" class="fn-control fn-time-wrapper" data-column="' + field.name + '" value="' + field.value + '" data-date-format="hh:ii:ss"></div>';
					break;
				case 'colorpicker':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><input type="text" class="fn-control fn-colorpicker-wrapper" data-column="' + field.name + '" value="' + field.value + '" /><div class="fn-colorpicker-state" style="background-color: ' + field.value + '" ></div></div>';
					break;
				case 'iconpicker':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span></label>' + hint + '<button class="btn btn-secondary" role="iconpicker" data-icon="'+ field.value +'"></button></div>';
					break;
				case 'number':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><input type="number" class="fn-control" data-column="' + field.name + '" value="' + field.value + '" /></div>';
					break;
                case 'float2':
                    html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><input type="number" step="0.01" class="fn-control" data-column="' + field.name + '" value="' + field.value + '" /></div>';
                    break;
				case 'phone':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><input type="text" class="fn-control" data-column="' + field.name + '" value="' + field.value + '" /></div>';
					break;
				case 'File':
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span>' + hint + '</label><input type="text" class="fn-control fn-file-wrapper" data-column="' + field.name + '" value="' + field.value + '" /></div>';
					break;
				case 'image':
					let img = field.value ? (field.value.indexOf('upload/') > -1 ? '' : 'upload/') + field.value : '';
					html =
						`<div data-type="${typeOfEditor}" class="fn-field ${required}" data-column="${field.name}">
							<label>${nameRu}: <span class="required-star">*</span></label>
							<div class="field_image_wrapper gallery_wrapper ${field.value ? '' : 'empty'}">
								<div class="field_image_not_loaded">Нет изображения.</div>
								<div class="field_value gallery_image_wrapper gallery_image" style="background-image: url('${img}')"
								data-small-src='${img}' data-full-src='${img}'></div>
								<div class="field_image_overlap">
									<div class="load">
										<i class="fa fa-cloud-upload" aria-hidden="true"></i>
										<span>Загрузить</span>
									</div>
									<div class="remove">
										<i class="fa fa-trash" aria-hidden="true"></i>
										<span>Удалить</span>
									</div>
								</div>
							</div>
						</div>`;
					break;
				default:
					html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span></label><input type="text" class="fn-control" data-column="' + field.name + '" value="' + field.value + '" /></div>';
					break;
			}
		} else {
			if (_t.activeId === 'new' && !field_disable_by_depend) {
				html = '';
			} else {
                if(typeOfEditor == 'checkbox'){

                    var checksign = (field.value == true || field.value == 'true')? '<i class="fa fa-check fn-readonly-checkbox-sign"></i>' : '<i class="fa fa-times fn-readonly-checkbox-sign"></i>' ;

					html = '<div data-type="' + typeOfEditor + '" class="fn-field fn-readonly-field" data-value="' + field.value + '" data-column="' + field.name + '"><label>' + nameRu + ':</label><div class="fn-readonly">' + checksign + '</div></div>';
				}else if(typeOfEditor == 'percent'){
					html = '<div data-type="' + typeOfEditor + '" class="fn-field fn-readonly-field" data-value="' + field.value + '" data-column="' + field.name + '"><label>' + nameRu + ':</label><div class="readonlyCell percent-readonly" data-value="'+field.value+'"><div class="percent-readonly-bar" style="width:'+field.value+'%; background-color: '+ getPercentColor(field.value)+';"></div><div class="percent-readonly-text">'+field.value+'%</div></div></div>';
				}else{



					field.value = _t.escaping(field.value);

					html = '<div data-type="' + typeOfEditor + '" class="fn-field fn-readonly-field" data-value="' + field.value + '" data-column="' + field.name + '"><label>' + nameRu + ':</label><div class="fn-readonly">'
						+ (
							(field.value)? field.value : (
								(
									depend_field_profile && (
										field.profile[0]['editable'] || (
											_t.activeId==='new'? field.profile[0]['insertable'] : field.profile[0]['updatable']
										)
									)
								)? `Сперва укажите "${depend_field_profile.name}"` : '')
						)
						+ '</div></div>';
                }
			}
		}
		return html;

	};

	/**
	 * Get template html code from public/html/farmes/frame_name.html
	 * @param obj
	 * @param cb
	 */
	MB.Frame.prototype.getTemplate = function (obj, cb) {
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;

		if (_t.template && _t.activeId !== 'new') return cb(null);

		const folder = obj.folder || _t.folder || 'frames';
		var url = "html/" + folder + "/" + _t.name + "/" + _t.name + ".html";
		// var url2 = "html/forms/" + _t.name + "/" + _t.name + ".html";

		if (_t.activeId == 'new') { //&& _t.profile['OBJECT_PROFILE']['CHILD_CLIENT_OBJECT'] != ''
			url = "html/" + folder + "/" + _t.name + "/" + _t.name + "_add" + ".html";
		} else {
			url = "html/" + folder + "/" + _t.name + "/" + _t.name + ".html";
		}

		$.ajax({
			url: url,
			success: function (res, status, xhr) {
				_t.template = res;
				cb(null);
			},
			error: function (e) {
				return cb(new MyError('Не удалось подгрузить файл фрейма',{url:url, e:e, _t:_t}));
				// $.ajax({
				// 	url: url2,
				// 	success: function (res, status, xhr) {
				// 		_t.template = res;
				// 		if (typeof callback == 'function') {
				// 			callback();
				// 		}
				// 	}
				// });
			}
		});
	};

	/**
	 * Get frame custom script file from public/html/frames/frame_name.js
	 * @param obj
	 * @param cb
	 */
	MB.Frame.prototype.getScript = function (obj, cb) {
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;

		// if(_t.scriptsLoaded){
         //    if (typeof callback == 'function') {
         //        callback();
         //    }
		// 	return false;
		// }

		const folder = obj.folder || _t.folder || 'frames';
		var load = function (url) {
			$.ajax({
				crossDomain: true,
				dataType: "script",
				url: url,
				success: function () {

                    // _t.scriptsLoaded = true;

					cb(null);
				},
				error: function () {
					console.error('Frame. Script file not found', url);
					return cb(null);
				}
			});
		};

		MB.Frames.justLoadedId = _t.id;

		if (_t.activeId == 'new'){
			load("html/" + folder +"/" + _t.name + "/" + _t.name + "_add" + ".js");

		} else {
			load("html/" + folder +"/" + _t.name + "/" + _t.name + ".js");
		}

		// load("html/" + folder +"/" + _t.name + "/" + _t.name + ".js");

	};
	//////___CHILD_TABLES___////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Create child tables in form, using TableNew.js and classicTable.js methods
     * @param wrap
     * @param names
     * @param cb
     */
    MB.Frame.prototype.createOneChildTbls = function(wrap, names, cb){
    	if (arguments.length === 4){

			this.additional_params = arguments[0];
			wrap = arguments[1];
			names = arguments[2];
			cb = arguments[3];
		}
		this.additional_params = this.additional_params || {};
        var _t = this;

        // console.log('==================!!=========', wrap, names);

        var afterChildLoaded = $('#mw-' + _t.modalId).find('.afterChildLoaded'); // ХЗ че это..

        var childName = names;
        var tblInstances = [];

        var tabsTpl = '<div class="tabsParent sc_tabulatorParent floated">' +
            '<div class="tabsTogglersRow sc_tabulatorToggleRow">' +
            '{{#tabs}}' +
            '<div class="tabToggle sc_tabulatorToggler {{opened}}" dataitem="{{dataitem}}">' +
            '<span class="childObjectTabTitle" data-name="{{name}}" data-item="{{dataitem}}">{{{tab_title}}}</span>' +
            '</div>' +
            '{{/tabs}}' +
            '</div>' +

            '<div class="ddRow sc_tabulatorDDRow">' +
            '{{#tabContents}}' +
            '<div class="tabulatorDDItem noMinHeight noMaxHeight sc_tabulatorDDItem {{opened}}" dataitem="{{dataitem}}">' +
            '<div class="childObjectWrapper" data-item="{{dataitem}}"></div>' +
            '</div>' +
            '{{/tabContents}}' +
            '</div>' +
            '</div>';

        var singleTabTpl = '<div class="tabsParent sc_tabulatorParent floated">' +
            '<div class="ddRow sc_tabulatorDDRow">' +
            '{{#tabContents}}' +
            '<div class="tabulatorDDItem noMinHeight noMaxHeight sc_tabulatorDDItem {{opened}}" dataitem="{{dataitem}}">' +
            '<div class="childObjectWrapper" data-item="{{dataitem}}"></div>' +
            '</div>' +
            '{{/tabContents}}' +
            '</div>' +
            '</div>';


        if (childName && childName != '') {

            if (_t.activeId == 'new') {
                if (typeof cb == 'function') {
                    cb();
                }
                return;
            }


            var childsArr = childName.split(',');
            var childTbl = undefined;
            var mO = {
                tabs: [],
                tabContents: []
            };
            for (var i in childsArr) {
                var chld = childsArr[i];
                var chld_class = (chld.substring(0, chld.indexOf('.')).length > 0)? chld.substring(0, chld.indexOf('.')) : 'EMPTY';
                var chld_clinetObject = (chld.substr(chld.indexOf('.') + 1).length > 0)? chld.substr(chld.indexOf('.') + 1) : 'EMPTY';
				let _tData = (typeof _t.data ==='object')? _t.data.data[0] : false;
                childTbl = new MB.TableN({
                    id: MB.Core.guid(),
                    class: (chld_class != 'EMPTY')? chld_class : chld,
                    client_object: (chld_clinetObject != 'EMPTY')? chld_clinetObject : '',
                    parentObject: _t,
                    parent_id: !_tData? null : _t.additional_params.parent_id ||( (_t.activeId == 'new') ? 'new' : (isNaN(+_tData[_t.profile['extra_data']['object_profile']['primary_key']])) ? "'" + _tData[_t.profile['extra_data']['object_profile']['primary_key']] + "'" : _tData[_t.profile['extra_data']['object_profile']['primary_key']]),
					destroy_on_reload: _t.additional_params.destroy_on_reload
                });

                mO.tabs.push({
                    opened: (i == 0) ? 'opened' : '',
                    dataitem: i,
                    tab_title: '<i class="fa fa-spin fa-spinner"></i>',
                    name: chld
                });

                mO.tabContents.push({
                    opened: (i == 0) ? 'opened' : '',
                    dataitem: i
                });

                tblInstances.push(childTbl);
            }

            if (childsArr.length == 1) {
                wrap.html(Mustache.to_html(singleTabTpl, mO));
            } else {
                wrap.html(Mustache.to_html(tabsTpl, mO));
            }


            uiTabs();
            var idx = 0;
            var tabsTitlesArr = [];
            var tabsTitlesWrappers = wrap.find('.childObjectTabTitle');

            var toCreateArray = [];

            function tryCallback(idx) {
                if (idx == toCreateArray.length - 1) {
                    afterChildLoaded.animate({
                        opacity: 1
                    }, 500);
                    if (typeof cb == 'function') {
                        cb();
//                        console.log('как будто бы отрисовал..');
                    }
                }
            }
            function syncCreateTables(item) {
                var instance = item.instance;
                var wrapper = item.wrapper;
                var currIdx = parseInt(item.idx);

                instance.create(wrapper, function (tblInstance) {
                    if(tblInstance == 'ERROR'){
                        tryCallback(currIdx);
                    }else{
                        _t.tblInstances.push(tblInstance);
                        if (childsArr.length == 1) {

                            tblInstance.ct_instance.wrapper.parents('.sc_tabulatorParent:first').find('.ct-environment-header').html(tblInstance.profile.extra_data['object_profile']['name_ru']);
                        } else {

                            tblInstance.ct_instance.wrapper.parents('.sc_tabulatorParent:first').find('.childObjectTabTitle[data-name="' + tblInstance.coAndClass + '"]').html(tblInstance.profile.extra_data['object_profile']['name_ru']);
                        }
                        for (var k in toCreateArray) {
                            var t = toCreateArray[k];
                            if (t.idx == toCreateArray.length - 1) {
                                tryCallback(currIdx);
                            } else {
                                if (currIdx == toCreateArray[k].idx) {
//                                console.log('Go Go next', toCreateArray[0], toCreateArray[1], currIdx+1);
                                    syncCreateTables(toCreateArray[currIdx + 1]);
                                }
                            }
                        }
                    }
                });
            }


            for (var i in tblInstances) {
                var inst = tblInstances[i];
                var instWrapper = wrap.find('.childObjectWrapper[data-item="' + i + '"]');
                var to = {
                    instance: inst,
                    wrapper: instWrapper,
                    idx: i
                };
                toCreateArray.push(to);
                if (idx == tblInstances.length -1) {
                    syncCreateTables(toCreateArray[0]);
                }
                idx++;
            }

        } else {
            if (typeof cb == 'function') {
                cb();
            }
        }


    };

	/**
	 * As createOneChildTbls, but provides inserting of tables to the different places in frame (places defined in markup)
	 * @param obj
	 * @param cb
	 * @returns {*}
	 */
    MB.Frame.prototype.createChildTablesSplited = function(obj, cb){
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;
		// if (!_t.activeId) return cb(null); // Пустой фрейм, без привязки к данным

		// return cb(null);




		var tbl_wrappers = _t.container.find('.fn-child-tbl-holder');
        var tblIdx = 0;

        function tryNextTbl(wrap){

            var tbls = wrap.attr('data-tbls');

            _t.createOneChildTbls(wrap, tbls, function(){
                tblIdx++;
                if(tblIdx < tbl_wrappers.length){
                    tryNextTbl(tbl_wrappers.eq(tblIdx));
                }
            });
        }

        tryNextTbl(tbl_wrappers.eq(tblIdx));

        if(typeof cb == 'function'){
            cb();
        }
    };

	/**
	 * reloadChildTbls Обновит все дочерние таблицы инстанса
	 * @param index
	 */
	MB.Frame.prototype.reloadChildTbls = function(obj, cb){
		if (arguments.length < 2){
			cb = obj || (()=>{});
			obj = {};
		}
		var _t = this;
		var __this = obj._t || _t;
		var instances = __this.tblInstances || _t.tblInstances;
		if (!instances) {
			console.warn('reloadChildTbls ==> Не существует instances');
			cb(new Error('reloadChildTbls ==> Не существует instances'));
			return;
		}
		(async function reloadChldTbls() {
			var reload = await (()=>{
				if (!instances.length) return;
				for (var ins in instances) {
					instances[ins].parent_id = _t.activeId;
					if (instances[ins].destroy_on_reload) {
						_t.destroyChildTbl(ins);
						continue;
					}
					instances[ins].reload({fromParentForm:true}, ()=> {});
				}
			})();
			var callback = await (()=>{

				cb(null, _t);
			})();
		})();

	};

	// destroyChildTbl
	MB.Frame.prototype.destroyChildTbl = function(index){
		this.additional_params = this.additional_params || {};
		var _t = this;
		var instance = _t.tblInstances[index];
		if (!instance) {
			console.warn('destroyChildTbl ==> Не существует таблицы', index);
			return;
		}
		// console.log('===destroyChildTbl=========', index, instance.id);
		_t.tblInstances.splice(index, 1);
		MB.Tables.removeTable(instance.id);
	};

    /**
	 * depricated
     * @param name
     * @param callback
     */
	MB.Frame.prototype.createChildTables = function (name, callback) {
		var _t = this;

		var childName = (name == '') ? _t.profile['extra_data']['object_profile']['child_client_object'] : name;

		var childObjectsWrapper = $('#mw-' + _t.modalId).find('.fn-child-objects-tabs-wrapper');
		var afterChildLoaded = $('#mw-' + _t.modalId).find('.afterChildLoaded');

		var tblInstances = [];

		var tabsTpl = '<div class="tabsParent sc_tabulatorParent floated">' +
			'<div class="tabsTogglersRow sc_tabulatorToggleRow">' +
			'{{#tabs}}' +
			'<div class="tabToggle sc_tabulatorToggler {{opened}}" dataitem="{{dataitem}}">' +
			'<span class="childObjectTabTitle" data-name="{{name}}" data-item="{{dataitem}}">{{{tab_title}}}</span>' +
			'</div>' +
			'{{/tabs}}' +
			'</div>' +

			'<div class="ddRow sc_tabulatorDDRow">' +
			'{{#tabContents}}' +
			'<div class="tabulatorDDItem noMinHeight noMaxHeight sc_tabulatorDDItem {{opened}}" dataitem="{{dataitem}}">' +
			'<div class="childObjectWrapper" data-item="{{dataitem}}"></div>' +
			'</div>' +
			'{{/tabContents}}' +
			'</div>' +
			'</div>';

		var singleTabTpl = '<div class="tabsParent sc_tabulatorParent floated">' +
			'<div class="ddRow sc_tabulatorDDRow">' +
			'{{#tabContents}}' +
			'<div class="tabulatorDDItem noMinHeight noMaxHeight sc_tabulatorDDItem {{opened}}" dataitem="{{dataitem}}">' +
			'<div class="childObjectWrapper" data-item="{{dataitem}}"></div>' +
			'</div>' +
			'{{/tabContents}}' +
			'</div>' +
			'</div>';


		if (childName != '') {
			if (_t.activeId == 'new') {
				if (typeof callback == 'function') {
					callback();
				}
				return;
			}
			var childsArr = childName.split(',');
			var childTbl = undefined;
			var mO = {
				tabs: [],
				tabContents: []
			};
			for (var i in childsArr) {
				var chld = childsArr[i];
                var chld_class = (chld.substring(0, chld.indexOf('.')).length > 0)? chld.substring(0, chld.indexOf('.')) : 'EMPTY';
                var chld_clinetObject = (chld.substr(chld.indexOf('.') + 1).length > 0)? chld.substr(chld.indexOf('.') + 1) : 'EMPTY';
				childTbl = new MB.TableN({
					id: MB.Core.guid(),
					class: (chld_class != 'EMPTY')? chld_class : chld,
					client_object: (chld_clinetObject != 'EMPTY')? chld_clinetObject : '',
					parentObject: _t,
					parent_id: _t.additional_params.parent_id || ( (_t.activeId == 'new') ? 'new' : (isNaN(+_t.data.data[0][_t.profile['extra_data']['object_profile']['primary_key']])) ? "'" + _t.data.data[0][_t.profile['extra_data']['object_profile']['primary_key']] + "'" : _t.data.data[0][_t.profile['extra_data']['object_profile']['primary_key']] ),
					destroy_on_reload: _t.additional_params.destroy_on_reload
				});

				mO.tabs.push({
					opened: (i == 0) ? 'opened' : '',
					dataitem: i,
					tab_title: '<i class="fa fa-spin fa-spinner"></i>',
					name: chld
				});

				mO.tabContents.push({
					opened: (i == 0) ? 'opened' : '',
					dataitem: i
				});

				tblInstances.push(childTbl);
			}

			if (childsArr.length == 1) {
				childObjectsWrapper.html(Mustache.to_html(singleTabTpl, mO));
			} else {
				childObjectsWrapper.html(Mustache.to_html(tabsTpl, mO));
			}


			uiTabs();
			var idx = 0;
			var tabsTitlesArr = [];
			var tabsTitlesWrappers = childObjectsWrapper.find('.childObjectTabTitle');

			var toCreateArray = [];

			function tryCallback(idx) {
				if (idx == toCreateArray.length - 1) {
					afterChildLoaded.animate({
						opacity: 1
					}, 500);
					if (typeof callback == 'function') {
						callback();
//                        console.log('как будто бы отрисовал..');
					}
				}
			}
			function syncCreateTables(item) {
				var instance = item.instance;
				var wrapper = item.wrapper;
				var currIdx = parseInt(item.idx);

				instance.create(wrapper, function (tblInstance) {

                    if(tblInstance == 'ERROR'){
                        tryCallback(currIdx);
                    }else{
                        _t.tblInstances.push(tblInstance);
                        if (childsArr.length == 1) {

                            tblInstance.ct_instance.wrapper.parents('.sc_tabulatorParent:first').find('.ct-environment-header').html(tblInstance.profile.extra_data['object_profile']['name_ru']);
                        } else {

                            tblInstance.ct_instance.wrapper.parents('.sc_tabulatorParent:first').find('.childObjectTabTitle[data-name="' + tblInstance.coAndClass + '"]').html(tblInstance.profile.extra_data['object_profile']['name_ru']);
                        }
                        for (var k in toCreateArray) {
                            var t = toCreateArray[k];
                            if (t.idx == toCreateArray.length - 1) {
                                tryCallback(currIdx);
                            } else {
                                if (currIdx == toCreateArray[k].idx) {
//                                console.log('Go Go next', toCreateArray[0], toCreateArray[1], currIdx+1);
                                    syncCreateTables(toCreateArray[currIdx + 1]);
                                }
                            }
                        }
                    }

				});
			}


			for (var i in tblInstances) {
				var inst = tblInstances[i];
				var instWrapper = childObjectsWrapper.find('.childObjectWrapper[data-item="' + i + '"]');
				var to = {
					instance: inst,
					wrapper: instWrapper,
					idx: i
				};
				toCreateArray.push(to);
				if (idx == _t.tblInstances.length) {
//                    console.log(toCreateArray);
					syncCreateTables(toCreateArray[0]);
				}
				idx++;
//
//                continue;
//
//                inst.create(instWrapper, function(tblInstance){
//                    _t.tblInstances.push(tblInstance);
//                    if(childsArr.length == 1){
//                        tblInstance.ct_instance.wrapper.parents('.sc_tabulatorParent').find('.ct-environment-header').html(tblInstance.profile['OBJECT_PROFILE']['CLIENT_OBJECT_NAME']);
//                    }else{
//                        tblInstance.ct_instance.wrapper.parents('.sc_tabulatorParent').find('.childObjectTabTitle[data-name="'+tblInstance.name+'"]').html(tblInstance.profile['OBJECT_PROFILE']['CLIENT_OBJECT_NAME']);
//                    }
//                    if(idx == _t.tblInstances.length){
//                        afterChildLoaded.animate({
//                            opacity: 1
//                        }, 500);
//                        if(typeof callback == 'function'){
//                            callback();
//                            console.log('как будто бы отрисовал..');
//                        }
//                    }
//                });
//                idx++;
			}
//            return;
//
//            var child = undefined;
//            var childWrapper = $('#mw-'+_t.modalId).find('.childObjectWrapper');
//
//
//            if(childName.length > 0){
//                child = new MB.TableN({
//                    id: MB.Core.guid(),
//                    name: childName,
//                    parentObject: _t,
//                    parent_id: _t.data.data[0][_t.data.data_columns.indexOf(_t.profile['OBJECT_PROFILE']['PRIMARY_KEY'])]
//                }).create(childWrapper, function(tblInstance){
//                        _t.tblInstance = tblInstance;
//                        afterChildLoaded.animate({
//                            opacity: 1
//                        }, 500);
//                        if(typeof callback == 'function'){
//                            callback();
//                            console.log('как будто бы отрисовал..');
//                        }
//                    });
//            }
		} else {
			if (typeof callback == 'function') {
				callback();
			}
		}
	};
	//////___CHILD_TABLES___END_////////////////////////////////////////////////////////////////////////////////////////



    /**
	 * Inserts primal values to template (without editor), look for {+{field_name}+} markup
     * @param html
     * @returns {*}
     */
	MB.Frame.prototype.insertNativeValues = function (html) {
		var _t = this;
		var fieldsArr = [];
		var keywordsArr = [];

		function populateArrays(tpl) {
			var start = tpl.indexOf('{+{');
			var end = tpl.indexOf('}+}');
			var keyword = tpl.substr(start + 3, ((end - 3) - start));

			if (start != -1) {
				keywordsArr.push(keyword);
				tpl = tpl.replace('{+{' + keyword + '}+}', '{-{' + keyword + '}-}');
			}
			for (var i in _t.fields) {
				var fld = _t.fields[i];
				if (fld.name == keyword) {
					fieldsArr.push(fld);
				}
			}
			if (start != -1) {
				populateArrays(tpl);
			}
		}

		populateArrays(html);

        // console.log('--->', fieldsArr, keywordsArr);


		for (var k in fieldsArr) {
			var fld = fieldsArr[k];
			var name = fld.name;
            var type = fld.profile[0].type;

			for (var h in keywordsArr) {
				var kw = keywordsArr[h];
				if (name === kw) {

					// 1234567890 => 1 234 567 890
					const value = (['number','bigint','int','float2'].indexOf(type) !== -1)?
						fld.value.toString().replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ')
						: fld.value;
					html = html.replace('{+{' + kw + '}+}', value);
				}
			}
		}

		function checkUnfilled() {
			var cutStart = html.indexOf('{+{');
			var cutEnd = html.indexOf('}+}');
			var keyword = html.substr(cutStart + 3, cutEnd - (cutStart + 3));
			html = html.replace('{+{' + keyword + '}+}', ' - ');
			if (html.indexOf('{+{') > -1) {
				checkUnfilled();
			}
		}

		if (html.indexOf('{+{') > -1) {
			checkUnfilled();
		}

		return html;
	};

	MB.Frame.prototype.getProfileByName = function(name){
		var _t = this;
		if (!_t.profile || !_t.profile.data) return false;
		for (var k in _t.profile.data) {
			if (_t.profile.data[k].column_name === name) return _t.profile.data[k];
		}
		return false;
	};

	/**
	 * Creates frame content with all editors using template, profile and data
	 * @param obj
	 * @param cb
	 */
	MB.Frame.prototype.createContent = function (obj, cb) {
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;
		var container = _t.container;

		if (!_t.activeId) { // Пустой фрейм, без привязки к данным. Контент выводится как есть
			container.html(_t.template);
			return cb(null);
		}

		// _t.modalId = _t.id;
		var mObj = {};



		var kItem, depend_field_profile;
		if (_t.activeId === 'new') {
			for (var k in _t.profile.data) {
				kItem = _t.profile.data[k];
				var kName = kItem['column_name'];
				depend_field_profile = (kItem.depend_column)? _t.getProfileByName(kItem.depend_column) : null;
				if (kItem.depend_column && !depend_field_profile) kItem.depend_column = null;
				mObj[kName] = _t.createField(_t.populateFieldByName(kName), depend_field_profile);
			}
		}else {
			for (var i in _t.data.data[0]) {
				kItem = _t.getProfileByName(i);
				depend_field_profile = (kItem && kItem.depend_column)? _t.getProfileByName(kItem.depend_column) : null;
				if (kItem && kItem.depend_column && !depend_field_profile) kItem.depend_column = null;
				mObj[i] = _t.createField(_t.populateFieldByName(i), depend_field_profile);

			}

		}

		var title_a = '';

		if(_t.activeId == 'new'){
			title_a = 'Создание ' + _t.profile['extra_data']['object_profile']['name_ru'].toLowerCase();
		}else{

			if(_t.data.data[0]){
				title_a = _t.profile['extra_data']['object_profile']['name_ru'] + ' : ' + ((_t.data.data[0]['name_ru'] || _t.data.data[0]['name'])? (_t.data.data[0]['name_ru'])? _t.data.data[0]['name_ru'] : _t.data.data[0]['name'] : '') +' ('+ _t.activeId+')';
			}else{
				title_a = _t.profile['extra_data']['object_profile']['name_ru'] + ' : ' + ' ('+ _t.activeId+')';
			}

		}




		container.html(_t.insertNativeValues(Mustache.to_html(_t.template, mObj)));
		_t.title = title_a;

		return cb(null);




		// if (_t.activeId === 'new') {
		// 	for (var k in _t.profile.data) {
		// 		var kItem = _t.profile.data[k];
		// 		var kName = kItem['column_name'];
		// 		mObj[kName] = _t.createField(_t.populateFieldByName(kName));
		// 	}
		// } else {
		// 	for (var i in _t.data.data[0]) {
		// 		mObj[i] = _t.createField(_t.populateFieldByName(i));
		// 	}
		// }


		// if (_t.wasNew && _t.newSaved) {
		// 	var modal = MB.Core.modalWindows.windows.getWindow(_t.modalId);
		// 	var wrapper = modal.wrapper;
		// 	wrapper.find('.mw-content-inner').html(_t.insertNativeValues(Mustache.to_html(_t.template, mObj)));
		//
        //     wrapper.find('.mw-insertIntoHeader').html(wrapper.find('.insertIntoHeader').html());
		//
		// 	if (typeof callback == 'function') {
		// 		callback();
		// 	}
		// } else {
		//
		// 	console.log('AAAAAAAAAAAAAAAAAAAA',_t);
		//
		// 	var title_a = '';
		//
		// 	if(_t.activeId == 'new'){
        //         title_a = 'Create ' + _t.profile['extra_data']['object_profile']['name_ru'].toLowerCase();
		// 	}else{
		//
		// 		if(_t.data.data[0]){
		// 			title_a = _t.profile['extra_data']['object_profile']['name_ru'] + ' : ' + ((_t.data.data[0]['name_ru'] || _t.data.data[0]['name'])? (_t.data.data[0]['name_ru'])? _t.data.data[0]['name_ru'] : _t.data.data[0]['name'] : '') +' ('+ _t.activeId+')';
		// 		}else{
		// 			title_a = _t.profile['extra_data']['object_profile']['name_ru'] + ' : ' + ' ('+ _t.activeId+')';
		// 		}
		//
		// 	}
		//
		//
		//
		// 	var modalWindow = MB.Core.modalWindows.init({
		// 		wrapper: undefined,
		// 		className: 'orderModal',
		// 		wrapId: _t.modalId,
		// 		resizable: true,
		// 		title: title_a,
		// 		status: '',
		// 		content: _t.insertNativeValues(Mustache.to_html(_t.template, mObj)),
		// 		bottomButtons: undefined,
		// 		startPosition: _t.position,
		// 		draggable: true,
		// 		top: 0,
		// 		left: 0,
		// 		waitForPosition: undefined,
		// 		active: true,
		// 		inMove: false,
		// 		minHeight: 700,
		// 		minWidth: 1300,
		// 		activeHeaderElem: undefined,
		// 		footerButton: undefined,
		// 		contentHeight: 0,
        //         formInstance: _t
		// 	}).render(function () {
		// 		_t.modalInstance = modalWindow;
		// 	});
		//
		// 	_t.container = MB.Core.modalWindows.windows.getWindow(_t.modalId).wrapper;
		//
        //     _t.container.find('.mw-insertIntoHeader').html(_t.container.find('.insertIntoHeader').html());
		//
		// 	if (typeof callback == 'function') {
		// 		//console.log('END- ', new Date(), new Date().getMilliseconds());
		// 		callback();
		// 	}
		// }
	};

    /**
	 * reload frame
     * @param callback
     */
	MB.Frame.prototype.reload = function (obj, callback) {
		if (!arguments.length) {
			callback = ()=>{};
			obj = {};
		}else if (arguments.length === 1) {
			callback = arguments[0];
			obj = {};
		}
		var _t = this;


		// debugger;
		// checkChanges
		if (_t.changes.length && !obj.confirm){
			bootbox.dialog({
				title: 'Обновить форму?',
				message: '<p>Есть несохраненные изменения. Если обновить форму, они будут потеряны.</p><p>Вы уверены что хотите обновить?</p>',
				buttons: {
					success: {
						label: 'Обновить',
						callback: function () {
							_t.reload({confirm:true}, callback);
						}
					},
					error: {
						label: 'Отменить',
						callback: function () {


							toastr['info']('Обновление формы отменено');

							if (typeof callback === "function") callback(null);

						}
					}
				}
			});
			return;
		}

		if (_t.activeId !== 'new') {
			_t.fields = [];
			var isFirstTimeAfterNew = (_t.wasNew && _t.newSaved);
			async.series({
				getData:cb => _t.getData({}, cb),
				getTemplate:cb => _t.getTemplate({}, cb),
				createContent:cb => _t.createContent({}, cb),
				createButtons: cb => {
					if (!_t.buttons || typeof _t.buttons !== 'object') return cb(null);
					async.series({
						prepare:cb => {
							if (typeof _t.buttons.prepare !== 'function') return cb(null);
							_t.buttons.prepare(cb);
						},
						createBtns:cb => {
							MB.Core.createButtons(_t);
							cb(null);
						}
					}, cb);

				},
				createChildTablesSplited:cb => _t.createChildTablesSplited({}, cb),
				initControllers:cb => _t.initControllers({}, cb),
				// reopenAndTrigger: cb => {
				// 	if (_t.dont_open_after_add){
				// 		_t.remove();
				// 	}
				// 	if (_t.after_save_trigger) {
				// 		$(document).trigger(_t.after_save_trigger, {id: _t.activeId});
				// 	}
				// 	cb(null);
				// },
				// getScript: cb => {
				// 	if (_t.doNotGetScript || isFirstTimeAfterNew) return cb(null);
				// 	_t.getScript({}, cb);
				// },
				createChildFrames:cb => _t.createChildFrames({}, cb),

				reSetDependField: cb => {
					if (!_t.activeId) return cb(null);
					if (_t.activeId ==='new') return cb(null);
					if (!_t.data.data[0]) return cb(null);
					async.eachSeries(Object.keys(_t.data.data[0]), function(i, cb){

						var kItem = _t.getProfileByName(i);
						var val = kItem.keyword? _t.getFieldByName(kItem.keyword).value : _t.data.data[0][i];
						if (typeof val === "undefined" || val === "") return cb(null);
						_t.reSetDependField(i, {id:val}, cb, {re_render:false, set_handlers:false, set_child:false});
					}, cb);
				},
				setHandlers:cb => _t.setHandlers({}, cb),
				// finish: cb => {
				// 	_t.wasNew = false;
				// 	_t.newSaved = false;
				// 	cb(null);
				// },
				afterReload: cb => {
					if (typeof _t.afterReload !== 'function') return cb(null);
					_t.afterReload(function(cb2){
						if (typeof cb2 === 'function'){
							cb2(function(){
								cb(null);
							});
							return;
						}
						cb(null);
					})
				},
				// createButtons: cb => {
				// 	MB.Core.createButtons(_t);
				// 	cb(null);
				// },
				// afterAdd: cb => {
				// 	if (!isFirstTimeAfterNew) return cb(null);
				// 	if (typeof _t.afterAdd !== 'function') return cb(null);
				// 	_t.afterAdd(function(cb2){
				// 		if (typeof cb2 === 'function'){
				// 			cb2(function(){
				// 				cb(null);
				// 			});
				// 			return;
				// 		}
				// 		cb(null);
				// 	})
				// }
			}, function(err, res){
				if (err) return callback(new MyError('При reload фрейма возниклиа ошибка.',{err:err, _t:_t}));
				// if (isFirstTimeAfterNew){
                //     var old = _t;
                //     _t =
                // }
				if (typeof callback === "function") callback(null);
			});




		} else {
			$(_t).trigger('update');

            if (typeof _t.afterReload === 'function'){
                _t.afterReload(function(cb){
                    if (typeof cb === 'function'){
                        cb(function(){
                            if (typeof callback == 'function') {
                                callback();
                            }
                        });
                        return;
                    }
                    if (typeof callback == 'function') {
                        callback();
                    }
                })
                return;
            }


			if (typeof callback == 'function') {
				callback();
			}
		}

	};

    /**
	 * toggle save button state
     */
	MB.Frame.prototype.enableSaveButton = function () {
		var _t = this;
		var wrapper = $('#mw-' + _t.id);
		var saveBtn = wrapper.find('.mw-save-frame');

		saveBtn.addClass('disabled');

		if (_t.parent && !(_t.parent.save_by_parent === false) && typeof _t.parent.enableSaveButton === 'function'){
            _t.parent.enableSaveButton();
        }

		if (_t.tblInstances.length > 0) {
			var totalChanged = 0;
			for (var ins in _t.tblInstances) {
				if (_t.changes.length > 0 || _t.tblInstances[ins].ct_instance.changes.length > 0) {
					totalChanged++;
				}
			}
			if (totalChanged > 0) {
				saveBtn.removeClass('disabled');
			}
		} else {
			if (_t.changes.length > 0) {
				saveBtn.removeClass('disabled');
			}
		}

	};

    /**
	 * adding field changes to form changes array
     * @param change
     */
	MB.Frame.prototype.addChange = function (change) {
		var _t = this;

		if (!change.type || !change.column_name) {
			return;
		}

		if (_t.changes.length > 0) {
			var isSame = 0;
			for (var i in _t.changes) {
				var ch = _t.changes[i];
				if (ch.column_name == change.column_name) {
					if (change.type.indexOf('select2') != -1) {
						ch.value.selValue = change.value.selValue;
						ch.value.value = change.value.value;
					} else {
						ch.value.value = change.value.value;
					}
					isSame++;
				}
			}
			if (isSame == 0) {
				_t.changes.push(change);
			}
		} else {
			_t.changes.push(change);
		}
		_t.enableSaveButton();
//        console.log(_t.changes);

	};

    /**
	 * remove field change form changes array
     * @param change
     */
	MB.Frame.prototype.removeChange = function (change) {
		var _t = this;
		var changes = _t.changes;

		if (changes.length) {
			for (var i = 0; i < changes.length; i++) {
				var ch = changes[i];
				if (ch.column_name == change.column_name) {
					changes.splice(i, 1);
				}
			}
		}

		if (!changes.length) _t.enableSaveButton();
	};

	MB.Frame.prototype.reSetDependField = function(columnName, value, cb, obj) {
		var _t = this;
		obj = obj || {};
        var reload_self = obj.reload_self;
        var re_render = obj.re_render;
        var set_child = obj.set_child;
        var set_handlers = obj.set_handlers;
		var dependens_fields = {};
		var self_profile = _t.getProfileByName(columnName);
		for (var i in _t.profile.data) {
			if (_t.profile.data[i].depend_column === columnName) dependens_fields[_t.profile.data[i].column_name] = _t.profile.data[i];
		}
		var kItem, depend_field_profile, field_html;

		// var arr = [];
		var arr = Object.keys(dependens_fields);
		if (reload_self) arr.push(columnName);

		async.eachSeries(arr, function(d_Cname, cb){
			kItem = (d_Cname === columnName)? self_profile : dependens_fields[d_Cname];
			depend_field_profile = (kItem.depend_column) ? _t.getProfileByName(kItem.depend_column) : null;
			if (depend_field_profile) depend_field_profile.value = value;
			if (kItem.depend_column && !depend_field_profile) kItem.depend_column = null;
			if (!(re_render===false)){
                field_html = _t.createField(_t.populateFieldByName(d_Cname), depend_field_profile);
                _t.container.find(`.fn-field[data-column=${d_Cname}]:first`).replaceWith(field_html);
            }
			var field = _t.getFieldByName(kItem.column_name);

			var depend_where;
			async.series({
				doDependFunc:function(cb){
					// depend_where = [{ // Example
					// 	key:'id',
					// 	type:'in',
					// 	val1:[1,2,3]
					// }]
					// return cb(null);
					var doDependFuncAlias = `prepareWhere_${d_Cname}`;
					// console.log('doDependFuncAlias', doDependFuncAlias);
					if (typeof _t[doDependFuncAlias] !== 'function') return cb(null);
					_t[doDependFuncAlias]({column_profile:self_profile, value:((value)? value.id : null)}, function(err, res){
					    if (err) {
					    	console.error('Пользовательская функция по формированию (depend) where вернула ош.', err);
					    	return cb(err);
						}
					    if (res && !Array.isArray(res)){
							console.error('Пользовательская функция по формированию (depend) where вернула некорректный результат. Должен быть массив типа where ( [{key:"",val1:""}] )', res);
							return cb(null);
						}
					    depend_where = res;
					    cb(null);
					})
				},
				// doDependProfileFunc:function(cb){
				// 	// Функция изменяющая профайл
				// 	var doDependFuncAlias = `prepareProfile_${d_Cname}`;
				// 	// console.log('doDependFuncAlias', doDependFuncAlias);
				// 	if (typeof _t[doDependFuncAlias] !== 'function') return cb(null);
				//
				// 	_t[doDependFuncAlias]({column_profile:self_profile, value:((value)? value.id : null)}, function(err, res){
				// 		if (err) {
				// 			console.error('Пользовательская функция по формированию (depend) where вернула ош.', err);
				// 			return cb(err);
				// 		}
				// 		if (res && typeof res !== 'object'){
				// 			console.error('Пользовательская функция по формированию (depend) where вернула некорректный результат. Должен быть массив типа where ( [{key:"",val1:""}] )', res);
				// 			return cb(null);
				// 		}
				// 		kItem = {...self_profile, ...res};
				// 		cb(null);
				// 	})
				// },
				initControllers:function(cb){
					var o = {
						fields: [{
							name: d_Cname,
							profile: [kItem],
							selValue: (field)? field.selValue : "",
							value: (field)? field.value : "",
							depend_where: depend_where,
							depend_value: (value)? value.id : undefined

						}]
					};
					_t.initControllers(o, cb);
				},
				setFieldHandlers:function(cb){
					if (set_handlers===false) return cb(null);
					_t.setFieldsHandlers({fields:[field]},cb);
				},
				reSetDependField: function(cb){
				    if (set_child === false || d_Cname===columnName || obj.doNotReSetDependField) return cb(null);
					_t.reSetDependField(d_Cname, null, cb);
				}
			}, cb);
			// _t.initControllers(o, function () {
			// 	_t.setHandlers(function () {
			// 		_t.reSetDependField(d_Cname, null, cb);
			// 	});
			// })
		}, function(err){
		    // if (!(set_handlers===false)){
		    //     _t.setHandlers({},function(err2){
		    //         if (err2) console.error('Ошибка в reSetDependField setHandlers', err2);
            //         if (typeof cb === 'function') cb(err);
            //         else if (err) console.error('Ошибка в reSetDependField', err);
            //     });
		    //     return;
            // }

			if (err) console.error('Ошибка в reSetDependField', err);

			if (typeof _t.afterReInitFields === 'function') {
				_t.afterReInitFields(function(cb2){
					if (typeof cb2 === 'function'){
						cb2(function(){
							cb(null);
						});
						return;
					}
					if (typeof cb === 'function') cb(err);
				})
			} else {
				if (typeof cb === 'function') cb(err);
			}

			// else if (err) console.error('Ошибка в reSetDependField', err);
		});

	}


	MB.Frame.prototype.select3 = function(params){
		var _t = this;
		if (!params || typeof params !=='object') {
			console.error('В Frame select3 некоректно переданы params. Должен быть объект');
			return;
		}
		if (!params.wrapper || !params.column_name){
			console.error('В Frame select3 в params не переданы обязательные поля: wrapper, column_name:',params.wrapper, params.column_name);
			return;
		}
		var select = MB.Core.select3.init({
			wrapper:            params.wrapper,
			column_name:        params.column_name,
			class:              params.class || _t.class,
			client_object:      params.class || _t.client_object,
			return_id:          params.return_id,
			return_name:        params.return_name,
			withSearch:         (typeof params.withSearch !== 'undefined')? params.withSearch : true,
			withEmptyValue:     (typeof params.withEmptyValue !== 'undefined')? params.withEmptyValue : true,
			absolutePosition:   (typeof params.absolutePosition !== 'undefined')? params.absolutePosition : true,
			isFilter:           (typeof params.isFilter !== 'undefined')? params.isFilter : false,
			// parentObject:       _t,
			value: params.value || {
				id: 'empty',
				name: ''
			},
			additionalClass:    params.additionalClass || '',
			default_where: params.default_where,
			depend_value: params.depend_value
		});
		_t.select3ids.push(select.id);
	}

	MB.Frame.prototype.setFieldsHandlers = function (obj, cb){
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;
		var fields = obj.fields || false;
		if (!Array.isArray(fields) || !fields.length) return cb(null);

		var elem;
		for (var i in fields) {
			var field = fields[i];
			let field_profile = field.profile[0];
			if (!field_profile) continue;

			// elem = _t.container.find(`.fn-field[data-column=${field_profile['column_name']}] .fn-control.fn-${field_profile.type_of_editor}-wrapper`);
			elem = _t.container.find(`.fn-field[data-column=${field_profile['column_name']}]`);

			switch (field_profile.type_of_editor) {
				case 'text':

					break;
				case 'plain_text':
				case 'textarea':

					elem.find('.fn-control').off('input').on('input', function () {
						var elem_ = _t.container.find(`.fn-field[data-column=${field_profile['column_name']}]`);
						var dataValue = "";

						var columnName = elem_.attr('data-column');
						var type = elem_.attr('data-type');
						var value = elem_.find('.fn-control').val();
						var chO = {
							column_name: columnName,
							type: type,
							value: {
								value: value,
								selValue: ''
							}
						};
						if (_t.data !== "new") dataValue = _t.data.data[0][columnName];
						if (value != dataValue) {
							_t.addChange(chO);
						}
						else {
							_t.removeChange(chO);
						}
					});

					break;
				case 'wysiwyg':

					break;
				case 'checkbox':

					break;
				case 'select2':
				case 'select2withEmptyValue':
				case 'select2FreeType':

					var selectId = _t.container.find(`.fn-field[data-column=${field.name}] .select3-wrapper`).attr('id');
					var selectInstance = MB.Core.select3.list.getSelect(selectId);

					// var block = $(elem).parents('.fn-field').eq(0);
					$(selectInstance).off('changeVal').on('changeVal', function (e, was, now) { //.off('changeVal')
						// var columnName = block.attr('data-column');
						var elem_ = _t.container.find(`.fn-field[data-column=${field_profile['column_name']}]`);
						var dataValue = "";


						var chO = {
							column_name: (field_profile['lov_return_to_column'] !== "") ? field_profile['lov_return_to_column'] : field_profile['column_name'],
							type: elem_.attr('data-type'),
							value: {
								value: now.id,
								selValue: now.id
							}
						};
						if (_t.data !== "new") dataValue = _t.data.data[0][field_profile['column_name']];
						if (now.name != dataValue) {
							_t.addChange(chO);
						} else {
							_t.removeChange(chO);
						}
						// Enable/Disable depend_fields
						// if (typeof now.id === "undefined" || now.id === "") return;
						_t.reSetDependField(field_profile['column_name'], now, function () {});
					});
					break;
				case 'datetime':
				case 'datetime_wo_sec':
				case 'date':
                case 'time':


                    // var $elem = $(elem);

                    var type_ = field_profile.type_of_editor;
                    var is_time = (type_ === 'datetime')? false : (type_ !== 'date');
                    var is_date = (type_ === 'datetime')? false : (type_ === 'date');
                    var is_datetime = (!is_date && !is_time); // Никакой класс не указан - полная дата


                    var default_datetime = (function (){
                        if (field.value){
                            var format = (is_time) ? "HH:mm:ss" : (is_date) ? "DD.MM.YYYY" : "DD.MM.YYYY HH:mm:ss";
                            return moment(field.value, format).format(format);
                        }
                        if (field_profile.default_datetime_value === 'now') return moment().format('DD.MM.YYYY HH:mm:ss');
                        if (field_profile.default_datetime_value === 'now_date') return moment().format('DD.MM.YYYY');
                        if (field_profile.default_datetime_value === 'now_datetime') return moment().format('DD.MM.YYYY HH:mm:ss');
                        if (field_profile.default_datetime_value) return moment(field_profile.min_datetime_value, 'DD.MM.YYYY HH:mm:ss').format('DD.MM.YYYY HH:mm:ss');
                        return false;
                    })();
                    var options = {
						dateFormat: (is_time) ? "H:i:S" : (is_date) ? "d.m.Y" : "d.m.Y H:i:S",
						formatDate: (date, format) => {
							var is_time = (field_profile.type_of_editor === 'datetime')? false : (field_profile.type_of_editor !== 'date');
							var is_date = (field_profile.type_of_editor === 'datetime')? false : (field_profile.type_of_editor === 'date');
							var is_datetime = (!is_date && !is_time);
							return (is_time) ? moment(date).format('HH:mm:ss') : (is_date) ? moment(date).format('DD.MM.YYYY') : moment(date).format('DD.MM.YYYY HH:mm:ss');
						},
						parseDate: (date, format) => {
							var is_time = (field_profile.type_of_editor === 'datetime')? false : (field_profile.type_of_editor !== 'date');
							var is_date = (field_profile.type_of_editor === 'datetime')? false : (field_profile.type_of_editor === 'date');
							var is_datetime = (!is_date && !is_time);
							return (is_time) ? moment(date, 'HH:mm:ss').toDate() : (is_date) ? moment(date, 'DD.MM.YYYY').toDate() : moment(date, 'DD.MM.YYYY HH:mm:ss').toDate();
						},
						enableTime: (is_time || is_datetime),
						time_24hr: true,
						enableSeconds: true,
						noCalendar: is_time,
						position:'auto',
						static:true,
						defaultDate:default_datetime,
						minDate:(function (){
							if (field_profile.min_datetime_value === 'now') return moment().format('DD.MM.YYYY HH:mm:ss');
							if (field_profile.min_datetime_value === 'now_date') return moment().format('DD.MM.YYYY');
							if (field_profile.min_datetime_value === 'now_datetime') return moment().format('DD.MM.YYYY HH:mm:ss');
							if (field_profile.min_datetime_value) return moment(field_profile.min_datetime_value, 'DD.MM.YYYY HH:mm:ss').format('DD.MM.YYYY HH:mm:ss');
							return false;
						})(),
                        maxDate:(function (){
                            if (field_profile.max_datetime_value === 'now') return moment().format('DD.MM.YYYY HH:mm:ss');
                            if (field_profile.max_datetime_value === 'now_date') return moment().format('DD.MM.YYYY');
                            if (field_profile.max_datetime_value === 'now_datetime') return moment().format('DD.MM.YYYY HH:mm:ss');
                            if (field_profile.max_datetime_value === 'add_3_months') return moment().add(3, 'M').format('DD.MM.YYYY HH:mm:ss');
                            if (field_profile.max_datetime_value) return moment(field_profile.min_datetime_value, 'DD.MM.YYYY HH:mm:ss').format('DD.MM.YYYY HH:mm:ss');
                            return false;
                        })(),
						onChange: (selectedDates, dateStr, instance) => {
							var elem_ = _t.container.find(`.fn-field[data-column=${field_profile['column_name']}]`);

							// var block = $(this).parents('.fn-field').eq(0),
							var is_time = (field_profile.type_of_editor === 'datetime')? false : (field_profile.type_of_editor !== 'date');
							var is_date = (field_profile.type_of_editor === 'datetime')? false : (field_profile.type_of_editor === 'date');
							var is_datetime = (!is_date && !is_time);

							var type = elem_.attr('data-type');
							var columnName = elem_.attr('data-column');
							var dataValue = (_t.data != "new") ? _t.data.data[0][columnName] : "";
							// var value = $(this).val();
							var format = (is_time) ? "HH:mm:ss" : (is_date) ? "DD.MM.YYYY" : "DD.MM.YYYY HH:mm:ss";
							var value = moment(dateStr, format).format(format);
							// if (value.length == 16) value += ':00'; // хз зачем это было
							var chO = {
								column_name: elem_.attr('data-column'),
								type: type,
								value: {
									value: value,
									selValue: ''
								}
							};
							if (value != dataValue) {
								_t.addChange(chO);
							} else {
								_t.removeChange(chO);
							}
						}
					};
                    var profile_options = (()=>{
                    	if (!field_profile.calender_options) return {};
                    	var r;
						try {
							r = JSON.parse(field_profile.calender_options);
						} catch (e) {
							r = {};
						}
						return r;
					})();



					// elem.find('.fn-control').flatpickr({...options, ...profile_options});

					let obj_flatpickr = options
					for (let i in profile_options) obj_flatpickr[i] = profile_options[i]
					elem.find('.fn-control').flatpickr(obj_flatpickr);

                    if (default_datetime){
                        var chO = {
                            column_name: field.name,
                            type: type_,
                            value: {
                                value: default_datetime,
                                selValue: ''
                            }
                        };
                        if (field.value != default_datetime) {
                            _t.addChange(chO);
                        } else {
                            _t.removeChange(chO);
                        }
                    }
					break;

				case 'colorpicker':

					break;
				case 'iconpicker':

					// alert(123)
					// html = '<div data-type="' + typeOfEditor + '" class="fn-field ' + required + '" data-column="' + field.name + '"><label>' + nameRu + ': <span class="required-star">*</span></label>' + hint + '<button class="btn btn-secondary" role="iconpicker" data-icon="'+ field.value +'"></button></div>';
					// res = '<button class="btn btn-secondary" role="iconpicker" data-icon="'+ params.value +'"></button>';
					break;
				case 'number':

					break;
				case 'float2':

					break;
				case 'phone':

					break;
				case 'File':

					break;
				case 'image':

					break;
				default:

					break;
			}
		}
		return cb(null);
	};

	/**
	 * all handlers
	 * @param obj
	 * @param cb
	 */
	MB.Frame.prototype.setHandlers = function (obj, cb) {

		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;
		var wrapper = _t.container;

		var getLovReturnToColumn = function(columnName) {
			for (var i in _t.profile.data) {
				var item = _t.profile.data[i];
				if (item['column_name'] == columnName) {
					return (item['lov_return_to_column'] != "") ? item['lov_return_to_column'] : item['column_name'];
				}
			}
		}

		async.series({
			setFieldsHandlers:cb => {
			    _t.setFieldsHandlers({
					fields:_t.fields
				}, cb);
			},
			another: cb => {

			    wrapper.find('.fn-field label').off('mouseenter').on('mouseenter', function(){

                    let label = $(this);
                    let parent = $(this).parents('.fn-field');
			        let col = parent.attr('data-column');

                    if(_t.data == 'new'){
                        return;
                    }

                    let col_index = _t.data.data_columns.indexOf(col);
			        let hint = _t.profile.data[col_index].hint;

			        let tpl = '<div class="hint">'+hint+'</div>';


			        if(hint.length > 0){
                        setTimeout(function(){

                            label.after(tpl);

                            setTimeout(function(){

                                parent.find('.hint').remove();

                            }, 3500)

                        }, 1000);

                    }

			    });

				wrapper.find('.fn-control.fn-file-wrapper').off('click').on('click', function () {
					var elem = $(this);
					var sVal = elem.val();
					var id = MB.Core.guid();
					var instance;
					if (!elem.attr('inited')) {
						instance = MB.Core.imageEditor.init({
							id: id,
							target: elem,
							src: sVal
						});

						$(instance).on('update', function (e) {
							var block = elem.parents('.fn-field').eq(0);
							var columnName = block.attr('data-column');
							var type = block.attr('data-type');
							var dataValue = "";
							var value = instance.data.name;
							var chO = {
								column_name: columnName,
								type: type,
								value: {
									value: value,
									selValue: ''
								}
							};

							elem.val(value);

							if (_t.data != "new") dataValue = _t.data.data[0][columnName];
							if (value != dataValue) {
								_t.addChange(chO);
							}
							else {
								_t.removeChange(chO);
							}
						});


						elem.attr('inited', "true");
						elem.attr('data-id', id);
					}
					else {
						instance = MB.Core.imageEditor.list.getItem( elem.data('id'));
						instance.open();
					}
				});

				wrapper.find('.field_image_overlap .load').off('click').on('click', function () {
					var elem = $(this);
					var block = elem.parents('.fn-field').eq(0);
					var columnName = block.attr('data-column');
					var type = block.attr('data-type');
					var image = elem.parents('.field_image_wrapper:first').find('.field_value');

					var fl = new ImageLoader({
						success: function (file) {
							image.css('background-image', `url('${file.params.dir + file.name}')`);

							var chO = {
								column_name: columnName,
								type: type,
								value: {
									value: file.name,
									selValue: ''
								}
							};
							_t.addChange(chO);

							elem.parents('.field_image_wrapper:first').removeClass('empty');
						}
					});

					fl.start();
				});

				wrapper.find('.field_image_overlap .remove').off('click').on('click', function () {
					var elem = $(this);
					var block = elem.parents('.fn-field').eq(0);
					var columnName = block.attr('data-column');
					var type = block.attr('data-type');
					var image = elem.parents('.field_image_wrapper:first').find('.field_value');
					image.css('background-image', `url('')`);

					var chO = {
						column_name: columnName,
						type: type,
						value: {
							value: '',
							selValue: ''
						}
					};
					_t.addChange(chO);

					elem.parents('.field_image_wrapper:first').addClass('empty');
				});

				wrapper.find('.mw-save-frame').off('click').on('click', function () {

					if ($(this).hasClass('disabled')) {
						return;
					}

					async.series({
						saveSelf:function(cb){
							_t.save(function (err) {
								if (err) return cb(new MyError('Ошибка сохранения',{err:err}));
								cb(null);
							});
						},
						saveChildTables:function(cb){
							async.eachSeries(_t.tblInstances, function(ins, cb){
								if (!ins.ct_instance.changes.length) return cb(null);
								ins.save(function () {
									ins.reload({fromParentForm:true},function(){
									});
									cb(null);
								});
								// if (!_t.tblInstances[ins].ct_instance.changes.length) return cb(null);
								// _t.tblInstances[ins].save(function () {
								// 	_t.tblInstances[ins].reload({fromParentForm:true},function(){
								// 	});
								// 	cb(null);
								// });
							}, cb);
						},
						saveChildFrames:function(cb){
							async.eachSeries(_t.frmInstances, function(ins, cb){
								if (!ins.changes.length) return cb(null);
								ins.save(function () {
									ins.reload({fromParentForm:true},function(){
									});
									cb(null);
								});

								// if (!_t.frmInstances[ins].changes.length) return cb(null);
								// _t.frmInstances[ins].save(function () {
								// 	_t.frmInstances[ins].reload({fromParentForm:true},function(){
								// 	});
								// 	cb(null);
								// });
							}, cb);
						},
						reload:function(cb){
							_t.reload(function () {

							    if(_t.after_save_trigger){
                                    $(document).trigger(_t.after_save_trigger);
                                }
                                if(_t.parent.after_save_trigger){
                                    $(document).trigger(_t.parent.after_save_trigger);
                                }

								cb(null);
							});
						},
					}, function(err){
						if (err){
							console.error("Ошибки при сохранении фрейма или его дочерних", err);
							return;
						}
						if (debugMode) console.log('Frame SAVED');
					});

					// if (_t.tblInstances.length > 0) {
					//
					// 	if (_t.changes.length > 0) {
					// 		_t.save(function (success) {
					// 			if (success) {
					// 				_t.reload(function () {
					// 					// $(modalWindow).trigger('save');
					// 				});
					// 			}
					// 		});
					// 	}
					// 	for (var ins in _t.tblInstances) {
					// 		if (_t.tblInstances[ins].ct_instance.changes.length > 0) {
					// 			_t.tblInstances[ins].save(function () {
					// 				_t.tblInstances[ins].reload({fromParentForm:true},function(){});
					// 				_t.reload(function () {
					// 					$(modalWindow).trigger('save');
					// 				});
					// 			});
					// 		}
					// 	}
					// } else {
					// 	if (_t.changes.length > 0) {
					// 		_t.save(function (success) {
					// 			if (success) {
					// 				_t.reload(function () {
					// 					$(modalWindow).trigger('save');
					// 				});
					// 			}
					// 		});
					// 	}
					// }


				});

				wrapper.find('.mw-config-access').off('mousedown').on('mousedown', function(){

					MB.Core.accessForm({
						object: _t.class,
						id: _t.activeId,
						class_id: _t.profile.extra_data.object_profile.class_id,
						name: _t.data.data[0].name
					});

				});

				wrapper.find('input.fn-control[data-column="DL_FULL_ADDRESS"]').on('input keyup change', function () {
					var block = $(this).parents('.fn-field').eq(0);
					var columnName = block.attr('data-column');
					var type = block.attr('data-type');
					var dataValue = "";
					var value = $(this).val();
					value = (type == 'phone') ? value.replace(/[^0-9]/gim, '') : value;
					var chO = {
						column_name: columnName,
						type: type,
						value: {
							value: value,
							selValue: ''
						}
					};
					if (_t.data != "new") dataValue = _t.data.data[0][columnName];
					if (value != dataValue) {
						_t.addChange(chO);
					}
					else {
						_t.removeChange(chO);
					}
				});

				wrapper.find('input.fn-control[data-column!="DL_FULL_ADDRESS"]').off('input keyup change').on('input keyup change', function () {
					var block = $(this).parents('.fn-field').eq(0);
					var columnName = block.attr('data-column');
					var type = block.attr('data-type');
					var dataValue = "";
					var value = $(this).val();
					value = (type == 'phone') ? value.replace(/[^0-9]/gim, '') : value;
					var chO = {
						column_name: columnName,
						type: type,
						value: {
							value: value,
							selValue: ''
						}
					};
					if (_t.data != "new") dataValue = _t.data.data[0][columnName];
					if (value != dataValue) {
						_t.addChange(chO);
					}
					else {
						_t.removeChange(chO);
					}
				});

				wrapper.find('.fn-control.checkbox-wrapper').each(function (index, elem) {
					var block = $(elem).parents('.fn-field').eq(0);
					var id = $(elem).data('id');
					var columnName = block.data('column');
					var type = block.data('type');
					var dataValue = "";
					var chkInstance = $(MB.Core.checkboxes.getItem(id)).off('toggleCheckbox').on('toggleCheckbox', function () {
//                console.log(this);
						var value = (this.value) ? true : false;
						var chO = {
							column_name: columnName,
							type: type,
							value: {
								value: value,
								selValue: ''
							}
						};
						if (_t.data != "new") dataValue = _t.data.data[0][columnName];
						if (value != dataValue) {
							_t.addChange(chO);
						}
						else {
							_t.removeChange(chO);
						}
					});
				});



				// wrapper.find('textarea.fn-control').off('input').on('input', function () {
				// 	var block = $(this).parents('.fn-field').eq(0);
				// 	var columnName = block.attr('data-column');
				// 	var type = block.attr('data-type');
				// 	var dataValue = "";
				// 	var value = $(this).val();
				// 	var chO = {
				// 		column_name: columnName,
				// 		type: type,
				// 		value: {
				// 			value: $(this).val(),
				// 			selValue: ''
				// 		}
				// 	};
				// 	if (_t.data != "new") dataValue = _t.data.data[0][columnName];
				// 	if (value != dataValue) {
				// 		_t.addChange(chO);
				// 	}
				// 	else {
				// 		_t.removeChange(chO);
				// 	}
				// });

				for(var i in _t.ckEditors){
					var ed = _t.ckEditors[i];
					var columnName =    ed.column_name;
					var type =          ed.type;
					var dataValue =     "";

					var value = ed.getData();

//            console.log(ed, value);

					ed.on('key', function(){
						value = ed.getData();
						var chO = {
							column_name: columnName,
							type: type,
							value: {
								value: value,
								selValue: ''
							}
						};

						// console.log(chO);

						if (_t.data != "new") dataValue = _t.data.data[0][columnName];
						if (value != dataValue) {
							_t.addChange(chO);
						}
						else {
							_t.removeChange(chO);
						}

					});



				}

				// wrapper.find('.fn-control.fn-datetime-wrapper').each(function (index, elem) {
                //
				// 	var $elem = $(elem);
                //
				// 	var is_time = false; // $elem.hasClass('time');
				// 	var is_date = false; // $elem.hasClass('date');
				// 	var is_datetime = (!is_date && !is_time); // Никакой класс не указан - полная дата
                //
				// 	$elem.flatpickr(
				// 		{
				// 			dateFormat: (is_time) ? "H:i:S" : (is_date) ? "d.m.Y" : "d.m.Y H:i:S",
				// 			formatDate: (date, format) => {
				// 				return (is_time) ? moment(date).format('HH:mm:ss') : (is_date) ? moment(date).format('DD.MM.YYYY') : moment(date).format('DD.MM.YYYY HH:mm:ss');
				// 			},
				// 			parseDate: (date, format) => {
				// 				return (is_time) ? moment(date, 'HH:mm:ss').toDate() : (is_date) ? moment(date, 'DD.MM.YYYY').toDate() : moment(date, 'DD.MM.YYYY HH:mm:ss').toDate();
				// 			},
				// 			enableTime: (is_time || is_datetime),
				// 			time_24hr: true,
				// 			enableSeconds: true,
				// 			noCalendar: is_time,
				// 			position:'auto',
				// 			static:true,
                //             // defaultDate:,
                //             minDate:moment().format('DD.MM.YYYY'),
				// 			onChange: (selectedDates, dateStr, instance) => {
				// 				var block = $(this).parents('.fn-field').eq(0),
				// 					type = block.attr('data-type'),
				// 					columnName = block.attr('data-column'),
				// 					dataValue = (_t.data != "new") ? _t.data.data[0][columnName] : "",
				// 					value = $(this).val();
				// 				if (value.length == 16) value += ':00';
				// 				var chO = {
				// 					column_name: $(this).attr('data-column'),
				// 					type: type,
				// 					value: {
				// 						value: value,
				// 						selValue: ''
				// 					}
				// 				};
				// 				if (value != dataValue) {
				// 					_t.addChange(chO);
				// 				} else {
				// 					_t.removeChange(chO);
				// 				}
				// 			}
				// 		}
				// 	);
				// });

// 				wrapper.find('.fn-control.fn-date-wrapper').each(function (index, elem) {
// 					$(elem).datepicker({
// 						autoclose: true,
// 						todayHighlight: true,
// 						//minuteStep: 10,
// 						keyboardNavigation: false,
// 						todayBtn: true,
// 						firstDay: 1,
// 						format: 'dd.mm.yyyy',
// //                startDate: '-infinity',
// 						weekStart: 1,
// 						language: "ru"
// 					})
// 					// .datepicker('setDate', moment($(elem).val(), 'DD.MM.YYYY').format('DD.MM.YYYY'))
// 						.off('changeDate').on('changeDate', function () {
// 							var block = $(this).parents('.fn-field').eq(0),
// 								type = block.attr('data-type'),
// 								columnName = block.attr('data-column'),
// 								dataValue = (_t.data != "new") ? _t.data.data[0][columnName] : "",
// 								value = $(this).val();
// 							if (value.length == 16) value += ':00';
// 							var chO = {
// 								column_name: $(this).attr('data-column'),
// 								type: type,
// 								value: {
// 									value: value,
// 									selValue: ''
// 								}
// 							};
// 							if (value != dataValue) {
// 								_t.addChange(chO);
// 							} else {
// 								_t.removeChange(chO);
// 							}
// 							// }
// 						}
// 					);
// 				});

				// wrapper.find('.fn-control.fn-time-wrapper').each(function () {
				// 	var $elem = $(this);
                //
				// 	var is_time = true; // $elem.hasClass('time');
				// 	var is_date = false; // $elem.hasClass('date');
				// 	var is_datetime = (!is_date && !is_time); // Никакой класс не указан - полная дата
                //
				// 	$elem.flatpickr(
				// 		{
				// 			dateFormat: (is_time)? "H:i:S" : (is_date)? "d.m.Y" : "d.m.Y H:i:S",
				// 			formatDate: (date, format)=>{
				// 				return (is_time)? moment(date).format('HH:mm:ss') : (is_date)? moment(date).format('DD.MM.YYYY') :moment(date).format('DD.MM.YYYY HH:mm:ss');
				// 			},
				// 			parseDate: (date, format)=>{
				// 				return (is_time)? moment(date, 'HH:mm:ss').toDate() : (is_date)? moment(date,'DD.MM.YYYY').toDate() : moment(date, 'DD.MM.YYYY HH:mm:ss').toDate();
				// 			},
				// 			enableTime: (is_time || is_datetime),
				// 			time_24hr: true,
				// 			enableSeconds:true,
				// 			noCalendar: is_time,
                //             minDate:moment().format('DD.MM.YYYY'),
				// 			onChange: (selectedDates, dateStr, instance) => {
                //
				// 			}
				// 		}
				// 	);
                //
				// 	// return;
				// 	// var $t = $(this);
				// 	// $t.clockpicker({
				// 	// 	align: 'left',
				// 	// 	donetext: 'Select',
				// 	// 	autoclose: true,
				// 	// 	afterDone: function () {
				// 	// 		var val = $t.val();
				// 	// 		if (val.length == 5) $t.val(val + ':00');
				// 	// 	}
				// 	// })
				// });



				// wrapper.find('.fn-control.fn-select3-wrapper').each(function (index, elem) {
				// 	var selectId = $(elem).find('.select3-wrapper').attr('id');
				// 	var selectInstance = MB.Core.select3.list.getSelect(selectId);
				// 	var block = $(elem).parents('.fn-field').eq(0);
				// 	$(selectInstance).off('changeVal').on('changeVal', function (e, was, now) { //.off('changeVal')
				// 		var columnName = block.attr('data-column');
				// 		var dataValue = "";
				//
				//
				//
				// 		var chO = {
				// 			column_name: getLovReturnToColumn($(elem).attr('data-column')),
				// 			type: $(elem).parents('.fn-field').eq(0).attr('data-type'),
				// 			value: {
				// 				value: now.id,
				// 				selValue: now.id
				// 			}
				// 		};
				// 		if (_t.data != "new") dataValue = _t.data.data[0][columnName];
				// 		if (now.name != dataValue) {
				// 			_t.addChange(chO);
				// 		}
				// 		else {
				// 			_t.removeChange(chO);
				// 		}
				// 		// Enable/Disable depend_fields
				// 		// if (typeof now.id === "undefined" || now.id === "") return;
				// 		_t.reSetDependField(columnName, now, function () {
				//
				// 		});
				//
				//
				// 	});
				// });

				wrapper.find('.fn-control.fn-colorpicker-wrapper').each(function (index, elem) {
					var block = $(elem).parents('.fn-field').eq(0);
					var type = block.attr('data-type');
					var columnName = block.attr('data-column');
					var stateView = $(elem).parents('.fn-field:first').find('.fn-colorpicker-state');
					var colorValue = undefined;
					var dataValue = "";
					var colorPickerInstance = $(elem).colorpicker();
					colorPickerInstance.off('changeColor').on('changeColor', function (e) {
						colorValue = e.color.toHex();
						stateView.css('backgroundColor', colorValue);

						var chO = {
							column_name: columnName,
							type: type,
							value: {
								value: colorValue,
								selValue: ''
							}
						};
						if (_t.data != "new") dataValue = _t.data.data[0][columnName];
						if (colorValue != dataValue) {
							_t.addChange(chO);
						}
						else {
							_t.removeChange(chO);
						}
					});
					$(elem).off('input').on('input', function () {
						stateView.css('backgroundColor', $(elem).val());
					});
					stateView.off('click').on('click', function () {
						colorPickerInstance.colorpicker('show');
					});
				});

				wrapper.find('.fn-control.fn-colorpicker-wrapper').each(function (index, elem) {
					var block = $(elem).parents('.fn-field').eq(0);
					var type = block.attr('data-type');
					var columnName = block.attr('data-column');
					var stateView = $(elem).parents('.fn-field:first').find('.fn-colorpicker-state');
					var colorValue = undefined;
					var dataValue = "";
					var colorPickerInstance = $(elem).colorpicker();
					colorPickerInstance.off('changeColor').on('changeColor', function (e) {
						colorValue = e.color.toHex();
						stateView.css('backgroundColor', colorValue);

						var chO = {
							column_name: columnName,
							type: type,
							value: {
								value: colorValue,
								selValue: ''
							}
						};
						if (_t.data != "new") dataValue = _t.data.data[0][columnName];
						if (colorValue != dataValue) {
							_t.addChange(chO);
						}
						else {
							_t.removeChange(chO);
						}
					});
					$(elem).off('input').on('input', function () {
						stateView.css('backgroundColor', $(elem).val());
					});
					stateView.off('click').on('click', function () {
						colorPickerInstance.colorpicker('show');
					});
				});

				wrapper.find('button.btn-secondary').each(function (index, elem) {
					$(elem).iconpicker()
					$(elem).on('change', function (e) {
						var block = $(elem).parents('.fn-field').eq(0);
						var type = block.attr('data-type');
						var columnName = block.attr('data-column');
						var dataValue = "";
						var chO = {
							column_name: columnName,
							type: type,
							value: {
								value: e.icon,
								selValue: ''
							}
						};
						if (_t.data != "new") dataValue = _t.data.data[0][columnName];
						if (e.icon != dataValue) {
							_t.addChange(chO);
						}
						else {
							_t.removeChange(chO);
						}
					})
				});

				wrapper.find('.classic-filed-replacer').off('click').on('click', function () {

					var id = $(this).attr('data-repid');
					var data_1 = $(this).attr('data-replace');
					var data_2 = $(this).attr('data-replace2');

					var fld_1 = wrapper.find('[data-repid="'+id+'"][data-replace="1"]').find('.fn-control');
					var fld_2 = wrapper.find('[data-repid="'+id+'"][data-replace="2"]').find('.fn-control');

					fld_1.val(data_1);
					fld_2.val(data_2);

					fld_1.trigger('input');
					fld_2.trigger('input');

				});
				//master
// 		if (_t.isMaster) {
//
// 			var m_wrap = wrapper.find('.master-wrapper');
// 			var m_vis = wrapper.find('.master-vis');
// 			var m_train = wrapper.find('.master-train');
// 			var m_steps = wrapper.find('.master-step');
// 			var m_fwd = wrapper.find('.master-step-fwd');
// 			var m_back = wrapper.find('.master-step-back');
// 			var m_finish = wrapper.find('.master-finish');
// 			var stepsCount = m_steps.length;
//
// 			m_train.css('width', stepsCount * 100 + '%');
// 			m_steps.css('width', 100 / stepsCount + '%');
// 			m_wrap.animate({opacity: 1}, 100);
//
// 			function updateVariables() {
// 				m_wrap = wrapper.find('.master-wrapper');
// 				m_vis = wrapper.find('.master-vis');
// 				m_train = wrapper.find('.master-train');
// 				m_steps = wrapper.find('.master-step');
// 				m_fwd = wrapper.find('.master-step-fwd');
// 				m_back = wrapper.find('.master-step-back');
// 				m_finish = wrapper.find('.master-finish');
// 				stepsCount = m_steps.length;
// 			}
//
// 			function disableButtons() {
// 				var activeStep = wrapper.find('.master-step.active');
// 				var activeIdx = parseInt(activeStep.data('step'));
//
// 				m_back.removeClass('disabled');
// 				m_fwd.removeClass('disabled');
// 				m_finish.removeClass('disabled');
//
// //                console.log(activeIdx, stepsCount);
//
// 				if (activeIdx == 0) {
// 					m_back.addClass('disabled');
// 					m_finish.addClass('disabled');
// 				} else if (activeIdx == stepsCount - 1) {
//
// 					m_fwd.addClass('disabled');
// 				} else {
// 					m_finish.addClass('disabled');
// 				}
// 			}
//
// 			disableButtons();
//
// 			m_fwd.off('click').on('click', function () {
//
// 				if ($(this).hasClass('disabled')) {
// 					return;
// 				}
// 				if (_t.activeId == 'new' && _t.changes.length == 0) {
// 					toastr['warning']('Fill in required fields');
// 					return;
// 				}
//
// 				var activeStep = wrapper.find('.master-step.active');
// 				var activeIdx = parseInt(activeStep.data('step'));
//
// 				function saveStep(cb) {
//
// //                    console.log('CHANGES LENGTH', _t.changes.length);
//
// 					if (_t.tblInstances.length > 0) {
// 						if (_t.changes.length > 0) {
// 							_t.save(function (success) {
// 								if (success) {
// 									if (typeof cb == 'function') {
// 										cb();
// 									}
// 								}
// 							});
// 						} else {
// 							if (typeof cb == 'function') {
// 								cb();
// 							}
// 						}
// 						for (var ins in _t.tblInstances) {
// 							if (_t.tblInstances[ins].ct_instance.changes.length > 0) {
// 								_t.tblInstances[ins].save(function () {
// 									_t.tblInstances[ins].reload({fromParentForm:true},function(){});
// 									_t.reload(function () {
// //                                        updateVariables();
// //
// //                                        console.log(m_train);
// //
// //                                        m_train.animate({
// //                                            marginLeft: '-' + (activeIdx+1) * 100 + '%'
// //                                        }, 350, function(){
// //
// //                                        });
// //                                        activeStep.removeClass('active');
// //                                        activeStep.next().addClass('active');
// //                                        disableButtons();
// //                                        if(typeof cb == 'function'){
// //                                            cb();
// //                                        }
// 									});
// 								});
// 							}
// 						}
// 					} else {
// 						if (_t.changes.length > 0) {
// 							_t.save(function (success) {
// 								if (success) {
// 									if (typeof cb == 'function') {
// 										cb();
// 									}
// 								}
// 							});
// 						} else {
// 							if (typeof cb == 'function') {
// 								cb();
// 							}
// 						}
// 					}
// 				}
//
//
// 				saveStep(function () {
// 					m_train.animate({
// 						marginLeft: '-' + (activeIdx + 1) * 100 + '%'
// 					}, 350, function () {
//
// 					});
// 					activeStep.removeClass('active');
// 					activeStep.next().addClass('active');
// 					disableButtons();
// 					_t.getData();
// 				});
// 			});
//
// 			m_back.off('click').on('click', function () {
//
// 				if ($(this).hasClass('disabled')) {
// 					return;
// 				}
//
// 				var activeStep = wrapper.find('.master-step.active');
// 				var activeIdx = parseInt(activeStep.data('step'));
//
// 				m_train.animate({
// 					marginLeft: '-' + (activeIdx - 1) * 100 + '%'
// 				}, 350, function () {
//
// 				});
// 				activeStep.removeClass('active');
// 				activeStep.prev().addClass('active');
// 				disableButtons();
// 			});
// 		}

				wrapper.find('.fn-field').off('click').on('click', function(e){
					var el = $(this);
					var highlight_class = el.data('highlight_class');
					var no_highlight_class = el.data('no_highlight_class');
					var required_highlight_on_focus = highlight_class + '_on_focus';
					if (highlight_class) el.removeClass(highlight_class);
					if (no_highlight_class) el.removeClass(no_highlight_class);
					el.addClass(required_highlight_on_focus);
				});


				// $('.far.fa-question-circle').mouseout(function() { $(this).next().hide() })
				// $('.far.fa-question-circle').mouseover(function() { $(this).next().css({'display': 'inline'}) })


				$('.far.fa-question-circle').live({
					mouseenter: function () {
						$(this).next().css({'display': 'inline'})
					},
					mouseleave: function () {
						$(this).next().hide()
					}
				})


				cb(null);
			}
		}, cb);

	};

    /**
	 * returns string without spaces
     * @param str
     * @returns {*}
     */
	MB.Frame.prototype.returnStringWithoutSpaces = function (str) {
        if(typeof str == 'string'){
            return str.replace(/(^\s*)|(\s*)$/g, '');
        }else{
            return str;
        }

	};

	MB.Frame.prototype.getChangesByName = function (name) {
		var _t = this;
		if (!name) return false;
		for (var i in _t.changes) {
			if (_t.changes[i].column_name === name) return _t.changes[i];
		}
		return false;
	}


	/**
	 * Подсветит переданные поля
	 * @param field_names можно также передать {field_names:[],css_class:'',...}
	 * @returns {boolean}
	 */
	MB.Frame.prototype.highlightFields = function (field_names) {
		var _t = this;
		if (!field_names) return;
		var params = (typeof field_names === 'object' && !Array.isArray(field_names))? field_names : {field_names:field_names};
		var fields = params.field_names || false;
		if (!fields) return;
		if (!Array.isArray(fields)) fields = [fields];
		if (!fields.length) return;
		var css_class = params.css_class || 'required_highlight';
		var no_css_class = 'no_' + css_class;
		var time = !isNaN(+params.time)? +params.time : 3000;
		var field_class = params.field_class || 'fn-field';
		var field_tag = (typeof params.field_tag !== 'undefined')? (params.field_tag? params.field_tag : '') : 'div'; // Можно указать ''|false тогда класс не будет учитываться
		var data_attr_name = params.data_attr_name || 'column';

		var fields_strs = fields.map(one=>`${field_tag}.${field_class}[data-${data_attr_name}=${one}]`);

		var elements = _t.container.find(fields_strs.join(', '));

		var nav_tab = elements.parents('.nav_tab');
		// var data_tab = nav_tab.data('tab');

		var data_tabs = [];
		var tabs = {};
		nav_tab.each(function(i, e){
			var header_label = $(e).data('tab');
			if (!header_label) return;
			if (!tabs[header_label]) tabs[header_label] = {
				e:e,
				header_label:header_label
			}
		    // if (data_tabs.indexOf(lbl) === -1) data_tabs.push(lbl);
		});

		for (var key in tabs) {
			tabs[key].tab_label = $(tabs[key].e).parents('.nav_tabs:first').data('label'); // Для всех
			if (!tabs[key].tab_label){
				delete tabs[key];
				continue;
			}
			tabs[key].tabHeaderElements = (tabs[key].tab_label && tabs[key].header_label)? _t.container.find(`ul.nav_headers[data-label=${tabs[key].tab_label}] li[data-tab=${tabs[key].header_label}]`).not('.active') : false;
		}

		// var tab_label = nav_tab.parents('.nav_tabs:first').data('label'); // Для всех
		// var tabHeaderElements = (tab_label && data_tab)? _t.container.find(`ul.nav_headers[data-label=${tab_label}] li[data-tab=${data_tab}]`).not('.active') : false;

		elements.addClass(css_class).addClass(no_css_class).data('highlight_class',css_class).data('no_highlight_class',no_css_class);
		for (var k in tabs) {
			tabs[k].tabHeaderElements.addClass(css_class).addClass(no_css_class).data('highlight_class',css_class).data('no_highlight_class',no_css_class);
		}
		// if (tabHeaderElements) tabHeaderElements.addClass(css_class).addClass(no_css_class).data('highlight_class',css_class).data('no_highlight_class',no_css_class);

		if (_t.highlightTimeout) clearTimeout(_t.highlightTimeout);
		_t.highlightTimeout = setTimeout(()=>{
			elements.removeClass(css_class);
			// if (tabHeaderElements) tabHeaderElements.removeClass(css_class);
			for (var k in tabs) {
				tabs[k].tabHeaderElements.removeClass(css_class);
			}
			clearTimeout(_t.highlightTimeout);
			delete _t.highlightTimeout;
		}, time)



	}

	/**
	 * Проверяет заполнены ли обязательные поля. Если передать field_names, то будут проверятся только среди них
	 * @param field_names [] ограничивает проверку этими полями
	 */
	MB.Frame.prototype.getNotFilledRequire = function (field_names) {

		var _t = this;
		var params = (typeof field_names === 'object' && !Array.isArray(field_names))? field_names : {field_names:field_names};
		var fields = params.field_names || false;
		if (!Array.isArray(fields) || !fields.length) fields = false;
		var highlight = params.highlight;

		var not_filled = {};
		for (var i in _t.fields) {
			var field = _t.fields[i];
			if (fields && fields.indexOf(field.column_name) === -1) continue;
			let field_profile = field.profile[0];
			if (!field_profile.required) continue;
			if (!field_profile.visible) continue;

			var one_change = _t.getChangesByName(field_profile.keyword || field_profile.column_name);
			if (field.value === "" && !one_change) not_filled[field.name] = field;
		}


		if (highlight) _t.highlightFields(Object.keys(not_filled));

		return Object.keys(not_filled).length? not_filled : false;
	}



    /**
	 * save form changes to server
     * @param callback
     */
	MB.Frame.prototype.save = function (callback) {
		var _t = this;
		var chs = _t.changes;
		var totalSaved = 0;
		var totalError = 0;
		if (_t.save_processing) {
		    var diff = moment().diff(_t.save_processing);
		    if (diff < 15000){
                toastr.info('Сохранение... Ожидайте результата. ' + diff);
                return;
            }
        }
        _t.save_processing = moment();



		// function checkRequired(){
		//     var not_filled = [];
        //     for (var i in _t.fields) {
        //         var field = _t.fields[i];
        //         let field_profile = field.profile[0];
        //         if (!field_profile.required) continue;
        //         var one_change = _t.getChangesByName(field_profile.keyword || field_profile.column_name);
        //         if (field.value === "" && !one_change) not_filled.push(field);
        //     }
        //     return !not_filled.length;
		// }
		if (_t.getNotFilledRequire({highlight:true})) {
            toastr.info('Заполнены не все обязательные поля.');
            _t.save_processing = false;
		    return;
        }


		// function finishSave() {
		// 	if (totalError == 0) {
		// 		_t.changes = [];
		// 	}
		// 	_t.enableSaveButton();
		// 	$(_t).trigger('update');
        //     _t.save_processing = false;
		// 	if (typeof callback == 'function') {
		// 		callback(totalError == 0);
		// 	}
		// }

		function populateParams() {
			var result = {};
			for (var i in chs) {
				var ch = chs[i];

				result[ch.column_name] = _t.returnStringWithoutSpaces(ch.value.value);
			}

			if(_t.activeId !== 'new') {
				for (var k in _t.profile['extra_data']['object_profile']['primary_key'].split(',')) {
					var key = _t.profile['extra_data']['object_profile']['primary_key'].split(',')[k];
					result[key] = _t.data.data[0][key];
				}
			}

			return result;
		}

		var sObj = {};

		if (_t.activeId === 'new') {
			sObj = {
				command: 'add',
				object: _t.profile['extra_data']['object_profile']['class'],
				params: populateParams()
			};

            if(_t.client_object){
                sObj.client_object = _t.client_object;
            }


            if(Object.keys(_t.add_params).length > 0){

            	for(var i in _t.add_params){
            		sObj.params[i] = _t.add_params[i];
				}

			}
            if (!Object.keys(sObj.params).length) {
				_t.save_processing = false;
            	return callback(null);
			}
		} else {
			sObj = {
				command: 'modify',
				object: _t.profile['extra_data']['object_profile']['class'],
				params: populateParams()
			};
            if(_t.client_object){
                sObj.client_object = _t.client_object;
            }
            if (Object.keys(sObj.params).length < 2) {
				_t.save_processing = false;
            	return callback(null);
			}
		}

		socketQuery(sObj, function (res) {
			_t.save_processing = false;
			if (res.code){

				if (typeof callback == 'function') {
					callback(res);
				}
				return;
			}

			async.series({
				ifAfterNew: cb => {
					if (_t.activeId !== 'new') return cb(null);
					_t.newSaved = true;
					_t.activeId = res['id'] || res.data.id;
					// Подменим фрейм на НЕ _add
					async.series({
						doAfterAdd: cb => {
							if (typeof _t.afterAdd !== 'function') return cb(null);
							_t.afterAdd(function(cb2){
								if (typeof cb2 === 'function'){
									cb2(function(){
										cb(null);
									});
									return;
								}
								cb(null);
							})
						},
						replaceFrameAndReturn: cb => {
							_t.remove();
							_t.old_element.data('ids',_t.activeId);
							_t.parent.createChildFrames({data_frame:_t.old_element.data('frame')});
							return cb(null); // Все же с коллбеком//OLD - Без вызова коллбека
						}
					}, cb);
				},
				finish: cb => {
					_t.tablePKeys = {
						data_columns: [_t.profile['extra_data']['object_profile']['primary_key'].split(',')],
						data: [res.id || res.data.id]
					};

					_t.changes = [];
					_t.enableSaveButton();
					// $(_t).trigger('update');
					_t.save_processing = false;
					cb(null);
				}
			}, (err)=>{
				_t.save_processing = false;
				if (typeof callback == 'function') {
					callback(err);
				}
			});

			// if (_t.activeId === 'new') {
			//
			//
			// }
			//
			// _t.tablePKeys = {
			// 	data_columns: [_t.profile['extra_data']['object_profile']['primary_key'].split(',')],
			// 	data: [res.id || res.data.id]
			// };
			//
			//
			// if (res.code == 0) {
			//
			//
			// 	// console.log('AFTER SAVE', results);
			//
			// 	totalSaved += 1;
			// 	if (_t.activeId === 'new') {
			//
			// 		_t.newSaved = true;
			// 		_t.activeId = res['id'] || res.data.id;
			// 		// Подменим фрейм на НЕ _add
			//
			// 		_t.remove();
			// 		_t.old_element.data('ids',_t.activeId);
            //         _t.parent.createChildFrames({data_frame:_t.old_element.data('frame')});
            //         return;
			//
			// 	}
			// 	_t.tablePKeys = {
			// 		data_columns: [_t.profile['extra_data']['object_profile']['primary_key'].split(',')],
			// 		data: [res.id || res.data.id]
			// 	};
			// } else {
			// 	totalError += 1;
			// }
			//
			// // finishSave();
			// if (totalError == 0) {
			// 	_t.changes = [];
			// }
			// _t.enableSaveButton();
			// $(_t).trigger('update');
			// _t.save_processing = false;
			// if (typeof callback == 'function') {
			// 	callback(totalError == 0);
			// }
		});
	};

    /**
	 * get child table by class name
     * @param class_name
     * @returns {*}
     */
    MB.Frame.prototype.getChildTbl = function (class_name) {
        var _t = this;
        for (var i in _t.tblInstances) {
            var tbl = _t.tblInstances[i];
            if (tbl.class == class_name) {
                return tbl;
            }
        }
    };

    /**
	 * toggle loader
     * @param state
     * @param mes
     */
    MB.Frame.prototype.loader = function(state, mes){

        var _t = this;

        var wrap = _t.container.find('.mw-content');

        if(state){
            var loaderHtml = '<div class="form-loader-holder">' +
                '<div class="form-loader-fader"></div>' +
                '<div class="form-loader-body">' +
                '<div class="form-loader-gif"></div>' +
                '<div class="form-loader-text">'+mes+'</div>' +
                '</div>' +
                '</div>';


            wrap.find('.form-loader-holder').remove();

            wrap.prepend(loaderHtml);

            wrap.find('.form-loader-holder').eq(0).animate({
                opacity: 1
            }, 70, function(){

            });

        }else{

            wrap.find('.form-loader-holder').eq(0).animate({
                opacity: 0
            }, 70, function(){
                wrap.find('.form-loader-holder').remove();
            });



        }




    };

    /**
	 * remove frame
     */
	MB.Frame.prototype.remove = function(obj){

		var _t = this;
		var obj = obj || {};


		// Удалив дочерние фреймы и таблицы
		for (var i in _t.frmInstances) {
			if (!_t.frmInstances[i]) continue;
			if (typeof _t.frmInstances[i] === 'object' && typeof _t.frmInstances[i].remove === 'function') _t.frmInstances[i].remove();
		}
		for (var i in _t.tblInstances) {
			if (!_t.tblInstances[i]) continue;
			if (typeof _t.tblInstances[i] === 'object' && typeof _t.tblInstances[i].removeTable === 'function') _t.tblInstances[i].removeTable();
		}
		// Удалим select3
		for (var i in _t.select3ids) {
			var one = MB.Core.select3.list.getSelect(_t.select3ids[i]);
			$(one).off();
			if (typeof one === 'object' && typeof one.destroy === 'function') one.destroy();
		}
		_t.select3ids = [];
		// _t.container.html(_t.container.old_html);
		if (obj.remove_from_parent && _t.parent){
			for (var i in _t.parent.frmInstances) {
				if (!_t.parent.frmInstances[i]) continue;
				if (_t.parent.frmInstances[i].id === _t.id )_t.parent.frmInstances.splice(i,1);
			}
		}

		if (_t.container){
			if (typeof _t.container.findPrototype === 'function') {
				_t.container.find = _t.container.findPrototype;
				delete _t.container.findPrototype;
			}

			// delete _t.container.find;
			_t.container.children = _t.container.childrenPrototype;
			delete _t.container.childrenPrototype;
			// delete _t.container.children;
			$(_t.container).off();

			if (typeof obj.html !== 'undefined'){
				_t.container.html(obj.html);
			}else{
				// _t.container.replaceWith(obj.old_element || _t.old_element);
				_t.container.html(_t.old_html);
			}

		}
		$(_t).off();
		// delete _t.container;
		for(var i in MB.Frames.frames){
			var f = MB.Frames.frames[i];

			if(_t.id === f.id){
                MB.Frames.frames.splice(i,1);
			}
		}
	};



	MB.Frame.prototype.createChildFrames = function(obj, cb){
		if (arguments.length === 1){
			cb = obj;
			obj = {};
		}
		var _t = this;
		// if (!_t.activeId) return cb(null); // Пустой фрейм, без привязки к данным

		var data_frame = obj.data_frame;
		var frm_wrappers = data_frame? _t.container.find(`.fn-child-frm-holder[data-frame=${data_frame}]`) : _t.container.find('.fn-child-frm-holder');

		var frames = [];
		frm_wrappers.each((index,item)=>{
			frames.push(item);
		});

		async.eachSeries(frames, function(item, cb){
			var chld = $(item).data('frame');
			if (!chld) return cb(null);
			var ids = $(item).data('ids') || null;
			var chld_class = (chld.substring(0, chld.indexOf('.')).length > 0)? chld.substring(0, chld.indexOf('.')) : undefined;
			var chld_clinetObject = (chld.substr(chld.indexOf('.') + 1).length > 0)? chld.substr(chld.indexOf('.') + 1) : undefined;
			var name = chld_clinetObject;
			if (!name) return cb(new MyError('Для Frame не указано имя клиентского объекта. Атрибут data-frame должен выглядить так: "class_name.frame_client_object_name"',{item:item}));


			let obj = {
				container:$(item),
				class:chld_class,
				client_object:chld_clinetObject,
				parent:_t,
				ids:[ids],
				name:name
			}
			MB.Frames.createFrame(obj, (err, frame)=>{
				if (err) return cb(new MyError('Не удалось создать фрейм',{err:err}));
				_t.frmInstances.push(frame);
			});
		}, (err, res)=>{
			if (err) {
				console.error('При создании дочерних фреймов возникли ошибки',{err:err, frame:_t});
			}
		});

		if(typeof cb == 'function'){
			cb();
		}



	};

	MB.Frame.prototype.reInitActionBtns = function(obj){
		var _t = this;
		if (_t.parent.co_type !== 'FORM') return;
		_t.parent.reInitActionBtns(obj);
	}

	MB.Frame.prototype.escaping = function (value) {
		return value.toString().split(`"`).join('&quot;')
	}

}());



