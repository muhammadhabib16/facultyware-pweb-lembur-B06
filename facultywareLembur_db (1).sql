-- Adminer 5.4.2 MySQL 9.7.0 dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `asset_audit_details`;
CREATE TABLE `asset_audit_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_audit_id` bigint unsigned NOT NULL,
  `asset_id` bigint unsigned NOT NULL,
  `condition` enum('good','minor_damage','major_damage','missing') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_audit_details_asset_audit_id_foreign` (`asset_audit_id`),
  KEY `asset_audit_details_asset_id_foreign` (`asset_id`),
  CONSTRAINT `asset_audit_details_asset_audit_id_foreign` FOREIGN KEY (`asset_audit_id`) REFERENCES `asset_audits` (`id`),
  CONSTRAINT `asset_audit_details_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `asset_audits`;
CREATE TABLE `asset_audits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `audit_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `audit_date` date NOT NULL,
  `conducted_by` bigint unsigned NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_audits_audit_number_unique` (`audit_number`),
  KEY `asset_audits_conducted_by_foreign` (`conducted_by`),
  CONSTRAINT `asset_audits_conducted_by_foreign` FOREIGN KEY (`conducted_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `asset_grants`;
CREATE TABLE `asset_grants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `grant_date` date NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `asset_insurance_claims`;
CREATE TABLE `asset_insurance_claims` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_insurance_id` bigint unsigned NOT NULL,
  `claim_date` date NOT NULL,
  `claim_amount` decimal(14,2) NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('submitted','approved','rejected','paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_insurance_claims_asset_insurance_id_foreign` (`asset_insurance_id`),
  CONSTRAINT `asset_insurance_claims_asset_insurance_id_foreign` FOREIGN KEY (`asset_insurance_id`) REFERENCES `asset_insurances` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `asset_insurances`;
CREATE TABLE `asset_insurances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `policy_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `coverage_amount` decimal(14,2) NOT NULL,
  `premium` decimal(14,2) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('active','expired','claimed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_insurances_asset_id_foreign` (`asset_id`),
  CONSTRAINT `asset_insurances_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `asset_tracking_logs`;
CREATE TABLE `asset_tracking_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `from_location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `moved_at` timestamp NOT NULL,
  `moved_by` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_tracking_logs_asset_id_foreign` (`asset_id`),
  KEY `asset_tracking_logs_moved_by_foreign` (`moved_by`),
  CONSTRAINT `asset_tracking_logs_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `asset_tracking_logs_moved_by_foreign` FOREIGN KEY (`moved_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `asset_trackings`;
CREATE TABLE `asset_trackings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,6) DEFAULT NULL,
  `longitude` decimal(10,6) DEFAULT NULL,
  `tracked_at` timestamp NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_trackings_asset_id_foreign` (`asset_id`),
  CONSTRAINT `asset_trackings_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `assets`;
CREATE TABLE `assets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('equipment','room') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `acquisition_type` enum('procurement','grant') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `acquisition_date` date NOT NULL,
  `acquisition_cost` decimal(14,2) DEFAULT NULL,
  `asset_grant_id` bigint unsigned DEFAULT NULL,
  `condition` enum('good','minor_damage','major_damage') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('available','in_use','maintenance','retired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assets_code_unique` (`code`),
  KEY `assets_asset_grant_id_foreign` (`asset_grant_id`),
  CONSTRAINT `assets_asset_grant_id_foreign` FOREIGN KEY (`asset_grant_id`) REFERENCES `asset_grants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `assignment_progress`;
CREATE TABLE `assignment_progress` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` bigint unsigned NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `progress_date` date NOT NULL,
  `status` enum('in_progress','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assignment_progress_assignment_id_foreign` (`assignment_id`),
  KEY `assignment_progress_created_by_foreign` (`created_by`),
  CONSTRAINT `assignment_progress_assignment_id_foreign` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`),
  CONSTRAINT `assignment_progress_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `assignments`;
CREATE TABLE `assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `assigned_by` bigint unsigned NOT NULL,
  `assigned_to` bigint unsigned NOT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('assigned','in_progress','completed','delegated','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('low','medium','high') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigned_by_id` bigint unsigned NOT NULL,
  `assigned_to_id` bigint unsigned NOT NULL,
  `parent_id_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assignments_assigned_by_foreign` (`assigned_by`),
  KEY `assignments_assigned_to_foreign` (`assigned_to`),
  KEY `assignments_parent_id_foreign` (`parent_id`),
  CONSTRAINT `assignments_assigned_by_foreign` FOREIGN KEY (`assigned_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `assignments_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `employees` (`id`),
  CONSTRAINT `assignments_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `assignments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `attendances`;
CREATE TABLE `attendances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `date` date NOT NULL,
  `check_in` datetime DEFAULT NULL,
  `check_out` datetime DEFAULT NULL,
  `status` enum('present','absent','leave','overtime','holiday') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attendances_employee_id_foreign` (`employee_id`),
  CONSTRAINT `attendances_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `buildings`;
CREATE TABLE `buildings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `buildings_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `cache`;
CREATE TABLE `cache` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `cache_locks`;
CREATE TABLE `cache_locks` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `committee_budget_items`;
CREATE TABLE `committee_budget_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `committee_budget_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(14,2) NOT NULL,
  `total_price` decimal(14,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `committee_budget_items_committee_budget_id_foreign` (`committee_budget_id`),
  CONSTRAINT `committee_budget_items_committee_budget_id_foreign` FOREIGN KEY (`committee_budget_id`) REFERENCES `committee_budgets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `committee_budgets`;
CREATE TABLE `committee_budgets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `committee_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `total_amount` decimal(14,2) NOT NULL,
  `used_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `committee_budgets_committee_id_foreign` (`committee_id`),
  CONSTRAINT `committee_budgets_committee_id_foreign` FOREIGN KEY (`committee_id`) REFERENCES `committees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `committee_expenses`;
CREATE TABLE `committee_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `committee_budget_item_id` bigint unsigned NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `receipt_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expense_date` date NOT NULL,
  `status` enum('submitted','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `committee_expenses_committee_budget_item_id_foreign` (`committee_budget_item_id`),
  KEY `committee_expenses_approved_by_foreign` (`approved_by`),
  CONSTRAINT `committee_expenses_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `committee_expenses_committee_budget_item_id_foreign` FOREIGN KEY (`committee_budget_item_id`) REFERENCES `committee_budget_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `committee_external_members`;
CREATE TABLE `committee_external_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `committee_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `committee_external_members_committee_id_foreign` (`committee_id`),
  CONSTRAINT `committee_external_members_committee_id_foreign` FOREIGN KEY (`committee_id`) REFERENCES `committees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `committee_members`;
CREATE TABLE `committee_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `committee_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_leader` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `committee_members_committee_id_foreign` (`committee_id`),
  KEY `committee_members_employee_id_foreign` (`employee_id`),
  CONSTRAINT `committee_members_committee_id_foreign` FOREIGN KEY (`committee_id`) REFERENCES `committees` (`id`),
  CONSTRAINT `committee_members_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `committee_task_progress`;
CREATE TABLE `committee_task_progress` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `committee_task_id` bigint unsigned NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `progress_date` date NOT NULL,
  `status` enum('in_progress','done') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `committee_task_progress_committee_task_id_foreign` (`committee_task_id`),
  CONSTRAINT `committee_task_progress_committee_task_id_foreign` FOREIGN KEY (`committee_task_id`) REFERENCES `committee_tasks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `committee_tasks`;
CREATE TABLE `committee_tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `committee_id` bigint unsigned NOT NULL,
  `assigned_to` bigint unsigned DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `priority` enum('low','medium','high') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('todo','in_progress','done','blocked') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `committee_member_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `committee_tasks_committee_id_foreign` (`committee_id`),
  KEY `committee_tasks_assigned_to_foreign` (`assigned_to`),
  CONSTRAINT `committee_tasks_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `committee_members` (`id`),
  CONSTRAINT `committee_tasks_committee_id_foreign` FOREIGN KEY (`committee_id`) REFERENCES `committees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `committees`;
CREATE TABLE `committees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `objective` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expected_outcome` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `status` enum('draft','active','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `committees_created_by_foreign` (`created_by`),
  CONSTRAINT `committees_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `community_service_members`;
CREATE TABLE `community_service_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `community_service_id` bigint unsigned NOT NULL,
  `lecturer_id` bigint unsigned NOT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `community_service_members_community_service_id_foreign` (`community_service_id`),
  KEY `community_service_members_lecturer_id_foreign` (`lecturer_id`),
  CONSTRAINT `community_service_members_community_service_id_foreign` FOREIGN KEY (`community_service_id`) REFERENCES `community_services` (`id`),
  CONSTRAINT `community_service_members_lecturer_id_foreign` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `community_services`;
CREATE TABLE `community_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `funding_source` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('proposed','ongoing','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `conference_proceedings`;
CREATE TABLE `conference_proceedings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `publication_id` bigint unsigned NOT NULL,
  `conference_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `conference_location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conference_date` date DEFAULT NULL,
  `publisher` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isbn` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pages` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `indexing` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `conference_proceedings_publication_id_foreign` (`publication_id`),
  CONSTRAINT `conference_proceedings_publication_id_foreign` FOREIGN KEY (`publication_id`) REFERENCES `publications` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `document_revisions`;
CREATE TABLE `document_revisions` (
  `id` int NOT NULL,
  `document_id` bigint unsigned NOT NULL,
  `rev_no` int DEFAULT NULL,
  `doc_date` int DEFAULT NULL,
  `doc_month` int DEFAULT NULL,
  `doc_year` int DEFAULT NULL,
  `active` tinyint DEFAULT NULL,
  `uploaded_file` varchar(45) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_document_revisions_documents1_idx` (`document_id`),
  CONSTRAINT `fk_document_revisions_documents1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `document_types`;
CREATE TABLE `document_types` (
  `id` bigint unsigned NOT NULL,
  `name` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents` (
  `id` bigint unsigned NOT NULL,
  `name` varchar(45) DEFAULT NULL,
  `document_type_id` bigint unsigned DEFAULT NULL,
  `doc_no` varchar(45) DEFAULT NULL,
  `unit_owner` bigint unsigned DEFAULT NULL,
  `published` tinyint DEFAULT NULL,
  `scope` varchar(45) DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_documents_users1_idx` (`created_by`),
  KEY `fk_documents_document_types1_idx` (`document_type_id`),
  CONSTRAINT `fk_documents_document_types1` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`),
  CONSTRAINT `fk_documents_users1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `education_histories`;
CREATE TABLE `education_histories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `degree` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `major` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_year` year NOT NULL,
  `end_year` year DEFAULT NULL,
  `gpa` decimal(3,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `education_histories_employee_id_foreign` (`employee_id`),
  CONSTRAINT `education_histories_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `employee_grades`;
CREATE TABLE `employee_grades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `national_id_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_id_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `birth_place` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `birth_date` date NOT NULL,
  `gender` enum('male','female') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `religion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marital_status` enum('single','married','divorced') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_unit_id` bigint unsigned NOT NULL,
  `hire_date` date NOT NULL,
  `employment_status_id` bigint unsigned NOT NULL,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_employee_number_unique` (`employee_number`),
  KEY `employees_organization_unit_id_foreign` (`organization_unit_id`),
  KEY `employees_employment_status_id_foreign` (`employment_status_id`),
  CONSTRAINT `employees_employment_status_id_foreign` FOREIGN KEY (`employment_status_id`) REFERENCES `employment_statuses` (`id`),
  CONSTRAINT `employees_organization_unit_id_foreign` FOREIGN KEY (`organization_unit_id`) REFERENCES `organization_units` (`id`),
  CONSTRAINT `employees_user_id_foreign` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `employees` (`id`, `employee_number`, `national_id_number`, `tax_id_number`, `name`, `birth_place`, `birth_date`, `gender`, `religion`, `marital_status`, `address`, `phone_number`, `organization_unit_id`, `hire_date`, `employment_status_id`, `status`, `created_at`, `updated_at`) VALUES
(2,	'NIP-19900101-002',	NULL,	NULL,	'Hasyfi Zharfan',	'Padang',	'1990-01-01',	'male',	NULL,	'single',	'Limau Manis, Padang',	NULL,	1,	'2026-06-03',	1,	'active',	NULL,	NULL),
(4,	'NIP-20000505-004',	NULL,	NULL,	'Alya Salsa Nabila',	'Padang',	'2000-05-05',	'female',	NULL,	'single',	'Unand, Padang',	NULL,	1,	'2026-06-03',	1,	'active',	NULL,	NULL);

DROP TABLE IF EXISTS `employment_statuses`;
CREATE TABLE `employment_statuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `employment_statuses` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1,	'Tetap',	NULL,	'2026-06-03 16:50:35',	'2026-06-03 16:50:35');

DROP TABLE IF EXISTS `equipment_loans`;
CREATE TABLE `equipment_loans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `equipment_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('requested','approved','rejected','returned') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_by_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_loans_employee_id_foreign` (`employee_id`),
  KEY `asset_loans_approved_by_foreign` (`approved_by`),
  KEY `asset_loans_asset_equipment_id_foreign_idx` (`equipment_id`),
  CONSTRAINT `asset_loans_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `asset_loans_asset_equipment_id_foreign` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`),
  CONSTRAINT `asset_loans_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `equipment_maintenance_request_log`;
CREATE TABLE `equipment_maintenance_request_log` (
  `id` bigint NOT NULL,
  `equipment_maintenance_request_id` bigint unsigned DEFAULT NULL,
  `log` varchar(45) DEFAULT NULL,
  `logged_by` bigint unsigned DEFAULT NULL,
  `logged_at` datetime DEFAULT NULL,
  `log_file` varchar(255) DEFAULT NULL,
  `verified_by` bigint unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `verification_file` varchar(255) DEFAULT NULL,
  `description` text,
  `status` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_equipment_maintenance_request_log_equipment_maintenance__idx` (`equipment_maintenance_request_id`),
  KEY `fk_equipment_maintenance_request_log_employees1_idx` (`logged_by`),
  KEY `fk_equipment_maintenance_request_log_employees2_idx` (`verified_by`),
  CONSTRAINT `fk_equipment_maintenance_request_log_employees1` FOREIGN KEY (`logged_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_equipment_maintenance_request_log_employees2` FOREIGN KEY (`verified_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_equipment_maintenance_request_log_equipment_maintenance_re1` FOREIGN KEY (`equipment_maintenance_request_id`) REFERENCES `equipment_maintenance_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `equipment_maintenance_requests`;
CREATE TABLE `equipment_maintenance_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `equipment_id` bigint unsigned NOT NULL,
  `reported_by` bigint unsigned NOT NULL,
  `issue_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('reported','in_progress','resolved') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reported_at` timestamp NOT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_maintenance_requests_reported_by_foreign` (`reported_by`),
  KEY `asset_maintenance_requests_asset_equipment_foreign_idx` (`equipment_id`),
  CONSTRAINT `asset_maintenance_requests_asset_equipment_foreign` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`),
  CONSTRAINT `asset_maintenance_requests_reported_by_foreign` FOREIGN KEY (`reported_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `equipment_proc_items`;
CREATE TABLE `equipment_proc_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `equipment_proc_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `specification` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `quantity` int NOT NULL,
  `estimated_price` decimal(14,2) DEFAULT NULL,
  `asset_equipment_procurement_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_equipment_proc_items_asset_equipment_proc_id_foreign` (`equipment_proc_id`),
  CONSTRAINT `asset_equipment_proc_items_asset_equipment_proc_id_foreign` FOREIGN KEY (`equipment_proc_id`) REFERENCES `equipment_procurements` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `equipment_procurements`;
CREATE TABLE `equipment_procurements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `request_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','submitted','approved','rejected','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_equipment_procurements_request_number_unique` (`request_number`),
  KEY `asset_equipment_procurements_created_by_foreign` (`created_by`),
  CONSTRAINT `asset_equipment_procurements_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `equipment_requests`;
CREATE TABLE `equipment_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `request_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `specification` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `purchase_link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int NOT NULL,
  `status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_at` timestamp NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_equipment_requests_request_number_unique` (`request_number`),
  KEY `asset_equipment_requests_employee_id_foreign` (`employee_id`),
  KEY `asset_equipment_requests_approved_by_foreign` (`approved_by`),
  CONSTRAINT `asset_equipment_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `asset_equipment_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `equipments`;
CREATE TABLE `equipments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `brand` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specification` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `purchase_link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `depreciation_value` decimal(14,2) DEFAULT NULL,
  `useful_life` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_equipment_asset_id_foreign` (`asset_id`),
  CONSTRAINT `asset_equipment_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `event_attendances`;
CREATE TABLE `event_attendances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_registration_id` bigint unsigned NOT NULL,
  `checked_in_at` timestamp NULL DEFAULT NULL,
  `checked_out_at` timestamp NULL DEFAULT NULL,
  `checked_by` bigint unsigned DEFAULT NULL,
  `attendance_method` enum('manual','qr_scan','system') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('present','absent','partial') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `checked_by_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_attendances_event_registration_id_foreign` (`event_registration_id`),
  KEY `event_attendances_checked_by_foreign` (`checked_by`),
  CONSTRAINT `event_attendances_checked_by_foreign` FOREIGN KEY (`checked_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `event_attendances_event_registration_id_foreign` FOREIGN KEY (`event_registration_id`) REFERENCES `event_registrations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `event_committee_members`;
CREATE TABLE `event_committee_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_leader` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_committee_members_event_id_foreign` (`event_id`),
  KEY `event_committee_members_employee_id_foreign` (`employee_id`),
  CONSTRAINT `event_committee_members_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `event_committee_members_event_id_foreign` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `event_documents`;
CREATE TABLE `event_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint unsigned NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_type` enum('report','photo','proposal','minutes','attendance','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `uploaded_by` bigint unsigned NOT NULL,
  `uploaded_at` timestamp NOT NULL,
  `uploaded_by_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_documents_event_id_foreign` (`event_id`),
  KEY `event_documents_uploaded_by_foreign` (`uploaded_by`),
  CONSTRAINT `event_documents_event_id_foreign` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  CONSTRAINT `event_documents_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `event_registrations`;
CREATE TABLE `event_registrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `registration_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `registered_at` timestamp NOT NULL,
  `attendance_status` enum('registered','attended','no_show','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ticket_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `qr_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issued_at` timestamp NOT NULL,
  `certificate_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `generated_by` bigint unsigned DEFAULT NULL,
  `generated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_registrations_registration_number_unique` (`registration_number`),
  UNIQUE KEY `event_registrations_ticket_number_unique` (`ticket_number`),
  UNIQUE KEY `event_registrations_certificate_number_unique` (`certificate_number`),
  KEY `event_registrations_user_id_foreign` (`user_id`),
  KEY `event_registrations_generated_by_foreign` (`generated_by`),
  KEY `event_registrations_event_id_foreign_idx` (`event_id`),
  CONSTRAINT `event_registrations_event_id_foreign` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  CONSTRAINT `event_registrations_generated_by_foreign` FOREIGN KEY (`generated_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `event_registrations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `event_reminders`;
CREATE TABLE `event_reminders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint unsigned NOT NULL,
  `sent_by` bigint unsigned NOT NULL,
  `channel` enum('email','whatsapp','sms','system') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_at` timestamp NOT NULL,
  `sent_by_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_reminders_event_id_foreign` (`event_id`),
  KEY `event_reminders_sent_by_foreign` (`sent_by`),
  CONSTRAINT `event_reminders_event_id_foreign` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  CONSTRAINT `event_reminders_sent_by_foreign` FOREIGN KEY (`sent_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `objectives` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `event_type` enum('seminar','workshop','training','conference','webinar','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_mode` enum('offline','online','hybrid') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `venue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `online_platform` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `online_link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quota` int DEFAULT NULL,
  `registration_deadline` datetime DEFAULT NULL,
  `cover_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banner_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','published','closed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `published_by` bigint unsigned DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_by_id` bigint unsigned NOT NULL,
  `published_by_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `events_slug_unique` (`slug`),
  KEY `events_created_by_foreign` (`created_by`),
  CONSTRAINT `events_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `functional_positions`;
CREATE TABLE `functional_positions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `holidays`;
CREATE TABLE `holidays` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `implementation_arrangements`;
CREATE TABLE `implementation_arrangements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partnership_id` bigint unsigned NOT NULL,
  `partnership_impl_id` bigint unsigned NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `document_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `partnership_implementation_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `implementation_arrangements_partnership_id_foreign` (`partnership_id`),
  KEY `implementation_arrangements_partnership_impl_id_foreign` (`partnership_impl_id`),
  CONSTRAINT `implementation_arrangements_partnership_id_foreign` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships` (`id`),
  CONSTRAINT `implementation_arrangements_partnership_impl_id_foreign` FOREIGN KEY (`partnership_impl_id`) REFERENCES `partnership_implementations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `inventories`;
CREATE TABLE `inventories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `item_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventories_item_id_foreign` (`item_id`),
  CONSTRAINT `inventories_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `inventory_procurement_items`;
CREATE TABLE `inventory_procurement_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inventory_procurement_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned DEFAULT NULL,
  `item_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_procurement_items_inventory_procurement_id_foreign` (`inventory_procurement_id`),
  KEY `inventory_procurement_items_item_id_foreign` (`item_id`),
  CONSTRAINT `inventory_procurement_items_inventory_procurement_id_foreign` FOREIGN KEY (`inventory_procurement_id`) REFERENCES `inventory_procurements` (`id`),
  CONSTRAINT `inventory_procurement_items_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `inventory_procurements`;
CREATE TABLE `inventory_procurements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `request_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','submitted','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_procurements_request_number_unique` (`request_number`),
  KEY `inventory_procurements_created_by_foreign` (`created_by`),
  CONSTRAINT `inventory_procurements_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `inventory_purchase_items`;
CREATE TABLE `inventory_purchase_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inventory_purchase_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(12,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_purchase_items_inventory_purchase_id_foreign` (`inventory_purchase_id`),
  KEY `inventory_purchase_items_item_id_foreign` (`item_id`),
  CONSTRAINT `inventory_purchase_items_inventory_purchase_id_foreign` FOREIGN KEY (`inventory_purchase_id`) REFERENCES `inventory_purchases` (`id`),
  CONSTRAINT `inventory_purchase_items_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `inventory_purchases`;
CREATE TABLE `inventory_purchases` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purchase_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `inventory_procurement_id` bigint unsigned DEFAULT NULL,
  `purchase_date` date NOT NULL,
  `supplier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_purchases_purchase_number_unique` (`purchase_number`),
  KEY `inventory_purchases_inventory_procurement_id_foreign` (`inventory_procurement_id`),
  CONSTRAINT `inventory_purchases_inventory_procurement_id_foreign` FOREIGN KEY (`inventory_procurement_id`) REFERENCES `inventory_procurements` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `inventory_request_approvals`;
CREATE TABLE `inventory_request_approvals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inventory_request_id` bigint unsigned NOT NULL,
  `approver_id` bigint unsigned NOT NULL,
  `status` enum('approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `action_date` timestamp NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_request_approvals_inventory_request_id_foreign` (`inventory_request_id`),
  KEY `inventory_request_approvals_approver_id_foreign` (`approver_id`),
  CONSTRAINT `inventory_request_approvals_approver_id_foreign` FOREIGN KEY (`approver_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `inventory_request_approvals_inventory_request_id_foreign` FOREIGN KEY (`inventory_request_id`) REFERENCES `inventory_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `inventory_request_details`;
CREATE TABLE `inventory_request_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inventory_request_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned DEFAULT NULL,
  `item_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specification` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `quantity` int NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_request_details_inventory_request_id_foreign` (`inventory_request_id`),
  KEY `inventory_request_details_item_id_foreign` (`item_id`),
  CONSTRAINT `inventory_request_details_inventory_request_id_foreign` FOREIGN KEY (`inventory_request_id`) REFERENCES `inventory_requests` (`id`),
  CONSTRAINT `inventory_request_details_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `inventory_requests`;
CREATE TABLE `inventory_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `request_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `request_date` date NOT NULL,
  `status` enum('pending','approved','rejected','fulfilled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_requests_request_number_unique` (`request_number`),
  KEY `inventory_requests_employee_id_foreign` (`employee_id`),
  KEY `inventory_requests_approved_by_foreign` (`approved_by`),
  CONSTRAINT `inventory_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `inventory_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `inventory_transactions`;
CREATE TABLE `inventory_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `item_id` bigint unsigned NOT NULL,
  `type` enum('in','out','adjustment') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `transaction_date` date NOT NULL,
  `reference` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_transactions_item_id_foreign` (`item_id`),
  CONSTRAINT `inventory_transactions_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `items`;
CREATE TABLE `items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `minimal_quantity` int NOT NULL DEFAULT '0',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `items_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `job_batches`;
CREATE TABLE `job_batches` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `job_responsibilities`;
CREATE TABLE `job_responsibilities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `structural_position_id` bigint unsigned NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('main','function') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `order` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_responsibilities_structural_position_id_foreign` (`structural_position_id`),
  CONSTRAINT `job_responsibilities_structural_position_id_foreign` FOREIGN KEY (`structural_position_id`) REFERENCES `structural_positions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `journal_publications`;
CREATE TABLE `journal_publications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `publication_id` bigint unsigned NOT NULL,
  `journal_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `issn` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publisher` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `volume` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pages` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `indexing` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quartile` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `journal_publications_publication_id_foreign` (`publication_id`),
  CONSTRAINT `journal_publications_publication_id_foreign` FOREIGN KEY (`publication_id`) REFERENCES `publications` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `leave_approvals`;
CREATE TABLE `leave_approvals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `leave_request_id` bigint unsigned NOT NULL,
  `approver_id` bigint unsigned NOT NULL,
  `level` int NOT NULL,
  `status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `action_date` timestamp NULL DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_approvals_leave_request_id_foreign` (`leave_request_id`),
  KEY `leave_approvals_approver_id_foreign` (`approver_id`),
  CONSTRAINT `leave_approvals_approver_id_foreign` FOREIGN KEY (`approver_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_approvals_leave_request_id_foreign` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `leave_balances`;
CREATE TABLE `leave_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `year` year NOT NULL,
  `quota` int NOT NULL,
  `used` int NOT NULL DEFAULT '0',
  `remaining` int NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_balances_employee_id_foreign` (`employee_id`),
  KEY `leave_balances_leave_type_id_foreign` (`leave_type_id`),
  CONSTRAINT `leave_balances_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_balances_leave_type_id_foreign` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `leave_requests`;
CREATE TABLE `leave_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `approver_id` bigint unsigned DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_days` int NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `attachment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_leave` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_leave` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_at` timestamp NOT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approver_id_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_requests_employee_id_foreign` (`employee_id`),
  KEY `leave_requests_leave_type_id_foreign` (`leave_type_id`),
  KEY `leave_requests_approver_id_foreign` (`approver_id`),
  CONSTRAINT `leave_requests_approver_id_foreign` FOREIGN KEY (`approver_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leave_requests_leave_type_id_foreign` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `leave_types`;
CREATE TABLE `leave_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `default_quota` int NOT NULL,
  `requires_attachment` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `lecturer_functional_positions`;
CREATE TABLE `lecturer_functional_positions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `lecturer_id` bigint unsigned NOT NULL,
  `functional_position_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `decree_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decree_date` date DEFAULT NULL,
  `sk_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lecturer_functional_positions_lecturer_id_foreign` (`lecturer_id`),
  KEY `lecturer_functional_positions_functional_position_id_foreign` (`functional_position_id`),
  CONSTRAINT `lecturer_functional_positions_functional_position_id_foreign` FOREIGN KEY (`functional_position_id`) REFERENCES `functional_positions` (`id`),
  CONSTRAINT `lecturer_functional_positions_lecturer_id_foreign` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `lecturers`;
CREATE TABLE `lecturers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `academic_rank` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `functional_position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expertise` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `lecturers_employee_id_foreign` FOREIGN KEY (`id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `meeting_consumption_requests`;
CREATE TABLE `meeting_consumption_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `meeting_id` bigint unsigned NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `estimated_participants` int NOT NULL,
  `status` enum('requested','approved','rejected','fulfilled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_at` timestamp NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meeting_consumption_requests_meeting_id_foreign` (`meeting_id`),
  KEY `meeting_consumption_requests_approved_by_foreign` (`approved_by`),
  CONSTRAINT `meeting_consumption_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `meeting_consumption_requests_meeting_id_foreign` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `meeting_documents`;
CREATE TABLE `meeting_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `meeting_id` bigint unsigned NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `uploaded_at` timestamp NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meeting_documents_meeting_id_foreign` (`meeting_id`),
  KEY `meeting_documents_uploaded_by_foreign` (`uploaded_by`),
  CONSTRAINT `meeting_documents_meeting_id_foreign` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`),
  CONSTRAINT `meeting_documents_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `meeting_external_participants`;
CREATE TABLE `meeting_external_participants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `meeting_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meeting_external_participants_meeting_id_foreign` (`meeting_id`),
  CONSTRAINT `meeting_external_participants_meeting_id_foreign` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `meeting_minutes`;
CREATE TABLE `meeting_minutes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `meeting_id` bigint unsigned NOT NULL,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_confidential` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meeting_minutes_meeting_id_foreign` (`meeting_id`),
  KEY `meeting_minutes_created_by_foreign` (`created_by`),
  CONSTRAINT `meeting_minutes_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `meeting_minutes_meeting_id_foreign` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `meeting_participants`;
CREATE TABLE `meeting_participants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `meeting_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `status` enum('invited','confirmed','attended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meeting_participants_meeting_id_foreign` (`meeting_id`),
  KEY `meeting_participants_employee_id_foreign` (`employee_id`),
  CONSTRAINT `meeting_participants_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `meeting_participants_meeting_id_foreign` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `meetings`;
CREATE TABLE `meetings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `organizer_id` bigint unsigned NOT NULL,
  `leader_id` bigint unsigned NOT NULL,
  `meeting_type` enum('offline','online','hybrid') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `meeting_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `asset_room_id` bigint unsigned DEFAULT NULL,
  `online_platform` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `online_link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `committee_id` bigint unsigned DEFAULT NULL,
  `is_confidential` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('draft','scheduled','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organizer_id_id` bigint unsigned NOT NULL,
  `leader_id_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meetings_organizer_id_foreign` (`organizer_id`),
  KEY `meetings_leader_id_foreign` (`leader_id`),
  KEY `meetings_asset_room_id_foreign` (`asset_room_id`),
  KEY `meetings_committee_id_foreign` (`committee_id`),
  CONSTRAINT `meetings_asset_room_id_foreign` FOREIGN KEY (`asset_room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `meetings_committee_id_foreign` FOREIGN KEY (`committee_id`) REFERENCES `committees` (`id`),
  CONSTRAINT `meetings_leader_id_foreign` FOREIGN KEY (`leader_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `meetings_organizer_id_foreign` FOREIGN KEY (`organizer_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `model_has_permissions`;
CREATE TABLE `model_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `model_has_roles`;
CREATE TABLE `model_has_roles` (
  `role_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `model_has_roles` (`role_id`, `model_type`, `model_id`) VALUES
(3,	'User',	1),
(2,	'User',	2),
(2,	'User',	3),
(1,	'User',	4),
(3,	'User',	5),
(3,	'User',	6);

DROP TABLE IF EXISTS `nomenclature_classifications`;
CREATE TABLE `nomenclature_classifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nomenclature_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nomenclature_classifications_nomenclature_id_foreign` (`nomenclature_id`),
  CONSTRAINT `nomenclature_classifications_nomenclature_id_foreign` FOREIGN KEY (`nomenclature_id`) REFERENCES `nomenclatures` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `nomenclatures`;
CREATE TABLE `nomenclatures` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `qualification` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `duties` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `grade` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `official_travel`;
CREATE TABLE `official_travel` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `request_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `destination` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `invitation_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','pending','approved','rejected','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_by` bigint unsigned NOT NULL,
  `submitted_at` timestamp NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `travel_outcome` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `outcome_followup` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `submitted_by_id` bigint unsigned NOT NULL,
  `approved_by_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `official_travel_request_number_unique` (`request_number`),
  KEY `official_travel_submitted_by_foreign` (`submitted_by`),
  KEY `official_travel_approved_by_foreign` (`approved_by`),
  CONSTRAINT `official_travel_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `official_travel_submitted_by_foreign` FOREIGN KEY (`submitted_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `official_travel_approvals`;
CREATE TABLE `official_travel_approvals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `official_travel_id` bigint unsigned NOT NULL,
  `approver_id` bigint unsigned NOT NULL,
  `status` enum('approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `action_date` timestamp NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `official_travel_approvals_official_travel_id_foreign` (`official_travel_id`),
  KEY `official_travel_approvals_approver_id_foreign` (`approver_id`),
  CONSTRAINT `official_travel_approvals_approver_id_foreign` FOREIGN KEY (`approver_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `official_travel_approvals_official_travel_id_foreign` FOREIGN KEY (`official_travel_id`) REFERENCES `official_travels` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `official_travel_documents`;
CREATE TABLE `official_travel_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `official_travel_id` bigint unsigned NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `official_travel_documents_official_travel_id_foreign` (`official_travel_id`),
  CONSTRAINT `official_travel_documents_official_travel_id_foreign` FOREIGN KEY (`official_travel_id`) REFERENCES `official_travels` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `official_travel_itineraries`;
CREATE TABLE `official_travel_itineraries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `official_travel_id` bigint unsigned NOT NULL,
  `date` date NOT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `official_travel_itineraries_official_travel_id_foreign` (`official_travel_id`),
  CONSTRAINT `official_travel_itineraries_official_travel_id_foreign` FOREIGN KEY (`official_travel_id`) REFERENCES `official_travels` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `official_travel_members`;
CREATE TABLE `official_travel_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `official_travel_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `report_date` date NOT NULL,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `official_travel_members_official_travel_id_foreign` (`official_travel_id`),
  KEY `official_travel_members_employee_id_foreign` (`employee_id`),
  CONSTRAINT `official_travel_members_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `official_travel_members_official_travel_id_foreign` FOREIGN KEY (`official_travel_id`) REFERENCES `official_travels` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `organization_units`;
CREATE TABLE `organization_units` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `type` enum('university','faculty','department','lab','unit') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `organization_unit_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organization_units_code_unique` (`code`),
  KEY `organization_units_parent_id_foreign` (`parent_id`),
  CONSTRAINT `organization_units_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `organization_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `organization_units` (`id`, `name`, `code`, `parent_id`, `type`, `description`, `organization_unit_id`, `created_at`, `updated_at`) VALUES
(1,	'Teknologi Informasi',	NULL,	NULL,	'department',	NULL,	1,	'2026-06-03 16:50:35',	'2026-06-03 16:50:35');

DROP TABLE IF EXISTS `overtime_approval_logs`;
CREATE TABLE `overtime_approval_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `overtime_request_id` bigint unsigned NOT NULL,
  `approver_id` bigint unsigned NOT NULL,
  `status` enum('approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `action_date` timestamp NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `overtime_approval_logs_overtime_request_id_foreign` (`overtime_request_id`),
  KEY `overtime_approval_logs_approver_id_foreign` (`approver_id`),
  CONSTRAINT `overtime_approval_logs_approver_id_foreign` FOREIGN KEY (`approver_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `overtime_approval_logs_overtime_request_id_foreign` FOREIGN KEY (`overtime_request_id`) REFERENCES `overtime_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `overtime_request_members`;
CREATE TABLE `overtime_request_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `overtime_request_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `planned_hours` decimal(5,2) NOT NULL,
  `actual_start_time` datetime NOT NULL,
  `actual_end_time` datetime NOT NULL,
  `actual_hours` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `overtime_request_members_overtime_request_id_foreign` (`overtime_request_id`),
  KEY `overtime_request_members_employee_id_foreign` (`employee_id`),
  CONSTRAINT `overtime_request_members_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `overtime_request_members_overtime_request_id_foreign` FOREIGN KEY (`overtime_request_id`) REFERENCES `overtime_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `overtime_request_members` (`id`, `overtime_request_id`, `employee_id`, `role`, `job_desc`, `planned_hours`, `actual_start_time`, `actual_end_time`, `actual_hours`, `created_at`, `updated_at`) VALUES
(1,	2,	2,	NULL,	NULL,	0.00,	'2026-06-04 13:22:00',	'2026-06-04 21:22:00',	0.00,	'2026-06-04 06:22:58',	'2026-06-04 06:22:58'),
(2,	3,	4,	NULL,	NULL,	3.00,	'2026-06-12 17:00:00',	'2026-06-12 20:00:00',	0.00,	'2026-06-12 07:40:59',	'2026-06-12 07:40:59');

DROP TABLE IF EXISTS `overtime_requests`;
CREATE TABLE `overtime_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `request_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `request_date` date NOT NULL,
  `planned_start_time` datetime NOT NULL,
  `planned_end_time` datetime NOT NULL,
  `submitted_by` bigint unsigned NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `status` enum('draft','pending','approved','rejected','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `submitted_by_id` bigint unsigned NOT NULL,
  `approved_by_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `overtime_requests_request_number_unique` (`request_number`),
  KEY `overtime_requests_submitted_by_foreign` (`submitted_by`),
  KEY `overtime_requests_approved_by_foreign` (`approved_by`),
  CONSTRAINT `overtime_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `overtime_requests_submitted_by_foreign` FOREIGN KEY (`submitted_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `overtime_requests` (`id`, `request_number`, `title`, `description`, `request_date`, `planned_start_time`, `planned_end_time`, `submitted_by`, `approved_by`, `status`, `submitted_at`, `approved_at`, `submitted_by_id`, `approved_by_id`, `created_at`, `updated_at`) VALUES
(1,	'REQ-LEMBUR-001',	'Lembur Migrasi Server Facultyware',	'Melakukan migrasi database lama ke server baru',	'2026-06-03',	'2026-06-03 23:50:35',	'2026-06-03 23:50:35',	4,	NULL,	'completed',	'2026-06-03 16:50:35',	NULL,	4,	2,	'2026-06-03 16:50:35',	'2026-06-03 16:50:35'),
(2,	'REQ-ASSIGN-1780554178797',	'Penyusunan RPS',	'bikin rps',	'2026-06-04',	'2026-06-04 13:22:00',	'2026-06-04 21:22:00',	2,	NULL,	'approved',	NULL,	NULL,	2,	2,	'2026-06-04 06:22:58',	'2026-06-04 06:22:58'),
(3,	'REQ-LEMBUR-1781250059748',	'Kerja Lembur test',	'test123',	'2026-06-12',	'2026-06-12 17:00:00',	'2026-06-12 20:00:00',	4,	NULL,	'pending',	NULL,	NULL,	4,	2,	'2026-06-12 07:40:59',	'2026-06-12 07:40:59');

DROP TABLE IF EXISTS `partner_contacts`;
CREATE TABLE `partner_contacts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `partner_contacts_partner_id_foreign` (`partner_id`),
  CONSTRAINT `partner_contacts_partner_id_foreign` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `partner_follow_ups`;
CREATE TABLE `partner_follow_ups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_potential_id` bigint unsigned NOT NULL,
  `activity_date` date NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('planned','ongoing','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `conducted_by` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `partner_follow_ups_partner_potential_id_foreign` (`partner_potential_id`),
  KEY `partner_follow_ups_conducted_by_foreign` (`conducted_by`),
  CONSTRAINT `partner_follow_ups_conducted_by_foreign` FOREIGN KEY (`conducted_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `partner_follow_ups_partner_potential_id_foreign` FOREIGN KEY (`partner_potential_id`) REFERENCES `partner_potentials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `partner_potential_fields`;
CREATE TABLE `partner_potential_fields` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_potential_id` bigint unsigned NOT NULL,
  `field` enum('research','community_service','internship','training','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `partner_potential_fields_partner_potential_id_foreign` (`partner_potential_id`),
  CONSTRAINT `partner_potential_fields_partner_potential_id_foreign` FOREIGN KEY (`partner_potential_id`) REFERENCES `partner_potentials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `partner_potentials`;
CREATE TABLE `partner_potentials` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('identified','in_discussion','proposed','converted','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `partner_potentials_partner_id_foreign` (`partner_id`),
  CONSTRAINT `partner_potentials_partner_id_foreign` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `partners`;
CREATE TABLE `partners` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('university','company','government','ngo','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `partnership_documents`;
CREATE TABLE `partnership_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partnership_id` bigint unsigned NOT NULL,
  `file_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `signed_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `partnership_documents_partnership_id_foreign` (`partnership_id`),
  CONSTRAINT `partnership_documents_partnership_id_foreign` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `partnership_implementations`;
CREATE TABLE `partnership_implementations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partnership_id` bigint unsigned NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('planned','ongoing','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `partnership_implementations_partnership_id_foreign` (`partnership_id`),
  CONSTRAINT `partnership_implementations_partnership_id_foreign` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `partnerships`;
CREATE TABLE `partnerships` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned NOT NULL,
  `partner_potential_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `document_type` enum('moa','pks') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('active','expired','terminated') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `partnerships_partner_id_foreign` (`partner_id`),
  KEY `partnerships_partner_potential_id_foreign` (`partner_potential_id`),
  CONSTRAINT `partnerships_partner_id_foreign` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`),
  CONSTRAINT `partnerships_partner_potential_id_foreign` FOREIGN KEY (`partner_potential_id`) REFERENCES `partner_potentials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permissions` (`id`, `name`, `guard_name`, `created_at`, `updated_at`) VALUES
(1,	'create_penugasan',	'web',	'2026-06-03 16:22:52',	'2026-06-03 16:22:52'),
(2,	'view_reports',	'web',	'2026-06-03 16:22:52',	'2026-06-03 16:22:52'),
(3,	'approve_laporan',	'web',	'2026-06-03 16:22:52',	'2026-06-03 16:22:52'),
(4,	'view_overtime_reports',	'web',	'2026-06-03 16:57:31',	'2026-06-03 16:57:31'),
(5,	'approve_overtime_reports',	'web',	'2026-06-03 16:57:31',	'2026-06-03 16:57:31'),
(6,	'create_overtime_assignments',	'web',	'2026-06-04 06:00:07',	'2026-06-04 06:00:07'),
(7,	'view_overtime_assignments',	'web',	'2026-06-04 06:25:38',	'2026-06-04 06:25:38'),
(8,	'edit_overtime_assignments',	'web',	'2026-06-04 06:42:46',	'2026-06-04 06:42:46');

DROP TABLE IF EXISTS `publication_authors`;
CREATE TABLE `publication_authors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `publication_id` bigint unsigned NOT NULL,
  `lecturer_id` bigint unsigned NOT NULL,
  `author_order` int NOT NULL,
  `is_corresponding` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `publication_authors_publication_id_foreign` (`publication_id`),
  KEY `publication_authors_lecturer_id_foreign` (`lecturer_id`),
  CONSTRAINT `publication_authors_lecturer_id_foreign` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`),
  CONSTRAINT `publication_authors_publication_id_foreign` FOREIGN KEY (`publication_id`) REFERENCES `publications` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `publications`;
CREATE TABLE `publications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `publication_date` date NOT NULL,
  `doi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `abstract` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `research_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `publications_research_id_foreign` (`research_id`),
  CONSTRAINT `publications_research_id_foreign` FOREIGN KEY (`research_id`) REFERENCES `research` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `research`;
CREATE TABLE `research` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `funding_source` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `budget` decimal(12,2) DEFAULT NULL,
  `status` enum('proposed','ongoing','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `research_members`;
CREATE TABLE `research_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `research_id` bigint unsigned NOT NULL,
  `lecturer_id` bigint unsigned NOT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `research_members_research_id_foreign` (`research_id`),
  KEY `research_members_lecturer_id_foreign` (`lecturer_id`),
  CONSTRAINT `research_members_lecturer_id_foreign` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`),
  CONSTRAINT `research_members_research_id_foreign` FOREIGN KEY (`research_id`) REFERENCES `research` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `role_has_permissions`;
CREATE TABLE `role_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  KEY `role_has_permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `role_has_permissions` (`permission_id`, `role_id`) VALUES
(1,	2),
(2,	2),
(3,	2),
(4,	2),
(5,	2),
(6,	2),
(7,	2),
(8,	2);

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id`, `name`, `guard_name`, `created_at`, `updated_at`) VALUES
(1,	'admin',	'web',	'2026-06-03 16:22:52',	'2026-06-03 16:22:52'),
(2,	'pimpinan',	'web',	'2026-06-03 16:22:52',	'2026-06-03 16:22:52'),
(3,	'pegawai',	'web',	'2026-06-03 16:22:52',	'2026-06-03 16:22:52');

DROP TABLE IF EXISTS `room_loans`;
CREATE TABLE `room_loans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `room_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `purpose` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('requested','approved','rejected','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_by_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `room_loans_asset_room_id_foreign` (`room_id`),
  KEY `room_loans_employee_id_foreign` (`employee_id`),
  KEY `room_loans_approved_by_foreign` (`approved_by`),
  CONSTRAINT `room_loans_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `room_loans_asset_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `room_loans_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `room_maintenance_request_log`;
CREATE TABLE `room_maintenance_request_log` (
  `id` bigint NOT NULL,
  `room_maintenance_request_id` bigint unsigned DEFAULT NULL,
  `log` varchar(45) DEFAULT NULL,
  `logged_by` bigint unsigned DEFAULT NULL,
  `logged_at` datetime DEFAULT NULL,
  `log_file` varchar(255) DEFAULT NULL,
  `verified_by` bigint unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `verification_file` varchar(255) DEFAULT NULL,
  `description` text,
  `status` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_room_maintenance_request_log_room_maintenance_requests1_idx` (`room_maintenance_request_id`),
  KEY `fk_room_maintenance_request_log_employees1_idx` (`logged_by`),
  KEY `fk_room_maintenance_request_log_employees2_idx` (`verified_by`),
  CONSTRAINT `fk_room_maintenance_request_log_employees1` FOREIGN KEY (`logged_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_room_maintenance_request_log_employees2` FOREIGN KEY (`verified_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_room_maintenance_request_log_room_maintenance_requests1` FOREIGN KEY (`room_maintenance_request_id`) REFERENCES `room_maintenance_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `room_maintenance_requests`;
CREATE TABLE `room_maintenance_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `room_id` bigint unsigned NOT NULL,
  `reported_by` bigint unsigned NOT NULL,
  `issue_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('reported','in_progress','resolved') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reported_at` timestamp NOT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `room_maintenance_requests_asset_room_id_foreign` (`room_id`),
  KEY `room_maintenance_requests_reported_by_foreign` (`reported_by`),
  CONSTRAINT `room_maintenance_requests_asset_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `room_maintenance_requests_reported_by_foreign` FOREIGN KEY (`reported_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `building_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `floor` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacity` int NOT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT '0',
  `responsible_employee_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_rooms_code_unique` (`code`),
  KEY `asset_rooms_asset_id_foreign` (`asset_id`),
  KEY `asset_rooms_building_id_foreign` (`building_id`),
  KEY `asset_rooms_responsible_employee_id_foreign` (`responsible_employee_id`),
  CONSTRAINT `asset_rooms_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `asset_rooms_building_id_foreign` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`),
  CONSTRAINT `asset_rooms_responsible_employee_id_foreign` FOREIGN KEY (`responsible_employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('VJfyh8NfAz5GZcVnY7AIvoos16i_K2gY',	1781620514,	'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2026-06-16T14:32:56.014Z\",\"httpOnly\":true,\"path\":\"/\"},\"userId\":3,\"name\":\"Hasyfi Zharfan\",\"email\":\"hasyfi@facultyware.com\",\"role\":\"pimpinan\",\"permissions\":[\"approve_laporan\",\"approve_overtime_reports\",\"create_overtime_assignments\",\"create_penugasan\",\"edit_overtime_assignments\",\"view_overtime_assignments\",\"view_overtime_reports\",\"view_reports\"]}'),
('YkPXw32tG3C0vh1f6PfFhgB9_J-Kq1t-',	1781625641,	'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2026-06-16T15:56:04.745Z\",\"httpOnly\":true,\"path\":\"/\"},\"userId\":3,\"name\":\"Hasyfi Zharfan\",\"email\":\"hasyfi@facultyware.com\",\"role\":\"pimpinan\",\"permissions\":[\"approve_laporan\",\"approve_overtime_reports\",\"create_overtime_assignments\",\"create_penugasan\",\"edit_overtime_assignments\",\"view_overtime_assignments\",\"view_overtime_reports\",\"view_reports\"]}'),
('ps-rHlqhLo9ILnIzYTMtKv_qWXMlcbMq',	1781340110,	'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2026-06-13T08:41:47.537Z\",\"httpOnly\":true,\"path\":\"/\"},\"userId\":2,\"name\":\"Muhammad Habib\",\"email\":\"habib@facultyware.com\",\"role\":\"pimpinan\",\"permissions\":[\"approve_laporan\",\"approve_overtime_reports\",\"create_overtime_assignments\",\"create_penugasan\",\"edit_overtime_assignments\",\"view_overtime_assignments\",\"view_overtime_reports\",\"view_reports\"]}');

DROP TABLE IF EXISTS `staff`;
CREATE TABLE `staff` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `staff_employee_id_foreign` FOREIGN KEY (`id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `staff_nomenclature_histories`;
CREATE TABLE `staff_nomenclature_histories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `nomenclature_class_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `nomenclature_classification_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `staff_nomenclature_histories_staff_id_foreign` (`staff_id`),
  KEY `staff_nomenclature_histories_nomenclature_class_id_foreign` (`nomenclature_class_id`),
  CONSTRAINT `staff_nomenclature_histories_nomenclature_class_id_foreign` FOREIGN KEY (`nomenclature_class_id`) REFERENCES `nomenclature_classifications` (`id`),
  CONSTRAINT `staff_nomenclature_histories_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `structural_position_histories`;
CREATE TABLE `structural_position_histories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `structural_position_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `decree_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decree_date` date DEFAULT NULL,
  `document` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `structural_position_histories_employee_id_foreign` (`employee_id`),
  KEY `structural_position_histories_structural_position_id_foreign` (`structural_position_id`),
  CONSTRAINT `structural_position_histories_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `structural_position_histories_structural_position_id_foreign` FOREIGN KEY (`structural_position_id`) REFERENCES `structural_positions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `structural_positions`;
CREATE TABLE `structural_positions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `grade` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `qualification` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `structural_position_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `structural_positions_parent_id_foreign` (`parent_id`),
  CONSTRAINT `structural_positions_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `structural_positions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `student_request_active_references`;
CREATE TABLE `student_request_active_references` (
  `id` bigint unsigned NOT NULL,
  `student_requests_id` bigint unsigned NOT NULL,
  `student_study_plan_file` varchar(45) DEFAULT NULL,
  `parent_decree_file` varchar(45) DEFAULT NULL,
  `checked_by` bigint unsigned NOT NULL,
  `checked_at` datetime DEFAULT NULL,
  `check_reason` text,
  `signed_by` bigint unsigned NOT NULL,
  `signed_at` datetime DEFAULT NULL,
  `sign_reason` text,
  `status` varchar(45) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_student_request_recomendations_student_requests1_idx` (`student_requests_id`),
  KEY `fk_student_request_recomendations_employees1_idx` (`signed_by`),
  KEY `fk_student_request_recomendations_employees2_idx` (`checked_by`),
  CONSTRAINT `fk_student_request_recomendations_employees1` FOREIGN KEY (`signed_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_student_request_recomendations_employees2` FOREIGN KEY (`checked_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_student_request_recomendations_student_requests1` FOREIGN KEY (`student_requests_id`) REFERENCES `student_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `student_request_resignation`;
CREATE TABLE `student_request_resignation` (
  `id` bigint unsigned NOT NULL,
  `student_requests_id` bigint unsigned NOT NULL,
  `student_address` text,
  `student_hp` varchar(45) DEFAULT NULL,
  `current_gpa` double DEFAULT NULL,
  `current_credits` int DEFAULT NULL,
  `reasons` varchar(45) DEFAULT NULL,
  `application_letter_file` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_student_request_resignation_student_requests1_idx` (`student_requests_id`),
  CONSTRAINT `fk_student_request_resignation_student_requests1` FOREIGN KEY (`student_requests_id`) REFERENCES `student_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `student_requests`;
CREATE TABLE `student_requests` (
  `id` bigint unsigned NOT NULL,
  `request_nunmber` varchar(45) DEFAULT NULL,
  `request_type` varchar(45) DEFAULT NULL,
  `title` varchar(45) DEFAULT NULL,
  `description` varchar(45) DEFAULT NULL,
  `status` int DEFAULT NULL,
  `requested_by` bigint unsigned DEFAULT NULL,
  `requested_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_student_requests_students1_idx` (`requested_by`),
  CONSTRAINT `fk_student_requests_students1` FOREIGN KEY (`requested_by`) REFERENCES `students` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `regno` varchar(255) NOT NULL,
  `birth_date` datetime DEFAULT NULL,
  `birth_place` varchar(45) DEFAULT NULL,
  `gender` int DEFAULT NULL,
  `religion` int DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `campus_email` varchar(255) DEFAULT NULL,
  `phone_no` varchar(45) DEFAULT NULL,
  `home_address` varchar(255) DEFAULT NULL,
  `home_town` varchar(45) DEFAULT NULL,
  `home_province` varchar(45) DEFAULT NULL,
  `home_postalcode` varchar(5) DEFAULT NULL,
  `current_address` varchar(255) DEFAULT NULL,
  `current_town` varchar(45) DEFAULT NULL,
  `current_province` varchar(45) DEFAULT NULL,
  `current_postalcode` varchar(5) DEFAULT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `year` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `advisor_id` bigint unsigned DEFAULT NULL,
  `citizenship` varchar(45) DEFAULT NULL,
  `photo` varchar(45) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_students_lecturers1_idx` (`advisor_id`),
  KEY `fk_students_organization_units1_idx` (`department_id`),
  CONSTRAINT `fk_students_lecturers1` FOREIGN KEY (`advisor_id`) REFERENCES `lecturers` (`id`),
  CONSTRAINT `fk_students_organization_units1` FOREIGN KEY (`department_id`) REFERENCES `organization_units` (`id`),
  CONSTRAINT `fk_students_users` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `survey_answer_options`;
CREATE TABLE `survey_answer_options` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `survey_answer_id` bigint unsigned NOT NULL,
  `survey_question_option_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `survey_answer_options_survey_answer_id_foreign` (`survey_answer_id`),
  KEY `survey_answer_options_survey_question_option_id_foreign` (`survey_question_option_id`),
  CONSTRAINT `survey_answer_options_survey_answer_id_foreign` FOREIGN KEY (`survey_answer_id`) REFERENCES `survey_answers` (`id`),
  CONSTRAINT `survey_answer_options_survey_question_option_id_foreign` FOREIGN KEY (`survey_question_option_id`) REFERENCES `survey_question_options` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `survey_answers`;
CREATE TABLE `survey_answers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `survey_response_id` bigint unsigned NOT NULL,
  `survey_question_id` bigint unsigned NOT NULL,
  `answer_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `survey_answers_survey_response_id_foreign` (`survey_response_id`),
  KEY `survey_answers_survey_question_id_foreign` (`survey_question_id`),
  CONSTRAINT `survey_answers_survey_question_id_foreign` FOREIGN KEY (`survey_question_id`) REFERENCES `survey_questions` (`id`),
  CONSTRAINT `survey_answers_survey_response_id_foreign` FOREIGN KEY (`survey_response_id`) REFERENCES `survey_responses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `survey_invitations`;
CREATE TABLE `survey_invitations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `survey_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pin` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `survey_invitations_pin_unique` (`pin`),
  KEY `survey_invitations_survey_id_foreign` (`survey_id`),
  CONSTRAINT `survey_invitations_survey_id_foreign` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `survey_question_assignments`;
CREATE TABLE `survey_question_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `survey_id` bigint unsigned NOT NULL,
  `survey_question_id` bigint unsigned NOT NULL,
  `order` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `survey_question_assignments_survey_id_foreign` (`survey_id`),
  KEY `survey_question_assignments_survey_question_id_foreign` (`survey_question_id`),
  CONSTRAINT `survey_question_assignments_survey_id_foreign` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`),
  CONSTRAINT `survey_question_assignments_survey_question_id_foreign` FOREIGN KEY (`survey_question_id`) REFERENCES `survey_questions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `survey_question_options`;
CREATE TABLE `survey_question_options` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `survey_question_id` bigint unsigned NOT NULL,
  `option_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `weight` decimal(5,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `survey_question_options_survey_question_id_foreign` (`survey_question_id`),
  CONSTRAINT `survey_question_options_survey_question_id_foreign` FOREIGN KEY (`survey_question_id`) REFERENCES `survey_questions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `survey_questions`;
CREATE TABLE `survey_questions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `question_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('single_choice','multiple_choice','short_answer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `survey_responses`;
CREATE TABLE `survey_responses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `survey_id` bigint unsigned NOT NULL,
  `survey_invitation_id` bigint unsigned NOT NULL,
  `submitted_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `survey_responses_survey_id_foreign` (`survey_id`),
  KEY `survey_responses_survey_invitation_id_foreign` (`survey_invitation_id`),
  CONSTRAINT `survey_responses_survey_id_foreign` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`),
  CONSTRAINT `survey_responses_survey_invitation_id_foreign` FOREIGN KEY (`survey_invitation_id`) REFERENCES `survey_invitations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `surveys`;
CREATE TABLE `surveys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `surveys_created_by_foreign` (`created_by`),
  CONSTRAINT `surveys_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `travel_cost_components`;
CREATE TABLE `travel_cost_components` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `travel_cost_components_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `travel_cost_standards`;
CREATE TABLE `travel_cost_standards` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `city_id` bigint unsigned NOT NULL,
  `structural_position_id` bigint unsigned DEFAULT NULL,
  `employee_grade_id` bigint unsigned DEFAULT NULL,
  `travel_cost_component_id` bigint unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `travel_cost_standards_city_id_foreign` (`city_id`),
  KEY `travel_cost_standards_structural_position_id_foreign` (`structural_position_id`),
  KEY `travel_cost_standards_employee_grade_id_foreign` (`employee_grade_id`),
  KEY `travel_cost_standards_travel_cost_component_id_foreign` (`travel_cost_component_id`),
  CONSTRAINT `travel_cost_standards_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `travel_cost_standards_employee_grade_id_foreign` FOREIGN KEY (`employee_grade_id`) REFERENCES `employee_grades` (`id`),
  CONSTRAINT `travel_cost_standards_structural_position_id_foreign` FOREIGN KEY (`structural_position_id`) REFERENCES `structural_positions` (`id`),
  CONSTRAINT `travel_cost_standards_travel_cost_component_id_foreign` FOREIGN KEY (`travel_cost_component_id`) REFERENCES `travel_cost_components` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `travel_expenses`;
CREATE TABLE `travel_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `official_travel_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `travel_cost_component_id` bigint unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `receipt_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_at` timestamp NOT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `status` enum('submitted','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `travel_expenses_official_travel_id_foreign` (`official_travel_id`),
  KEY `travel_expenses_employee_id_foreign` (`employee_id`),
  KEY `travel_expenses_travel_cost_component_id_foreign` (`travel_cost_component_id`),
  CONSTRAINT `travel_expenses_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `travel_expenses_official_travel_id_foreign` FOREIGN KEY (`official_travel_id`) REFERENCES `official_travels` (`id`),
  CONSTRAINT `travel_expenses_travel_cost_component_id_foreign` FOREIGN KEY (`travel_cost_component_id`) REFERENCES `travel_cost_components` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `two_factor_secret` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `two_factor_recovery_codes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `two_factor_confirmed_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `two_factor_secret`, `two_factor_recovery_codes`, `two_factor_confirmed_at`, `remember_token`, `created_at`, `updated_at`) VALUES
(1,	'Pegawai Lembur',	'pegawai@lembur.com',	NULL,	'$2b$10$dzqn9Hn2iTMMikC27iLtuuyRN.kr03yvNcSamRn0OSdwM9RK54DYS',	NULL,	NULL,	NULL,	NULL,	'2026-06-03 09:11:05',	'2026-06-03 09:11:05'),
(2,	'Muhammad Habib',	'habib@facultyware.com',	NULL,	'$2b$10$euiDXLUDwaoH/btKSB/BPOEtPsFLAyKwMw2irx0aDHfxeoGy.ee/a',	NULL,	NULL,	NULL,	NULL,	'2026-06-03 16:37:35',	'2026-06-03 16:37:35'),
(3,	'Hasyfi Zharfan',	'hasyfi@facultyware.com',	NULL,	'$2b$10$euiDXLUDwaoH/btKSB/BPOEtPsFLAyKwMw2irx0aDHfxeoGy.ee/a',	NULL,	NULL,	NULL,	NULL,	'2026-06-03 16:37:35',	'2026-06-03 16:37:35'),
(4,	'Darrel Rajendra',	'darrel@facultyware.com',	NULL,	'$2b$10$euiDXLUDwaoH/btKSB/BPOEtPsFLAyKwMw2irx0aDHfxeoGy.ee/a',	NULL,	NULL,	NULL,	NULL,	'2026-06-03 16:37:35',	'2026-06-03 16:37:35'),
(5,	'Alya Salsa Nabila',	'alya@facultyware.com',	NULL,	'$2b$10$euiDXLUDwaoH/btKSB/BPOEtPsFLAyKwMw2irx0aDHfxeoGy.ee/a',	NULL,	NULL,	NULL,	NULL,	'2026-06-03 16:37:35',	'2026-06-03 16:37:35'),
(6,	'M. Ananda Akbar',	'akbar@facultyware.com',	NULL,	'$2b$10$euiDXLUDwaoH/btKSB/BPOEtPsFLAyKwMw2irx0aDHfxeoGy.ee/a',	NULL,	NULL,	NULL,	NULL,	'2026-06-03 16:37:35',	'2026-06-03 16:37:35');

-- 2026-06-15 16:00:56 UTC
