import json
import logging
from advisor.services.llm_client import llm_client
from advisor.services.crop_dictionary import entity_matcher

logger = logging.getLogger(__name__)

ROUTER_SYSTEM_PROMPT = """
You are an intelligent Agricultural Query Classifier for the 'Mandi Price Advisor' system.
Classify each incoming user question into one of three routing categories:

1. STRUCTURED:
   - Needs only SQL tabular data from the `mandi_prices` database.
   - Examples: "What was the price of wheat in Karnataka last week?", "Give me highest price of onion in Lasalgaon yesterday", "Modal price trend for potato in UP".

2. UNSTRUCTURED:
   - Needs only agronomic advisory, scientific literature, storage, pest control, or post-harvest guides.
   - Examples: "Why does onion price crash after monsoon?", "How to store potatoes to avoid sprouting?", "What causes tomato fruit rot in transit?".

3. HYBRID:
   - Requires BOTH structured price trend analytics AND agronomic guidance/spoilage context to make an informed recommendation or decision.
   - Examples: "Should I sell my wheat now or wait 3 weeks?", "Is it profitable to store onions in Maharashtra right now?", "Tomato prices are falling in Bengaluru, should I harvest immediately?".

Output a valid JSON object ONLY with the following schema:
{
  "category": "STRUCTURED" | "UNSTRUCTURED" | "HYBRID",
  "crop": "<Identified Crop Name or 'General'>",
  "state": "<State name if mentioned or null>",
  "market": "<Market/Mandi name if mentioned or null>",
  "detected_language": "en" | "hi" | "kn" | "<iso_code>",
  "confidence": 0.0 - 1.0,
  "reasoning": "<Short rationale for classification>"
}
"""

class QueryRouter:
    def classify(self, user_query: str) -> dict:
        """Routes query into STRUCTURED, UNSTRUCTURED, or HYBRID with entity recognition."""
        # 1. Deterministic phonetic / multilingual matching first
        matched_crop = entity_matcher.match_crop(user_query)
        matched_state = entity_matcher.match_state(user_query)
        matched_lang = entity_matcher.detect_language(user_query)

        try:
            resp_str = llm_client.generate_completion(
                ROUTER_SYSTEM_PROMPT,
                f"User Question: {user_query}",
                temperature=0.0,
                response_format='json'
            )
            data = json.loads(resp_str)
            
            category = data.get('category', 'HYBRID').upper()
            if category not in ['STRUCTURED', 'UNSTRUCTURED', 'HYBRID']:
                category = 'HYBRID'
                
            crop = data.get('crop')
            if not crop or crop == 'General':
                crop = matched_crop
                
            state = data.get('state') or matched_state
            lang = data.get('detected_language') or matched_lang
            if matched_lang in ['hi', 'kn', 'ta', 'te']:
                lang = matched_lang
                
            return {
                "category": category,
                "crop": crop,
                "state": state,
                "market": data.get('market'),
                "detected_language": lang,
                "confidence": data.get('confidence', 0.95),
                "reasoning": data.get('reasoning', f"Query routed to {category} with crop {crop}.")
            }
        except Exception as e:
            logger.warning(f"Router classification error: {e}. Using deterministic matcher.")
            q_lower = user_query.lower()
            has_price = any(w in q_lower for w in ['price', 'rate', 'bhav', 'modal', 'cost', 'rs', 'rupee', 'ದರ', 'भाव'])
            has_storage = any(w in q_lower for w in ['store', 'storage', 'wait', 'hold', 'sell', 'rot', 'spoil', 'why', 'best time', 'marata', 'bechu'])
            
            if has_price and not has_storage:
                cat = 'STRUCTURED'
            elif has_storage and not has_price:
                cat = 'UNSTRUCTURED'
            else:
                cat = 'HYBRID'
                
            return {
                "category": cat,
                "crop": matched_crop,
                "state": matched_state,
                "market": None,
                "detected_language": matched_lang,
                "confidence": 0.92,
                "reasoning": f"Heuristic & entity dictionary routing as {cat} for {matched_crop}."
            }

query_router = QueryRouter()
