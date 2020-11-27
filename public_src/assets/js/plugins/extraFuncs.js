
function renderField(field) {
	let html;

	field.required = field.required ? 'required' : '';

	switch (field.type_of_editor) {
		case 'textarea':
		case 'plain_text':
			html = `<div data-type="${field.type_of_editor}" class="fn-field ${field.required}" data-column="${field.column_name}">
							<label>${field.name}: <span class="required-star">*</span></label>
							<textarea class="fn-control" data-column="${field.column_name}"></textarea>
						</div>`;
			break;
		case 'wysiwyg':
			html = `<div data-type="${field.type_of_editor}" class="fn-field ${field.required}" data-column="${field.column_name}">
							<label>${field.name}: <span class="required-star">*</span></label>
							<textarea rows="10" class="fn-control wysiwyg-wrapper" data-column="${field.column_name}" data-id="${MB.Core.guid()}"></textarea>
						</div>`;
			break;
		case 'number':
			html = `<div data-type="${field.type_of_editor}" class="fn-field ${field.required}" data-column="${field.column_name}">
							<label>${field.name}: <span class="required-star">*</span></label>
							<input type="number" class="fn-control" data-column="${field.column_name}" />
						</div>`;
			break;
		case 'float2':
			html = `<div data-type="${field.type_of_editor}" class="fn-field ${field.required}" data-column="${field.column_name}">
							<label>${field.name}: <span class="required-star">*</span></label>
							<input type="number" step="0.01" class="fn-control" data-column="${field.column_name}" />
						</div>`;
			break;
		case 'text':
			html = `<div data-type="${field.type_of_editor}" class="fn-field ${field.required}" data-column="${field.column_name}">
							<label>${field.name}: <span class="required-star">*</span></label>
							<input type="text" class="fn-control" data-column="${field.column_name}" />
						</div>`;
			break;
		case 'checkbox':
			html = `<div data-type="${field.type_of_editor}" class="fn-field ${field.required}" data-column="${field.column_name}">
							<label class="fn-checkbox-label">${field.name}: <span class="required-star">*</span></label>
							<div data-id="${MB.Core.guid()}" data-type="inline" class="fn-control checkbox-wrapper" data-column="${field.column_name}"></div>
						</div>`;
			break;
		case 'datetime':
			html = `<div data-type="${field.type_of_editor}" class="fn-field ${field.required}" data-column="${field.column_name}">
							<label>${field.name}: <span class="required-star">*</span></label>
							<input type="text" class="fn-control fn-datetime-wrapper" data-column="${field.column_name}" data-date-format="dd.mm.yyyy hh:ii:ss">
						</div>`;
			break;
		case 'date':
			html = `<div data-type="${field.type_of_editor}" class="fn-field ${field.required}" data-column="${field.column_name}">
							<label>${field.name}: <span class="required-star">*</span></label>
							<input type="text" class="fn-control fn-date-wrapper" data-column="${field.column_name}" data-date-format="dd.mm.yyyy">
						</div>`;
			break;
		case 'time':
			html = `<div data-type="${field.type_of_editor}" class="fn-field ${field.required}" data-column="${field.column_name}">
							<label>${field.name}: <span class="required-star">*</span></label>
							<input type="text" class="fn-control fn-time-wrapper" data-column="${field.column_name}" data-date-format="hh:ii:ss">
						</div>`;
			break;
		case 'select2':
		case 'select2withEmptyValue':
			html = `<div data-type="${field.type_of_editor}" class="fn-field ${field.required}" data-column="${field.column_name}">
							<label>${field.name}: <span class="required-star">*</span></label>
							<select data-select-type="select2" data-column="${field.column_name}" class="fn-control" 
							data-select-return-name="${field.select_return_name}" data-select-class="${field.select_class}" data-keyword="${field.keyword}"></select>
						</div>`;
			break;
		default:
			html = `<div data-type="${field.type_of_editor}" class="fn-field" data-column="${field.column_name}">
							<label>${field.name}: <span class="required-star">*</span></label>
							<input type="text" class="fn-control" data-column="${field.name}" /></div>`;
	}

	return html;
}

function initFields2(selector, object, instance) {
	selector.find('.fn-field').each((i, e) => {
		let elem = $(e);
		let type = elem.attr('data-type');
		let column_name = elem.attr('data-column');

		// console.log(object, column_name, type);

		switch (type) {
			case 'textarea':
			case 'plain_text':
				elem.find('textarea').val(object[column_name]).off('input').on('input', function (e) {
					instance.addChange({
						object: object,
						column_name: column_name,
						type: type,
						value: {
							value: $(e.target).val(),
							selValue: ''
						}
					});
				});
				break;
			case 'number':
			case 'float2':
			case 'text':
				elem.find('input').val(object[column_name]).off('input').on('input', function (e) {
					instance.addChange({
						object: object,
						column_name: column_name,
						type: type,
						value: {
							value: $(e.target).val(),
							selValue: ''
						}
					});
				});
				break;
			case 'checkbox':
				elem.find('.checkbox-wrapper').checkboxIt();
				break;
			case 'datetime':
				elem.find('input[type="text"]').val(object[column_name]).datetimepicker({
					autoclose: true,
					todayHighlight: true,
					minuteStep: 10,
					keyboardNavigation: false,
					todayBtn: true,
					firstDay: 1,
					weekStart: 1,
					language: "en"
				});
				break;
			case 'date':
				elem.find('input[type="text"]').val(object[column_name]).datetimepicker({
					autoclose: true,
					todayHighlight: true,
					minuteStep: 10,
					keyboardNavigation: false,
					todayBtn: true,
					firstDay: 1,
					weekStart: 1,
					language: "en",
					minView: 2,
					maxView: 2,
					pickTime: false,
					format: 'dd.mm.yyyy'
				});
				break;
			case 'time':
				let fldDate = elem.find('input[type="text"]');
				fldDate.clockpicker({
					align: 'top',
					placement: 'top',
					donetext: 'Select',
					autoclose: true,
					afterDone: function () {
						let val = fldDate.val();
						if (val.length === 5) fldDate.val(val + ':00');
					}
				});
				break;
			case 'select2':
			case 'select2withEmptyValue':
				let limit = 100;
				let select = elem.find('select');
				let select_class = select.attr('data-select-class');
				let select_return_name = select.attr('data-select-return-name');
				let select_data_keyword = select.attr('data-keyword');

				// console.log(object, select_data_keyword);

				select.select2({
					data: [{
						id: object[select_data_keyword],
						text: object[column_name],
						selected: true
					}],
					allowClear: true,
					placeholder: 'Select value...',
					ajax: {
						dataType: 'json',
						delay: 250,
						transport: function (params, success, failure) {
							// console.error('transport params', params);

							let o = {
								command: 'get',
								object: select_class,
								params: {
									limit: limit,
									page_no: params.data.page || 1,
									collapseData: false,
									where: []
								}
							};

							if (params.data.term) {
								o.params.where.push({
									key: select_return_name,
									type: 'like',
									val1: params.data.term
								})
							}

							socketQuery(o, res => {
								if (res) {
									let data = [];

									res.forEach(row => {
										data.push({
											id: row.id,
											text: row[select_return_name]
										})
									});

									success({
										items: data,
										size: data.length
									});
								} else {
									failure('failed');
								}
							});
						},
						processResults: function (data, params) {
							// console.log('processResults', data, params);

							params.page = params.page || 1;

							return {
								results: data.items,
								pagination: {
									more: data.size === limit
								}
							};
						},
					}
				}).on('select2:select', function (e) {
					var data = e.params.data;

					instance.addChange({
						object: object,
						column_name: select_data_keyword,
						type: type,
						value: {
							value: data.id,
							selValue: ''
						}
					});
				});
				;
				break;
			case 'wysiwyg':
				let field_id = elem.find('textarea').attr('data-id');

				elem.find('textarea').val(object[column_name]);
				tinymce.init({
					selector: `.wysiwyg-wrapper[data-id="${field_id}"]`,
					height: 150,
					setup: function (ed) {
						ed.on('change', function (e) {

							instance.addChange({
								object: object,
								column_name: column_name,
								type: type,
								value: {
									value: ed.getContent(),
									selValue: ''
								}
							});
						});
					}
				});
				break;
		}
	});
}

function getFieldsForRendering(class_name, fields, cb) {
	// console.log('getFieldsForRendering', class_name, fields);

	if (!class_name) return;
	if (!fields) return;

	let class_id;

	let select_class;
	let select_return_name;

	let select_class_id;
	let select_autocomplete_columns;

	let columns_data = [];

	let fields_html = '';

	async.series({
		getClassId: cb => {
			let o = {
				command: 'get',
				object: 'class_profile',
				params: {
					param_where: {
						name: class_name
					},
					collapseData: false
				}
			};
			socketQuery(o, function (res) {
				if (res && res.length) {
					class_id = res[0].id;

					cb(null);
				} else {
					cb('Class not found');
				}
			});
		},
		getFieldsProfile: cb => {
			let o = {
				command: 'get',
				object: 'class_fields_profile',
				params: {
					param_where: {
						class_id: class_id
					},
					where: [
						{
							key: 'column_name',
							type: 'in',
							val1: fields
						}
					],
					sort: 'sort_no',
					collapseData: false
				}
			};
			socketQuery(o, function (res) {
				if (res && res.length) {
					res.forEach(row => {
						columns_data.push({
							class: row.class,
							select_class: row.select_class,
							select_class_id: row.select_class_id,
							select_return_name: row.return_name || row.return_column,
							keyword: row.keyword,
							name: row.name,
							column_name: row.column_name,
							type_of_editor: row.type_of_editor,
							type_of_editor_id: row.type_of_editor_id,
							type: row.type,
							required: row.required
						})
					});

					cb(null);
				} else {
					cb('Class not found');
				}
			});
		},
		renderFields: cb => {
			columns_data.forEach(row => {
				fields_html += renderField(row);
			});

			cb(null);
		}
	}, (err, res) => {
		// console.log('getFieldsForRendering', err, res);

		cb({
			html: fields_html,
			select_class: select_class,
			select_return_name: select_return_name
		});
	})
}


(function () {
	MB.Fields = {
		insertFieldHTML: ($wrapper, field, type, value) => {
			// console.error(type, value);
			let html;

			switch (type) {
				case 'TEXT':
					html = `
						<div class="field_value_input_wrapper" data-type="${type}">
							<textarea class="field_value_input">${value.value1}</textarea>
						</div>`;
					$wrapper.html(html);
					break;
				case 'VARCHAR':
					html = `
						<div class="field_value_input_wrapper" data-type="${type}">
							<input class="field_value_input" type="text" value="${value.value1}" />
						</div>`;
					$wrapper.html(html);
					break;
				case 'DATETIME':
					html = `
						<div class="field_value_input_wrapper" data-type="${type}">
							<input class="field_value_input" type="text" value="${value.value1}"/>
						</div>`;
					$wrapper.html(html);
					break;
				case 'SELECT':
					html = `
						<div class="field_value_input_wrapper" data-type="${type}" data-type="select">
							<select data-get="${field.sub_table_name_for_select}">
								<option value="${value.value_id}" selected>${value.value1}</option>
							</select>
						</div>`;
					$wrapper.html(html);
					break;
				case 'BOOLEAN':
					html = `
						<div class="field_value_input_wrapper checkbox_holder" data-type="${type}">
							<input class="field_value_input" type="checkbox" ${value.value1 === 'checked' ? 'checked="checked"' : ''} />
							<i class="fa fa-check"></i>
							<i class="fa fa-times"></i>
						</div>`;
					$wrapper.html(html);
					break;
				default :
					break;
			}
		}
	};
}());