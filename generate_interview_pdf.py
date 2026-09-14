import sys
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "Mandi Price Advisor India — Comprehensive Technical & Architectural Interview Guide")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)

        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "Confidential & Proprietary — Candidate Interview Defense Guide")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 46, 558, 46)
        self.restoreState()

def generate_interview_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    PRIMARY = colors.HexColor("#0f766e")     # Deep Teal
    DARK_TEXT = colors.HexColor("#0f172a")   # Slate 900
    MUTED_TEXT = colors.HexColor("#475569")  # Slate 600
    ACCENT_Q = colors.HexColor("#047857")    # Emerald Green for Question
    ACCENT_XQ = colors.HexColor("#b91c1c")   # Dark Red for Cross Question
    BOX_BG = colors.HexColor("#f8fafc")      # Soft slate bg
    BORDER_COLOR = colors.HexColor("#e2e8f0")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=MUTED_TEXT,
        spaceAfter=15
    )

    cat_header_style = ParagraphStyle(
        'CatHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.white,
        spaceBefore=0,
        spaceAfter=0
    )

    q_title_style = ParagraphStyle(
        'QuestionTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=ACCENT_Q,
        spaceBefore=8,
        spaceAfter=4
    )

    ans_style = ParagraphStyle(
        'AnswerText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=DARK_TEXT,
        spaceAfter=6
    )

    cross_q_style = ParagraphStyle(
        'CrossQTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=ACCENT_XQ,
        spaceBefore=4,
        spaceAfter=2
    )

    cross_ans_style = ParagraphStyle(
        'CrossAnsText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=4
    )

    story = []

    # Title Header Block
    story.append(Paragraph("🌾 Mandi Price Advisor India", title_style))
    story.append(Paragraph("<b>Complete Interview Preparation, Technical Q&A & Cross-Examination Defense Guide</b><br/>"
                           "<i>Covers System Architecture, RAG Pipeline, Generative AI (Gemini), Frontend Engineering, and Domain Modeling</i>", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=0, spaceAfter=14))

    def make_section_banner(title_text):
        p = Paragraph(f"<b>{title_text.upper()}</b>", cat_header_style)
        t = Table([[p]], colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), PRIMARY),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('CORNERPAD', (0, 0), (-1, -1), 4),
        ]))
        return t

    def make_qa_block(q_num, question, answer, cross_questions):
        content = []
        content.append(Paragraph(f"<b>Q{q_num}: {question}</b>", q_title_style))
        content.append(Paragraph(f"<b>Candidate Answer:</b> {answer}", ans_style))
        
        if cross_questions:
            for xq, xans in cross_questions:
                content.append(Spacer(1, 4))
                content.append(Paragraph(f"<b>⚡ Follow-up / Cross-Question:</b> <i>{xq}</i>", cross_q_style))
                content.append(Paragraph(f"<b>🎯 How to Defend / Answer:</b> {xans}", cross_ans_style))
        
        box_table = Table([[content]], colWidths=[504])
        box_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BOX_BG),
            ('BOX', (0, 0), (-1, -1), 0.75, BORDER_COLOR),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        return box_table

    # ==========================================
    # SECTION 1: PROJECT OVERVIEW & VALUE PROPOSITION
    # ==========================================
    story.append(make_section_banner("1. Project Overview & Core Value Proposition"))
    story.append(Spacer(1, 8))

    q1_cross = [
        ("Why not just show price graphs? Why is an AI advisory necessary?",
         "Raw charts show what happened in the past, but farmers lack financial literacy to calculate net holding profit vs. cold storage decay rates. The AI advisor synthesizes price trends, ICAR storage costs, and festival demand windows into one actionable decision: SELL NOW or HOLD."),
        ("Who is the primary user, and how will they access it in rural areas?",
         "Target users are farmers, traders, and FPOs. It is built as a lightweight mobile-responsive web app with full voice input and text-to-speech in 5 regional languages (Telugu, Hindi, Tamil, Kannada, English), removing literacy barriers.")
    ]
    story.append(make_qa_block(
        1,
        "What is the high-level objective and core problem solved by Mandi Price Advisor?",
        "Mandi Price Advisor is a national agricultural price intelligence platform designed to eliminate distress selling during harvest supply gluts. Instead of merely listing spot prices, it calculates optimal post-harvest selling windows and spatial price arbitrage, advising farmers whether holding their produce in cold storage will yield a net positive ROI during upcoming festival surge months.",
        q1_cross
    ))
    story.append(Spacer(1, 10))

    q2_cross = [
        ("Agmarknet already publishes daily modal prices. How is your project different?",
         "Agmarknet is a static tabular repository with zero decision support. Mandi Price Advisor contextualizes Agmarknet records by linking them with ICAR post-harvest protocols (storage temperature, RH, shelf-life) and forecasting terminal market arbitrage premiums (e.g. Solapur to Azadpur Delhi)."),
        ("How do you prevent price manipulation by local middlemen?",
         "By displaying inter-mandi price transparency and terminal market differentials, farmers can bypass local cartel pricing or negotiate with FPOs for aggregated transport to higher-paying consumer mandis.")
    ]
    story.append(make_qa_block(
        2,
        "How does this platform improve upon government portals like Agmarknet or e-NAM?",
        "While government portals act as raw data registries, they require manual data extraction and lack decision intelligence. Mandi Price Advisor provides an end-to-end intelligent decision pipeline: it cleans and normalizes multi-state APMC records, applies ICAR scientific preservation rules, and provides conversational AI guidance with exact financial projections.",
        q2_cross
    ))
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 2: RAG ARCHITECTURE & GENERATIVE AI
    # ==========================================
    story.append(make_section_banner("2. RAG Architecture & Generative AI Deep-Dive"))
    story.append(Spacer(1, 8))

    q3_cross = [
        ("Why RAG instead of fine-tuning an LLM on agriculture data?",
         "Fine-tuning is static and expensive; it bakes knowledge into model weights, meaning daily fluctuating APMC mandi prices would become stale immediately. RAG separates the dynamic knowledge store (APMC prices & ICAR guidelines) from the reasoning engine (Gemini), enabling zero-cost updates and eliminating price hallucinations."),
        ("Why did you choose Google Gemini 1.5 Flash over OpenAI GPT-4?",
         "Gemini 1.5 Flash offers sub-second inference latency, a generous free tier for high-throughput queries, native multi-token streaming in the browser via @google/generative-ai, and superior native multilingual understanding of Indian languages like Telugu and Tamil.")
    ]
    story.append(make_qa_block(
        3,
        "Why did you choose a RAG (Retrieval-Augmented Generation) architecture for this project?",
        "Agricultural markets change daily. A fine-tuned LLM hallucinated prices and outdated storage guidelines. RAG allows us to extract current APMC spot prices and ICAR cold storage scientific parameters at query time and augment the LLM system prompt. This guarantees 100% factual grounding with verifiable source citations.",
        q3_cross
    ))
    story.append(Spacer(1, 10))

    q4_cross = [
        ("Why did you avoid LangChain or LlamaIndex in your implementation?",
         "LangChain introduces heavy package bloat (~40MB+ dependencies), unnecessary abstraction layers, and added latency. By implementing a direct RAG pipeline with native SDKs, we achieved sub-50ms context retrieval, full control over prompt engineering, and deterministic error fallback handlers."),
        ("How does the token-by-token streaming work in your frontend?",
         "We utilize Gemini's generateContentStream() async generator. Each incoming chunk updates a React streaming state variable rendered inside a Markdown component, providing real-time ChatGPT-like word-by-word typing feedback to the farmer.")
    ]
    story.append(make_qa_block(
        4,
        "Explain the step-by-step lifecycle of a user query through your RAG pipeline.",
        "1. Query Ingestion & Language Detection: The query is parsed to detect intent, crop name, language (Unicode regex for Telugu/Hindi/Tamil/Kannada), and mandi location.<br/>"
        "2. Knowledge Retrieval: The engine retrieves corresponding APMC modal price records, peak demand timing, optimal cold storage temperatures, and disease alerts.<br/>"
        "3. Context Augmentation: The retrieved data is injected into a strict grounding prompt with hard constraints against hallucination.<br/>"
        "4. Stream Generation: Gemini 1.5 Flash streams the grounded advice directly to the frontend, complete with bold highlights and action points.",
        q4_cross
    ))
    story.append(Spacer(1, 10))

    q5_cross = [
        ("How do you guarantee that Gemini will not invent a fake price?",
         "The system prompt enforces strict grounding rules: 'Answer ONLY using the provided RETRIEVED DOCUMENT. Quote exact prices verbatim. Do NOT invent prices or schemes.' If the model deviates, the UI displays the raw APMC SQL table alongside the text so the farmer can cross-verify instantly."),
        ("What happens when a user types a non-crop query like 'Hi' or 'Who made you'?",
         "We implemented an intent router. For greetings or generic inquiries, the retrieval step bypasses crop extraction and responds with a polite introduction and sample prompts in the user's detected language without forcing an unprompted harvest card.")
    ]
    story.append(make_qa_block(
        5,
        "How do you handle LLM Hallucinations and Edge-Case Inputs (e.g. 'HI')?",
        "Hallucination is prevented by strict grounding constraints in the system prompt combined with verbatim price extraction from our structured APMC matrix. For conversational edge-cases like 'HI', intent classification routes the query to a conversational welcome handler rather than executing an arbitrary crop retrieval.",
        q5_cross
    ))
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 3: FRONTEND & SYSTEM DESIGN
    # ==========================================
    story.append(make_section_banner("3. Frontend Architecture, UI/UX & Resilient Engineering"))
    story.append(Spacer(1, 8))

    q6_cross = [
        ("Why did you switch from a dark dashboard layout to a white ChatGPT-style interface?",
         "Agricultural users found high-density dark mode dashboards overwhelming and cluttered. The clean white layout with top-aligned avatars, clear typography, and a collapsible sidebar mirrors intuitive modern messaging apps (WhatsApp/ChatGPT), reducing cognitive load."),
        ("How do you handle offline mode or API key exhaustion?",
         "We implemented a 3-tier resilient fallback: Tier 1 (Real Gemini Flash RAG), Tier 2 (Backend REST endpoint), Tier 3 (Client-side pre-indexed APMC & ICAR matrix). If Gemini is unavailable, Tier 3 seamlessly generates structured advisories without throwing blank screens.")
    ]
    story.append(make_qa_block(
        6,
        "How is the frontend structured, and how do you ensure zero-downtime reliability?",
        "The frontend is built with React 18, Vite, and Tailwind CSS. It features a responsive split-view architecture: a left sidebar for crop and mandi selection, and a right chat panel with ReactMarkdown rendering. It implements multi-tier fallback architecture ensuring 100% uptime even when deployed statically without an active backend server.",
        q6_cross
    ))
    story.append(Spacer(1, 10))

    q7_cross = [
        ("Which charting library was used, and what chart types are supported?",
         "We used Recharts to build 5 analytical modes: 1. YoY Multi-Year Lines, 2. 12-Month Seasonal Surge Curves, 3. Annual Growth Bars, 4. Daily Series Area Charts, and 5. Inter-Mandi Arbitrage Horizontal Bar Comparisons."),
        ("How is crop state synchronized across different tabs?",
         "App.jsx serves as the centralized state coordinator. Selecting a crop in the AI Advisor automatically propagates to the Price Explorer ROI simulator and Mandi Directory via shared handlers.")
    ]
    story.append(make_qa_block(
        7,
        "Explain the data visualization and state synchronization mechanisms across the app.",
        "Interactive analytics are powered by Recharts with dynamic memoization (useMemo) for high rendering performance. State management is coordinated at the root level, enabling seamless deep-linking: clicking an APMC mandi in the directory or ticker instantly primes the AI Advisor with contextual queries.",
        q7_cross
    ))
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 4: DOMAIN MODELING & AGRICULTURAL LOGIC
    # ==========================================
    story.append(make_section_banner("4. Domain Modeling & Agricultural Decision Logic"))
    story.append(Spacer(1, 8))

    q8_cross = [
        ("What exact mathematical formula determines the HOLD recommendation?",
         "Net Gain = (Projected Peak Price - Current Spot Price) - [Cold Storage Rent (₹/Ton/Month) * Storage Duration + Estimated Weight Loss Spoilage (2-4%) + Cost of Capital / Interest on Crop Loan]. If Net Gain > 15%, the system triggers a HOLD recommendation."),
        ("Where do the cold storage temperature and humidity figures come from?",
         "All post-harvest parameters are sourced from published ICAR protocols: e.g., Pomegranate (5.0°C, 90-95% RH, max 75 days shelf life), Banana (13.5°C, 90-95% RH, max 60 days to prevent chilling injury).")
    ]
    story.append(make_qa_block(
        8,
        "How does the system calculate the SELL vs. HOLD decision and price arbitrage?",
        "The decision engine evaluates the historical seasonal price surge percentage against cold storage holding costs and physiological weight loss. Spatial arbitrage calculates price differentials between primary production mandis (e.g. Solapur, Guntur) and high-demand terminal consumption hubs (e.g. Azadpur Delhi, Kolkata), factoring in average transit costs.",
        q8_cross
    ))
    story.append(Spacer(1, 10))

    q9_cross = [
        ("How does the app support farmers who cannot read or write?",
         "We integrated the Web Speech API: SpeechRecognition allows farmers to speak their query in their mother tongue, while SpeechSynthesis speaks the answer back in Telugu, Hindi, Tamil, Kannada, or English."),
        ("How do you handle regional crop names and colloquial spelling variations?",
         "The detector uses multilingual fuzzy regex matching: e.g., Pomegranate matches 'danimma' (Telugu), 'anar' (Hindi), 'madhulai' (Tamil), 'dalimbe' (Kannada), and common misspellings like 'pomgranate'.")
    ]
    story.append(make_qa_block(
        9,
        "How does the platform cater to regional languages and voice accessibility?",
        "The system incorporates automated Unicode script detection and fuzzy multilingual dictionaries across 10 major crops. Integrated Web Speech APIs provide two-way voice interaction (voice search input + audio advisory narration) in 5 regional languages.",
        q9_cross
    ))
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 5: TOUGH INTERVIEW DEFENSE & SCALABILITY
    # ==========================================
    story.append(make_section_banner("5. Tough Technical Questions, Security & Scalability Defense"))
    story.append(Spacer(1, 8))

    q10_cross = [
        ("In production, how would you prevent exposing your Gemini API key in client-side code?",
         "For production enterprise deployment, the frontend routes requests through our Django REST backend endpoint (/api/query/). The backend securely stores the API key in environment secrets, implements Redis token rate-limiting, and uses JWT authentication for authorized users."),
        ("How would you scale this to support real-time data from 5,000+ mandis?",
         "We would deploy Celery distributed task workers with Redis queues to ingest daily Agmarknet XML/JSON feeds into a PostgreSQL database with pgvector indexing. Static historical trends would be cached on Cloudflare Edge CDNs to achieve sub-10ms response times.")
    ]
    story.append(make_qa_block(
        10,
        "What are the security, scalability, and production deployment considerations for this system?",
        "1. Security: API key proxying via backend middleware with CORS protection and rate-limiting.<br/>"
        "2. Scalability: Distributed Celery ingestion workers, PostgreSQL + pgvector for semantic search, and Redis caching for hot APMC price records.<br/>"
        "3. High Availability: Multi-region edge deployment on Vercel/Cloudflare with static caching layers ensuring uninterrupted advisory generation.",
        q10_cross
    ))
    story.append(Spacer(1, 14))

    # Final summary box
    summary_p = Paragraph(
        "<b>🎓 Interview Tip Summary:</b> When presenting this project, emphasize that this is not just an API wrapper. "
        "Highlight the <b>RAG architecture</b>, <b>hallucination prevention</b>, <b>resilient multi-tier fallback engineering</b>, "
        "<b>multilingual intent classification</b>, and the <b>real-world economic impact on Indian farmers</b>.",
        ans_style
    )
    summary_box = Table([[summary_p]], colWidths=[504])
    summary_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ecfdf5")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#10b981")),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_box)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at: {output_path}")

if __name__ == '__main__':
    out_file = os.path.join(os.getcwd(), 'Mandi_Price_Advisor_Interview_Prep.pdf')
    generate_interview_pdf(out_file)
