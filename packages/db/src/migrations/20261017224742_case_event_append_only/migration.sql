-- case_event is append-only: corrections are new events.
CREATE OR REPLACE FUNCTION bb_forbid_change() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'case_event is append-only'; END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER case_event_no_update BEFORE UPDATE OR DELETE ON case_event FOR EACH ROW EXECUTE FUNCTION bb_forbid_change();
