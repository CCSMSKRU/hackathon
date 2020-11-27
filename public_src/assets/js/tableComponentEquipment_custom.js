var socketQueryPr = function socketQueryPr(param) {
    return new Promise(function (resolve, rej) {
        socketQuery(param, function (res) {
            resolve(res);
        });
    });
};

class TableComponentsEquipment {
    constructor (equipment_id, wrapper, params_obj) {
        this.storage = {
            not_editable: false,
            equipment_id: equipment_id,
            components: [],
            changes: [],
            changed_component: false,
            dom: {
                wrapper: wrapper,
                wrapper_for_table: undefined,
                wrapper_for_button: undefined,
                button_new_component: undefined,
                button_save_changes: undefined,
                components: [],
                table: undefined,
            }
        }
        if (params_obj) {
            if (params_obj.not_editable === true || params_obj.not_editable === false) this.storage.not_editable = params_obj.not_editable
            if (params_obj.hide_if_no_data === true || params_obj.hide_if_no_data === false) this.storage.hide_if_no_data = params_obj.hide_if_no_data
            if (typeof params_obj.after_save === 'function') this.storage.after_save = params_obj.after_save
        }
        this.init()
    }
    async init() {
        let types = await this.getAllTypesComponent()
        this.storage.types = types
        this.renderBasicElemnts()
        await this.initComponents()
        if (this.storage.hide_if_no_data && this.storage.components.length === 0) this.hideAll()
        if (this.storage.not_editable) return
        this.setHandlersButtonAdd()
        this.setHandlersButtonSaveChange()
    }

    hideAll() {
        if (this.storage.dom.wrapper_for_table instanceof Element) this.storage.dom.wrapper_for_table.style.display = "none";
        if (this.storage.dom.wrapper_for_button instanceof Element) this.storage.dom.wrapper_for_button.style.display = "none";
        if (this.storage.dom.button_new_component instanceof Element) this.storage.dom.button_new_component.style.display = "none";
        if (this.storage.dom.button_save_changes instanceof Element) this.storage.dom.button_save_changes.style.display = "none";
        if (this.storage.dom.table instanceof Element) this.storage.dom.table.style.display = "none";
    }

    showAll() {
        if (this.storage.dom.wrapper_for_table instanceof Element) this.storage.dom.wrapper_for_table.style.display = "unset";
        if (this.storage.dom.wrapper_for_button instanceof Element) this.storage.dom.wrapper_for_button.style.display = "unset";
        if (this.storage.dom.button_new_component instanceof Element) this.storage.dom.button_new_component.style.display = "unset";
        if (this.storage.dom.button_save_changes instanceof Element) this.storage.dom.button_save_changes.style.display = "unset";
        if (this.storage.dom.table instanceof Element) this.storage.dom.table.style.display = "none";
    }

    async initComponents() {
        this.storage.components = await this.getComponents()
        this.renderComponents()
        if (this.storage.not_editable) return
        this.storage.components.forEach(component => {
            this.setHandlersComponent(component)
        })
    }
    async getComponents() {
        let o = {
            command: 'get',
            object: 'component_equipment',
            params: {
                param_where: {
                    equipment_id: this.storage.equipment_id
                },
                columns: ['id', 'type', 'type_id', 'name', 'description', 'technical_charaters', 'type_input']
            }
        }
        let components_equipment = await socketQueryPr(o)
        components_equipment = Object.values(components_equipment.data).reverse()
        return components_equipment
    }
    async getComponent(id) {
        let o = {
            command: 'get',
            object: 'component_equipment',
            params: {
                param_where: {
                    id: id
                },
                columns: ['id', 'type', 'type_id', 'name', 'description', 'technical_charaters', 'type_input']
            }
        }
        let result = await socketQueryPr(o)
        return result.data[0]
    }
    async getAllTypesComponent() {
        let o = {
            command: 'get',
            object: 'type_component_equipment',
        }
        let types = await socketQueryPr(o)
        types = Object.values(types.data).map(type => {
            return {
                id: type.id,
                name: type.name
            }
        })
        return types
    }
    renderBasicElemnts() {

        if (this.storage.dom.wrapper) this.storage.dom.wrapper.innerHTML = ''


        //render wrapper_for_table
        let wrapper_for_table = document.createElement('div')
        wrapper_for_table.className = 'wrapper-for-table-component'
        this.storage.dom.wrapper.appendChild(wrapper_for_table)
        this.storage.dom.wrapper_for_table = wrapper_for_table


        //render table
        let table = document.createElement('table')
        table.className = 'table-component-equipment'

        table.style.textAlign = this.storage.not_editable ? 'left' : ''
        table.style.width = this.storage.not_editable ? '100%' : ''
        table.style.borderCollapse = this.storage.not_editable ? 'collapse' : 'auto'


        let tr_1 = document.createElement('tr')

        let th_1 = document.createElement('th')
        th_1.textContent = 'Обозначение'
        th_1.style.paddingBottom = this.storage.not_editable ? '13px' : ''
        th_1.style.fontSize = this.storage.not_editable ? '12px' : ''

        let th_2 = document.createElement('th')
        th_2.textContent = 'Наименование'
        th_2.style.paddingBottom = this.storage.not_editable ? '13px' : ''
        th_2.style.fontSize = this.storage.not_editable ? '12px' : ''

        let th_3 = document.createElement('th')
        th_3.textContent = 'Технические характеристики'
        th_3.style.paddingBottom = this.storage.not_editable ? '13px' : ''
        th_3.style.fontSize = this.storage.not_editable ? '12px' : ''

        let th_4 = document.createElement('th')
        th_4.textContent = 'Комментарии'
        th_4.style.paddingBottom = this.storage.not_editable ? '13px' : ''
        th_4.style.fontSize = this.storage.not_editable ? '12px' : ''

        let th_5 = document.createElement('th')
        th_5.textContent = 'Описание'
        th_5.style.paddingBottom = this.storage.not_editable ? '13px' : ''
        th_5.style.fontSize = this.storage.not_editable ? '12px' : ''

        // if (!this.storage.not_editable) {
        let th_6 = document.createElement('th')
        th_6.textContent = 'Действия'
        th_6.style.paddingBottom = this.storage.not_editable ? '13px' : ''
        th_6.style.fontSize = this.storage.not_editable ? '12px' : ''
        // }


        tr_1.appendChild(th_1)
        tr_1.appendChild(th_2)
        tr_1.appendChild(th_3)
        tr_1.appendChild(th_4)
        tr_1.appendChild(th_5)

        if (!this.storage.not_editable) {
            tr_1.appendChild(th_6)
        }



        table.appendChild(tr_1)
        this.storage.dom.table = table
        this.storage.dom.wrapper_for_table.appendChild(this.storage.dom.table)

        if (!this.storage.not_editable) {
            //render wrapper_for_button
            let wrapper_for_button = document.createElement('div')
            wrapper_for_button.className = 'wrapper-for-button-bottom-specification wrapper-for-button-bottom-components';
            // this.storage.dom.wrapper.appendChild(wrapper_for_button);
            this.storage.dom.wrapper.insertBefore(wrapper_for_button, this.storage.dom.wrapper.firstChild);
            this.storage.dom.wrapper_for_button = wrapper_for_button

            //render button_new_specification
            var button_new_component = document.createElement('div');
            button_new_component.className = 'button-bottom-new-specification button-specification';
            button_new_component.innerHTML = '<i class="fa fa-plus"></i>&nbsp;&nbsp;Добавить';

            this.storage.dom.wrapper_for_button.appendChild(button_new_component)
            this.storage.dom.button_new_component = button_new_component

            //render button_save_changes
            var button_save_changes = document.createElement('div');
            button_save_changes.className = 'button-bottom-save-changes button-specification';
            button_save_changes.innerHTML = '<i class="fa fa-save"></i>&nbsp;&nbsp;Сохранить';
            this.storage.dom.wrapper_for_button.appendChild(button_save_changes)
            this.storage.dom.button_save_changes = button_save_changes
        }

    }
    renderComponents() {
        this.storage.dom.components.forEach(component => {
            try {
                this.storage.dom.table.removeChild(component)
            } catch (e) {

            }
        })
        this.storage.dom.components = []
        this.storage.components.forEach(component => {
            this.renderComponent(component)
        })
    }
    renderComponent(component) {

        // let specification = this.storage.specifications[this.storage.specifications.length - 1]

        let dom_component = document.createElement('tr')
        dom_component.style.border = '1px solid black'
        let td_1 = document.createElement('td')
        let td_2 = document.createElement('td')
        let td_3 = document.createElement('td')
        let td_4 = document.createElement('td')
        let td_5 = document.createElement('td')
        let td_6 = document.createElement('td')

        dom_component.appendChild(td_1)
        dom_component.appendChild(td_2)
        dom_component.appendChild(td_3)
        dom_component.appendChild(td_4)
        dom_component.appendChild(td_5)

        if (!this.storage.not_editable) {
            dom_component.appendChild(td_6)
        }



        // let select_type
        if (!this.storage.not_editable) {
            // select_type = document.createElement('select')
            // select_type.className = 'fn-control'
            // this.storage.types.forEach(type => {
            //     let option = document.createElement('option')
            //     option.value = type.id
            //     option.innerText = type.name
            //     select_type.appendChild(option)
            // })
        } else {
            // select_type = document.createElement('div')
            // select_type.textContent = component.type

            td_1.style.verticalAlign = 'top'
            td_2.style.verticalAlign = 'top'
            td_3.style.verticalAlign = 'top'
            td_4.style.verticalAlign = 'top'
            td_5.style.verticalAlign = 'top'
            td_6.style.verticalAlign = 'top'

            td_1.style.border = '1px solid #ddd'
            td_2.style.border = '1px solid #ddd'
            td_3.style.border = '1px solid #ddd'
            td_4.style.border = '1px solid #ddd'
            td_5.style.border = '1px solid #ddd'
            td_6.style.border = '1px solid #ddd'

            td_1.style.padding = '5px'
            td_2.style.padding = '5px'
            td_3.style.padding = '5px'
            td_4.style.padding = '5px'
            td_5.style.padding = '5px'
            td_6.style.padding = '5px'

            td_1.style.borderSpacing = '0px'
            td_2.style.borderSpacing = '0px'
            td_3.style.borderSpacing = '0px'
            td_4.style.borderSpacing = '0px'
            td_5.style.borderSpacing = '0px'
            td_6.style.borderSpacing = '0px'

            td_1.style.fontSize = '12px'
            td_2.style.fontSize = '12px'
            td_3.style.fontSize = '12px'
            td_4.style.fontSize = '12px'
            td_5.style.fontSize = '12px'
            td_6.style.fontSize = '12px'

        }


        // select_type.style.display = this.storage.not_editable ? 'none' : 'auto'




        // select_type.setAttribute("value", component.type)

        let input_type
        let input_name
        let input_comment
        let input_description
        if (!this.storage.not_editable) {
            input_type = document.createElement('textarea')
            input_type.className = 'chromeScroll'
            input_type.value = component.type_input

            input_name = document.createElement('textarea')
            input_name.className = 'chromeScroll'
            input_name.value = component.name

            input_comment = document.createElement('textarea')
            input_comment.className = 'chromeScroll'
            input_comment.value = component.description

            input_description = document.createElement('textarea')
            input_description.className = 'chromeScroll'
            input_description.value = component.technical_charaters
        } else {
            input_type = document.createElement('div')
            input_type.className = 'chromeScroll'
            input_type.textContent = component.type_input

            input_name = document.createElement('div')
            input_name.className = 'chromeScroll'
            input_name.textContent = component.name

            input_comment = document.createElement('div')
            input_comment.className = 'chromeScroll'
            input_comment.textContent = component.description

            input_description = document.createElement('div')
            input_description.className = 'chromeScroll'
            input_description.textContent = component.technical_charaters
        }




        var button_doublicate = document.createElement('div');
        button_doublicate.className = 'spec-actions-btn-2 component-duplicate';
        button_doublicate.innerHTML = '<i class="fa fa-copy"></i>&nbsp;&nbsp;Дублировать';

        var button_remove = document.createElement('div');
        button_remove.className = 'spec-actions-btn-2 component-remove';
        button_remove.innerHTML = '<i class="fa fa-trash"></i>&nbsp;&nbsp;Удалить';

        var button_add_property = document.createElement('div');
        button_add_property.className = 'spec-actions-btn-2 component-add-char';
        button_add_property.innerHTML = '<i class="fa fa-plus"></i>&nbsp;&nbsp;Добавить характеристику';
        // }

        td_1.appendChild(input_type)
        td_2.appendChild(input_name)

        let params_obj = {}
        if (this.storage.not_editable) params_obj.not_editable = true
        // component.properties_table = new TablePropertiesComponentEquipment(component.id, td_3, {
        // observe_change: this.observer_change_child.bind(this)
        // observer: this.observer_childs_table_properties_component_equipment.bind(this, event_name, data)
        // }, params_obj)
        component.properties_table = new TablePropertiesComponentEquipment(
            component,
            td_3,
            this.observer_childs_table_properties_component_equipment.bind(this),
            params_obj)

        td_4.appendChild(input_comment)
        td_5.appendChild(input_description)

        if (!this.storage.not_editable) {
            td_6.appendChild(button_doublicate)
            td_6.appendChild(button_remove)
            // td_6.appendChild(button_add_property)
            td_3.insertBefore(button_add_property, component.properties_table.storage.dom.table)

        }

        this.storage.dom.table.appendChild(dom_component)
        this.storage.dom.components.push(dom_component)


        // let select_type_select2
        // if (!this.storage.not_editable) {
        //     select_type_select2 = $(select_type).select2()
        //     select_type_select2.val(component.type_id)
        //     select_type_select2.trigger('change');
        // }


        component.dom = {
            // select_type: select_type,
            input_name: input_name,
            input_type: input_type,
            // table_propeties: table_propeties,
            input_comment: input_comment,
            input_description: input_description,
            row: dom_component
        }
        if (!this.storage.not_editable) {
            component.dom.button_doublicate = button_doublicate;
            component.dom.button_remove = button_remove;
            component.dom.button_add_property = button_add_property;
            // component.dom.select_type_select2 = select_type_select2
        }
    }
    setHandlersButtonAdd() {
        this.storage.dom.button_new_component.addEventListener('click', this.addNewComponent.bind(this, undefined, undefined, undefined, undefined))
        // this.addNewSpecification()
    }
    setHandlersButtonSaveChange() {
        this.storage.dom.button_save_changes.addEventListener('click', this.saveChanges.bind(this))
    }
    setHandlersComponent(component) {
        component.dom.button_doublicate.addEventListener('click', this.handlerDoublicateComponent.bind(this, component))
        component.dom.button_remove.addEventListener('click', this.handlerRemoveComponent.bind(this, component))
        component.dom.button_add_property.addEventListener('click', component.properties_table.addNewProperty.bind(component.properties_table, undefined, undefined))

        // if (!this.storage.not_editable) {
        //     component.dom.select_type_select2.on('select2:select', (e) => {
        //         this.handlerChangeSelectComponent(component, 'type_id', e)
        //     });
        // }


        component.dom.input_type.addEventListener('keyup', this.handlerChangeComponent.bind(this, component, 'input_type'))
        component.dom.input_name.addEventListener('keyup', this.handlerChangeComponent.bind(this, component, 'name'))
        component.dom.input_comment.addEventListener('keyup', this.handlerChangeComponent.bind(this, component, 'description'))
        component.dom.input_description.addEventListener('keyup', this.handlerChangeComponent.bind(this, component, 'technical_charaters'))
    }

    observer_change_child_properties(flag_change) {
        if (flag_change == false) {
            if (this.storage.changes.length && !this.storage.changed_component) {
                this.storage.changed_component = true
                this.diactivateButtonSaveChanges()
            } else {
                this.storage.changed_component = false
                this.activateButtonSaveChanges()
            }
        }
        if (flag_change == true) {
            this.storage.changed_component = true
            this.activateButtonSaveChanges()
        }
    }
    // observer_add_child_property(data) {
    //     debugger
    // }

    observer_childs_table_properties_component_equipment(event_name, data) {
        if (event_name === 'change') return this.observer_change_child_properties(data)
        if (event_name === 'addNewProperty') return this.observer_add_child_property(data)
    }

    handlerChangeSelectComponent(component, type_field, event) {
        let check_chages = false
        component[type_field] = event.params.data.id
        this.storage.changes.forEach(change_component => {
            if (change_component.id == component.id) {
                check_chages = true
            }
        })
        if (!check_chages) this.storage.changes.push(component)
        this.checkStateChanges()
    }
    async handlerDoublicateComponent(component, event) {
        let old_component = component
        let new_component = await this.addNewComponent(component.name, component.description, component.technical_charaters, component.type_input)
        await new_component.properties_table.addNewProperties(old_component.properties_table.storage.properties)
    }
    handlerChangeComponent(component, type_field, event) {
        let check_chages = false
        component[type_field] = event.target.value
        this.storage.changes.forEach(change_component => {
            if (change_component.id == component.id) {
                check_chages = true
            }
        })
        if (!check_chages) this.storage.changes.push(component)
        this.checkStateChanges()
    }
    async saveChanges() {
        if (!this.storage.changed_component) return
        let _t = this
        let prom_func = []
        this.storage.changes.forEach(changed_component => {
            prom_func.push(
                new Promise(async (resolve, reject) => {
                    let o = {
                        command: 'modify',
                        object: 'component_equipment',
                        params: {
                            id: changed_component.id,
                            name: changed_component.name,
                            description: changed_component.description,
                            technical_charaters: changed_component.technical_charaters,
                            type_input: changed_component.input_type
                        }
                    }
                    await socketQueryPr(o)
                    resolve()
                })
            )
        })
        Promise.all(prom_func).then(function(){
            _t.storage.changes = []
            _t.checkStateChanges()
        });

        return _t.saveChangesChildTables()
        if (typeof _t.storage.after_save === 'function') {
            _t.storage.after_save()
        }
    }
    async saveChangesChildTables() {
        if (!this.storage.changed_component) return
        let _t = this
        let prom_func = []
        this.storage.components.forEach(component => {
            prom_func.push(
                new Promise(async (resolve, reject) => {
                    await component.properties_table.saveChanges()
                    resolve()
                })
            )
        })
        return Promise.all(prom_func).then(function(){
            _t.storage.changes = []
            _t.checkStateChanges()
        });
    }

    handlerRemoveComponent(component, event) {
        this.removeComponent(component)
    }
    checkStateChanges() {
        if (this.storage.changes.length && !this.storage.changed_component) {
            this.storage.changed_component = true
            this.activateButtonSaveChanges()
        }
        if (!this.storage.changes.length && this.storage.changed_component) {
            this.storage.changed_component = false
            this.diactivateButtonSaveChanges()
        }
    }
    activateButtonSaveChanges() {
        this.storage.dom.button_save_changes.classList.add('activeted')
    }
    diactivateButtonSaveChanges() {
        this.storage.dom.button_save_changes.classList.remove('activeted')
    }
    async addNewComponent(name, description, technical_charaters, type_input) {
        let o = {
            command: 'add',
            object: 'component_equipment',
            params: {
                equipment_id: this.storage.equipment_id,
            }
        }
        if (name) o.params.name = name
        if (description) o.params.description = description
        if (technical_charaters) o.params.technical_charaters = technical_charaters
        if (type_input) o.params.type_input = type_input
        let new_component_equipment = await socketQueryPr(o)
        let last_component = await this.getComponent(new_component_equipment.id)
        this.storage.components.push(last_component)
        this.storage.dom.components.push(last_component)
        this.renderComponent(last_component)
        this.setHandlersComponent(last_component)
        return last_component
    }
    async removeComponent(component) {
        let o = {
            command: 'remove',
            object: 'component_equipment',
            params: {
                id: component.id
            }
        }
        await socketQueryPr(o)
        component.dom.row.remove()
        this.storage.changes = this.storage.changes.filter(component_change_i => {
            return component_change_i.id != component.id
        })
        this.storage.dom.components = this.storage.dom.components.filter(component_dom => {
            return component_dom != component.dom.row
        })
        this.storage.components = this.storage.components.filter(component_i => {
            return component_i != component
        })
        this.checkStateChanges()
    }
}

class TablePropertiesComponentEquipment {
    constructor(component, wrapper, observer, params_obj) {
        this.storage = {
            component_id: component.id,
            parent_component: component,
            properties: [],
            changes: [],
            changed_properties: false,
            dom: {
                wrapper: wrapper,
                wrapper_for_table: undefined,
                wrapper_for_button: undefined,
                properties: [],
                table: undefined,
            }
        }
        this.emitter = observer
        if (params_obj) {
            if (params_obj.not_editable) this.storage.not_editable = params_obj.not_editable
        }
        this.init()
    }
    async init() {
        this.renderBasicElements()
        await this.initProperties()
    }
    renderBasicElements() {
        let table = document.createElement('table')
        table.className = 'table-component-equipment table-component-equipment-inner'

        table.style.borderCollapse = this.storage.not_editable ? 'collapse' : ''
        table.style.width = this.storage.not_editable ? '100%' : ''

        this.storage.dom.wrapper.appendChild(table)
        this.storage.dom.table = table
        //return table
    }
    async getProperties() {
        let o = {
            command: 'get',
            object: 'properties_component_equipment',
            params: {
                param_where: {
                    component_equipment_id: this.storage.component_id,
                },
                collapseData: false,
                columns: ['id', 'component_equipment_id', 'name', 'value']
            }
        }
        let properties_components_equipment = await socketQueryPr(o)
        properties_components_equipment = properties_components_equipment.filter(property => property.id)
        properties_components_equipment.forEach(property => {
            property.dom = {}
        })
        return Object.values(properties_components_equipment)
    }
    async initProperties() {
        this.storage.properties = []
        this.storage.changes = []
        this.storage.dom.properties.forEach(property => property.row.remove())
        this.storage.dom.properties = []
        this.storage.changed_properties = false

        this.storage.properties = await this.getProperties()
        this.storage.properties.reverse()
        this.renderPropertiesComponent(this.storage.properties)

        if (this.storage.not_editable) return;
        this.setHandlers()
    }
    renderPropertiesComponent(properties) {
        properties.forEach(property => {
            this.renderPropertyComponent(property)
        })
    }
    renderPropertyComponent(property) {

        let row = document.createElement('tr')

        let td_name = document.createElement('td')
        let td_value = document.createElement('td')

        let input_name
        let input_value

        if (!this.storage.not_editable) {
            input_name = document.createElement('input')
            input_value = document.createElement('input')

            input_name.setAttribute("value", property.name)
            input_value.setAttribute("value", property.value)
        } else {

            td_name.style.border = '1px solid #ddd'
            td_name.style.borderSpacing = '0'

            td_value.style.border = '1px solid #ddd'
            td_value.style.borderSpacing = '0'

            input_name = document.createElement('div')
            input_value = document.createElement('div')

            input_name.textContent = property.name
            input_value.textContent = property.value

            input_name.style.fontSize = '12px'
            input_value.style.fontSize = '12px'



        }

        td_name.appendChild(input_name)
        td_value.appendChild(input_value)

        let td_buttons = document.createElement('td')

        td_buttons.className = 'small-buttons-td'

        let button_doublicate = document.createElement('i')
        button_doublicate.className = 'spec-actions-btn fa fa-copy';

        let button_remove = document.createElement('i')
        button_remove.className = 'spec-actions-btn fa fa-trash';


        if (!this.storage.not_editable) {
            td_buttons.appendChild(button_doublicate)
            td_buttons.appendChild(button_remove)
        }

        row.appendChild(td_name)
        row.appendChild(td_value)
        if (!this.storage.not_editable) row.appendChild(td_buttons)
        let property_obj_dom = {
            row: row,
            input_name: input_name,
            input_value: input_value,

        }
        if (!this.storage.not_editable) {
            property_obj_dom.button_doublicate = button_doublicate
            property_obj_dom.button_remove = button_remove
        }
        this.storage.dom.properties.push(property_obj_dom)
        this.storage.dom.table.appendChild(row)
        property.dom = property_obj_dom
        return property_obj_dom
    }
    setHandlers(property) {
        let properties_for_set_handlers = []
        if (property) {
            if (Array.isArray(property)) {
                properties_for_set_handlers = property
            } else {
                properties_for_set_handlers = [property]
            }
        } else {
            properties_for_set_handlers = this.storage.properties
        }

        properties_for_set_handlers.forEach(property => {
            property.dom.input_name.addEventListener('keyup', this.handlerChangeInput.bind(this, property, 'name'))
            property.dom.input_value.addEventListener('keyup', this.handlerChangeInput.bind(this, property, 'value'))
            property.dom.button_doublicate.addEventListener('click', this.handlerClickButton.bind(this, property, 'doublicate'))
            property.dom.button_remove.addEventListener('click', this.handlerClickButton.bind(this, property, 'remove'))
        })
    }
    handlerChangeInput(property, type, event) {
        if (!this.storage.changed_properties) {
            property[type] = event.target.value
            this.storage.changes.push(property)
        } else if (this.storage.changed_properties) {
            let check_chages = false
            this.storage.changes.forEach(property_change => {
                if (property_change.id == property.id) {
                    check_chages = true
                    property_change[type] = event.target.value
                }
            })
            if (!check_chages) {
                property[type] = event.target.value
                this.storage.changes.push(property)
            }
        }
        this.checkChanges()

    }
    async handlerClickButton(property, type) {
        if (type == 'doublicate') this.doublicate_property(property)
        if (type == 'remove')  this.remove_property(property)
    }
    async addNewProperty(name, value) {
        let o = {
            command: 'add',
            object: 'properties_component_equipment',
            params: {
                component_equipment_id: this.storage.component_id,
                name: name ? name : '',
                value: value ? value : ''
            }
        }
        let res_new_property = await socketQueryPr(o)
        let new_property = {
            id: res_new_property.id,
            name: name ? name : '',
            value: value ? value : ''
        }
        this.storage.properties.push(new_property)
        this.renderPropertyComponent(new_property)
        this.setHandlers(new_property)
        return new_property
    }
    async addNewProperties(properties_arr) {
        let _t = this
        async function* asyncGeneratorNewProperty(properties_arr) {
            let i = 0;
            while (true) {
                if (properties_arr[i]) {
                    await _t.addNewProperty(properties_arr[i].name, properties_arr[i].value)
                    yield i++
                } else {
                    return
                }
            }
        }
        for await (const ii of asyncGeneratorNewProperty(properties_arr)){}
        this.init()
    }
    async doublicate_property(property) {
        let new_property = await this.addNewProperty(property.name, property.value)
    }
    async remove_property(property) {
        let o = {
            command: 'remove',
            object: 'properties_component_equipment',
            params: {
                id: property.id
            }
        }
        let res_remove = await socketQueryPr(o)
        property.dom.row.remove()
        this.storage.changes = this.storage.properties.filter(property_change_i => {
            return property_change_i.id != property.id
        })
        this.storage.dom.properties = this.storage.dom.properties.filter(property_dom => {
            return property_dom != property.dom.row
        })
        this.storage.properties = this.storage.properties.filter(property_i => {
            return property_i.id != property.id
        })
    }
    checkChanges() {
        if (this.storage.changes.length) this.setState('changed_properties', true)
        if (!this.storage.changes.length) this.setState('changed_properties', false)
    }
    setState(variable, value) {
        this.storage[variable] = value
        if (variable == 'changed_properties') {
            this.emitter('change', value)
        }
    }
    async saveChanges() {
        if (!this.storage.changes) return
        let _t = this
        let prom_func = []
        this.storage.changes.forEach(changed_property => {
            prom_func.push(
                new Promise(async (resolve, reject) => {
                    let o = {
                        command: 'modify',
                        object: 'properties_component_equipment',
                        params: {
                            id: changed_property.id,
                            name: changed_property.name,
                            value: changed_property.value,
                        }
                    }
                    await socketQueryPr(o)
                    resolve()
                })
            )
        })
        return Promise.all(prom_func).then(function(){
            _t.checkChanges()
        });
    }
}

class TableSpecificationsEquipment {
    constructor (equipment_id, wrapper, params_obj) {
        this.storage = {
            equipment_id: equipment_id,
            specifications: [],
            changes: [],
            changed_specification: false,
            dom: {
                wrapper: wrapper,
                wrapper_for_table: undefined,
                wrapper_for_button: undefined,
                button_new_specification: undefined,
                button_save_changes: undefined,
                specifications: [],
                table: undefined,
            }
        }

        if (params_obj) {
            if (typeof params_obj.after_save === 'function') this.storage.after_save = params_obj.after_save
        }

        this.init()
    }
    async init() {
        this.renderBasicElemnts()
        await this.initSpecifications()
        this.setHandlersButtonAdd()
        this.setHandlersButtonSaveChange()
    }
    async initSpecifications () {
        this.storage.specifications = await this.getSpecifications()
        this.renderSpecifications()
        this.storage.specifications.forEach(specification => {
            this.setHandlersSpecification(specification)
        })
    }
    async getSpecifications () {
        let o = {
            command: 'get',
            object: 'properties_equipment',
            params: {
                param_where: {
                    equipment_id: this.storage.equipment_id
                },
                columns: ['id', 'name', 'value']
            }
        }
        let properties_equipment = await socketQueryPr(o)
        return Object.values(properties_equipment.data).reverse()
    }
    async getSpecification(id) {
        let o = {
            command: 'get',
            object: 'properties_equipment',
            params: {
                param_where: {
                    id: id
                },
                columns: ['id', 'name', 'value']
            }
        }
        let result = await socketQueryPr(o)
        return result.data[0]
    }
    renderBasicElemnts() {

        //render wrapper_for_table
        let wrapper_for_table = document.createElement('div')
        wrapper_for_table.className = 'wrapper-for-table-specification'
        this.storage.dom.wrapper.appendChild(wrapper_for_table)
        this.storage.dom.wrapper_for_table = wrapper_for_table


        //render table
        let table = document.createElement('table')
        table.className = 'table-specification-equipment'
        let tr_1 = document.createElement('tr')
        let th_1 = document.createElement('th')
        th_1.textContent = 'Наименование'
        let th_2 = document.createElement('th')
        th_2.textContent = 'Значение'
        let th_3 = document.createElement('th')
        th_3.textContent = 'Действия'
        tr_1.appendChild(th_1)
        tr_1.appendChild(th_2)
        tr_1.appendChild(th_3)
        table.appendChild(tr_1)
        this.storage.dom.table = table
        this.storage.dom.wrapper_for_table.appendChild(this.storage.dom.table)


        //render wrapper_for_button
        let wrapper_for_button = document.createElement('div')
        wrapper_for_button.className = 'wrapper-for-button-bottom-specification'
        this.storage.dom.wrapper.insertBefore(wrapper_for_button, this.storage.dom.wrapper.firstChild);
        this.storage.dom.wrapper_for_button = wrapper_for_button

        //render button_new_specification
        var button_new_specification = document.createElement('div');
        button_new_specification.className = 'button-bottom-new-specification button-specification';
        button_new_specification.innerHTML = '<i class="fa fa-plus"></i>&nbsp;&nbsp;Добавить';

        this.storage.dom.wrapper_for_button.appendChild(button_new_specification)
        this.storage.dom.button_new_specification = button_new_specification

        //render button_save_changes
        var button_save_changes = document.createElement('div');
        button_save_changes.className = 'button-bottom-save-changes button-specification';
        button_save_changes.innerHTML = '<i class="fa fa-save"></i>&nbsp;&nbsp;Сохранить';

        this.storage.dom.wrapper_for_button.appendChild(button_save_changes)
        this.storage.dom.button_save_changes = button_save_changes

    }
    renderSpecifications() {
        this.storage.dom.specifications.forEach(specification => {
            try {
                this.storage.dom.table.removeChild(specification)
            } catch (e) {

            }
        })
        this.storage.dom.specifications = []
        this.storage.specifications.forEach(specification => {
            this.renderSpecification(specification)
        })
    }
    renderSpecification(specification) {

        // let specification = this.storage.specifications[this.storage.specifications.length - 1]

        let dom_specification = document.createElement('tr')
        let td_1 = document.createElement('td')
        let td_2 = document.createElement('td')
        let td_3 = document.createElement('td')

        td_3.className = 'small-buttons-td'

        dom_specification.appendChild(td_1)
        dom_specification.appendChild(td_2)
        dom_specification.appendChild(td_3)


        let input_name = document.createElement('input')
        input_name.setAttribute("value", specification.name)

        let input_value = document.createElement('input')
        input_value.setAttribute("value", specification.value)

        var button_doublicate = document.createElement('i');
        button_doublicate.className = 'spec-actions-btn fa fa-copy';
        button_doublicate.innerText = '';

        var button_remove = document.createElement('i');
        button_remove.className = 'spec-actions-btn fa fa-trash';
        button_remove.innerText = '';

        td_1.appendChild(input_name)
        td_2.appendChild(input_value)

        td_3.appendChild(button_doublicate)
        td_3.appendChild(button_remove)

        this.storage.dom.table.appendChild(dom_specification)
        this.storage.dom.specifications.push(dom_specification)

        specification.dom = {
            input_name: input_name,
            input_value: input_value,
            button_doublicate: button_doublicate,
            button_remove: button_remove,
            row: dom_specification
        }
    }
    setHandlersButtonAdd() {
        this.storage.dom.button_new_specification.addEventListener('click', this.addNewSpecification.bind(this, undefined, undefined))
        // this.addNewSpecification()
    }
    setHandlersButtonSaveChange() {
        this.storage.dom.button_save_changes.addEventListener('click', this.saveChanges.bind(this))
    }
    setHandlersSpecification(specification) {
        specification.dom.button_doublicate.addEventListener('click', this.handlerDoublicateSpecification.bind(this, specification))
        specification.dom.button_remove.addEventListener('click', this.handlerRemoveSpecification.bind(this, specification))
        specification.dom.input_name.addEventListener('keyup', this.handlerChangeSpecification.bind(this, specification, 'name'))
        specification.dom.input_value.addEventListener('keyup', this.handlerChangeSpecification.bind(this, specification, 'value'))
    }
    handlerDoublicateSpecification(specification, event) {
        this.addNewSpecification(specification.name, specification.value)
    }
    handlerRemoveSpecification(specification, event) {
        this.removeSpecification(specification)
    }
    handlerChangeSpecification(specification, type_field, event) {
        let check_chages = false
        specification[type_field] = event.target.value
        this.storage.changes.forEach(change_specification => {
            if (change_specification.id == specification.id) {
                check_chages = true
            }
        })
        if (!check_chages) this.storage.changes.push(specification)
        this.checkStateChanges()
    }
    checkStateChanges() {
        if (this.storage.changes.length && !this.storage.changed_specification) {
            this.storage.changed_specification = true
            this.activateButtonSaveChanges()
        }
        if (!this.storage.changes.length && this.storage.changed_specification) {
            this.storage.changed_specification = false
            this.diactivateButtonSaveChanges()
        }
    }
    activateButtonSaveChanges() {
        this.storage.dom.button_save_changes.classList.add('activeted')
    }
    diactivateButtonSaveChanges() {
        this.storage.dom.button_save_changes.classList.remove('activeted')
    }
    async saveChanges() {
        if (!this.storage.changed_specification) return

        let _t = this
        let prom_func = []
        this.storage.changes.forEach(changed_specification => {
            prom_func.push(
                new Promise(async (resolve, reject) => {
                    let o = {
                        command: 'modify',
                        object: 'properties_equipment',
                        params: {
                            id: changed_specification.id,
                            name: changed_specification.name,
                            value: changed_specification.value
                        }
                    }
                    await socketQueryPr(o)
                    resolve()
                })
            )
        })
        return Promise.all(prom_func).then(function(){
            _t.storage.changes = []
            _t.checkStateChanges()
        });

        if (typeof _t.storage.after_save === 'function') {
            _t.storage.after_save()
        }
    }
    async addNewSpecification(name, value) {
        let o = {
            command: 'add',
            object: 'properties_equipment',
            params: {
                equipment_id: this.storage.equipment_id
            }
        }
        if (name) o.params.name = name
        if (value) o.params.value = value
        let new_properties_equipment = await socketQueryPr(o)
        let last_specification = await this.getSpecification(new_properties_equipment.id)
        this.storage.dom.specifications.push(last_specification)
        this.renderSpecification(last_specification)
        this.setHandlersSpecification(last_specification)
    }
    async removeSpecification(specification) {
        let o = {
            command: 'remove',
            object: 'properties_equipment',
            params: {
                id: specification.id
            }
        }
        await socketQueryPr(o)
        specification.dom.row.remove()
        this.storage.changes = this.storage.changes.filter(specification_change_i => {
            return specification_change_i.id != specification.id
        })
        this.storage.dom.specifications = this.storage.dom.specifications.filter(specification_dom => {
            return specification_dom != specification.dom.row
        })
        this.storage.specifications = this.storage.specifications.filter(specification_i => {
            return specification_i != specification
        })
        this.checkStateChanges()
    }
}
