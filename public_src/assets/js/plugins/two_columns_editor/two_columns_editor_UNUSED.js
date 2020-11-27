
// 1. Доступно добавление условия where для обоих списков
// 2. Вместо new / remove - modify

(function(){

    $.fn.tce2 = function(options){
        var Tce2 = function(wrapper, obj){
            this.wrapper = wrapper || undefined;

            this.parent_id = obj.parent_id || undefined;
            this.parent_object = obj.parent_object;
            this.parent_key = obj.parent_key || undefined;

            this.left_data = undefined;
            this.right_data = undefined;

            this.left_pk = obj.left_pk;
            this.right_pk = obj.right_pk;

            this.left_id = obj.left_id;
            this.right_id = obj.right_id;

            this.left_name = obj.left_name;
            this.right_name = obj.right_name;

            this.dual_id = obj.dual_id;

            this.get_left = obj.get_left;
            this.get_right = obj.get_right;

            this.lu_command = obj.lu_command;
            this.lu_column = obj.lu_column;
            this.back_button = obj.back_button;

            this.where_left_param = obj.where_left_param;
            this.where_right_param = obj.where_right_param;
            this.where_left_column = obj.where_left_column;
            this.where_right_column = obj.where_right_column;


            this.left_label = obj.left_label || 'Доступные к подключению';
            this.right_label = obj.right_label || 'Подключенные';
            this.search_label = obj.search_label || 'Поиск';

        };


        Tce2.prototype.init = function(){
            var _t = this;
            _t.getData(function(){
                _t.populate();
                _t.setHandlers();
            });
        };

        Tce2.prototype.getData = function(cb){
            var _t = this;

            var whereStrLeft = _t.where_left_param + ' = ' + _t.parent_object.data.data[0][_t.where_left_column];
            var whereStrRight = _t.where_right_param + ' = ' + _t.parent_object.data.data[0][_t.where_right_column];

            console.log('ADHASKJDHASKJDHKASHDKHASKDHASHDK->',whereStrLeft, whereStrRight, _t.get_left, _t.get_right);

            socketQuery({
                command: "get",
                object: _t.get_left,
                params:{
                    where: whereStrLeft
                }

            }, function(res){

                _t.left_data = socketParse(res);

                socketQuery({
                    command: "get",
                    object: _t.get_right,
                    params:{
                        where: whereStrRight //_t.parent_key + " = " + _t.parent_id
                    }
                }, function(res){
                    _t.right_data = socketParse(res);

                    if(typeof cb == 'function'){

                        console.log(_t);

                        cb();
                    }
                });
            });
        };

        Tce2.prototype.populate = function(){
            var _t = this;

            var tpl =  "<div id='tce_inner'>" +
                            "<div class='row'>" +
                                "<div class='col-md-12'>" +
                                    "<div class='toBlockCheckboxes'>" +
                                        "<div class='col-md-6'>" +
                                            "<div class='row lh25'>" +
                                                "<label class='fn-label'>{{search_label}}</label>" +
                                                "<input type='text' class='search_entries fn-control' placeholder='Поиск'/>" +
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
                                                            "<div class='name'>{{name}}</div>" +
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
                                                        "<div class='name'>{{name}}</div>" +
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
                left_label: _t.left_label,
                right_label: _t.right_label,
                search_label: _t.search_label,
                left_list: [],
                right_list: [],
                back_button: (_t.back_button) ? "<div class='form-role-slideBack fn-small-btn fn-btn blue'><i class='fa fa-chevron-left'></i> Вернуться</div>" : ""
            };

            var flat_right_list = [];

            for(var i in _t.right_data){
                var right_item = _t.right_data[i];
                var right_item_id = right_item[_t.left_id];

                flat_right_list.push(right_item_id);

                mO.right_list.push({
                    id: right_item[_t.right_id],
                    name: right_item[_t.right_name],
                    dual_id: right_item[_t.left_id]
                });

            }



            for(var k in _t.left_data){
                var left_item = _t.left_data[k];
                var left_item_id = left_item[_t.left_id];

                if($.inArray(left_item_id, flat_right_list) == -1){
                    mO.left_list.push({
                        id: left_item[_t.left_id],
                        name: left_item[_t.left_name]
                    });
                }
            }

            _t.wrapper.html(Mustache.to_html(tpl, mO));

            _t.left_items = _t.wrapper.find('.fromBlock .uff-item');
        };

        Tce2.prototype.setHandlers = function(){
            var _t = this;

            _t.wrapper.find('.fromBlock .uff-item').off('click').on('click', function(){
                var o = {
                    command: 'modify',
                    object: _t.lu_command,
                    params:{}
                };
                o.params[_t.left_pk] = $(this).data('id');
                o.params[_t.lu_column] = _t.parent_id;

                socketQuery(o, function(res){
                    _t.reload();
                });
            });

            _t.wrapper.find('.toBlock .uff-item').off('click').on('click', function(){
                var o = {
                    command: 'modify',
                    object: _t.lu_command,
                    params:{}
                };
                o.params[_t.right_pk] = $(this).data('id');
                o.params[_t.lu_column] = '';

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

            _t.wrapper.find('.search_entries').off('input').on('input', function(){
                if($(this).val() == ''){
                    _t.left_items.show(0);
                }
            });

        };

        Tce2.prototype.reload = function(){
            var _t = this;

            MB.Core.spinner.start(_t.wrapper);

            _t.getData(function(){
                _t.populate();
                _t.setHandlers();

                MB.Core.spinner.stop(_t.wrapper);

            });
        };




        var tce2 = new Tce2(this, options);

        tce2.init(function(){

        });
        return tce2;
    };


}());
