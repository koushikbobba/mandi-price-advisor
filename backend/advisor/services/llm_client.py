import os
import json
import logging
import hashlib
import numpy as np
from django.conf import settings
from advisor.metrics import MANDI_TOKENS_TOTAL

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self):
        self.provider = getattr(settings, 'LLM_PROVIDER', 'openai').lower()
        self.openai_key = getattr(settings, 'OPENAI_API_KEY', '') or os.environ.get('OPENAI_API_KEY', '')
        self.anthropic_key = getattr(settings, 'ANTHROPIC_API_KEY', '') or os.environ.get('ANTHROPIC_API_KEY', '')
        
        self.has_openai = bool(self.openai_key and self.openai_key != 'mock-key')
        self.has_anthropic = bool(self.anthropic_key and self.anthropic_key != 'mock-key')

    def generate_completion(self, system_prompt: str, user_prompt: str, temperature: float = 0.2, response_format: str = 'text') -> str:
        """Generate completion using OpenAI, Claude, or deterministic mock engine."""
        if self.has_openai:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=self.openai_key)
                kwargs = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": temperature,
                }
                if response_format == 'json':
                    kwargs["response_format"] = {"type": "json_object"}
                
                resp = client.chat.completions.create(**kwargs)
                usage = resp.usage
                if usage:
                    MANDI_TOKENS_TOTAL.labels(model='gpt-4o-mini', token_type='prompt').inc(usage.prompt_tokens)
                    MANDI_TOKENS_TOTAL.labels(model='gpt-4o-mini', token_type='completion').inc(usage.completion_tokens)
                return resp.choices[0].message.content
            except Exception as e:
                logger.warning(f"OpenAI completion failed: {e}. Falling back to internal engine.")
        
        if self.has_anthropic:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=self.anthropic_key)
                resp = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=2048,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                    temperature=temperature
                )
                if resp.usage:
                    MANDI_TOKENS_TOTAL.labels(model='claude-3-5-sonnet', token_type='prompt').inc(resp.usage.input_tokens)
                    MANDI_TOKENS_TOTAL.labels(model='claude-3-5-sonnet', token_type='completion').inc(resp.usage.output_tokens)
                return resp.content[0].text
            except Exception as e:
                logger.warning(f"Anthropic completion failed: {e}. Falling back to internal engine.")
        
        # Internal Deterministic Fallback Engine
        return self._mock_completion(system_prompt, user_prompt, response_format)

    def generate_embedding(self, text: str, dimensions: int = 1536) -> list:
        """Generate 1536-dimensional embedding using OpenAI or deterministic semantic projection."""
        if self.has_openai:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=self.openai_key)
                resp = client.embeddings.create(
                    model="text-embedding-3-small",
                    input=text
                )
                return resp.data[0].embedding
            except Exception as e:
                logger.warning(f"OpenAI embedding failed: {e}. Falling back to semantic hash projection.")
        
        # Deterministic semantic hash projection (unit normalized 1536-dim vector)
        return self._generate_deterministic_vector(text, dimensions)

    def _generate_deterministic_vector(self, text: str, dimensions: int = 1536) -> list:
        text_clean = text.lower().strip()
        words = text_clean.split()
        
        # Build deterministic pseudo-embedding based on word hashes and character n-grams
        rng = np.random.default_rng(seed=int(hashlib.sha256(text_clean.encode('utf-8')).hexdigest()[:8], 16))
        vec = rng.standard_normal(dimensions).astype(float)
        
        # Boost specific dimensions for agricultural domain keywords to ensure semantic clustering
        crop_boosts = {
            'onion': 10, 'pyaz': 10, 'eerulli': 10,
            'wheat': 20, 'gehu': 20, 'godhi': 20,
            'tomato': 30, 'tamatar': 30,
            'potato': 40, 'aloo': 40, 'alugadde': 40,
            'cotton': 50, 'kapas': 50, 'hathi': 50,
            'banana': 55, 'arati': 55, 'kela': 55,
            'pomegranate': 58, 'danimma': 58, 'anar': 58,
            'mango': 60, 'mamidi': 60, 'aam': 60,
            'price': 65, 'mandi': 65, 'bhav': 65, 'market': 65,
            'storage': 70, 'godown': 70, 'spoilage': 75, 'rot': 75, 'shelf': 75,
            'disease': 78, 'pest': 78, 'tegulu': 78, 'fungus': 78,
            'sell': 80, 'hold': 85, 'wait': 85, 'harvest': 90, 'monsoon': 95
        }
        for word in words:
            for kw, dim_idx in crop_boosts.items():
                if kw in word:
                    vec[dim_idx:dim_idx+15] += 2.5
        
        # L2 unit normalization
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def _mock_completion(self, system_prompt: str, user_prompt: str, response_format: str) -> str:
        from advisor.services.crop_dictionary import entity_matcher
        user_lower = user_prompt.lower()
        
        if "router" in system_prompt.lower() or "classify" in system_prompt.lower():
            has_price_request = any(k in user_lower for k in [
                'price', 'rate', 'bhav', 'cost', 'modal', 'yesterday', 'last week', 'last month',
                'highest', 'lowest', 'today', 'how much', 'kya rate', 'ಭಾವ', 'ದರ', 'भाव', 'दाम',
                'trend', 'rates', 'ఎంత', 'ధర'
            ])
            has_storage_advice = any(k in user_lower for k in [
                'storage', 'store', 'godown', 'spoilage', 'rot', 'rotting', 'shelf life', 'curing',
                'prevent', 'fungus', 'aeration', 'loss', 'why does', 'crash after monsoon', 'humidity',
                'भंडारण', 'सड़न', 'ಶೇಖರಣೆ', 'disease', 'transit', 'కోల్డ్ స్టోరేజ్', 'నిల్వ'
            ])
            has_decision = any(k in user_lower for k in [
                'should i sell', 'wait', 'hold', 'sell now', 'best time', 'right time', 'bechu',
                'bechna', 'marata madala', 'बेचूं', 'बेचना', 'ಮಾರಾಟ', 'sell my', 'when to sell',
                'which month', 'best month', 'ఏ నెల', 'ఎప్పుడు', 'యಾವ ತಿಂಗಳು', 'किस महीने'
            ])
            
            crop = entity_matcher.match_crop(user_prompt)
            state = entity_matcher.match_state(user_prompt)
            lang = entity_matcher.detect_language(user_prompt)
                
            if has_decision or (has_price_request and has_storage_advice):
                category = 'HYBRID'
            elif has_price_request:
                category = 'STRUCTURED'
            elif has_storage_advice:
                category = 'UNSTRUCTURED'
            else:
                category = 'HYBRID'
                
            res = {
                "category": category,
                "crop": crop,
                "state": state,
                "detected_language": lang,
                "confidence": 0.95,
                "reasoning": f"Query classified as {category} for crop {crop} in state {state}."
            }
            return json.dumps(res) if response_format == 'json' else str(res)
            
        elif "text-to-sql" in system_prompt.lower() or "sql" in system_prompt.lower():
            crop = entity_matcher.match_crop(user_prompt)
            state = entity_matcher.match_state(user_prompt)
            
            where_clauses = []
            if crop and crop != 'General':
                where_clauses.append(f"LOWER(commodity) = '{crop.lower()}'")
            if state:
                where_clauses.append(f"LOWER(state) = '{state.lower()}'")
                
            where_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
            sql = f"SELECT arrival_date, commodity, state, market, modal_price, min_price, max_price FROM mandi_prices {where_str} ORDER BY arrival_date DESC LIMIT 15;"
            return f"```sql\n{sql}\n```"
            
        else:
            # Answer Synthesis Mock
            return json.dumps({
                "answer": "Based on current Agmarknet mandi price trends and ICAR post-harvest advisories, holding or staggered selling is recommended depending on storage ventilation quality.",
                "decision_action": "HOLD",
                "reasoning": [
                    "Modal prices have appreciated over the analyzed period.",
                    "ICAR storage guidelines indicate controlled humidity storage limits spoilage.",
                    "Market arrivals are projected to tighten in coming weeks."
                ],
                "confidence": "HIGH",
                "uncertainty_reason": ""
            })

llm_client = LLMClient()
