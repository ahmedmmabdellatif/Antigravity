# Fitness PDF Parser - Backend v2

Node.js backend with real database (SQLite/PostgreSQL) for parsing fitness plan PDFs using OpenAI via Cloudflare Worker.

## Architecture

```
Frontend (Expo/React Native)
         ↓
    Backend (Express + Prisma + SQLite)
         ↓
    Cloudflare Worker
         ↓
    OpenAI API
```

### Workflow

1. Frontend uploads PDF to `POST /api/parse`
2. Backend splits PDF into pages (text + image)
3. Each page is sent to Cloudflare Worker
4. Worker calls OpenAI and returns structured JSON per page
5. Backend merges all pages into unified fitness plan
6. Result stored in database
7. Frontend fetches via `GET /api/plans/:id`

## Tech Stack

- **Runtime**: Node.js (LTS)
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: SQLite (dev) / PostgreSQL (production)
- **PDF Processing**: pdfjs-dist + canvas
- **HTTP Client**: axios
- **Language**: TypeScript

## Prerequisites

- Node.js 18+ or 20+ (LTS)
- npm or yarn or bun

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
WORKER_URL=https://pdf-relay.ahmed-m-m-abdellatif.workers.dev/
```

### 3. Initialize Database

```bash
npx prisma migrate dev --name init
```

This creates the SQLite database and runs migrations.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

## Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns server status.

### Parse PDF

```bash
POST /api/parse
Content-Type: multipart/form-data

Body:
  file: <PDF file>
```

**Response:**

```json
{
  "planId": "clxxx...",
  "status": "completed",
  "meta": {
    "title": "12-Week Transformation Program",
    "coachName": "John Doe",
    "durationWeeks": 12
  },
  "pagesCount": 15,
  "createdAt": "2025-01-16T..."
}
```

### List All Plans

```bash
GET /api/plans
```

**Response:**

```json
{
  "plans": [
    {
      "id": "clxxx...",
      "createdAt": "2025-01-16T...",
      "sourceFilename": "fitness_plan.pdf",
      "status": "completed",
      "metaTitle": "12-Week Program",
      "metaCoachName": "John Doe",
      "metaDurationWeeks": 12,
      "pagesCount": 15
    }
  ],
  "count": 1
}
```

### Get Plan by ID

```bash
GET /api/plans/:id
```

**Response:**

```json
{
  "id": "clxxx...",
  "createdAt": "2025-01-16T...",
  "sourceFilename": "fitness_plan.pdf",
  "pagesCount": 15,
  "status": "completed",
  "meta": {
    "title": "12-Week Program",
    "coachName": "John Doe",
    "durationWeeks": 12
  },
  "data": {
    "domains": [
      {
        "type": "fitness_plan",
        "confidence": 1.0,
        "fields": {
          "meta": { ... },
          "workouts": [ ... ],
          "cardio": [ ... ],
          "meals": [ ... ],
          ...
        }
      }
    ]
  },
  "debug": {
    "page_summaries": [ ... ]
  },
  "mediaAssets": []
}
```

### Get Debug Data

```bash
GET /api/plans/:id/debug
```

**Response:**

```json
{
  "id": "clxxx...",
  "sourceFilename": "fitness_plan.pdf",
  "pagesCount": 15,
  "debug": {
    "page_summaries": [
      {
        "page": 1,
        "summary": "Cover page with program title and coach info",
        "mapped_to": ["meta.plan_name", "meta.coach_name"],
        "unmapped_raw_text": ""
      },
      ...
    ]
  }
}
```

## Database

### View Database

```bash
npx prisma studio
```

Opens a web UI at `http://localhost:5555` to browse data.

### Run Migrations

```bash
npx prisma migrate dev
```

### Reset Database

```bash
npx prisma migrate reset
```

Deletes all data and re-runs migrations.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── env.ts              # Environment validation
│   ├── db/
│   │   └── client.ts           # Prisma client instance
│   ├── routes/
│   │   ├── parse.routes.ts     # POST /api/parse
│   │   └── plan.routes.ts      # GET /api/plans*
│   ├── controllers/
│   │   ├── parse.controller.ts # Upload & parse logic
│   │   └── plan.controller.ts  # Fetch logic
│   ├── services/
│   │   ├── pdf.service.ts      # PDF splitting
│   │   ├── worker.service.ts   # Worker API calls
│   │   └── merge.service.ts    # Page result merging
│   ├── types/
│   │   └── fitnessPlan.ts      # TypeScript types
│   └── server.ts               # Express app
├── prisma/
│   └── schema.prisma           # Database schema
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Database Schema

### ParsedPlan

Stores each parsed fitness plan.

| Field              | Type     | Description                      |
| ------------------ | -------- | -------------------------------- |
| id                 | String   | Primary key (cuid)               |
| createdAt          | DateTime | Creation timestamp               |
| updatedAt          | DateTime | Last update timestamp            |
| sourceFilename     | String   | Original PDF filename            |
| pagesCount         | Int      | Number of pages in PDF           |
| status             | String   | "processing", "completed", "failed" |
| metaTitle          | String?  | Plan name (quick access)         |
| metaCoachName      | String?  | Coach name (quick access)        |
| metaDurationWeeks  | Int?     | Duration in weeks (quick access) |
| rawJson            | String   | Full JSON data (stringified)     |
| debugJson          | String   | Debug data (stringified)         |

### MediaAsset

For future media URL tracking.

| Field        | Type     | Description                      |
| ------------ | -------- | -------------------------------- |
| id           | String   | Primary key (cuid)               |
| planId       | String   | Foreign key to ParsedPlan        |
| pageNumber   | Int?     | Source page number               |
| type         | String   | "video", "image", "gif"          |
| originalUrl  | String   | URL from PDF                     |
| resolvedUrl  | String?  | Fetched/processed URL            |
| thumbnailUrl | String?  | Thumbnail URL                    |
| exerciseName | String?  | Related exercise name            |
| notes        | String?  | Additional notes                 |
| createdAt    | DateTime | Creation timestamp               |

## Testing

### Manual Test

1. Start server: `npm run dev`
2. Upload a fitness PDF:

```bash
curl -X POST http://localhost:3000/api/parse \
  -F "file=@/path/to/fitness_plan.pdf"
```

3. Check response for `planId`
4. Fetch plan:

```bash
curl http://localhost:3000/api/plans/<planId>
```

5. Verify data is complete and correct

## Error Handling

- If any page parsing fails, the entire parse is marked as "failed"
- Error details are stored in `debugJson`
- Server never crashes on parsing errors
- All worker responses are validated for proper JSON structure

## Production Deployment

### PostgreSQL Setup

1. Update `DATABASE_URL` in `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
```

2. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Run migrations:

```bash
npx prisma migrate deploy
```

### Environment Variables

Ensure all required variables are set:

- `PORT`
- `DATABASE_URL`
- `WORKER_URL`
- `NODE_ENV=production`

## Troubleshooting

### Issue: Prisma Client not found

```bash
npx prisma generate
```

### Issue: Database locked

```bash
rm dev.db
npx prisma migrate dev
```

### Issue: Worker timeout

Increase timeout in `worker.service.ts` (default: 120s)

### Issue: PDF parsing fails

Check logs for specific error. Common issues:
- Invalid PDF format
- Corrupted file
- Worker URL incorrect
- OpenAI API rate limits

## License

MIT
