const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../dev.db');
const db = new Database(dbPath);

console.log('Initializing database at:', dbPath);

const schema = `
CREATE TABLE IF NOT EXISTS "ParsedPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceFilename" TEXT NOT NULL,
    "pagesCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaCoachName" TEXT,
    "metaDurationWeeks" INTEGER,
    "rawJson" TEXT NOT NULL,
    "debugJson" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "ParsedPlan_createdAt_idx" ON "ParsedPlan"("createdAt");
CREATE INDEX IF NOT EXISTS "ParsedPlan_status_idx" ON "ParsedPlan"("status");

CREATE TABLE IF NOT EXISTS "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planId" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "type" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "resolvedUrl" TEXT,
    "thumbnailUrl" TEXT,
    "exerciseName" TEXT,
    "notes" TEXT,
    CONSTRAINT "MediaAsset_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ParsedPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MediaAsset_planId_idx" ON "MediaAsset"("planId");
CREATE INDEX IF NOT EXISTS "MediaAsset_type_idx" ON "MediaAsset"("type");
`;

try {
  db.exec(schema);
  console.log('✅ Database schema created successfully!');
  console.log('Tables created:');
  console.log('  - ParsedPlan');
  console.log('  - MediaAsset');
} catch (error) {
  console.error('❌ Error creating schema:', error.message);
  process.exit(1);
} finally {
  db.close();
}
