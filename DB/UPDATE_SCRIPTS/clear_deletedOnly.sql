delete from `organization` where deleted is not null;
delete from `group_object` where deleted is not null;
delete from `object_` where deleted is not null;
delete from `building` where deleted is not null;
delete from `level_` where deleted is not null;
delete from `object_location` where deleted is not null;
delete from `group_system` where deleted is not null;
delete from `object_system` where deleted is not null;
delete from `equipment` where deleted is not null;
delete from `reglament_r_equipment` where deleted is not null;
delete from `tech_card_equipment` where deleted is not null;
delete from `system_reglament_work` where deleted is not null;
delete from `component_equipment` where deleted is not null;

delete from `request_ppr_second` where deleted is not null;
delete from `request_ppr_third` where deleted is not null;
delete from `ppr` where deleted is not null;
delete from `status_request_ppr` where deleted is not null ;
delete from `log_status_change_request_ppr` where deleted is not null;
delete from `log_change_request_ppr` where deleted is not null;
delete from `request_work` where deleted is not null;
delete from `log_status_change_request_work` where deleted is not null;
delete from `log_change_request_work` where deleted is not null;
delete from `_request_work_history` where deleted is not null;
delete from `object_relation_organization_r_role` where deleted is not null;
delete from `organization_relation_user` where deleted is not null;
delete from `user_relation_type_for_organization` where deleted is not null;
delete from `organization_relation_type_for_organization` where deleted is not null;
delete from `type_for_organization` where deleted is not null;
delete from `periodicity` where deleted is not null;
delete from `tangibles` where deleted is not null;
delete from `category_tangibles` where deleted is not null;
delete from `request_transit_tangibles` where deleted is not null;
delete from `manager_response_tangibles` where deleted is not null;
delete from `types_for_tangibles` where deleted is not null;
delete from `status_type_for_tangibles` where deleted is not null;
delete from `status_request_work_for_request_work` where deleted is not null;
delete from `timeliness_for_request_work` where deleted is not null;
delete from `type_request_for_request_work` where deleted is not null;
delete from `type_component_equipment` where deleted is not null;
delete from `news` where deleted is not null;
delete from `test_lil` where deleted is not null;
delete from `lil_methods` where deleted is not null;
delete from `comment_equipment` where deleted is not null;
delete from `comment_component_equipment` where deleted is not null;
delete from `tangibles_comment` where deleted is not null;
delete from `system_comment` where deleted is not null;
delete from `request_work_comment` where deleted is not null;
delete from `request_ppr_comment` where deleted is not null;
delete from `file_tangibles` where deleted is not null;
delete from `file_for_tangibles_type` where deleted is not null;
delete from `file_for_reglament_work_system` where deleted is not null;
delete from `file_for_reglament_work_system_type` where deleted is not null;
delete from `file_for_system` where deleted is not null;
delete from `file_for_system_type` where deleted is not null;
delete from `file_object` where deleted is not null;
delete from `file_object_type` where deleted is not null;
delete from `file_object_system` where deleted is not null;
delete from `file_for_object_system_type` where deleted is not null;
delete from `file_for_equipment` where deleted is not null;
delete from `file_for_equipment_type` where deleted is not null;
delete from `file_system_reglament_work` where deleted is not null;
delete from `file_for_system_reglament_work_type` where deleted is not null;
delete from `file_comment_tangibles` where deleted is not null;
delete from `file_comment_component_equipment` where deleted is not null;
delete from `file_comment_request_work` where deleted is not null;
delete from `file_comment_request_ppr` where deleted is not null;
delete from `file_comment_system` where deleted is not null;
delete from `file_comment_equipment` where deleted is not null;
delete from `session_attach_files` where deleted is not null;
delete from `session_attach` where deleted is not null;
delete from `client_system_settings` where deleted is not null;
delete from `request_work_category` where deleted is not null;
delete from `user_default_location` where deleted is not null;
delete from `client_object_fields_profile` where deleted is not null;
delete from `user` where deleted is not null;
