CREATE TABLE IF NOT EXISTS "employee_id_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"card_number" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" date NOT NULL,
	"expires_at" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_number_seq" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_id_cards" ADD CONSTRAINT "employee_id_cards_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employee_id_cards_employee_id_unique" ON "employee_id_cards" USING btree ("employee_id");
--> statement-breakpoint
-- Add column as nullable first so existing rows don't violate NOT NULL
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "employee_number" text;
--> statement-breakpoint
-- Backfill existing employees with sequential ONB-<YEAR>-<NNNN> numbers
-- Uses created_at order; groups by year and assigns sequence within each year.
DO $$
DECLARE
  rec RECORD;
  yr  INTEGER;
  seq INTEGER;
  prev_yr INTEGER := -1;
BEGIN
  FOR rec IN
    SELECT id, EXTRACT(YEAR FROM created_at)::integer AS yr
    FROM employees
    ORDER BY created_at ASC, id ASC
  LOOP
    yr := rec.yr;
    IF yr <> prev_yr THEN
      -- Reset per-year counter
      seq := 0;
      prev_yr := yr;
    END IF;
    seq := seq + 1;
    -- Initialise the seq counter row so future app inserts start after the backfill
    INSERT INTO employee_number_seq (year, last_seq)
    VALUES (yr, seq)
    ON CONFLICT (year) DO UPDATE SET last_seq = GREATEST(employee_number_seq.last_seq, EXCLUDED.last_seq);

    UPDATE employees
    SET employee_number = 'ONB-' || yr || '-' || LPAD(seq::text, 4, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;
--> statement-breakpoint
-- Now enforce NOT NULL + unique
ALTER TABLE "employees" ALTER COLUMN "employee_number" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_employee_number_unique" UNIQUE("employee_number");
