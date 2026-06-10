ALTER TABLE "invoice_items" ADD COLUMN "discount_rate" numeric(5, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_total" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "discount_rate" numeric(5, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "discount_total" numeric(14, 2) DEFAULT '0' NOT NULL;