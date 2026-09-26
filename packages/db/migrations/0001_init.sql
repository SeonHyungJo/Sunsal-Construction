CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"published_on" date NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "builder_aliases" (
	"alias" text PRIMARY KEY NOT NULL,
	"company_key" text NOT NULL,
	"evidence" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "builder_aliases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "complexes" (
	"kapt_code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bjd_code" text,
	"sido" text,
	"sigungu" text,
	"eupmyeondong" text,
	"legal_address" text,
	"road_address" text,
	"builder_raw" text,
	"developer_raw" text,
	"approval_date" date,
	"households" integer,
	"listed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"basis_attempted_at" timestamp with time zone,
	"basis_synced_at" timestamp with time zone,
	"basis_changed_at" timestamp with time zone,
	"basis_error" text
);
--> statement-breakpoint
ALTER TABLE "complexes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ranking_rows" (
	"announcement_id" text NOT NULL,
	"company_key" text NOT NULL,
	"rank" integer NOT NULL,
	"company_name" text NOT NULL,
	"defect_count" integer NOT NULL,
	"case_count" integer NOT NULL,
	"note" text,
	CONSTRAINT "ranking_rows_announcement_id_company_key_pk" PRIMARY KEY("announcement_id","company_key")
);
--> statement-breakpoint
ALTER TABLE "ranking_rows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" integer DEFAULT 0 NOT NULL,
	"changed" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "sync_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ranking_rows" ADD CONSTRAINT "ranking_rows_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complexes_basis_attempted_at_idx" ON "complexes" USING btree ("basis_attempted_at");--> statement-breakpoint
CREATE INDEX "complexes_search_trgm_idx" ON "complexes" USING gin ((coalesce("name", '') || ' ' || coalesce("road_address", '') || ' ' || coalesce("legal_address", '')) gin_trgm_ops);