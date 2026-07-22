CREATE TABLE `master_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feedback_text` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `master_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`summary_id` int NOT NULL,
	`master_feedback_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `page_feedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `page_feedback_summary_unique` UNIQUE(`summary_id`)
);
--> statement-breakpoint
ALTER TABLE `page_feedback` ADD CONSTRAINT `page_feedback_summary_id_page_diff_summary_id_fk` FOREIGN KEY (`summary_id`) REFERENCES `page_diff_summary`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_feedback` ADD CONSTRAINT `page_feedback_master_feedback_id_master_feedback_id_fk` FOREIGN KEY (`master_feedback_id`) REFERENCES `master_feedback`(`id`) ON DELETE no action ON UPDATE no action;