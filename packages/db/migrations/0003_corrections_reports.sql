CREATE TABLE "correction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"kapt_code" text,
	"message" text NOT NULL,
	"contact" text,
	"status" text DEFAULT 'received' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "correction_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"report_date" date PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"message" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "correction_requests_status_updated_idx" ON "correction_requests" USING btree ("status","updated_at");