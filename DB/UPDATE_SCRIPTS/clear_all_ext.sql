delete from `company_sys` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `organization` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `group_object` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `object_` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `building` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `level_` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `object_location` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `group_system` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `object_system` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `equipment` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `reglament_r_equipment` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `tech_card_equipment` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `system_reglament_work` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `component_equipment` where ext_id is not null and ext_system_alias not like 'go.core|%';

-- delete from `request_ppr_second` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `request_ppr_third` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `ppr` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `status_request_ppr` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `log_status_change_request_ppr` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `log_change_request_ppr` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `request_work` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `log_status_change_request_work` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `log_change_request_work` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `_request_work_history` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `object_relation_organization_r_role` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `organization_relation_user` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `user_relation_type_for_organization` where ext_id is not null and ext_system_alias not like 'go.core|%';
 delete from `organization_relation_type_for_organization` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `type_for_organization` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `periodicity` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `tangibles` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `category_tangibles` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `request_transit_tangibles` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `manager_response_tangibles` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `types_for_tangibles` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `status_type_for_tangibles` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `status_request_work_for_request_work` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `timeliness_for_request_work` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `type_request_for_request_work` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `type_component_equipment` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `news` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `test_lil` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `lil_methods` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `comment_equipment` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `comment_component_equipment` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `tangibles_comment` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `system_comment` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `request_work_comment` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `request_ppr_comment` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_tangibles` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `file_for_tangibles_type` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_for_reglament_work_system` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `file_for_reglament_work_system_type` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_for_system` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `file_for_system_type` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_object` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `file_object_type` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_object_system` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `file_for_object_system_type` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_for_equipment` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `file_for_equipment_type` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_system_reglament_work` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `file_for_system_reglament_work_type` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_comment_tangibles` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_comment_component_equipment` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_comment_request_work` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_comment_request_ppr` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_comment_system` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `file_comment_equipment` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `session_attach_files` where ext_id is not null and ext_system_alias not like 'go.core|%';
-- delete from `session_attach` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `client_system_settings` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `request_work_category` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `user_default_location` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `user` where ext_id is not null and ext_system_alias not like 'go.core|%';
delete from `user_role` where ext_id is not null and ext_system_alias not like 'go.core|%';


-- CLEAR ext_id if not deleted
update `company_sys` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `organization` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `group_object` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `object_` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `building` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `level_` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `object_location` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `group_system` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `object_system` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `equipment` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `reglament_r_equipment` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `tech_card_equipment` set ext_id = null, ext_system_alias = null where ext_id is not null
update `system_reglament_work` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `component_equipment` set ext_id = null, ext_system_alias = null where ext_id is not null

-- update `request_ppr_second` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `request_ppr_third` set ext_id = null, ext_system_alias = null where ext_id is not null
update `ppr` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `status_request_ppr` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `log_status_change_request_ppr` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `log_change_request_ppr` set ext_id = null, ext_system_alias = null where ext_id is not null
update `request_work` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `log_status_change_request_work` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `log_change_request_work` set ext_id = null, ext_system_alias = null where ext_id is not null
update `_request_work_history` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `object_relation_organization_r_role` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `organization_relation_user` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `user_relation_type_for_organization` set ext_id = null, ext_system_alias = null where ext_id is not null
 update `organization_relation_type_for_organization` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `type_for_organization` set ext_id = null, ext_system_alias = null where ext_id is not null
update `periodicity` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `tangibles` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `category_tangibles` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `request_transit_tangibles` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `manager_response_tangibles` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `types_for_tangibles` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `status_type_for_tangibles` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `status_request_work_for_request_work` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `timeliness_for_request_work` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `type_request_for_request_work` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `type_component_equipment` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `news` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `test_lil` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `lil_methods` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `comment_equipment` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `comment_component_equipment` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `tangibles_comment` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `system_comment` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `request_work_comment` set ext_id = null, ext_system_alias = null where ext_id is not null
-- update `request_ppr_comment` set ext_id = null, ext_system_alias = null where ext_id is not null
update `file_tangibles` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `file_for_tangibles_type` set ext_id = null, ext_system_alias = null where ext_id is not null
update `file_for_reglament_work_system` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `file_for_reglament_work_system_type` set ext_id = null, ext_system_alias = null where ext_id is not null
update `file_for_system` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `file_for_system_type` set ext_id = null, ext_system_alias = null where ext_id is not null
update `file_object` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `file_object_type` set ext_id = null, ext_system_alias = null where ext_id is not null
update `file_object_system` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `file_for_object_system_type` set ext_id = null, ext_system_alias = null where ext_id is not null
update `file_for_equipment` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `file_for_equipment_type` set ext_id = null, ext_system_alias = null where ext_id is not null
update `file_system_reglament_work` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `file_for_system_reglament_work_type` set ext_id = null, ext_system_alias = null where ext_id is not null
update `file_comment_tangibles` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `file_comment_component_equipment` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `file_comment_request_work` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `file_comment_request_ppr` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `file_comment_system` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `file_comment_equipment` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `session_attach_files` set ext_id = null, ext_system_alias = null where ext_id is not null;
-- update `session_attach` set ext_id = null, ext_system_alias = null where ext_id is not null
update `client_system_settings` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `request_work_category` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `user_default_location` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `user` set ext_id = null, ext_system_alias = null where ext_id is not null;
update `user_role` set ext_id = null, ext_system_alias = null where ext_id is not null;
