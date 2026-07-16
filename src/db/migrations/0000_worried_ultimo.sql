CREATE TABLE `csv_data` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`c1` varchar(255),
	`c2` varchar(255),
	`c3` varchar(255),
	`c4` varchar(255),
	`c5` varchar(255),
	`c6` varchar(255),
	`c7` varchar(255),
	`c8` varchar(255),
	`c9` varchar(255),
	`c10` varchar(255),
	CONSTRAINT `csv_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_diff_detail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`summary_id` int NOT NULL,
	`dump_time` time NOT NULL,
	`element_code` varchar(50) NOT NULL,
	`element_name` varchar(255) NOT NULL,
	`new_place` boolean NOT NULL DEFAULT false,
	`delete_displace` boolean NOT NULL DEFAULT false,
	`change_position` boolean NOT NULL DEFAULT false,
	`change_geometry` boolean NOT NULL DEFAULT false,
	`change_name_material` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_diff_detail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_diff_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prprod_id` int NOT NULL,
	`prprod_name` varchar(50) NOT NULL,
	`prprod_dump` int NOT NULL,
	`dump_date` date NOT NULL,
	`page_id` int NOT NULL,
	`page_name` varchar(100) NOT NULL,
	`page_no` int NOT NULL,
	`pp_id` int NOT NULL,
	`pp_name` varchar(100) NOT NULL,
	`diff_free_area` int DEFAULT 0,
	`diff_elements` int DEFAULT 0,
	`makeup_flag` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_diff_summary_id` PRIMARY KEY(`id`),
	CONSTRAINT `page_diff_summary_unique` UNIQUE(`prprod_id`,`dump_date`,`page_id`)
);
--> statement-breakpoint
ALTER TABLE `page_diff_detail` ADD CONSTRAINT `page_diff_detail_summary_id_page_diff_summary_id_fk` FOREIGN KEY (`summary_id`) REFERENCES `page_diff_summary`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `page_diff_detail_summary_idx` ON `page_diff_detail` (`summary_id`,`dump_time`,`element_code`);--> statement-breakpoint
CREATE INDEX `page_diff_summary_search_idx` ON `page_diff_summary` (`dump_date`,`prprod_name`,`page_id`);