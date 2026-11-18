CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, state TEXT NOT NULL, available INTEGER NOT NULL, updated INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rooms_match ON rooms(available, updated);
