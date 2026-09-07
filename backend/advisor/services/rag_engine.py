import time
import logging
import numpy as np
from django.conf import settings
from django.db import connection
from advisor.models import AdvisoryChunk, AdvisoryDocument
from advisor.services.llm_client import llm_client
from advisor.metrics import MANDI_RAG_LATENCY

logger = logging.getLogger(__name__)

class RAGEngine:
    def __init__(self):
        self.similarity_threshold = 0.40

    def retrieve(self, query: str, crop: str = None, top_k: int = 4) -> dict:
        """Embeds query and searches top-k advisory chunks using pgvector cosine distance or numpy fallback."""
        start_time = time.time()
        query_vector = llm_client.generate_embedding(query)
        
        chunks_data = []
        is_pgvector = hasattr(AdvisoryChunk, 'embedding') and getattr(settings, 'DB_ENGINE', '') != 'sqlite'
        
        try:
            if is_pgvector:
                crop_filter_sql = "AND LOWER(c.crop) = LOWER(%s)" if crop and crop.lower() != 'general' else ""
                sql = f"""
                    SELECT c.id, c.crop, c.topic, c.chunk_index, c.content, c.metadata,
                           d.title, d.source, d.category, d.publication_date,
                           1 - (c.embedding <=> %s::vector) AS similarity
                    FROM advisory_chunks c
                    JOIN advisory_documents d ON c.document_id = d.id
                    WHERE c.embedding IS NOT NULL {crop_filter_sql}
                    ORDER BY c.embedding <=> %s::vector ASC
                    LIMIT %s;
                """
                params = [query_vector]
                if crop and crop.lower() != 'general':
                    params.append(crop)
                params.extend([query_vector, top_k])
                
                with connection.cursor() as cursor:
                    cursor.execute(sql, params)
                    rows = cursor.fetchall()
                    
                for row in rows:
                    sim = float(row[10]) if row[10] is not None else 0.0
                    chunks_data.append({
                        "id": row[0],
                        "crop": row[1],
                        "topic": row[2],
                        "chunk_index": row[3],
                        "content": row[4],
                        "metadata": row[5] or {},
                        "doc_title": row[6],
                        "doc_source": row[7],
                        "doc_category": row[8],
                        "publication_date": row[9].isoformat() if row[9] else None,
                        "similarity_score": round(sim, 4)
                    })
            else:
                qs = AdvisoryChunk.objects.select_related('document').all()
                if crop and crop.lower() != 'general':
                    crop_qs = qs.filter(crop__iexact=crop)
                    if crop_qs.exists():
                        qs = crop_qs
                        
                q_vec = np.array(query_vector, dtype=float)
                q_norm = np.linalg.norm(q_vec)
                
                scored_chunks = []
                for chunk in qs:
                    c_vec = np.array(chunk.get_embedding(), dtype=float)
                    if len(c_vec) == 0:
                        continue
                    c_norm = np.linalg.norm(c_vec)
                    if q_norm > 0 and c_norm > 0:
                        score = float(np.dot(q_vec, c_vec) / (q_norm * c_norm))
                    else:
                        score = 0.0
                        
                    crop_lower = crop.lower() if crop else ""
                    if crop_lower and crop_lower in chunk.content.lower():
                        score += 0.25
                        
                    scored_chunks.append((score, chunk))
                    
                scored_chunks.sort(key=lambda x: x[0], reverse=True)
                top_chunks = scored_chunks[:top_k]
                
                for sim, chunk in top_chunks:
                    chunks_data.append({
                        "id": chunk.id,
                        "crop": chunk.crop,
                        "topic": chunk.topic,
                        "chunk_index": chunk.chunk_index,
                        "content": chunk.content,
                        "metadata": chunk.metadata,
                        "doc_title": chunk.document.title,
                        "doc_source": chunk.document.source,
                        "doc_category": chunk.document.category,
                        "publication_date": chunk.document.publication_date.isoformat() if chunk.document.publication_date else None,
                        "similarity_score": round(sim, 4)
                    })
                    
        except Exception as e:
            logger.error(f"RAG retrieval failed: {e}")
            
        elapsed = time.time() - start_time
        MANDI_RAG_LATENCY.observe(elapsed)
        
        citations = []
        for c in chunks_data:
            citations.append({
                "title": c["doc_title"],
                "source": c["doc_source"],
                "category": c["doc_category"],
                "crop": c["crop"],
                "topic": c["topic"],
                "relevance_score": c["similarity_score"]
            })
            
        return {
            "query": query,
            "crop": crop,
            "chunks": chunks_data,
            "citations": citations,
            "count": len(chunks_data),
            "retrieval_time_sec": round(elapsed, 4)
        }

rag_engine = RAGEngine()
