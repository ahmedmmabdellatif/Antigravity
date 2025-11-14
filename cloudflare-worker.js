// Cloudflare Worker for PDF parsing with universal envelope
// Deploy this to: https://pdf-relay.ahmed-m-m-abdellatif.workers.dev/

export default {
  async fetch(req, env) {
    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'POST /parse only' }), 
        { status: 405, headers: { 'Content-Type': 'application/json', ...CORS }}
      );
    }

    try {
      const ct = req.headers.get('content-type') || '';
      if (!ct.includes('multipart/form-data')) {
        return new Response(
          JSON.stringify({ error: 'multipart/form-data with field "file" required' }), 
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS }}
        );
      }

      const form = await req.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return new Response(
          JSON.stringify({ error: 'file is required' }), 
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS }}
        );
      }
      
      if (file.type !== 'application/pdf') {
        return new Response(
          JSON.stringify({ error: 'PDF only' }), 
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS }}
        );
      }

      // Upload file to OpenAI
      const up = new FormData();
      up.append('file', file, file.name || 'upload.pdf');
      up.append('purpose', 'assistants');

      const upRes = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: up
      });
      
      if (!upRes.ok) {
        const t = await upRes.text();
        return new Response(
          JSON.stringify({ error: `file upload failed: ${t}` }), 
          { status: 502, headers: { 'Content-Type': 'application/json', ...CORS }}
        );
      }
      
      const upJson = await upRes.json();
      const fileId = upJson.id;

      // Universal envelope instruction
      const PARSE_INSTRUCTIONS = `You are a universal PDF parser. Extract structured data and return ONLY valid JSON with this exact structure:

{
  "domains": [
    {
      "type": "string (domain name)",
      "confidence": 0.0-1.0,
      "fields": { domain-specific object },
      "missing_fields": ["list", "of", "relevant", "missing", "keys"],
      "source_coverage": {
        "pages_covered": [page numbers with mapped content],
        "pages_with_no_mapped_content": [page numbers with no mapped content]
      }
    }
  ]
}

DOMAIN TYPES:
- "fitness_plan": workout/fitness/coaching documents
- "resume": CV/resume documents
- "receipt": purchase receipts
- "generic_document": everything else

FITNESS_PLAN SCHEMA (when detected):
{
  "type": "fitness_plan",
  "confidence": 0.0-1.0,
  "fields": {
    "meta": {
      "plan_name": "string | null",
      "coach_name": "string | null",
      "duration_weeks": "number | null",
      "language": "string | null",
      "target_gender": "string | null",
      "target_level": "string | null"
    },
    "profile": {
      "age": "number | null",
      "height_cm": "number | null",
      "weight_kg": "number | null",
      "body_fat_percent": "number | null",
      "injuries": ["string"],
      "constraints": ["string"]
    },
    "goals": {
      "primary": "string | null",
      "secondary": ["string"],
      "timeframe_weeks": "number | null"
    },
    "workouts": [
      {
        "name": "string (e.g. Push, Legs, Upper A)",
        "day_label": "string | null (e.g. Day 1, Monday)",
        "source_pages": ["number"],
        "exercises": [
          {
            "name": "string",
            "sets": "number | null",
            "reps": "string | null",
            "rest_seconds": "number | null",
            "tempo": "string | null",
            "notes": "string | null",
            "media_url": "string | null",
            "source_pages": ["number"]
          }
        ]
      }
    ],
    "cardio": [
      {
        "name": "string",
        "intensity": "string | null",
        "duration_minutes": "number | null",
        "frequency_per_week": "number | null",
        "notes": "string | null",
        "source_pages": ["number"]
      }
    ],
    "meals": [
      {
        "name": "string (e.g. Breakfast, Meal 1)",
        "time": "string | null (e.g. 08:00)",
        "items": [
          {
            "name": "string",
            "quantity": "string | null",
            "calories_kcal": "number | null",
            "protein_g": "number | null",
            "carbs_g": "number | null",
            "fats_g": "number | null"
          }
        ],
        "source_pages": ["number"]
      }
    ],
    "water_intake": {
      "recommended_liters_per_day": "number | null",
      "notes": "string | null",
      "source_pages": ["number"]
    },
    "supplements": [
      {
        "name": "string",
        "dosage": "string | null",
        "timing": "string | null",
        "notes": "string | null",
        "source_pages": ["number"]
      }
    ],
    "rehab_and_mobility": [
      {
        "name": "string",
        "frequency_per_week": "number | null",
        "notes": "string | null",
        "source_pages": ["number"]
      }
    ],
    "stretching": [
      {
        "name": "string",
        "duration_seconds": "number | null",
        "notes": "string | null",
        "source_pages": ["number"]
      }
    ]
  },
  "missing_fields": ["list of relevant fields not found"],
  "source_coverage": {
    "pages_covered": [1, 2, 3],
    "pages_with_no_mapped_content": [4]
  }
}

RULES:
1. Return ONLY the JSON object, no explanations, no markdown, no prose
2. If field not found: set to null or [] and list in missing_fields
3. Every content object must include source_pages with page numbers
4. Use 1-based page numbering
5. Set confidence low if structure doesn't clearly match domain
6. For non-fitness PDFs: use appropriate domain type or "generic_document"
7. Ensure valid JSON with no trailing commas or syntax errors`;

      // Call Responses API
      const respRes = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${env.OPENAI_API_KEY}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          text: { format: { type: 'json_object' } },
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: PARSE_INSTRUCTIONS },
                { type: 'input_file', file_id: fileId }
              ]
            }
          ]
        })
      });
      
      if (!respRes.ok) {
        const t = await respRes.text();
        return new Response(
          JSON.stringify({ error: `model error: ${t}` }), 
          { status: 502, headers: { 'Content-Type': 'application/json', ...CORS }}
        );
      }

      const rjson = await respRes.json();
      
      // Extract text
      let text = rjson.output_text;
      if (!text) {
        try {
          const chunks = rjson.output ?? [];
          const first = chunks.find(c => Array.isArray(c.content) && c.content[0]?.type === 'output_text');
          text = first?.content?.[0]?.text;
        } catch {}
      }
      
      if (!text || typeof text !== 'string') {
        return new Response(
          JSON.stringify({ error: 'empty/non-text model response' }), 
          { status: 502, headers: { 'Content-Type': 'application/json', ...CORS }}
        );
      }

      // Parse JSON
      let json;
      try { 
        json = JSON.parse(text); 
      } catch {
        const m = text.match(/\{[\s\S]*\}$/);
        if (!m) {
          return new Response(
            JSON.stringify({ error: 'model returned non-JSON' }), 
            { status: 502, headers: { 'Content-Type': 'application/json', ...CORS }}
          );
        }
        json = JSON.parse(m[0]);
      }

      // Validate envelope structure
      if (!json.domains || !Array.isArray(json.domains)) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid response: missing domains array',
            received: json
          }), 
          { status: 502, headers: { 'Content-Type': 'application/json', ...CORS }}
        );
      }

      return new Response(
        JSON.stringify(json), 
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS }}
      );
      
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e?.message || 'server error' }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS }}
      );
    }
  }
}
