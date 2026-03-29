ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "preimage" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nostr_pubkey" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nostr_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nostr_metadata_updated_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_users_nostr_pubkey" ON "users" USING btree ("nostr_pubkey");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_nostr_pubkey_unique" UNIQUE("nostr_pubkey");--> statement-breakpoint
-- Backfill: mark existing Nostr-registered users
UPDATE "users" SET "auth_provider" = 'nostr' WHERE "email" LIKE 'nostr_%@bitbybit.nostr';