const path = require('path');
const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const SENDER = 'Alex Rivera <alex.rivera@ournetworkops.example>';
const SCORE_THRESHOLD = 6;

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store of generated .eml files, keyed by runId -> leadId. Fine for
// a single-process learning exercise; nothing here needs to survive a restart.
const runs = new Map();

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set on the server.');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Expected a JSON object in the model response, got: ${text}`);
  return JSON.parse(match[0]);
}

async function scoreLead(client, lead) {
  const system = `You are a lead-scoring assistant for a sandboxed, purely educational exercise. Every lead is a fictional person at a fictional company — do not search for or attempt to verify anything, score using only the given record.

Context: the product being sold is a predictive network diagnostics platform for telecom/CSP network operations — it helps teams detect faults before they cause outages, reducing truck-rolls and MTTR.

Score the lead out of 10 using this rubric:
- Role fit (0-6 pts): how directly the title owns network operations/engineering/infrastructure reliability decisions this product affects. VP/Head of Network Operations or Network Engineering = 6, CTO = 5, Director of Digital Transformation or similar infrastructure-adjacent role = 4, roles with no clear connection to network operations (e.g. Customer Experience, Marketing, Sales) = 1-2.
- Seniority (0-2 pts): VP/CTO/Head-of level = 2, Director = 1, Manager or below = 0.
- Company size signal (0-2 pts): "enterprise" = 2, "mid-market" = 1, "smb" = 0.

Sum the three components for a total out of 10. A total >= ${SCORE_THRESHOLD} is PASS, below is DOES NOT PASS.

Respond with ONLY a JSON object, no other text:
{"role_fit": <0-6>, "seniority": <0-2>, "company_size": <0-2>, "score": <total>, "result": "PASS" | "DOES NOT PASS", "rationale": "<1-2 sentence rationale>"}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages: [{ role: 'user', content: JSON.stringify(lead) }],
  });
  return extractJson(res.content[0].text);
}

async function researchLead(client, lead) {
  const system = `You are an ICP research assistant for a sandboxed, purely educational exercise. Every lead is a fictional person at a fictional company — do not search for or attempt to verify anything, use only the given record.

Context: the product being sold is a predictive network diagnostics platform for telecom/CSP network operations.

Given a lead record, write a short research profile: 2-4 sentences covering (a) what someone in this role likely cares about, and (b) one plausible, specific personalization hook you could open an outreach email with.

Respond with ONLY the profile text — no headers, no preamble.`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages: [{ role: 'user', content: JSON.stringify(lead) }],
  });
  return res.content[0].text.trim();
}

async function draftEmail(client, lead, profile) {
  const system = `You are an outreach email copywriter for a sandboxed, purely educational exercise. Every lead is a fictional person at a fictional company — do not search for or attempt to verify anything, use only the given record and research profile.

Draft one short outreach email using the profile's personalization hook:
- Subject line: short, specific, not clickbait-y.
- Body: 4-6 sentences covering, in order: the personalization hook, a concise value proposition relevant to the lead's likely priorities, and one clear call to action.

Do not invent additional facts about the company beyond what's in the lead record and research profile.

Respond with ONLY a JSON object, no other text:
{"subject": "<subject line>", "body": "<email body>"}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system,
    messages: [{ role: 'user', content: `Lead: ${JSON.stringify(lead)}\n\nResearch profile: ${profile}` }],
  });
  return extractJson(res.content[0].text);
}

async function parseLeadsWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet('Leads') || workbook.worksheets[0];
  if (!worksheet) throw new Error('Workbook has no sheets.');

  const headers = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value).trim();
  });

  const leads = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const lead = {};
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber];
      if (key) lead[key] = cell.value === null || cell.value === undefined ? '' : String(cell.value);
    });
    if (Object.keys(lead).length) leads.push(lead);
  });
  return leads;
}

function buildEml(lead, subject, body) {
  return `From: ${SENDER}\nTo: ${lead.name} <${lead.email}>\nSubject: ${subject}\nContent-Type: text/plain; charset="UTF-8"\n\n${body}\n`;
}

app.post('/api/process', upload.single('leadsFile'), async (req, res) => {
  let client;
  try {
    client = getClient();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  let leads;
  try {
    leads = await parseLeadsWorkbook(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: `Could not read the uploaded file as .xlsx: ${err.message}` });
  }

  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const emls = new Map();
  const results = [];

  try {
    for (const lead of leads) {
      if (lead.status !== 'new') continue;

      const scoring = await scoreLead(client, lead);
      if (scoring.result !== 'PASS') {
        results.push({
          id: lead.id, name: lead.name, title: lead.title, score: scoring.score,
          passed: false, rationale: scoring.rationale,
        });
        continue;
      }

      const profile = await researchLead(client, lead);
      const { subject, body } = await draftEmail(client, lead, profile);
      emls.set(lead.id, buildEml(lead, subject, body));
      results.push({
        id: lead.id, name: lead.name, title: lead.title, score: scoring.score,
        passed: true, subject,
      });
    }
  } catch (err) {
    return res.status(502).json({ error: `Pipeline failed: ${err.message}`, partialResults: results });
  }

  runs.set(runId, emls);
  res.json({ runId, results });
});

app.get('/api/download/:runId/:leadId', (req, res) => {
  const emls = runs.get(req.params.runId);
  const eml = emls && emls.get(req.params.leadId);
  if (!eml) return res.status(404).send('Not found — re-run the pipeline if the server restarted.');
  res.setHeader('Content-Type', 'message/rfc822');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.leadId}-email.eml"`);
  res.send(eml);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lead nurture UI running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY is not set — /api/process will fail until it is.');
  }
});
