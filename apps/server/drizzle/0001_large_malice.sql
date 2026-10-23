CREATE TABLE IF NOT EXISTS "employee_ocr_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"requirement_id" uuid,
	"full_name" text,
	"date_of_birth" text,
	"id_number" text,
	"nationality" text,
	"address" text,
	"expiry_date" text,
	"document_type" text,
	"raw_ocr_text" text,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"hr_notes" text,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_ocr_profiles" ADD CONSTRAINT "employee_ocr_profiles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_ocr_profiles" ADD CONSTRAINT "employee_ocr_profiles_requirement_id_employee_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."employee_requirements"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
