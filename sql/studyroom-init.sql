-- ============================================================
-- Study Hall 初始化脚本
-- - 创建自习室业务表
-- - 写入示例数据（房间 + 座位）
-- - 配置后台菜单与权限
-- - 追加本地文件存储配置
-- 可重复执行，已使用 NOT EXISTS / ON DUPLICATE KEY 避免重复
-- ============================================================

-- 0) 数据库与本地联调账号
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `ruoyi_vue_pro_studyroom`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `ruoyi_vue_pro_studyroom`;

-- 为 backend/application-dev.yaml 默认配置补齐本地账号
CREATE USER IF NOT EXISTS 'study'@'localhost' IDENTIFIED BY 'hyh123';
CREATE USER IF NOT EXISTS 'study'@'127.0.0.1' IDENTIFIED BY 'hyh123';

ALTER USER IF EXISTS 'study'@'localhost' IDENTIFIED BY 'hyh123';
ALTER USER IF EXISTS 'study'@'127.0.0.1' IDENTIFIED BY 'hyh123';

GRANT ALL PRIVILEGES ON `ruoyi_vue_pro_studyroom`.* TO 'study'@'localhost';
GRANT ALL PRIVILEGES ON `ruoyi_vue_pro_studyroom`.* TO 'study'@'127.0.0.1';
FLUSH PRIVILEGES;

-- 1) 自习室业务表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `study_room` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自习室编号',
  `name` varchar(100) NOT NULL COMMENT '自习室名称',
  `description` varchar(512) DEFAULT NULL COMMENT '自习室简介',
  `max_capacity` int NOT NULL DEFAULT 50 COMMENT '最大人数上限',
  `online_count` int NOT NULL DEFAULT 0 COMMENT '当前在线人数',
  `creator_user_id` bigint NOT NULL COMMENT '创建者用户编号',
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '状态（0开启 1关闭）',
  `creator` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  `tenant_id` bigint NOT NULL DEFAULT 0 COMMENT '租户编号',
  PRIMARY KEY (`id`),
  KEY `idx_room_status` (`status`),
  KEY `idx_room_creator` (`creator_user_id`),
  KEY `idx_room_online` (`online_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自习室';

CREATE TABLE IF NOT EXISTS `seat` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '座位编号',
  `room_id` bigint NOT NULL COMMENT '自习室编号',
  `seat_number` varchar(32) NOT NULL COMMENT '座位号',
  `seat_type` varchar(32) NOT NULL DEFAULT 'normal' COMMENT '座位类型',
  `has_power` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否有电源',
  `has_lamp` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否有台灯',
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '状态（0可用 1维修）',
  `creator` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  `tenant_id` bigint NOT NULL DEFAULT 0 COMMENT '租户编号',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_seat_room_number` (`room_id`, `seat_number`),
  KEY `idx_seat_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自习室座位';

CREATE TABLE IF NOT EXISTS `study_room_member` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '成员编号',
  `room_id` bigint NOT NULL COMMENT '自习室编号',
  `user_id` bigint NOT NULL COMMENT '用户编号',
  `status` varchar(20) NOT NULL DEFAULT 'online' COMMENT '状态',
  `learning_goal` varchar(255) DEFAULT NULL COMMENT '学习目标',
  `join_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `last_active_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后活跃时间',
  `creator` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  `tenant_id` bigint NOT NULL DEFAULT 0 COMMENT '租户编号',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_member_room_user` (`room_id`, `user_id`),
  KEY `idx_member_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自习室成员';

CREATE TABLE IF NOT EXISTS `chat_message` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '消息编号',
  `room_id` bigint NOT NULL COMMENT '自习室编号',
  `user_id` bigint NOT NULL COMMENT '发送者编号',
  `content` text NOT NULL COMMENT '消息内容',
  `message_type` varchar(20) NOT NULL DEFAULT 'text' COMMENT '消息类型',
  `send_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  `creator` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  `tenant_id` bigint NOT NULL DEFAULT 0 COMMENT '租户编号',
  PRIMARY KEY (`id`),
  KEY `idx_chat_room_time` (`room_id`, `send_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自习室聊天消息';

CREATE TABLE IF NOT EXISTS `study_record` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '记录编号',
  `user_id` bigint NOT NULL COMMENT '用户编号',
  `room_id` bigint NOT NULL COMMENT '自习室编号',
  `study_date` date NOT NULL COMMENT '学习日期',
  `total_duration` int NOT NULL DEFAULT 0 COMMENT '总时长（分钟）',
  `pomodoro_count` int NOT NULL DEFAULT 0 COMMENT '完成番茄钟数',
  `creator` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  `tenant_id` bigint NOT NULL DEFAULT 0 COMMENT '租户编号',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_user_date` (`user_id`, `study_date`),
  KEY `idx_record_room_date` (`room_id`, `study_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习记录';

CREATE TABLE IF NOT EXISTS `reservation` (
  `id` varchar(64) NOT NULL COMMENT '预约编号（UUID）',
  `user_id` bigint NOT NULL COMMENT '用户编号',
  `seat_id` bigint NOT NULL COMMENT '座位编号',
  `reserve_date` date NOT NULL COMMENT '预约日期',
  `start_time` time NOT NULL COMMENT '开始时间',
  `end_time` time NOT NULL COMMENT '结束时间',
  `status` varchar(20) NOT NULL DEFAULT 'reserved' COMMENT '状态',
  `check_in_time` datetime DEFAULT NULL COMMENT '签到时间',
  `check_out_time` datetime DEFAULT NULL COMMENT '签退时间',
  `creator` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  `tenant_id` bigint NOT NULL DEFAULT 0 COMMENT '租户编号',
  PRIMARY KEY (`id`),
  KEY `idx_reservation_user_date` (`user_id`, `reserve_date`),
  KEY `idx_reservation_seat_date` (`seat_id`, `reserve_date`),
  KEY `idx_reservation_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='座位预约';

CREATE TABLE IF NOT EXISTS `pomodoro_session` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '会话编号',
  `user_id` bigint NOT NULL COMMENT '用户编号',
  `room_id` bigint NOT NULL COMMENT '自习室编号',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `duration` int NOT NULL DEFAULT 0 COMMENT '时长（分钟）',
  `type` varchar(16) NOT NULL DEFAULT 'work' COMMENT '类型',
  `completed` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否完成',
  `creator` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  `tenant_id` bigint NOT NULL DEFAULT 0 COMMENT '租户编号',
  PRIMARY KEY (`id`),
  KEY `idx_pomodoro_user_time` (`user_id`, `start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='番茄钟会话';

CREATE TABLE IF NOT EXISTS `violation` (
  `id` varchar(64) NOT NULL COMMENT '违规编号（UUID）',
  `user_id` bigint NOT NULL COMMENT '用户编号',
  `reservation_id` varchar(64) NOT NULL COMMENT '预约编号',
  `violation_type` varchar(20) NOT NULL COMMENT '违规类型',
  `violation_time` datetime NOT NULL COMMENT '违规时间',
  `credit_deduction` int NOT NULL DEFAULT 0 COMMENT '扣除积分',
  `description` varchar(255) DEFAULT NULL COMMENT '处理说明',
  `creator` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  `tenant_id` bigint NOT NULL DEFAULT 0 COMMENT '租户编号',
  PRIMARY KEY (`id`),
  KEY `idx_violation_user_time` (`user_id`, `violation_time`),
  KEY `idx_violation_reservation` (`reservation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='违规记录';

-- 2) 示例数据（仅在表为空时写入）
-- ------------------------------------------------------------
INSERT INTO `study_room` (`name`, `description`, `max_capacity`, `online_count`, `creator_user_id`, `status`, `creator`, `updater`, `tenant_id`)
SELECT '晨光自习室', '早间专注房间（示例数据）', 48, 0, 1, 0, 'admin', 'admin', 0
WHERE NOT EXISTS (SELECT 1 FROM `study_room`);

INSERT INTO `study_room` (`name`, `description`, `max_capacity`, `online_count`, `creator_user_id`, `status`, `creator`, `updater`, `tenant_id`)
SELECT '夜读交流室', '夜间陪伴学习房间（示例数据）', 36, 0, 1, 0, 'admin', 'admin', 0
WHERE (SELECT COUNT(*) FROM `study_room`) < 2;

-- 为示例房间补充座位（如果该房间目前没有座位）
INSERT INTO `seat` (`room_id`, `seat_number`, `seat_type`, `has_power`, `has_lamp`, `status`, `creator`, `updater`, `tenant_id`)
SELECT sr.id, 'A1', 'quiet', b'1', b'1', 0, 'admin', 'admin', sr.tenant_id
FROM `study_room` sr
WHERE sr.name = '晨光自习室'
  AND NOT EXISTS (SELECT 1 FROM `seat` s WHERE s.room_id = sr.id);

INSERT INTO `seat` (`room_id`, `seat_number`, `seat_type`, `has_power`, `has_lamp`, `status`, `creator`, `updater`, `tenant_id`)
SELECT sr.id, 'A2', 'normal', b'1', b'0', 0, 'admin', 'admin', sr.tenant_id
FROM `study_room` sr
WHERE sr.name = '晨光自习室'
  AND NOT EXISTS (SELECT 1 FROM `seat` s WHERE s.room_id = sr.id AND s.seat_number = 'A2');

INSERT INTO `seat` (`room_id`, `seat_number`, `seat_type`, `has_power`, `has_lamp`, `status`, `creator`, `updater`, `tenant_id`)
SELECT sr.id, 'A3', 'discussion', b'0', b'0', 0, 'admin', 'admin', sr.tenant_id
FROM `study_room` sr
WHERE sr.name = '晨光自习室'
  AND NOT EXISTS (SELECT 1 FROM `seat` s WHERE s.room_id = sr.id AND s.seat_number = 'A3');

INSERT INTO `seat` (`room_id`, `seat_number`, `seat_type`, `has_power`, `has_lamp`, `status`, `creator`, `updater`, `tenant_id`)
SELECT sr.id, 'B1', 'quiet', b'1', b'1', 0, 'admin', 'admin', sr.tenant_id
FROM `study_room` sr
WHERE sr.name = '夜读交流室'
  AND NOT EXISTS (SELECT 1 FROM `seat` s WHERE s.room_id = sr.id);

INSERT INTO `seat` (`room_id`, `seat_number`, `seat_type`, `has_power`, `has_lamp`, `status`, `creator`, `updater`, `tenant_id`)
SELECT sr.id, 'B2', 'normal', b'1', b'0', 0, 'admin', 'admin', sr.tenant_id
FROM `study_room` sr
WHERE sr.name = '夜读交流室'
  AND NOT EXISTS (SELECT 1 FROM `seat` s WHERE s.room_id = sr.id AND s.seat_number = 'B2');

INSERT INTO `seat` (`room_id`, `seat_number`, `seat_type`, `has_power`, `has_lamp`, `status`, `creator`, `updater`, `tenant_id`)
SELECT sr.id, 'B3', 'discussion', b'0', b'0', 0, 'admin', 'admin', sr.tenant_id
FROM `study_room` sr
WHERE sr.name = '夜读交流室'
  AND NOT EXISTS (SELECT 1 FROM `seat` s WHERE s.room_id = sr.id AND s.seat_number = 'B3');

-- 3) 后台菜单与权限（目录 + 菜单 + 按钮）
-- ------------------------------------------------------------
-- 根目录：自习室
INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6000, '自习室', '', 1, 10, 0, '/studyroom', 'ep:office-building', 'Layout', 'StudyRoom', 0, b'1', b'1', b'1', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6000);

-- 自习室子菜单
INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6001, '自习室大厅', 'studyroom:room:query', 2, 10, 6000, 'hall', 'ep:list', 'studyroom/hall/index', 'StudyRoomHall', 0, b'1', b'1', b'0', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6001);

INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6002, '学习统计', 'studyroom:statistics:query', 2, 20, 6000, 'statistics', 'ep:data-analysis', 'studyroom/statistics/index', 'StudyStatistics', 0, b'1', b'1', b'0', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6002);

INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6003, '座位预约', 'studyroom:reservation:list', 2, 30, 6000, 'reservation', 'ep:ticket', 'studyroom/reservation/index', 'SeatReservation', 0, b'1', b'1', b'0', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6003);

INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6004, '自习室管理', 'studyroom:manage:query', 2, 40, 6000, 'manage', 'ep:setting', 'studyroom/manage/index', 'StudyRoomManage', 0, b'1', b'0', b'0', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6004);

INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6005, '平台数据', 'statistics:platform:query', 2, 50, 6000, 'platform', 'ep:data-line', 'statistics/platform/index', 'PlatformStatistics', 0, b'1', b'0', b'0', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6005);

-- 管理动作按钮
INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6006, '关闭/开启自习室', 'studyroom:manage:close', 3, 10, 6004, '', '', NULL, NULL, 0, b'1', b'0', b'0', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6006);

-- 根目录：用户管理
INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6100, '用户管理', '', 1, 20, 0, '/user-manage', 'ep:user', 'Layout', 'UserManage', 0, b'1', b'1', b'1', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6100);

INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6101, '用户列表', 'studyroom:user-management:query', 2, 10, 6100, 'list', 'ep:user', 'system/user/index', 'UserManageList', 0, b'1', b'0', b'0', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6101);

INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6102, '封禁用户', 'studyroom:user-management:ban', 3, 20, 6101, '', '', NULL, NULL, 0, b'1', b'0', b'0', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6102);

INSERT INTO `system_menu` (`id`, `name`, `permission`, `type`, `sort`, `parent_id`, `path`, `icon`, `component`, `component_name`, `status`, `visible`, `keep_alive`, `always_show`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT 6103, '解封用户', 'studyroom:user-management:unban', 3, 30, 6101, '', '', NULL, NULL, 0, b'1', b'0', b'0', 'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (SELECT 1 FROM `system_menu` WHERE id = 6103);

-- 为管理员角色授权以上菜单
INSERT INTO `system_role_menu` (`role_id`, `menu_id`, `creator`, `create_time`, `updater`, `update_time`, `deleted`, `tenant_id`)
SELECT r.id, m.id, 'admin', NOW(), 'admin', NOW(), b'0', r.tenant_id
FROM `system_role` r
JOIN (SELECT 6000 AS id UNION ALL SELECT 6001 UNION ALL SELECT 6002 UNION ALL SELECT 6003 UNION ALL SELECT 6004 UNION ALL SELECT 6005 UNION ALL SELECT 6006 UNION ALL SELECT 6100 UNION ALL SELECT 6101 UNION ALL SELECT 6102 UNION ALL SELECT 6103) m
WHERE r.deleted = b'0' AND (r.code = 'super_admin' OR r.type = 1)
ON DUPLICATE KEY UPDATE updater = VALUES(updater), update_time = VALUES(update_time), deleted = b'0';

-- 4) 本地文件存储配置（头像上传等）
-- ------------------------------------------------------------
INSERT INTO `infra_file_config` (`name`, `storage`, `remark`, `master`, `config`, `creator`, `create_time`, `updater`, `update_time`, `deleted`)
SELECT
  'local-file',
  10,
  'Local storage for avatar uploads',
  b'1',
  '{"@class":"cn.iocoder.yudao.module.infra.framework.file.core.client.local.LocalFileClientConfig","basePath":"/opt/yudao/upload","domain":"http://localhost:48080"}',
  'admin', NOW(), 'admin', NOW(), b'0'
WHERE NOT EXISTS (
  SELECT 1 FROM `infra_file_config` WHERE `master` = b'1' AND `deleted` = b'0'
);
