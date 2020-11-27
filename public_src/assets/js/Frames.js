/*
* Frame.js - complex cloud solutions, LLC
* This client-side class provides work with frames (frames (content only)) in the system, is responsible for obtaining,
* displaying and editing data.
* */

(function () {
	MB = MB || {};
	MB.FramesConstructor = function () {
		this.frames = [];
		this.ckEditors = [];
	};
	MB.Frames = new MB.FramesConstructor();


	MB.FramesConstructor.prototype.createFrame = function (obj, cb) {
		// console.log('IN createFrame');
		if (typeof obj !== 'object') return new Error('в createFrame некорректно переданы параметры');
		let container = obj.container;
		if (!(container instanceof jQuery)) return new Error('в createFrame не передан контейнер или он не jQuery');

		let co = obj.co || obj.client_object || container.data('co');
		let class_ = obj.class || container.data('class') || obj.name;

		// if (!class_ || !co) return new Error('У контейнера не указаны дата атрибуты data-class и data-co');

		// var sel = flatSelection[i];
		// var formId = MB.Core.guid();
		// var tablePKeys = {data_columns: _t.profile['extra_data']['object_profile']['primary_key'].split(','), data: []};
		// for (var j in tablePKeys['data_columns']) {
		// 	tablePKeys['data'].push(sel[tablePKeys['data_columns'][j]]);
		// }

		let frameId = MB.Core.guid();
		var params = {
			id: frameId,
			name: obj.name || co || ('frame_' + frameId),
			class: class_,
			client_object: co,
			parent: obj.parent,
			params: obj.params,
			add_params: obj.add_params,
			container:container,
			attr:obj.attr,
			ids:obj.ids
			// type: 'form',
			// ids: [sel[tablePKeys['data_columns'][0]]],
			// position: (flatSelection.length == 1) ? 'center' : 'shift',
			// tablePKeys: tablePKeys
		};


		var frame = new MB.Frame(params);
		MB.Frames.addFrame(frame);
		MB.Frames.justLoadedId = frame.id;
		if (typeof container.data === 'function') container.data('frame_id', frame.id);
		frame.create((err, frm)=>{
			if (err) {

				if (typeof frame.remove === 'function') frame.remove();
			}
			cb(err, frm);
		});
	};
    /**
	 * add frame instance to global frames array
     * @param frame
     */
	MB.FramesConstructor.prototype.addFrame = function (frame) {
		this.frames.push(frame);
	};

    /**
     * get frame instance from global frames array by name and id
     * @param name, id
     */
	MB.FramesConstructor.prototype.getFrame = function (name, id) {
		var _t = this;
		for (var i in _t.frames) {
			var frame = _t.frames[i];
			if (frame.id == id && frame.name == name) {
				return frame;
			}
		}
	};

	/**
	 * get frame instance from global frames array by id
	 * @param id
	 */
	MB.FramesConstructor.prototype.getById = function (id) {
		var _t = this;
		for (var i in _t.frames) {
			var frame = _t.frames[i];
			if (frame.id === id) {
				return frame;
			}
		}
	};


    /**
     * remove frame instance from global frames array
     * @param id
     */
	MB.FramesConstructor.prototype.removeFrame = function (id) {
		var _t = this;
		for (var i in _t.frames) {
			var frame = _t.frames[i];
			if (frame.id == id) {
				this.frames.splice(i, 1);
			}
		}
	};
}());



