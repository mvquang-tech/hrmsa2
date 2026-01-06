-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1:3306
-- Thời gian đã tạo: Th1 06, 2026 lúc 02:50 PM
-- Phiên bản máy phục vụ: 8.0.31
-- Phiên bản PHP: 8.2.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `hrm_db`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `academic_titles`
--

DROP TABLE IF EXISTS `academic_titles`;
CREATE TABLE IF NOT EXISTS `academic_titles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `academic_titles`
--

INSERT INTO `academic_titles` (`id`, `code`, `name`, `createdAt`) VALUES
(1, 'giao_su', 'Giáo sư', '2026-01-04 12:42:00'),
(2, 'pho_giao_su', 'Phó giáo sư', '2026-01-04 12:42:00'),
(3, 'vien_si', 'Viện sĩ', '2026-01-04 12:42:00'),
(4, 'tien_si', 'Tiến sĩ', '2026-01-04 12:42:00');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `departments`
--

DROP TABLE IF EXISTS `departments`;
CREATE TABLE IF NOT EXISTS `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `managerId` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_manager` (`managerId`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `departments`
--

INSERT INTO `departments` (`id`, `name`, `code`, `description`, `managerId`, `createdAt`, `updatedAt`) VALUES
(1, 'Trung tâm Phát triển & Ứng dụng phần mềm DNC', 'DET001', NULL, NULL, '2026-01-03 01:50:26', '2026-01-03 03:25:57'),
(2, 'Phòng Công nghệ thông tin', 'DET002', NULL, NULL, '2026-01-03 01:54:45', '2026-01-03 02:30:20');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `education_levels`
--

DROP TABLE IF EXISTS `education_levels`;
CREATE TABLE IF NOT EXISTS `education_levels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `education_levels`
--

INSERT INTO `education_levels` (`id`, `code`, `name`, `createdAt`) VALUES
(1, 'trung_cap', 'Trung cấp', '2026-01-04 12:23:06'),
(2, 'cao_dang', 'Cao đẳng', '2026-01-04 12:23:06'),
(3, 'dai_hoc', 'Đại học', '2026-01-04 12:23:06'),
(4, 'thac_si', 'Thạc sĩ', '2026-01-04 12:23:06'),
(5, 'tien_si', 'Tiến sĩ', '2026-01-04 12:23:06'),
(6, 'tien_si_khoa_hoc', 'Tiến sĩ khoa học', '2026-01-04 12:23:06'),
(7, 'chuyen_khoa_i', 'Chuyên khoa cấp I', '2026-01-04 12:23:06'),
(8, 'chuyen_khoa_ii', 'Chuyên khoa cấp II', '2026-01-04 12:23:06'),
(9, 'bac_si_noi_tru', 'Bác sĩ nội trú', '2026-01-04 12:23:06'),
(10, 'khac', 'Khác', '2026-01-04 12:23:06');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `employees`
--

DROP TABLE IF EXISTS `employees`;
CREATE TABLE IF NOT EXISTS `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `firstName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `dateOfBirth` date DEFAULT NULL,
  `dateOfJoin` date NOT NULL,
  `departmentId` int NOT NULL,
  `position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salary` decimal(12,2) DEFAULT NULL,
  `status` enum('active','inactive','terminated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `educationLevelId` int DEFAULT NULL,
  `academicTitleId` int DEFAULT NULL,
  `placeOfTraining` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` enum('male','female') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cccdNumber` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cccdIssuedDate` date DEFAULT NULL,
  `cccdIssuedPlace` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `internshipStart` date DEFAULT NULL,
  `internshipEnd` date DEFAULT NULL,
  `trainingStart` date DEFAULT NULL,
  `trainingEnd` date DEFAULT NULL,
  `probationStart` date DEFAULT NULL,
  `probationEnd` date DEFAULT NULL,
  `officialStart` date DEFAULT NULL,
  `officialEnd` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_code` (`code`),
  KEY `idx_email` (`email`),
  KEY `idx_department` (`departmentId`),
  KEY `idx_status` (`status`),
  KEY `fk_employee_education` (`educationLevelId`),
  KEY `fk_employee_academic` (`academicTitleId`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `employees`
--

INSERT INTO `employees` (`id`, `code`, `firstName`, `lastName`, `email`, `phone`, `address`, `dateOfBirth`, `dateOfJoin`, `departmentId`, `position`, `salary`, `status`, `createdAt`, `updatedAt`, `educationLevelId`, `academicTitleId`, `placeOfTraining`, `gender`, `cccdNumber`, `cccdIssuedDate`, `cccdIssuedPlace`, `internshipStart`, `internshipEnd`, `trainingStart`, `trainingEnd`, `probationStart`, `probationEnd`, `officialStart`, `officialEnd`) VALUES
(1, '26001', 'Mai Viet', 'Quang', 'mvquang91@gmail.com', '0775867145', 'Cần Thơ', '1990-04-07', '2016-12-25', 1, 'Phó Giám Đốc', NULL, 'active', '2026-01-03 02:25:21', '2026-01-04 13:51:50', 3, NULL, 'Đại học Cần Thơ', 'male', '369123123', '2007-01-01', 'Cục cảnh sát', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, '26002', 'Nguyễn', 'Minh', 'nguyenminh@gmail.com', '0919123123', 'Cần Thơ', '1999-12-31', '2025-12-30', 2, 'Chuyên viên', NULL, 'active', '2026-01-03 02:31:30', '2026-01-04 13:28:36', 3, NULL, NULL, 'male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, '26003', 'Trần Thị', 'Tiên', 'ttien@gmail.com', NULL, 'Cần Thơ', '1994-12-31', '2025-12-31', 2, 'Nhân viên', NULL, 'active', '2026-01-03 15:21:17', '2026-01-04 13:28:40', 3, NULL, NULL, 'male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, '25001', 'admin', 'hrm', 'mvquang@gmail.com', '0775867145', 'Cần Thơ', '2002-12-31', '2000-01-01', 2, 'admin', NULL, 'active', '2026-01-04 07:15:10', '2026-01-04 13:28:44', 3, NULL, NULL, 'male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, '26004', 'Nguyên Minh', 'Nhật', 'nmnhat@gmail.com', NULL, 'Cần Thơ', '2000-01-01', '2026-01-01', 2, 'Nhân viên', NULL, 'active', '2026-01-04 13:30:32', '2026-01-04 14:09:30', 3, NULL, NULL, 'male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-30', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `files`
--

DROP TABLE IF EXISTS `files`;
CREATE TABLE IF NOT EXISTS `files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Stored filename on disk',
  `originalName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Original uploaded filename',
  `mimeType` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` bigint DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `tags` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON array of tags',
  `fileType` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'User defined file type/category',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdBy` int DEFAULT NULL,
  `path` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Relative path to file on disk',
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_createdBy` (`createdBy`),
  KEY `idx_fileType` (`fileType`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `files`
--

INSERT INTO `files` (`id`, `filename`, `originalName`, `mimeType`, `size`, `description`, `tags`, `fileType`, `notes`, `createdBy`, `path`, `isActive`, `createdAt`, `updatedAt`) VALUES
(16, '1767523429047_02_2025_hnct-softedu_vv_xay_dung_va_trien_khai_phan_he_hoc_vu_sinh_vien_chuc_nang_1_1_-_1_7.pdf', '02_2025_hnct-softedu_vv_xay_dung_va_trien_khai_phan_he_hoc_vu_sinh_vien_chuc_nang_1_1_-_1_7.pdf', 'application/pdf', 2535679, '02_2025_ĐHNCT-SOFTEDU Vv Xây dựng và triển khai Phân hệ học vụ sinh viên (Chức năng 1_1 - 1_7)', '[\"Hợp đồng\"]', NULL, NULL, 1, '/uploads/2026/01/04/1767523429047_02_2025_hnct-softedu_vv_xay_dung_va_trien_khai_phan_he_hoc_vu_sinh_vien_chuc_nang_1_1_-_1_7.pdf', 1, '2026-01-04 10:43:49', '2026-01-04 10:44:58'),
(17, '1767523429047_03_2025_hnct-softedu_vv_xay_dung_va_trien_khai_danh_muc_he_thong_va_phan_he_thoi_khoa_bieu.pdf', '03_2025_hnct-softedu_vv_xay_dung_va_trien_khai_danh_muc_he_thong_va_phan_he_thoi_khoa_bieu.pdf', 'application/pdf', 2431776, '03_2025_ĐHNCT-SOFTEDU Vv Xây dựng và triển khai Danh mục hệ thống và Phân hệ thời khóa biểu', '[\"Hợp đồng\"]', NULL, NULL, 1, '/uploads/2026/01/04/1767523429047_03_2025_hnct-softedu_vv_xay_dung_va_trien_khai_danh_muc_he_thong_va_phan_he_thoi_khoa_bieu.pdf', 1, '2026-01-04 10:43:49', '2026-01-04 10:45:39'),
(18, '1767523429172_04_2025_hnct-softedu_vv_xay_dung_va_trien_khai_phan_he_hoc_vu_sinh_vien_chuc_nang_1_8_-_1_17.pdf', '04_2025_hnct-softedu_vv_xay_dung_va_trien_khai_phan_he_hoc_vu_sinh_vien_chuc_nang_1_8_-_1_17.pdf', 'application/pdf', 2714424, '04_2025_ĐHNCT-SOFTEDU Vv Xây dựng và triển khai Phân hệ học vụ sinh viên (Chức năng 1_8 - 1_17)', '[\"Hợp đồng\"]', NULL, NULL, 1, '/uploads/2026/01/04/1767523429172_04_2025_hnct-softedu_vv_xay_dung_va_trien_khai_phan_he_hoc_vu_sinh_vien_chuc_nang_1_8_-_1_17.pdf', 1, '2026-01-04 10:43:49', '2026-01-04 10:45:49'),
(19, '1767523429172_01_2025_hnct-softedu_vv_xay_dung_va_trien_khai_danh_muc_he_thong_va_phan_he_thoi_khoa_bieu_thuoc_phan_mem_quan_ly_giao_duc_dnc.pdf', '01_2025_hnct-softedu_vv_xay_dung_va_trien_khai_danh_muc_he_thong_va_phan_he_thoi_khoa_bieu_thuoc_phan_mem_quan_ly_giao_duc_dnc.pdf', 'application/pdf', 3115143, '01_2025ĐHNCT-SOFTEDU vv Xây dựng và triển khai Danh mục hệ thống và Phân hệ thời khóa biểu thuộc phần mềm Quản lý Giáo dục DNC', '[\"Hợp đồng\"]', NULL, NULL, 1, '/uploads/2026/01/04/1767523429172_01_2025_hnct-softedu_vv_xay_dung_va_trien_khai_danh_muc_he_thong_va_phan_he_thoi_khoa_bieu_thuoc_phan_mem_quan_ly_giao_duc_dnc.pdf', 1, '2026-01-04 10:43:49', '2026-01-04 10:44:41');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `leaves`
--

DROP TABLE IF EXISTS `leaves`;
CREATE TABLE IF NOT EXISTS `leaves` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employeeId` int NOT NULL,
  `type` enum('annual','sick','personal','maternity','unpaid') COLLATE utf8mb4_unicode_ci NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `days` decimal(4,2) NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `approvedBy` int DEFAULT NULL,
  `approvedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `approvedBy` (`approvedBy`),
  KEY `idx_employee` (`employeeId`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`startDate`,`endDate`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `leaves`
--

INSERT INTO `leaves` (`id`, `employeeId`, `type`, `startDate`, `endDate`, `days`, `reason`, `status`, `approvedBy`, `approvedAt`, `createdAt`, `updatedAt`) VALUES
(9, 1, 'annual', '2026-01-04', '2026-01-04', '1.00', 'Chọn buổi nghỉ cho từng ngày:\n', 'approved', 1, '2026-01-03 15:11:01', '2026-01-03 12:09:45', '2026-01-03 15:11:01'),
(21, 4, 'sick', '2026-01-05', '2026-01-06', '1.50', 'Tạo đơn nghỉ phép\n', 'pending', NULL, NULL, '2026-01-05 10:21:14', '2026-01-05 10:21:14');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `leave_notification_logs`
--

DROP TABLE IF EXISTS `leave_notification_logs`;
CREATE TABLE IF NOT EXISTS `leave_notification_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `leaveId` int NOT NULL,
  `status` enum('pending','sent','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `error` text COLLATE utf8mb4_unicode_ci,
  `sentAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leave` (`leaveId`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `leave_notification_logs`
--

INSERT INTO `leave_notification_logs` (`id`, `leaveId`, `status`, `error`, `sentAt`, `createdAt`) VALUES
(5, 21, 'sent', NULL, '2026-01-05 10:21:16', '2026-01-05 10:21:14');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `leave_sessions`
--

DROP TABLE IF EXISTS `leave_sessions`;
CREATE TABLE IF NOT EXISTS `leave_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `leaveId` int NOT NULL,
  `date` date NOT NULL,
  `sessionType` enum('morning','afternoon') COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_leave_date_session` (`leaveId`,`date`,`sessionType`),
  KEY `idx_leave` (`leaveId`),
  KEY `idx_date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `leave_sessions`
--

INSERT INTO `leave_sessions` (`id`, `leaveId`, `date`, `sessionType`, `createdAt`, `updatedAt`) VALUES
(9, 9, '2026-01-04', 'morning', '2026-01-03 12:09:56', '2026-01-03 12:09:56'),
(10, 9, '2026-01-04', 'afternoon', '2026-01-03 12:09:56', '2026-01-03 12:09:56'),
(57, 21, '2026-01-05', 'afternoon', '2026-01-05 10:21:14', '2026-01-05 10:21:14'),
(58, 21, '2026-01-06', 'morning', '2026-01-05 10:21:14', '2026-01-05 10:21:14'),
(59, 21, '2026-01-06', 'afternoon', '2026-01-05 10:21:14', '2026-01-05 10:21:14');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `meetings`
--

DROP TABLE IF EXISTS `meetings`;
CREATE TABLE IF NOT EXISTS `meetings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tiêu đề cuộc họp',
  `date` date NOT NULL COMMENT 'Ngày họp',
  `time` time NOT NULL COMMENT 'Giờ bắt đầu',
  `duration` int DEFAULT '60' COMMENT 'Thời lượng (phút)',
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Địa điểm',
  `attendees` text COLLATE utf8mb4_unicode_ci COMMENT 'Danh sách người tham dự (comma separated)',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Ghi chú, agenda',
  `reminderEnabled` tinyint(1) DEFAULT '0' COMMENT 'Bật nhắc nhở',
  `reminderMinutes` int DEFAULT '15' COMMENT 'Nhắc trước bao nhiêu phút',
  `reminderSent` tinyint(1) DEFAULT '0' COMMENT 'Đã gửi nhắc nhở chưa',
  `status` enum('upcoming','ongoing','finished','unknown') COLLATE utf8mb4_unicode_ci DEFAULT 'upcoming',
  `createdBy` int NOT NULL COMMENT 'Người tạo (employee id)',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_date` (`date`),
  KEY `idx_createdBy` (`createdBy`),
  KEY `idx_reminder` (`reminderEnabled`,`reminderSent`,`date`,`time`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `meetings`
--

INSERT INTO `meetings` (`id`, `title`, `date`, `time`, `duration`, `location`, `attendees`, `notes`, `reminderEnabled`, `reminderMinutes`, `reminderSent`, `status`, `createdBy`, `createdAt`, `updatedAt`) VALUES
(7, 'Họp thành lập các Trường DNC', '2026-01-05', '09:00:00', 120, 'Phòng Họp Yersin - Khu P', NULL, NULL, 0, 15, 0, 'finished', 4, '2026-01-05 02:58:34', '2026-01-05 16:06:38'),
(8, 'Họp nghiệm thu phần số hóa của BXD', '2026-01-08', '01:30:00', 60, 'Chưa có phòng', NULL, 'Chưa xác định cụ thể thời gian, địa điểm', 0, 30, 0, 'upcoming', 4, '2026-01-05 03:00:01', '2026-01-05 17:04:26'),
(9, 'Họp giao ban', '2026-01-06', '09:00:00', 60, 'Phòng Họp Yersin - Khu P', NULL, NULL, 0, 15, 0, 'finished', 4, '2026-01-05 08:56:25', '2026-01-06 14:18:07'),
(10, 'Họp Zalo mini app', '2026-01-06', '15:00:00', 60, 'Phòng học Tiến sĩ - Khu I', NULL, 'Kính gửi quý thầy/cô lịch 15h00\' T3, 06/01 tại trung tâm PM có lịch Zalo Mini app. Kính mời các thành viên tham dự đầy đủ', 0, 15, 0, 'finished', 4, '2026-01-05 09:56:58', '2026-01-06 14:18:14'),
(11, 'Phỏng vấn IT', '2026-01-08', '09:00:00', 60, 'Phòng Họp Yersin - Khu P', NULL, NULL, 0, 15, 0, 'upcoming', 4, '2026-01-05 10:20:04', '2026-01-05 16:06:45');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `meeting_reads`
--

DROP TABLE IF EXISTS `meeting_reads`;
CREATE TABLE IF NOT EXISTS `meeting_reads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meetingId` int NOT NULL,
  `userId` int NOT NULL COMMENT 'employee id',
  `readAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_meeting_user` (`meetingId`,`userId`),
  KEY `idx_meeting` (`meetingId`),
  KEY `idx_user` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `meeting_reads`
--

INSERT INTO `meeting_reads` (`id`, `meetingId`, `userId`, `readAt`, `createdAt`) VALUES
(86, 7, 4, '2026-01-05 17:18:47', '2026-01-05 10:49:04');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `notification_logs`
--

DROP TABLE IF EXISTS `notification_logs`;
CREATE TABLE IF NOT EXISTS `notification_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meetingId` int NOT NULL,
  `status` enum('pending','sent','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `error` text COLLATE utf8mb4_unicode_ci COMMENT 'Lỗi nếu có',
  `sentAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_meeting` (`meetingId`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `overtime`
--

DROP TABLE IF EXISTS `overtime`;
CREATE TABLE IF NOT EXISTS `overtime` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employeeId` int NOT NULL,
  `date` date NOT NULL,
  `hours` decimal(4,2) NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `approvedBy` int DEFAULT NULL,
  `approvedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `total_seconds` int NOT NULL DEFAULT '0',
  `total_hours` decimal(8,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `approvedBy` (`approvedBy`),
  KEY `idx_employee` (`employeeId`),
  KEY `idx_date` (`date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `overtime`
--

INSERT INTO `overtime` (`id`, `employeeId`, `date`, `hours`, `reason`, `status`, `approvedBy`, `approvedAt`, `createdAt`, `updatedAt`, `total_seconds`, `total_hours`) VALUES
(6, 4, '0000-00-00', '0.00', 'Tạo đơn ngoài giờ\n', 'pending', NULL, NULL, '2026-01-04 16:09:15', '2026-01-05 01:18:44', 417600, '116.00'),
(10, 1, '0000-00-00', '0.00', 'Tăng ca code', 'pending', NULL, NULL, '2026-01-04 17:32:30', '2026-01-04 17:32:30', 14400, '4.00'),
(11, 5, '0000-00-00', '0.00', 'Tăng ca viết code', 'pending', NULL, NULL, '2026-01-04 17:54:59', '2026-01-04 17:55:33', 32400, '9.00'),
(12, 2, '0000-00-00', '0.00', 'Tạo đơn ngoài giờ\n', 'pending', NULL, NULL, '2026-01-04 18:22:53', '2026-01-04 18:22:53', 14400, '4.00');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `overtime_days`
--

DROP TABLE IF EXISTS `overtime_days`;
CREATE TABLE IF NOT EXISTS `overtime_days` (
  `id` int NOT NULL AUTO_INCREMENT,
  `overtimeId` int NOT NULL,
  `date` date NOT NULL,
  `total_seconds` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_overtimeId` (`overtimeId`)
) ENGINE=InnoDB AUTO_INCREMENT=183 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `overtime_days`
--

INSERT INTO `overtime_days` (`id`, `overtimeId`, `date`, `total_seconds`, `createdAt`, `updatedAt`) VALUES
(25, 11, '2026-01-04', 10800, '2026-01-04 17:55:33', '2026-01-04 17:55:33'),
(26, 11, '2026-01-05', 14400, '2026-01-04 17:55:33', '2026-01-04 17:55:33'),
(27, 11, '2026-01-06', 7200, '2026-01-04 17:55:33', '2026-01-04 17:55:33'),
(152, 10, '2026-01-05', 14400, '2026-01-04 18:22:29', '2026-01-04 18:22:29'),
(153, 12, '2026-01-05', 14400, '2026-01-04 18:22:53', '2026-01-04 18:22:53'),
(154, 6, '2025-12-29', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(155, 6, '2025-12-30', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(156, 6, '2025-12-31', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(157, 6, '2026-01-01', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(158, 6, '2026-01-02', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(159, 6, '2026-01-03', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(160, 6, '2026-01-04', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(161, 6, '2026-01-05', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(162, 6, '2026-01-06', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(163, 6, '2026-01-07', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(164, 6, '2026-01-08', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(165, 6, '2026-01-09', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(166, 6, '2026-01-10', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(167, 6, '2026-01-11', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(168, 6, '2026-01-12', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(169, 6, '2026-01-13', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(170, 6, '2026-01-14', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(171, 6, '2026-01-15', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(172, 6, '2026-01-16', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(173, 6, '2026-01-17', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(174, 6, '2026-01-18', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(175, 6, '2026-01-19', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(176, 6, '2026-01-20', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(177, 6, '2026-01-21', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(178, 6, '2026-01-22', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(179, 6, '2026-01-23', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(180, 6, '2026-01-24', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(181, 6, '2026-01-25', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(182, 6, '2026-01-26', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `overtime_slots`
--

DROP TABLE IF EXISTS `overtime_slots`;
CREATE TABLE IF NOT EXISTS `overtime_slots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dayId` int NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `seconds` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dayId` (`dayId`)
) ENGINE=InnoDB AUTO_INCREMENT=194 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `overtime_slots`
--

INSERT INTO `overtime_slots` (`id`, `dayId`, `start_time`, `end_time`, `seconds`, `createdAt`, `updatedAt`) VALUES
(35, 25, '07:00:00', '09:00:00', 7200, '2026-01-04 17:55:33', '2026-01-04 17:55:33'),
(36, 25, '10:00:00', '11:00:00', 3600, '2026-01-04 17:55:33', '2026-01-04 17:55:33'),
(37, 26, '07:00:00', '11:00:00', 14400, '2026-01-04 17:55:33', '2026-01-04 17:55:33'),
(38, 27, '07:00:00', '09:00:00', 7200, '2026-01-04 17:55:33', '2026-01-04 17:55:33'),
(163, 152, '19:00:00', '23:00:00', 14400, '2026-01-04 18:22:29', '2026-01-04 18:22:29'),
(164, 153, '07:00:00', '11:00:00', 14400, '2026-01-04 18:22:53', '2026-01-04 18:22:53'),
(165, 154, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(166, 155, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(167, 156, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(168, 157, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(169, 158, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(170, 159, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(171, 160, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(172, 161, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(173, 162, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(174, 163, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(175, 164, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(176, 165, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(177, 166, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(178, 167, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(179, 168, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(180, 169, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(181, 170, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(182, 171, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(183, 172, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(184, 173, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(185, 174, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(186, 175, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(187, 176, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(188, 177, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(189, 178, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(190, 179, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(191, 180, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(192, 181, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44'),
(193, 182, '07:00:00', '11:00:00', 14400, '2026-01-05 01:18:44', '2026-01-05 01:18:44');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `permissions`
--

DROP TABLE IF EXISTS `permissions`;
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'M?? quy???n: module.action (vd: users.create)',
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Module: users, departments, employees, overtime, leaves, roles, permissions',
  `action` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Action: view, create, update, delete, approve',
  `description` text COLLATE utf8mb4_unicode_ci,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_module` (`module`),
  KEY `idx_action` (`action`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `code`, `module`, `action`, `description`, `createdAt`, `updatedAt`) VALUES
(1, 'Xem Dashboard', 'dashboard.view', 'dashboard', 'view', 'Xem trang Dashboard', '2026-01-03 02:51:56', '2026-01-03 02:51:56'),
(2, 'Xem danh sách người dùng', 'users.view', 'users', 'view', 'Xem danh sách người dùng', '2026-01-03 02:51:56', '2026-01-03 03:01:46'),
(3, 'Tạo người dùng', 'users.create', 'users', 'create', 'Tạo người dùng', '2026-01-03 02:51:56', '2026-01-03 03:02:16'),
(4, 'Sửa người dùng', 'users.update', 'users', 'update', 'Sửa người dùng', '2026-01-03 02:51:56', '2026-01-03 03:01:59'),
(5, 'Xóa người dùng', 'users.delete', 'users', 'delete', 'Xóa người dùng', '2026-01-03 02:51:56', '2026-01-03 03:02:10'),
(6, 'Xem vai trò', 'roles.view', 'roles', 'view', 'Xem danh sách vai trò', '2026-01-03 02:51:56', '2026-01-03 03:02:37'),
(7, 'Tạo vai trò', 'roles.create', 'roles', 'create', 'Tạo vai trò mới', '2026-01-03 02:51:56', '2026-01-03 03:02:51'),
(8, 'Sửa vai trò', 'roles.update', 'roles', 'update', 'cập nhật vai trò', '2026-01-03 02:51:56', '2026-01-03 03:03:24'),
(9, 'Xóa vai trò', 'roles.delete', 'roles', 'delete', 'Xóa vai trò', '2026-01-03 02:51:56', '2026-01-03 03:03:20'),
(10, 'Phân quyền', 'roles.assign', 'roles', 'assign', 'Phân quyền cho vai trò', '2026-01-03 02:51:56', '2026-01-03 03:03:41'),
(11, 'Xem phòng ban', 'departments.view', 'departments', 'view', 'Xem danh sách phòng ban', '2026-01-03 02:51:56', '2026-01-03 03:03:56'),
(12, 'Tạo phòng ban', 'departments.create', 'departments', 'create', 'Tạo phòng ban', '2026-01-03 02:51:56', '2026-01-03 03:06:03'),
(13, 'Sửa phòng ban', 'departments.update', 'departments', 'update', 'Sửa phòng ban', '2026-01-03 02:51:56', '2026-01-03 03:06:08'),
(14, 'Xóa phòng ban', 'departments.delete', 'departments', 'delete', 'Xóa phòng ban', '2026-01-03 02:51:56', '2026-01-03 03:06:12'),
(15, 'Xem nhân viên', 'employees.view', 'employees', 'view', 'Xem nhân viên', '2026-01-03 02:51:56', '2026-01-03 03:06:17'),
(16, 'Tạo nhân viên', 'employees.create', 'employees', 'create', 'Tạo nhân viên', '2026-01-03 02:51:56', '2026-01-03 03:06:22'),
(17, 'Sửa nhân viên', 'employees.update', 'employees', 'update', 'Sửa nhân viên', '2026-01-03 02:51:56', '2026-01-03 03:06:29'),
(18, 'Xóa nhân viên', 'employees.delete', 'employees', 'delete', 'Xóa nhân viên', '2026-01-03 02:51:56', '2026-01-03 03:06:33'),
(19, 'Xem ngoài giờ', 'overtime.view', 'overtime', 'view', 'Xem ngoài giờ', '2026-01-03 02:51:56', '2026-01-03 03:06:38'),
(20, 'Tạo ngoài giờ', 'overtime.create', 'overtime', 'create', 'Tạo ngoài giờ', '2026-01-03 02:51:56', '2026-01-03 03:06:46'),
(21, 'Sửa ngoài giờ', 'overtime.update', 'overtime', 'update', 'Sửa ngoài giờ', '2026-01-03 02:51:56', '2026-01-03 03:06:53'),
(22, 'Xóa ngoài giờ', 'overtime.delete', 'overtime', 'delete', 'Xóa ngoài giờ', '2026-01-03 02:51:56', '2026-01-03 03:06:58'),
(23, 'Duyệt ngoài giờ', 'overtime.approve', 'overtime', 'approve', 'Duyệt ngoài giờ', '2026-01-03 02:51:56', '2026-01-03 03:07:02'),
(24, 'Xem nghỉ phép', 'leaves.view', 'leaves', 'view', 'Xem nghỉ phép', '2026-01-03 02:51:56', '2026-01-03 03:07:07'),
(25, 'Tạo nghỉ phép', 'leaves.create', 'leaves', 'create', 'Tạo nghỉ phép', '2026-01-03 02:51:56', '2026-01-03 03:07:12'),
(26, 'Sửa nghỉ phép', 'leaves.update', 'leaves', 'update', 'Sửa nghỉ phép', '2026-01-03 02:51:56', '2026-01-03 03:08:06'),
(27, 'Xóa nghỉ phép', 'leaves.delete', 'leaves', 'delete', 'Xóa nghỉ phép', '2026-01-03 02:51:56', '2026-01-03 03:08:12'),
(28, 'Duyệt nghỉ phép', 'leaves.approve', 'leaves', 'approve', 'leaves.approve', '2026-01-03 02:51:56', '2026-01-03 03:08:17'),
(29, 'Xem lịch họp', 'meetings.view', 'meetings', 'view', 'Xem danh sách cuộc họp', '2026-01-03 16:40:10', '2026-01-03 16:52:20'),
(30, 'Tạo cuộc họp', 'meetings.create', 'meetings', 'create', 'Tạo cuộc họp mới', '2026-01-03 16:40:10', '2026-01-03 16:52:24'),
(31, 'Sửa cuộc họp', 'meetings.update', 'meetings', 'update', 'Cập nhật cuộc họp', '2026-01-03 16:40:10', '2026-01-03 16:52:27'),
(32, 'Xóa cuộc họp', 'meetings.delete', 'meetings', 'delete', 'Xóa cuộc họp', '2026-01-03 16:40:10', '2026-01-03 16:52:30'),
(33, 'Cấu hình thông báo', 'meetings.config', 'meetings', 'config', 'Cấu hình Telegram bot', '2026-01-03 16:40:10', '2026-01-03 16:52:34'),
(34, 'Xem cấu hình hệ thống', 'settings.view', 'settings', 'view', 'Xem trang cài đặt hệ thống', '2026-01-04 07:53:31', '2026-01-04 07:53:31'),
(35, 'Cập nhật cấu hình hệ thống', 'settings.update', 'settings', 'update', 'Cập nhật cấu hình hệ thống', '2026-01-04 07:53:31', '2026-01-04 07:53:31'),
(36, 'Xem cấu hình Telegram', 'telegram.view', 'telegram', 'view', 'Xem cấu hình Telegram', '2026-01-04 07:53:31', '2026-01-04 07:53:31'),
(37, 'Cập nhật cấu hình Telegram', 'telegram.update', 'telegram', 'update', 'Cập nhật cấu hình Telegram', '2026-01-04 07:53:31', '2026-01-04 07:53:31'),
(38, 'Xem file lưu trữ', 'files.view', 'files', 'view', 'Xem danh sách file lưu trữ', '2026-01-04 08:26:41', '2026-01-04 08:26:41'),
(39, 'Tải lên file', 'files.upload', 'files', 'upload', 'Tải lên file mới', '2026-01-04 08:26:41', '2026-01-04 08:26:41'),
(40, 'Xóa file', 'files.delete', 'files', 'delete', 'Xóa file lưu trữ', '2026-01-04 08:26:41', '2026-01-04 08:26:41'),
(41, 'Cập nhật file', 'files.update', 'files', 'update', 'Cập nhật metadata file', '2026-01-04 08:52:41', '2026-01-04 08:52:41'),
(42, 'Download file', 'files.download', 'files', 'download', 'Tải file trực tiếp', '2026-01-04 09:45:47', '2026-01-04 09:47:10');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `isSystem` tinyint(1) DEFAULT '0' COMMENT 'Vai tr?? h??? th???ng kh??ng th??? x??a',
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_active` (`isActive`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `roles`
--

INSERT INTO `roles` (`id`, `name`, `code`, `description`, `isSystem`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 'admin', 'admin', 'Full quyền', 1, 1, '2026-01-03 02:51:56', '2026-01-03 02:57:01'),
(2, 'Nhân sự', 'hr', 'Quản lý nhân sự, phòng ban', 1, 1, '2026-01-03 02:51:56', '2026-01-03 02:57:19'),
(3, 'Quản lý', 'manager', 'Quản lý phòng ban, duyệt tin', 1, 1, '2026-01-03 02:51:56', '2026-01-03 02:57:46'),
(4, 'Nhân viên', 'employee', 'Quyền cơ bản của nhân viên', 1, 1, '2026-01-03 02:51:56', '2026-01-03 02:59:16');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roleId` int NOT NULL,
  `permissionId` int NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_permission` (`roleId`,`permissionId`),
  KEY `idx_role` (`roleId`),
  KEY `idx_permission` (`permissionId`)
) ENGINE=InnoDB AUTO_INCREMENT=158 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `roleId`, `permissionId`, `createdAt`) VALUES
(1, 1, 23, '2026-01-03 02:51:56'),
(2, 1, 28, '2026-01-03 02:51:56'),
(3, 1, 10, '2026-01-03 02:51:56'),
(4, 1, 3, '2026-01-03 02:51:56'),
(5, 1, 7, '2026-01-03 02:51:56'),
(6, 1, 12, '2026-01-03 02:51:56'),
(7, 1, 16, '2026-01-03 02:51:56'),
(8, 1, 20, '2026-01-03 02:51:56'),
(9, 1, 25, '2026-01-03 02:51:56'),
(10, 1, 5, '2026-01-03 02:51:56'),
(11, 1, 9, '2026-01-03 02:51:56'),
(12, 1, 14, '2026-01-03 02:51:56'),
(13, 1, 18, '2026-01-03 02:51:56'),
(14, 1, 22, '2026-01-03 02:51:56'),
(15, 1, 27, '2026-01-03 02:51:56'),
(16, 1, 4, '2026-01-03 02:51:56'),
(17, 1, 8, '2026-01-03 02:51:56'),
(18, 1, 13, '2026-01-03 02:51:56'),
(19, 1, 17, '2026-01-03 02:51:56'),
(20, 1, 21, '2026-01-03 02:51:56'),
(21, 1, 26, '2026-01-03 02:51:56'),
(22, 1, 1, '2026-01-03 02:51:56'),
(23, 1, 2, '2026-01-03 02:51:56'),
(24, 1, 6, '2026-01-03 02:51:56'),
(25, 1, 11, '2026-01-03 02:51:56'),
(26, 1, 15, '2026-01-03 02:51:56'),
(27, 1, 19, '2026-01-03 02:51:56'),
(28, 1, 24, '2026-01-03 02:51:56'),
(63, 3, 1, '2026-01-03 02:51:56'),
(64, 3, 11, '2026-01-03 02:51:56'),
(65, 3, 15, '2026-01-03 02:51:56'),
(66, 3, 28, '2026-01-03 02:51:56'),
(67, 3, 24, '2026-01-03 02:51:56'),
(68, 3, 23, '2026-01-03 02:51:56'),
(69, 3, 19, '2026-01-03 02:51:56'),
(77, 2, 1, '2026-01-03 03:11:29'),
(78, 2, 12, '2026-01-03 03:11:29'),
(79, 2, 14, '2026-01-03 03:11:29'),
(80, 2, 13, '2026-01-03 03:11:29'),
(81, 2, 11, '2026-01-03 03:11:29'),
(82, 2, 16, '2026-01-03 03:11:29'),
(83, 2, 18, '2026-01-03 03:11:29'),
(84, 2, 17, '2026-01-03 03:11:29'),
(85, 2, 15, '2026-01-03 03:11:29'),
(86, 2, 28, '2026-01-03 03:11:29'),
(87, 2, 25, '2026-01-03 03:11:29'),
(88, 2, 27, '2026-01-03 03:11:29'),
(89, 2, 26, '2026-01-03 03:11:29'),
(90, 2, 24, '2026-01-03 03:11:29'),
(91, 2, 23, '2026-01-03 03:11:29'),
(92, 2, 20, '2026-01-03 03:11:29'),
(93, 2, 22, '2026-01-03 03:11:29'),
(94, 2, 21, '2026-01-03 03:11:29'),
(95, 2, 19, '2026-01-03 03:11:29'),
(96, 2, 3, '2026-01-03 03:11:29'),
(97, 2, 4, '2026-01-03 03:11:29'),
(98, 2, 2, '2026-01-03 03:11:29'),
(99, 4, 25, '2026-01-03 03:53:49'),
(100, 4, 24, '2026-01-03 03:53:49'),
(101, 4, 20, '2026-01-03 03:53:49'),
(102, 4, 19, '2026-01-03 03:53:49'),
(103, 1, 29, '2026-01-03 16:40:10'),
(104, 1, 30, '2026-01-03 16:40:10'),
(105, 1, 31, '2026-01-03 16:40:10'),
(106, 1, 32, '2026-01-03 16:40:10'),
(107, 1, 33, '2026-01-03 16:40:10'),
(110, 2, 29, '2026-01-03 16:40:10'),
(111, 2, 30, '2026-01-03 16:40:10'),
(112, 2, 31, '2026-01-03 16:40:10'),
(113, 2, 32, '2026-01-03 16:40:10'),
(114, 2, 33, '2026-01-03 16:40:10'),
(117, 3, 29, '2026-01-03 16:40:10'),
(118, 3, 30, '2026-01-03 16:40:10'),
(119, 3, 31, '2026-01-03 16:40:10'),
(120, 3, 32, '2026-01-03 16:40:10'),
(121, 3, 33, '2026-01-03 16:40:10'),
(124, 4, 30, '2026-01-03 16:40:10'),
(125, 4, 32, '2026-01-03 16:40:10'),
(126, 4, 31, '2026-01-03 16:40:10'),
(127, 4, 29, '2026-01-03 16:40:10'),
(131, 1, 34, '2026-01-04 07:53:31'),
(132, 1, 35, '2026-01-04 07:53:31'),
(133, 2, 34, '2026-01-04 07:53:31'),
(134, 2, 35, '2026-01-04 07:53:31'),
(138, 1, 36, '2026-01-04 07:53:31'),
(139, 1, 37, '2026-01-04 07:53:31'),
(140, 2, 36, '2026-01-04 07:53:31'),
(141, 2, 37, '2026-01-04 07:53:31'),
(145, 1, 38, '2026-01-04 08:26:41'),
(146, 1, 39, '2026-01-04 08:26:41'),
(147, 1, 40, '2026-01-04 08:26:41'),
(148, 2, 38, '2026-01-04 08:26:41'),
(149, 2, 39, '2026-01-04 08:26:41'),
(150, 2, 40, '2026-01-04 08:26:41'),
(152, 1, 41, '2026-01-04 08:52:41'),
(153, 2, 41, '2026-01-04 08:52:41'),
(155, 1, 42, '2026-01-04 09:45:47'),
(156, 2, 42, '2026-01-04 09:45:47');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `telegram_config`
--

DROP TABLE IF EXISTS `telegram_config`;
CREATE TABLE IF NOT EXISTS `telegram_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL COMMENT 'User ID',
  `botToken` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Telegram Bot Token',
  `chatId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Telegram Chat ID',
  `enabled` tinyint(1) DEFAULT '0' COMMENT 'Kích hoạt thông báo',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`),
  KEY `idx_enabled` (`enabled`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `telegram_config`
--

INSERT INTO `telegram_config` (`id`, `userId`, `botToken`, `chatId`, `enabled`, `createdAt`, `updatedAt`) VALUES
(1, 4, '8468529739:AAGyomaMbn393VNcnbsrCPhhXopNvBCKAx4', '-5104012289', 1, '2026-01-04 04:25:37', '2026-01-04 04:34:05'),
(2, 1, '8468529739:AAGyomaMbn393VNcnbsrCPhhXopNvBCKAx4', '-5104012289', 1, '2026-01-04 07:34:43', '2026-01-04 07:34:43');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','hr','manager','employee') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'employee',
  `employeeId` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `fk_user_employee` (`employeeId`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `employeeId`, `createdAt`, `updatedAt`) VALUES
(1, 'admin', 'admin@hrms.com', '$2a$10$g6ueSmP2YIknQcLMsvJJPOL0VPAxPXrf0W5bTts/W4q9EkxP/grSe', 'admin', 4, '2026-01-03 01:37:42', '2026-01-04 07:16:02'),
(4, '26001', 'mvquang91@gmail.com', '$2a$10$uj3cebWQXTp53ZMRYa6ww.lveuEWZ9v55eyeUiI67BHE15p9WUg7G', 'admin', 1, '2026-01-03 15:19:40', '2026-01-04 06:44:49'),
(5, '26002', 'nguyenminh@gmail.com', '$2a$10$69zPTnoRgz1f7G/gHxPuZ.Y0N27jCJ8NAO8KFgQR3QSn3cXdoCnZG', 'employee', 2, '2026-01-03 15:19:56', '2026-01-04 07:18:43'),
(6, '26003', 'ttien@gmail.com', '$2a$10$gAiCL9CVO.E.PtlsKLDQZ.Wntm24JUh2W9ac.V5AfE8Y077JScwZu', 'employee', 3, '2026-01-03 15:21:23', '2026-01-03 15:21:23'),
(7, '26004', 'nmnhat@gmail.com', '$2a$10$UNGUWjVzQCMxvlN8rpuxeuF.sH9M0Wjlk0cAu2ET.tsFHx1cBhBG6', 'employee', 5, '2026-01-04 14:08:50', '2026-01-04 14:08:50');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `roleId` int NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_role` (`userId`,`roleId`),
  KEY `idx_user` (`userId`),
  KEY `idx_role` (`roleId`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `user_roles`
--

INSERT INTO `user_roles` (`id`, `userId`, `roleId`, `createdAt`) VALUES
(1, 1, 1, '2026-01-03 02:51:56'),
(14, 4, 1, '2026-01-03 17:34:28'),
(22, 6, 4, '2026-01-04 12:03:56'),
(23, 5, 3, '2026-01-04 12:46:23'),
(24, 7, 4, '2026-01-04 14:08:50');

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `fk_department_manager` FOREIGN KEY (`managerId`) REFERENCES `employees` (`id`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_employee_academic` FOREIGN KEY (`academicTitleId`) REFERENCES `academic_titles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_employee_education` FOREIGN KEY (`educationLevelId`) REFERENCES `education_levels` (`id`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `files`
--
ALTER TABLE `files`
  ADD CONSTRAINT `files_ibfk_1` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `leaves`
--
ALTER TABLE `leaves`
  ADD CONSTRAINT `leaves_ibfk_1` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leaves_ibfk_2` FOREIGN KEY (`approvedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `leave_notification_logs`
--
ALTER TABLE `leave_notification_logs`
  ADD CONSTRAINT `leave_notification_logs_ibfk_1` FOREIGN KEY (`leaveId`) REFERENCES `leaves` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `leave_sessions`
--
ALTER TABLE `leave_sessions`
  ADD CONSTRAINT `leave_sessions_ibfk_1` FOREIGN KEY (`leaveId`) REFERENCES `leaves` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `meetings`
--
ALTER TABLE `meetings`
  ADD CONSTRAINT `meetings_ibfk_1` FOREIGN KEY (`createdBy`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `meeting_reads`
--
ALTER TABLE `meeting_reads`
  ADD CONSTRAINT `meeting_reads_ibfk_1` FOREIGN KEY (`meetingId`) REFERENCES `meetings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `meeting_reads_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `notification_logs`
--
ALTER TABLE `notification_logs`
  ADD CONSTRAINT `notification_logs_ibfk_1` FOREIGN KEY (`meetingId`) REFERENCES `meetings` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `overtime`
--
ALTER TABLE `overtime`
  ADD CONSTRAINT `overtime_ibfk_1` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `overtime_ibfk_2` FOREIGN KEY (`approvedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `overtime_days`
--
ALTER TABLE `overtime_days`
  ADD CONSTRAINT `overtime_days_ibfk_1` FOREIGN KEY (`overtimeId`) REFERENCES `overtime` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `overtime_slots`
--
ALTER TABLE `overtime_slots`
  ADD CONSTRAINT `overtime_slots_ibfk_1` FOREIGN KEY (`dayId`) REFERENCES `overtime_days` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permissionId`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `telegram_config`
--
ALTER TABLE `telegram_config`
  ADD CONSTRAINT `telegram_config_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_user_employee` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
