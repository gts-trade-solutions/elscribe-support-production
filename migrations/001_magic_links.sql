-- Migration 001: Magic link payment flow (Phase 1)
-- Adds users.is_guest and ticket_magic_links. Forward-only.

ALTER TABLE `users`
  ADD COLUMN `is_guest` tinyint(1) NOT NULL DEFAULT '0' AFTER `role`,
  ADD KEY `idx_users_is_guest` (`is_guest`);

CREATE TABLE `ticket_magic_links` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticket_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guest_user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by_user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `revoked_by_user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_visited_at` timestamp NULL DEFAULT NULL,
  `visit_count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_magic_links_token_hash` (`token_hash`),
  KEY `idx_magic_links_ticket` (`ticket_id`),
  KEY `idx_magic_links_guest` (`guest_user_id`),
  KEY `idx_magic_links_expires` (`expires_at`),
  KEY `fk_magic_links_created_by` (`created_by_user_id`),
  KEY `fk_magic_links_revoked_by` (`revoked_by_user_id`),
  CONSTRAINT `fk_magic_links_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_magic_links_guest_user` FOREIGN KEY (`guest_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_magic_links_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_magic_links_revoked_by` FOREIGN KEY (`revoked_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
