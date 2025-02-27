truncate table `organization`;
truncate table `group_object`;
truncate table `object_`;
truncate table `building`;
truncate table `level_`;
truncate table `object_location`;
truncate table `group_system`;
truncate table `object_system`;
truncate table `equipment`;
truncate table `reglament_r_equipment`;
truncate table `tech_card_equipment`;
truncate table `system_reglament_work`;
truncate table `component_equipment`;
truncate table `request_ppr_second`;
truncate table `request_ppr_third`;
truncate table `ppr`;
-- truncate table `status_request_ppr`;
truncate table `log_status_change_request_ppr`;
truncate table `log_change_request_ppr`;
truncate table `request_work`;
truncate table `log_status_change_request_work`;
truncate table `log_change_request_work`;
truncate table `_request_work_history`;
truncate table `object_relation_organization_r_role`;
truncate table `organization_relation_user`;
truncate table `user_relation_type_for_organization`;
truncate table `organization_relation_type_for_organization`;
-- truncate table  `type_for_organization`;
-- truncate table  `periodicity`;
truncate table `tangibles`;
-- truncate table  `category_tangibles`;
truncate table `request_transit_tangibles`;
truncate table `manager_response_tangibles`;
-- truncate table  `types_for_tangibles`;
-- truncate table  `status_type_for_tangibles`;
-- truncate table  `status_request_work_for_request_work`;
-- truncate table  `timeliness_for_request_work`;
-- truncate table  `type_request_for_request_work`;
-- truncate table  `type_component_equipment`;
truncate table `news`;
truncate table `test_lil`;
truncate table `lil_methods`;
truncate table `comment_equipment`;
truncate table `comment_component_equipment`;
truncate table `tangibles_comment`;
truncate table `system_comment`;
truncate table `request_work_comment`;
truncate table `request_ppr_comment`;
truncate table `file_tangibles`;
-- truncate table  `file_for_tangibles_type`;
truncate table `file_for_reglament_work_system`;
-- truncate table  `file_for_reglament_work_system_type`;
truncate table `file_for_system`;
-- truncate table  `file_for_system_type`;
truncate table `file_object`;
-- truncate table  `file_object_type`;
truncate table `file_object_system`;
-- truncate table  `file_for_object_system_type`;
truncate table `file_for_equipment`;
-- truncate table  `file_for_equipment_type`;
truncate table `file_system_reglament_work`;
-- truncate table  `file_for_system_reglament_work_type`;
truncate table `file_comment_tangibles`;
truncate table `file_comment_component_equipment`;
truncate table `file_comment_request_work`;
truncate table `file_comment_request_ppr`;
truncate table `file_comment_system`;
truncate table `file_comment_equipment`;
truncate table `session_attach_files`;
truncate table `session_attach`;
truncate table `client_system_settings`;
-- truncate table  `request_work_category`;
truncate table `user_default_location`;

delete from `user` where user_type_id not in (SELECT id from user_type WHERE sysname = 'ADMIN' or sysname = 'USER_ROLE');
