const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../dev.db');

// Create empty database file
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, '');
  console.log('Created dev.db file');
}

const sql = `
CREATE TABLE IF NOT EXISTS "ParsedPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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

console.log('SQL schema:\n', sql);
console.log('\nDatabase file created at:', dbPath);
console.log('To complete setup, install sqlite3 CLI and run:');
console.log(`  sqlite3 ${dbPath} < schema.sql`);

// Write SQL to a file
fs.writeFileSync(path.join(__dirname, '../schema.sql'), sql);
console.log('SQL schema written to schema.sql');
