<div align="center">
  <img src="public/banner.png" alt="Tutor System Architecture Banner" width="100%" />
</div>

# Tutor System Architecture

Tutor is an AI-powered learning interface for reading PDFs, asking a tutor questions, building a persistent learning library, and reviewing knowledge over time. The app combines a document reader, streaming chat, voice tutoring, live search, learner modeling, a 3D brain map, revision flashcards, analytics, admin tracing, and the `/brain` architecture cognition system.

## Core Surfaces

- **Study View:** PDF upload, document reading, annotation, usage analytics, and chat.
- **Chat Panel:** Streaming SSE tutor responses, web search, PDF page vision, graph updates, flashcard generation, markdown, Mermaid, code blocks, TTS, and voice.
- **Brain View:** A Three.js 3D graph of the learner, learning books, and extracted concepts.
- **Revision View:** A paper-style library with the built-in Tutor System Architecture book, generated learning books, mapped concepts, notes, and flashcards.
- **Analytics View:** Dexie-backed concept, interaction, and session charts.
- **Admin View:** DeepSeek trace cards, learning book inspection, and live server console logs.

## Design System

The main product uses the **Cosmic Obsidian** theme: `#030303` and `#0A0A0B` backgrounds, neon violet/blue/orange accents, glass panels, motion transitions, and liquid UI details. Revision and Admin intentionally switch to a `#faf9f6` paper reading style so memory review feels like a notebook instead of a control panel.

## Getting Started

### Prerequisites

You need Node.js installed on your system. 

This project follows a **Bring Your Own Key (BYOK)** model. You will need API keys for the following services to run all features:
1. **LLM Key:** OpenRouter API Key (for the tutor intelligence)
2. **Voice Key:** Deepgram API Key (for Voice-to-Text and Text-to-Speech)
3. **Web Search Key:** Web Search API Key (for real-time web search capabilities)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MohamedFuad16/Tutor-System-Architecture-.git
   cd Tutor-System-Architecture-
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Setup:
   Create a `.env` file in the root of the project and add your API keys:
   ```env
   OPENROUTER_API_KEY=your_openrouter_key_here
   DEEPGRAM_API_KEY=your_deepgram_key_here
   WEB_SEARCH_API_KEY=your_web_search_key_here
   ```
   *(Note: You can also configure the OpenRouter API key directly in the app's settings UI).*

4. Run the development servers:
   You will need to run the frontend and backend concurrently. In your terminal, start the app:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to the local URL provided in your terminal (usually `http://localhost:5173` or similar) to start learning!