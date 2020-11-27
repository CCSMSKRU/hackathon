/**
 * two_columns_editor.js - complex cloud solutions, LLC
 *
 * Plugin provides data binding/unbinding in two columns view
 */

(function(){

    $.fn.tce = function(options){
        var Tce = function(wrapper, obj){
            this.wrapper = wrapper || undefined;

	        this.search_placeholder = obj.search_placeholder || 'Введите поисковый запрос...';

            if(obj.additional_button) this.additional_button = obj.additional_button;
            else this.additional_button = {};

            // this.additional_button = obj.additional_button;

            this.parent_id = obj.parent_id || undefined;
            this.parent_key = obj.parent_key || undefined;

            this.left_data = {};
            this.right_data = {};
            this.right_parental_data = {};

            this.left_pk = obj.left_pk;
            this.right_pk = obj.right_pk;

            this.left_id = obj.left_id;
            this.right_id = obj.right_id;

            this.left_name = obj.left_name;
            this.right_name = obj.right_name;
            this.right_concat_name = obj.right_concat_name;

            this.dual_id = obj.dual_id;

            this.get_left = obj.get_left;
            this.get_left_params = obj.get_left_params;
            this.exclude_left_field = obj.exclude_left_field;
            this.get_right = obj.get_right;
            this.get_right_params = obj.get_right_params;
            this.command_right = obj.command_right;
            this.add_params = obj.add_params;

            this.lu_command = obj.lu_command;
            this.back_button = obj.back_button;


            this.left_label = obj.left_label || 'Доступные к подключению';
            this.right_label = obj.right_label || 'Подключенные';
            this.search_label = obj.search_label || 'Поиск';

        };

        /**
         * init plugin
         */
        Tce.prototype.init = async function(){
            var _t = this;
            await _t.getData();
            // console.log(_t.right_data);
            // debugger
            await _t.populate();
            // console.log('pop');
            // debugger
            await _t.setHandlers();
        };

        /**
         * get data from server
         * @param cb
         */
        Tce.prototype.getData = function () { return new Promise((resolveGetData, reject) => {
            var _t = this;
            _t.right_data = {};
            _t.right_parental_data = {};

            var lo = {
                command: "get",
                object: _t.get_left,
                params:{
                    param_where: {},
	                // limit: 100
                }
            };

            for(let k in _t.get_left_params){
                if (!_t.get_left_params[k].value) {
                    if (!lo.params.where) lo.params.where = []
                    lo.params.where.push(_t.get_left_params[k]);
                }

                let item_k = _t.get_left_params[k];

                lo.params.param_where[item_k.key] = item_k.value;
            }

            if(_t.get_right == 'list_of_access'){
                lo.params.where = [
                    {
                        key:'user_type_sysname',
                        type:'!in',
                        val1:['USER_ROLE','SITE']
                    }
                ]
            }

            socketQuery(lo, async function(res){
                _t.left_data = res.data;
                console.log(lo, res)
                // debugger
                let ro = {
                    command: _t.command_right,
                    object: _t.get_right,
                    params:{
                        param_where: {}
                        // where: _t.parent_key + " = " + _t.parent_id
                    }
                };
                for(let i in _t.get_right_params){
                    let item = _t.get_right_params[i];
                    ro.params.param_where[item.key] = item.value;
                }
                socketQuery(ro, async function (res) {
                    // alert('this')
                    if(_t.get_right == 'list_of_access'){
                        _t.right_data = res.list_of_access;
                    }
                    if (_t.get_left == 'list_of_access') {
                        _t.left_data = res.list_of_access;
                    } else {
                        _t.right_data = res.data;
                    }
                    if (Object.values(_t.additional_button).length == 0) resolveGetData();
                    // if (Object.values(_t.right_data).length == 0) resolveGetData();
                    // if (Object.values(_t.left_data).length == 0) resolveGetData();
                    let GetDataRightButtons = function () {
                        return new Promise((resolveGetDataRightButtons, rejectGetDatarightButtons) => {
                            if (!_t.additional_button.right_column) resolveGetDataRightButtons()

                            let arr_additional_button = []
                            for (let row in _t.right_data) {
                                _t.right_data[row].buttons = [];

                                for (let btn in _t.additional_button.right_column) {
                                    arr_additional_button.push(
                                        _t.additional_button.right_column[btn].getData(_t.right_data[row].id).then((result) => {
                                            console.log('right btn ', _t.right_data[row], _t.right_data[row].buttons);
                                            _t.right_data[row].buttons.push({result});
                                            return Promise.resolve()
                                        })
                                    )
                                }

                            }
                            Promise.all(arr_additional_button).then(resPPR => {
                                resolveGetDataRightButtons()
                            });


                        })
                    };
                    let GetDataLeftButtons = function () {
                        return new Promise((resolveGetDataLeftButtons, rejectGetDataLeftButtons) => {
                            if(!_t.additional_button.left_column) resolveGetDataLeftButtons()
                            for (let row in _t.left_data) {
                                _t.left_data[row].buttons = [];
                                for (let btn in _t.additional_button.left_column) {
                                    _t.additional_button.left_column[btn].getData(_t.left_data[row].id).then((result) => {
                                        console.log('left btn ', _t.left_data[row], _t.left_data[row].buttons);
                                        _t.left_data[row].buttons.push({result});
                                        if (Object.values(_t.left_data).length - 1 == row && Object.values(_t.additional_button.left_column).length - 1 == btn) {
                                            console.log(_t.left_data)
                                            resolveGetDataLeftButtons()
                                            // debugger
                                            // resolveGetData()
                    }else{
                                            // debugger
                                        }
                                    })
                                }
                    }
                        })
                    }

                    await GetDataRightButtons();
                    await GetDataLeftButtons();
                    await resolveGetData()


                });
            });
        });}

        /**
         * render
         */
        Tce.prototype.populate = function() { return new Promise( (resolveRender, reject) =>{
            var _t = this;
            let left_btns = "", right_btns = "";
            var tpl =  "<div id='tce_inner'>" +
                            "<div class='row'>" +
                                "<div class='col-md-12'>" +
                                    "<div class='toBlockCheckboxes'>" +
                                        "<div class='col-md-12'>" +
                                            "<div class='row lh25 tce-search-holder'>" +
                                                "<label class='fn-label tce-search-label'>{{search_label}}</label>" +
                                                "<input type='text' class='search_entries fn-control' placeholder='{{search_placeholder}}'/>" +
                                                "<div class='tce-confirm-search'>Найти</div>" +
                                            "</div>" +
                                        "</div>" +
                                    "</div>" +
                                "</div>" +
                                "<div class='col-md-12'>" +
                                    "<div class='toBlockCheckboxes'>" +
                                        "<div class='col-md-6'>" +
                                            "<div class='row'><div class='role-hl'>{{left_label}}</div>" +
                                                "<div class='fromBlock'>" +
                                                    "{{#left_list}}" +
                                                        "<div class='uff-item' data-id='{{id}}'>" +
                "<div class='name'>{{name}} {{#buttons}} {{&result.tpl}} {{/buttons}}</div>" +
                left_btns +
                                                        "</div>" +
                                                    "{{/left_list}}" +
                                                "</div>" +
                                            "</div>" +
                                        "</div>" +
                                    "<div class='col-md-6'>" +
                                        "<div class='row'>" +
                                            "<div class='role-hl'>{{right_label}}</div>" +
                                            "<div class='toBlock'>" +
                                                "{{#right_list}}" +
                                                    "<div class='uff-item' data-dual='{{dual_id}}' data-id='{{id}}'>" +
                "<div class='name'>{{name}} {{#buttons}} {{&result.tpl}} {{/buttons}}</div>" +
                right_btns +
                                                    "</div>" +
                                                "{{/right_list}}" +
                                            "</div>" +
                                        "</div>" +
                                    "</div>" +
                                "</div>" +
                            "</div>" +
                            "</div>" +
                            "</div>" +
                            "<div class='uff-buttons'>" +
                            "{{{back_button}}}" +
                "</div>";


            var mO = {
	            search_placeholder: _t.search_placeholder,
                left_label: _t.left_label,
                right_label: _t.right_label,
                search_label: _t.search_label,
                left_list: [],
                right_list: [],
                back_button: (_t.back_button) ? "<div class='form-role-slideBack fn-small-btn fn-btn blue'><i class='fa fa-chevron-left'></i> Вернуться</div>" : ""
            };
            var flat_right_list = [];
            for(let i in _t.right_data){
                let right_item = _t.right_data[i];
                let right_item_id = right_item[_t.left_id];
                flat_right_list.push(right_item[_t.exclude_left_field]);
                mO.right_list.push({
                    id: right_item[_t.right_id],
                    name: right_item[_t.right_name],
                    dual_id: right_item[_t.left_id],
                    buttons:  right_item.buttons,
                });
            }
            for(var k in _t.left_data){
                var left_item = _t.left_data[k];
                var left_item_id = left_item[_t.left_id];
                if($.inArray(left_item_id, flat_right_list) == -1){
                    mO.left_list.push({
                        id: left_item[_t.left_id],
                        name: left_item[_t.left_name],
                        buttons:  left_item.buttons,
                    });
                }
            }
            _t.wrapper.html(Mustache.to_html(tpl, mO));
            _t.left_items = _t.wrapper.find('.fromBlock .uff-item');
            resolveRender();
        })};

        Tce.prototype.setHandlers = function(){
            var _t = this;
            _t.wrapper.find('.fromBlock .uff-item').off('click').on('click', function(){
                let this_id = $(this).attr('data-id');

                var o = {
                    command: 'add',
                    object: _t.lu_command,
                    params:{}
                };

                for(let i in _t.add_params){
                    var ap = _t.add_params[i];

                    if(ap.value == 'GET_ROW_ID'){
                        o.params[ap.key] = +this_id;
                    }else{
                        o.params[ap.key] = (isNaN(ap.value))? ap.value : +ap.value;
                    }
                }

                socketQuery(o, function(res){
                    _t.reload();
                });
            });
            _t.wrapper.find('.toBlock .uff-item').off('click').on('click', function(){
                var o = {
                    command: 'remove',
                    object: _t.lu_command,
                    params:{}
                };
                o.params[_t.right_pk] = $(this).data('id');

                socketQuery(o, function(res){
                    _t.reload();
                });
            });



            _t.wrapper.find('.tce-confirm-search').off('click').on('click', function(){
                var val = _t.wrapper.find('.search_entries').val();
                var items = _t.left_items;

                items.hide(0);

                for(var i = 0; i < items.length; i++){
                    var item = items.eq(i);
                    var title = item.find('.name').html().toLowerCase();

                    if(title.indexOf(val.toLowerCase()) > -1){
                        item.show(0);
                    }
                }

            });

            _t.wrapper.find('.tce-search-holder').keyup(function(event){
                if(event.keyCode == 13){
                    event.preventDefault();

                    _t.wrapper.find('.tce-confirm-search').click();

                }
            });

            _t.wrapper.find('.search_entries').off('input').on('input', function(){
                if($(this).val() == ''){
                    _t.left_items.show(0);
                }
            });
            // additional_button

            if(_t.additional_button.right_column) {
                console.log('_t.additional_button.right_column');
                for (let i in _t.additional_button.right_column) {
                    _t.wrapper.find('.' + _t.additional_button.right_column[i].nameButton).click(function(e) {
                        _t.additional_button.right_column[i].getHandler($(this).attr('data-id'));
                        e.stopPropagation()
                    })
                }
            }
            if(_t.additional_button.left_column) {
                console.log('_t.additional_button.left_column');
                for (let i in _t.additional_button.left_column) {
                    _t.wrapper.find('.' + _t.additional_button.left_column[i].nameButton).click(function(e) {
                        _t.additional_button.left_column[i].getHandler($(this).attr('data-id'));
                        e.stopPropagation()
                    })
                }
            }
        };

        /**
         * reload
         */
        Tce.prototype.reload = async function(){
            var _t = this;

            MB.Core.spinner.start(_t.wrapper);

            await _t.getData();
            _t.populate();
            _t.setHandlers();
            MB.Core.spinner.stop(_t.wrapper);
            // debugger
            // _t.getData(function(){
            //     debugger
            //     _t.populate();
            //     _t.setHandlers();
            //
            //
            //
            // });
        };

//        Tce.prototype.send_command = function(){
//
//        };


        var tce = new Tce(this, options);

        tce.init(function(){

        });
        return tce;
    };

    $.fn.tce_simple = function (options) {
        let TceS = function (wrapper, obj) {
            this.wrapper = wrapper || undefined;

            this.data = obj.data || [];

            this.left_label = obj.left_label || 'Доступные к подключению';
            this.right_label = obj.right_label || 'Подключенные';
        };

        TceS.prototype.init = function () {
            this.populateInterface();
            this.populateList();
            this.setHandlers();
        };

        TceS.prototype.populateInterface = function () {
            let _t = this;

            let tpl = `
                <div id='tce_inner'>
                    <div class='row'>
                        <div class='col-md-12'>
                            <div class='toBlockCheckboxes'>
                                <div class='col-md-6'>
                                    <div class='row'>
                                        <div class='role-hl'>{{left_label}}</div>
                                        <div class='fromBlock'>
                                        </div>
                                    </div>
                                </div>
                                <div class='col-md-6'>
                                    <div class='row'>
                                        <div class='role-hl'>{{right_label}}</div>
                                        <div class='toBlock'>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            let mO = {
                left_label: _t.left_label,
                right_label: _t.right_label,
            };

            _t.wrapper.html(Mustache.to_html(tpl, mO));
        };

        TceS.prototype.populateList = function () {
            let _t = this;

            let tpl_left = `
                {{#left_list}}
                <div class='uff-item' data-id='{{id}}'>
                    <div class='name'>{{name}}</div>
                    </div>
                {{/left_list}}
            `;

            let tpl_right = `
                {{#right_list}}
                <div class='uff-item' data-id='{{id}}'>
                    <div class='name'>{{name}}</div>
                </div>
                {{/right_list}}
            `;

            let mO = {
                left_list: [],
                right_list: []
            };

            if (_t.data.length && !('id' in _t.data[0]))
                _t.data.forEach((row, i) => {
                    row.id = i;
                });

            _t.data.forEach((row, i) => {
                if (row.checked) {
                    mO.right_list.push(row);
                } else {
                    mO.left_list.push(row);
                }
            });

            _t.wrapper.find('.fromBlock').html('');
            _t.wrapper.find('.fromBlock').html(Mustache.to_html(tpl_left, mO));
            _t.wrapper.find('.toBlock').html('');
            _t.wrapper.find('.toBlock').html(Mustache.to_html(tpl_right, mO));
        };

        TceS.prototype.setHandlers = function () {
            let _t = this;

            _t.wrapper.find('.fromBlock .uff-item').off('click').on('click', function () {
                let this_id = $(this).attr('data-id');

                for (let row of _t.data) {
                    if (row.id === +this_id) {
                        row.checked = true;
                        break;
                    }
                }

                _t.populateList();
                _t.setHandlers();
            });

            _t.wrapper.find('.toBlock .uff-item').off('click').on('click', function () {
                let this_id = $(this).attr('data-id');

                for (let row of _t.data) {
                    if (row.id === +this_id) {
                        row.checked = false;
                        break;
                    }
                }

                _t.populateList();
                _t.setHandlers();
            });

        };

        TceS.prototype.getData = function () {
            return this.data.filter(row => {
                return row.checked;
            });
        };

        TceS.prototype.reload = function () {
            this.populateInterface();
            this.populateList();
            this.setHandlers();
        };


        let tce = new TceS(this, options);

        tce.init(function () {

        });

        return tce;
    }

}());
