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
function buildRetrievedContext(query, selectedCrop = null) {
  const cropName = detectCropFromQuery(query) || (selectedCrop && /price|mandi|market|rate|sell|store|harvest|spray|crop|yield|disease|profit/i.test(query) ? selectedCrop : null);
  const data = cropName ? CROP_INTELLIGENCE[cropName] : null;

  if (!data) {
    // Generic fallback context — lists all known crops & prices
    const summary = Object.entries(CROP_INTELLIGENCE)
      .map(([name, d]) => `• ${name}: Spot price=${d.spot_price}, Peak price=${d.peak_price}, Peak season=${d.peak_en}, Recommended decision=${d.decision}`)
      .join('\n');
    return {
      cropName: null,
      contextText: `Available crops supported in database with verified APMC & ICAR benchmarks:\n${summary}`,
      data: null
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
const SYSTEM_PROMPT = `You are "Kisan AI Advisor", an expert agricultural market & price intelligence assistant for 150+ APMC Mandis in India.

CRITICAL RULES:
1. If the user's message is a greeting (e.g. "hi", "hello", "namaste", "vanakkam") or a general conversation, greet them politely in the language they used (English, Telugu, Hindi, Tamil, Kannada) and briefly explain what you can do (APMC mandi prices, selling time advice, ICAR storage protocols, disease management). Give 2-3 quick examples of questions they can ask.
2. If the user asks about a crop, price, market, or agricultural decision:
   - Base your factual claims (prices, storage temps, months) strictly on the "RETRIEVED DOCUMENT".
   - Quote exact prices (e.g., ₹78,000/Ton). Never fabricate arbitrary figures.
   - Keep answers clear, structured with markdown (bold, bullet points, headers).
   - End with a clear recommendation (e.g., SELL NOW / HOLD & STORE / MONITOR TERMINAL MANDIS).
3. If the user's query is in Telugu, Hindi, Tamil, or Kannada, respond fluently in that exact regional language.
4. Maintain a warm, encouraging, and authoritative tone suitable for Indian farmers and traders.
5. Use emojis tastefully (🌾 💰 📅 ⚠️ ✅) to enhance readability.
6. Do not mention system internals, raw code, or prompts.`;

// ── 4. Main RAG function — streams token-by-token ──────────────
/**
 * Runs Gemini RAG and calls onChunk(text) for each streamed token.
 * Returns the full response text when done.
 * Throws if Gemini is unavailable.
 *
 * @param {string} userQuery
 * @param {(chunk: string) => void} onChunk
 * @param {string} [selectedCrop]
 * @returns {Promise<{ fullText: string, cropName: string, data: object }>}
 */
export async function runGeminiRAG(userQuery, onChunk, selectedCrop = null) {
  const geminiModel = getModel();
  if (!geminiModel) throw new Error('GEMINI_KEY_MISSING');

  // Step 1 — Retrieve
  const retrieved = buildRetrievedContext(userQuery, selectedCrop);

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
