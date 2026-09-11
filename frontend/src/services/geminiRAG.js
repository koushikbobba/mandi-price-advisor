// ============================================================
//  Mandi Price Advisor — Gemini-Powered RAG Engine
//  Flow: User Query → Retrieve crop context → Gemini Flash → Stream response
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { detectCropFromQuery, CROP_INTELLIGENCE } from './advisorEngine';

// ── 1. Initialise client (key from Vite env) ──────────────────
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;
let model = null;

function getModel() {
  if (!API_KEY) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.4,       // focused, factual
        topP: 0.9,
        maxOutputTokens: 600,   // concise but complete
      },
    });
  }
  return model;
}

export function isGeminiAvailable() {
  return Boolean(API_KEY);
}

// ── 2. Build rich retrieval context from CROP_INTELLIGENCE ─────
function buildRetrievedContext(query) {
  const cropName = detectCropFromQuery(query);
  const data = CROP_INTELLIGENCE[cropName];

  if (!data) {
    // Generic fallback context — lists all known crops & prices
    const summary = Object.entries(CROP_INTELLIGENCE)
      .map(([name, d]) => `${name}: spot=${d.spot_price}, peak=${d.peak_price}, decision=${d.decision}`)
      .join('\n');
    return {
      cropName: 'General',
      contextText: `Available crops with current market data:\n${summary}`,
    };
  }

  // Format mandi records as a readable table
  const mandiTable = (data.mandi_records || [])
    .map(r => `  • ${r.market} (${r.state}): ₹${r.modal_price.toLocaleString('en-IN')}/Qtl on ${r.arrival_date}`)
    .join('\n');

  const contextText = `
=== RETRIEVED DOCUMENT: ${cropName} Market Intelligence ===

CROP: ${cropName}
CURRENT SPOT PRICE: ${data.spot_price}
PEAK SEASON PRICE: ${data.peak_price}
SELL DECISION: ${data.decision} (Expected gain: ${data.gain_pct})
PEAK SEASON: ${data.peak_en}

COLD STORAGE PROTOCOL:
  Temperature: ${data.opt_temp}
  Humidity: ${data.opt_humidity}
  Max Shelf Life: ${data.max_shelf_life}

DISEASE ALERT:
  ${data.disease_alert}

ICAR INSTITUTE: ${data.icar_institute}
ICAR RECOMMENDED PROTOCOL: ${data.icar_protocol}

LIVE APMC MANDI RECORDS (latest 5):
${mandiTable}

KEY EXPERT ADVISORY POINTS:
1. ${data.points_en[0] || ''}
2. ${data.points_en[1] || ''}
3. ${data.points_en[2] || ''}
`.trim();

  return { cropName, contextText, data };
}

// ── 3. System prompt that grounds Gemini strictly to retrieved data ─
const SYSTEM_PROMPT = `You are an expert Indian agricultural market advisor integrated into the "Mandi Price Advisor" platform.

CRITICAL RULES:
1. Answer ONLY using the information in the "RETRIEVED DOCUMENT" provided. Do NOT invent prices, dates or schemes.
2. Always quote exact prices from the document (e.g., ₹78,000/Ton). Never round them differently.
3. Keep your answer under 200 words — farmers need crisp, actionable advice.
4. Always end with one clear action: SELL NOW / HOLD & STORE / WAIT FOR FESTIVAL SEASON.
5. If the query is in Telugu/Hindi/Tamil/Kannada, respond in that same language.
6. Include relevant emojis sparingly (✅ ⚠️ 📅 💰 🌾) to improve readability.
7. Never mention "Gemini", "AI", "language model" or any technical details.
8. Structure your response:
   - 🎯 Decision (1 sentence)
   - 💰 Price snapshot (spot vs peak)
   - 📅 Best selling window
   - 💡 Top 2 action tips
   - ⚠️ Risk alert (if applicable)`;

// ── 4. Main RAG function — streams token-by-token ──────────────
/**
 * Runs Gemini RAG and calls onChunk(text) for each streamed token.
 * Returns the full response text when done.
 * Throws if Gemini is unavailable.
 *
 * @param {string} userQuery
 * @param {{ cropName, contextText, data }} retrieved
 * @param {(chunk: string) => void} onChunk
 * @returns {Promise<{ fullText: string, cropName: string, data: object }>}
 */
export async function runGeminiRAG(userQuery, onChunk) {
  const geminiModel = getModel();
  if (!geminiModel) throw new Error('GEMINI_KEY_MISSING');

  // Step 1 — Retrieve
  const retrieved = buildRetrievedContext(userQuery);

  // Step 2 — Augment: build the full prompt
  const fullPrompt = `${SYSTEM_PROMPT}

--- RETRIEVED KNOWLEDGE BASE DOCUMENT ---
${retrieved.contextText}
--- END OF RETRIEVED DOCUMENT ---

FARMER'S QUERY: "${userQuery}"

Provide your advisory response:`;

  // Step 3 — Generate (streaming)
  const result = await geminiModel.generateContentStream(fullPrompt);

  let fullText = '';
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    if (chunkText) {
      fullText += chunkText;
      onChunk(chunkText);
    }
  }

  return {
    fullText,
    cropName: retrieved.cropName,
    data: retrieved.data,
  };
}
