class printPpr {
    constructor(ppr_id) {
        if (!ppr_id) throw 'Не передан ppr_id, либо не в правильном формате (должно быть целое число)'
        this.storage = {
            ppr_id: ppr_id,
            ppr: undefined,
            dom: {
                wrapper: undefined,
                wrapper_data_ppr: undefined,
                wrapper_table_specification: undefined,
                wrapper_data_reglament: undefined,
                wrapper_table_component: undefined
            },
            specifications_equipment: [],
            components_eqiupment: [],
            reglament: undefined
        }
        this.init()
    }


    async loadPpr() {
        let o = {
            command: 'get',
            object: 'ppr',
            params: {
                param_where: {
                    id: this.storage.ppr_id
                }
            }
        }
        let res = await socketQueryPr(o)

        res.data[0].plan_execute =  res.data[0].start_time_plan.split(' ')[0] + res.data[0].end_time_plan.split(' ')[0]

        this.storage.ppr = res.data[0]
    }
    async loadSpecificationsEquipment() {
        let o = {
            command: 'get',
            object: 'properties_equipment',
            params: {
                where: [
                    {key: 'equipment_id', type: '=', val1: this.storage.ppr.equipment_id}
                ]
            }
        }
        let res = await socketQueryPr(o)
        this.storage.specifications_equipment = Object.values(res.data)
    }
    async loadComponentsEquipment() {
        this.storage.dom.wrapper_table_component = document.createElement('div')
        this.storage.dom.wrapper_table_component.style.marginTop = '15px'
        this.storage.dom.wrapper_table_component.style.marginBottom = '5px'
        this.storage.table_component = new TableComponentsEquipment(this.storage.ppr.equipment_id, this.storage.dom.wrapper_table_component, {
            not_editable: true,
            hide_if_no_data: true
        })
        await this.storage.table_component.init()
    }
    async loadReglament() {
        let o = {
            command: 'get',
            object: 'system_reglament_work',
            params: {
                param_where: {
                    id: this.storage.ppr.reglament_id
                }
            }
        }
        let res = await socketQueryPr(o)

        this.storage.reglament = res.data[0]
    }
    // async loadComponentsEquipment() {
    //     let _t = this
    //     let o = {
    //         command: 'get',
    //         object: 'component_equipment',
    //         params: {
    //             where: [
    //                 {key: 'equipment_id', type: '=', val1: _t.equipment_id}
    //             ]
    //         }
    //     }
    //     let res = await socketQueryPr(o)
    //     this.storage.components_eqiupment = res.data
    //
    //     await this.loadSpecificationsComponentsEquipment()
    // }
    // async loadSpecificationsComponentsEquipment() {
    //     if (!this.storage.components_eqiupment.length) return cb(null)
    //     let component_equipment_ids = this.storage.components_eqiupment.map(component => {
    //         return component.id
    //     })
    //     let o = {
    //         command: 'get',
    //         object: 'properties_component_equipment',
    //         params: {
    //             where: [
    //                 {key: 'component_equipment_id', type: 'in', val1: component_equipment_ids}
    //             ],
    //             columns: ['id', 'component_equipment_id', 'name', 'value']
    //         }
    //     }
    //     let res = await socketQueryPr(o)
    //     res = res.data
    //     res.forEach(property => {
    //         this.storage.components_eqiupment.forEach(component => {
    //             if (component.id == property.component_equipment_id) {
    //                 if (!component.properties) component.properties = []
    //                 component.properties.push(property)
    //             }
    //         })
    //     })
    // }

    renderDataPpr() {
        // if (this.storage.dom.wrapper_data_ppr instanceof Element) this.storage.dom.wrapper_data_ppr.innerHTML = ''
        // this.storage.dom.wrapper_data_ppr = undefined
        this.storage.dom.wrapper_data_ppr = document.createElement('div')


        let equipment_id_div = document.createElement('div')
        equipment_id_div.innerHTML = '<b>id:</b> ' + this.storage.ppr.equipment_id
        equipment_id_div.style.lineHeight = '24px'

        let equipment_div = document.createElement('div')
        equipment_div.innerHTML = '<b>Оборудование:</b> ' + this.storage.ppr.equipment
        equipment_div.classList.add('equipment-name')
        equipment_div.style.lineHeight = '24px'

        let object_div = document.createElement('div')
        object_div.innerHTML = '<b>Объект:</b> ' + this.storage.ppr.object_
        object_div.style.lineHeight = '24px'

        let group_system_div = document.createElement('div')
        group_system_div.innerHTML = '<b>Группа систем:</b> ' + this.storage.ppr.group_system
        group_system_div.style.lineHeight = '24px'

        let object_system_div = document.createElement('div')
        object_system_div.innerHTML = '<b>Система:</b> ' + this.storage.ppr.object_system
        object_system_div.style.lineHeight = '24px'

        let location_div = document.createElement('div')
        location_div.innerHTML = '<b>Помещение:</b> ' + this.storage.ppr.location
        location_div.style.lineHeight = '24px'

        let location_desc_div = document.createElement('div')
        location_desc_div.innerHTML = '<b>Описание помещения:</b> ' + this.storage.ppr.location_description
        location_desc_div.style.lineHeight = '24px'


        this.storage.dom.wrapper_data_ppr.appendChild(equipment_div)
        this.storage.dom.wrapper_data_ppr.appendChild(equipment_id_div)
        this.storage.dom.wrapper_data_ppr.appendChild(object_div)
        this.storage.dom.wrapper_data_ppr.appendChild(group_system_div)
        this.storage.dom.wrapper_data_ppr.appendChild(object_system_div)
        this.storage.dom.wrapper_data_ppr.appendChild(location_div)
        this.storage.dom.wrapper_data_ppr.appendChild(location_desc_div)
    }
    renderSpecificationsEquipment() {
        this.storage.dom.wrapper_table_specification = undefined
        let count_tables;
        if (this.storage.specifications_equipment.length < 6) count_tables = this.storage.specifications_equipment.length
        if (this.storage.specifications_equipment.length >= 6) count_tables = 5
        let tables_dom_arr = []
        let main_node_tables = document.createElement('div')
        main_node_tables.style.display = 'flex'
        for (let i = 0; i < count_tables; i++) {
            let table = document.createElement('table')
            table.style.width = '100%'
            let tr = document.createElement('tr')
            table.appendChild(tr)
            tables_dom_arr.push(table)
            main_node_tables.appendChild(table)
        }
        let count_num_table = 0
        for (let i in this.storage.specifications_equipment.reverse()){
            let tr = document.createElement('tr')
            tr.style.border = '1px solid silver'

            let td_name = document.createElement('td')

            td_name.textContent = this.storage.specifications_equipment[i].name +': '
            td_name.style.fontSize = '12px'
            td_name.style.fontWeight = 'bold'
            td_name.style.paddingBottom = '10px'

            let td_value = document.createElement('td')
            td_value.textContent = this.storage.specifications_equipment[i].value
            td_value.style.paddingBottom = '10px'
            td_value.style.textAlign = 'left'
            td_value.style.fontSize = '12px'

            tr.appendChild(td_name)
            tr.appendChild(td_value)

            tables_dom_arr[count_num_table].appendChild(tr)
            count_num_table++
            if (!tables_dom_arr[count_num_table]) count_num_table = 0
        }
        // _t.wrapper.find('.specifications')[0].appendChild(main_node_tables)
        this.storage.dom.wrapper_table_specification = main_node_tables
        this.storage.dom.wrapper_table_specification.style.marginTop = '15px'
    }
    renderReglament() {
        this.storage.dom.wrapper_data_reglament = undefined

        let wrapper_reglament = document.createElement('div')
        wrapper_reglament.classList.add('wrapper_reglament')


        let reglament = document.createElement('d')
        reglament.innerHTML = '№: ' + this.storage.reglament.id + ' - Работа: ' + this.storage.reglament.name

        let reglament_description = document.createElement('d')
        reglament_description.innerHTML = 'Описание регламента: ' + this.storage.reglament.description

        let periodicity = document.createElement('d')
        periodicity.innerHTML = 'Периодичность: ' + this.storage.reglament.periodicity

        let weeks = document.createElement('d')
        weeks.innerHTML = 'Недели: ' + this.storage.reglament.weeks


        let table_ppr_reglament = document.createElement('table')
        table_ppr_reglament.classList.add('table-reglament-work-tech-map')
        table_ppr_reglament.style.fontSize = '12px'

        let header_table = '<thead><tr><th>План выполнения</th><th>Исполнитель</th><th>Статус</th></tr></thead>'
        let body_table = '<tbody><tr><th style="font-weight: 400; padding: 0 10px;">' + this.storage.ppr.plan_execute + '</th><th style="font-weight: 400; padding: 0 10px;">' + (this.storage.ppr.executor_fio ? this.storage.ppr.executor_fio : 'Не назначено') + '</th><th style="font-weight: 400; padding: 0 10px;">' + this.storage.ppr.status_request + '</th></tr></tbody>'

        table_ppr_reglament.innerHTML = (header_table + body_table)

        wrapper_reglament.appendChild(document.createElement('br'))
        wrapper_reglament.appendChild(document.createElement('br'))
        wrapper_reglament.appendChild(reglament)
        wrapper_reglament.appendChild(document.createElement('br'))
        wrapper_reglament.appendChild(reglament_description)
        wrapper_reglament.appendChild(document.createElement('br'))
        wrapper_reglament.appendChild(periodicity)
        wrapper_reglament.appendChild(document.createElement('br'))
        wrapper_reglament.appendChild(weeks)
        wrapper_reglament.appendChild(document.createElement('br'))
        wrapper_reglament.appendChild(document.createElement('br'))
        wrapper_reglament.appendChild(table_ppr_reglament)

        this.storage.dom.wrapper_data_reglament = wrapper_reglament
    }
    renderAll() {
        this.storage.dom.wrapper = document.createElement('div')

        this.renderDataPpr()
        this.renderSpecificationsEquipment()
        this.renderReglament()

        this.storage.dom.wrapper.appendChild(this.storage.dom.wrapper_data_ppr)
        this.storage.dom.wrapper.appendChild(this.storage.dom.wrapper_table_specification)
        this.storage.dom.wrapper.appendChild(this.storage.dom.wrapper_table_component)
        this.storage.dom.wrapper.appendChild(this.storage.dom.wrapper_data_reglament)


        let _t = this
        var mywindow = window.open('', 'PRINT');
        setTimeout(function(){

            mywindow.document.write('<html><head><title>' + document.title  + '</title>');
            mywindow.document.write('</head><body style="margin-left: 40px; margin-right: 40px; font-family: Arial; font-size: 12px;">');
            // mywindow.document.write('<div style="font-family: arial, Sans-Serif; font-size: 13px; color: #666; text-align: center;">' + document.title  + '</div>');
            mywindow.document.write('<div class="equipment-name" style="font-family: Arial,Sans-Serif;font-size: 22px;font-weight: bold;margin-top: 20px; margin-bottom: 18px;">'+_t.storage.ppr.equipment+'</div>');
            mywindow.document.write(_t.storage.dom.wrapper.innerHTML);
            mywindow.document.write('</body></html>');


            setTimeout(() => {
                mywindow.document.close(); // necessary for IE >= 10
                mywindow.focus(); // necessary for IE >= 10*/

                mywindow.print();
                mywindow.close();

            }, 200)

            return true;

        }, 1000);
    }

    async init() {
        await this.loadPpr()
        await this.loadSpecificationsEquipment()
        await this.loadReglament()
        await this.loadComponentsEquipment()
        this.renderAll()
    }
}
