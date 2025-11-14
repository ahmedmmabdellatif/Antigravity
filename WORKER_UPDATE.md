# Cloudflare Worker Update Instructions

## Overview
The PDF parser now uses a **universal envelope structure** with domain detection. The Worker must be updated to enforce the new JSON schema.

## What Changed

### 1. Response Format
**Old**: Direct JSON with arbitrary structure
**New**: Universal envelope with `domains[]` array

```json
{
  "domains": [
    {
      "type": "fitness_plan | resume | receipt | generic_document",
      "confidence": 0.0-1.0,
      "fields": { domain-specific object },
      "missing_fields": ["field1", "field2"],
      "source_coverage": {
        "pages_covered": [1, 2, 3],
        "pages_with_no_mapped_content": [4]
      }
    }
  ]
}
```

### 2. Fitness Plan Schema
When a PDF is detected as a fitness plan, the `fields` object follows this structure:
- `meta`: Plan metadata (name, coach, duration, language, target, level)
- `profile`: User profile (age, height, weight, body fat, injuries, constraints)
- `goals`: Fitness goals (primary, secondary, timeframe)
- `workouts`: Array of workout sessions with exercises
- `cardio`: Cardio activities
- `meals`: Meal plans with nutritional info
- `water_intake`: Daily water recommendations
- `supplements`: Supplement recommendations
- `rehab_and_mobility`: Rehab exercises
- `stretching`: Stretching routines

Each item includes `source_pages` to trace content back to PDF pages.

## Deployment Steps

### Step 1: Update Worker Code
1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker: `pdf-relay`
3. Click "Edit Code"
4. Replace the entire worker code with the contents of `cloudflare-worker.js`
5. Click "Save and Deploy"

### Step 2: Verify Environment Variables
1. Go to Settings → Variables
2. Ensure `OPENAI_API_KEY` is set with your API key
3. Save if changed

### Step 3: Test the Update
1. Open your Rork app
2. Upload a fitness PDF (e.g., workout plan)
3. Click "Send"
4. Verify the response shows:
   - Domain type badge (e.g., "Fitness Plan")
   - Confidence percentage
   - Coverage information (pages covered)
   - Missing fields (if any)
   - Structured sections based on the fitness plan schema

### Step 4: Test Non-Fitness PDFs
1. Upload a non-fitness PDF (e.g., resume, receipt)
2. Verify it returns a different domain type with appropriate confidence
3. Check the structured view adapts to the domain

## Validation

The Worker now validates the response structure and will return an error if:
- `domains` array is missing
- JSON parsing fails
- OpenAI returns non-JSON text

## Client Updates

The React Native app (`app/index.tsx`) has been updated to:
1. Parse the universal envelope structure
2. Select the domain with highest confidence
3. Render fitness plans with a specialized UI
4. Fall back to generic rendering for other domains
5. Display confidence scores and source coverage

## Rollback

If issues occur, you can rollback by:
1. Going to Worker → Deployments
2. Selecting the previous deployment
3. Clicking "Rollback to this deployment"

## Support

If you encounter errors:
1. Check Worker logs in Cloudflare Dashboard
2. Verify the OpenAI API key is valid
3. Test with the Raw JSON view to see actual API responses
4. Check that the PDF uploaded successfully (no CORS errors)
