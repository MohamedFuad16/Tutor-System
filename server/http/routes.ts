/**
 * REST + SSE API. Thin handlers: validate input, call a service or
 * repository, shape the response. All business logic lives in services/.
 */
import express, { Router } from "express";
import multer from "multer";
import type { ChatRequest, HealthInfo, ReviewGrade } from "../../shared/types.js";
import type { AppContext } from "../context.js";
import { toSpeakableText } from "../../shared/speech.js";
import { openSse } from "../lib/sse.js";
import { metrics } from "../lib/metrics.js";
import { HttpError, identity, rateLimit, requireString, route } from "./middleware.js";

const VERSION = "2.0.0";

export function createApiRouter(ctx: AppContext) {
  const { config, store } = ctx;
  const api = Router();
  api.use(express.json({ limit: "1mb" }));

  // ------------------------------------------------------------ public
  api.get("/health", (_req, res) => {
    const health: HealthInfo = {
      ok: true,
      version: VERSION,
      llm: {
        provider: ctx.llm.name,
        fastModel: ctx.llm.modelFor("fast"),
        smartModel: ctx.llm.modelFor("smart"),
        visionModel: ctx.llm.modelFor("vision"),
      },
      speech: {
        stt: Boolean(ctx.speech?.available),
        tts: Boolean(ctx.speech?.available),
        provider: ctx.speech?.name ?? "browser",
      },
      search: { web: true, images: true, provider: `${ctx.search.providers.web}+${ctx.search.providers.images}` },
    };
    res.json(health);
  });

  // Everything below needs a learner identity (the site is public: no access code).
  api.use(identity());
  const limited = rateLimit(config.limits.userRequestsPerMinute);

  api.get("/system", (_req, res) => {
    res.json({
      llm: ctx.llm.stats(),
      metrics: metrics.snapshot(),
      voiceSessions: ctx.voice.activeSessions,
      eventStreams: ctx.events.connections,
    });
  });

  api.post("/profile", (req, res) => {
    res.json(store.library.ensureUser(req.userId, typeof req.body?.name === "string" ? req.body.name : undefined));
  });

  // Push channel for background updates (guide sync, ingestion).
  api.get("/events", (req, res) => {
    const sse = openSse(res, { heartbeatMs: 20_000 });
    const unsubscribe = ctx.events.subscribe(req.userId, (event) => sse.send(event.type, event));
    sse.signal.addEventListener("abort", unsubscribe, { once: true });
  });

  // ------------------------------------------------------------ books
  api.get("/books", (req, res) => {
    store.library.ensureUser(req.userId, req.learnerName);
    res.json(store.library.listBooks(req.userId));
  });

  api.post("/books", (req, res) => {
    store.library.ensureUser(req.userId, req.learnerName);
    res
      .status(201)
      .json(
        store.library.createBook(req.userId, typeof req.body?.title === "string" ? req.body.title : "New notebook"),
      );
  });

  api.patch("/books/:id", (req, res) => {
    const book = store.library.renameBook(req.userId, req.params.id, requireString(req.body?.title, "title", 120));
    if (!book) throw new HttpError(404, "Notebook not found");
    res.json(book);
  });

  api.delete(
    "/books/:id",
    route(async (req, res) => {
      const documents = store.library.listDocuments(req.userId, req.params.id);
      if (!store.library.deleteBook(req.userId, req.params.id)) throw new HttpError(404, "Notebook not found");
      await Promise.all(documents.map((doc) => store.files.remove(req.userId, doc.id)));
      res.status(204).end();
    }),
  );

  const bookOr404 = (userId: string, bookId: string) => {
    const book = store.library.getBook(userId, bookId);
    if (!book) throw new HttpError(404, "Notebook not found");
    return book;
  };

  // ------------------------------------------------------------ documents
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.limits.uploadMaxMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const isPdf = /\.pdf$/i.test(file.originalname) || file.mimetype === "application/pdf";
      if (!isPdf) return cb(new HttpError(400, "Only PDF files are supported"));
      cb(null, true);
    },
  });

  api.get("/books/:id/documents", (req, res) => {
    bookOr404(req.userId, req.params.id);
    res.json(store.library.listDocuments(req.userId, req.params.id));
  });

  api.post(
    "/books/:id/documents",
    (req, res, next) =>
      upload.single("file")(req, res, (error: unknown) => {
        if ((error as { code?: string })?.code === "LIMIT_FILE_SIZE") {
          return next(new HttpError(413, `PDFs up to ${config.limits.uploadMaxMb} MB are supported`));
        }
        next(error);
      }),
    route(async (req, res) => {
      bookOr404(req.userId, req.params.id);
      if (!req.file) throw new HttpError(400, "Attach a PDF as the 'file' field");
      if (!req.file.buffer.subarray(0, 5).toString("latin1").startsWith("%PDF"))
        throw new HttpError(400, "That file is not a valid PDF");
      const document = await ctx.ingest.accept(req.userId, req.params.id, req.file);
      res.status(202).json(document);
    }),
  );

  api.get("/documents/:id/file", (req, res) => {
    const document = store.library.getDocument(req.userId, req.params.id);
    if (!document || !store.files.exists(req.userId, document.id)) throw new HttpError(404, "Document not found");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.type("application/pdf").sendFile(store.files.pathFor(req.userId, document.id));
  });

  api.patch("/documents/:id", (req, res) => {
    const document = store.library.getDocument(req.userId, req.params.id);
    if (!document) throw new HttpError(404, "Document not found");
    if (Number.isFinite(Number(req.body?.lastPage)))
      store.library.setLastPage(req.userId, document.id, Number(req.body.lastPage));
    res.json(store.library.getDocument(req.userId, document.id));
  });

  api.delete(
    "/documents/:id",
    route(async (req, res) => {
      if (!store.library.deleteDocument(req.userId, req.params.id)) throw new HttpError(404, "Document not found");
      await store.files.remove(req.userId, req.params.id);
      res.status(204).end();
    }),
  );

  api.get("/documents/:id/annotations", (req, res) => {
    res.json(store.library.listAnnotations(req.userId, req.params.id));
  });

  api.post("/documents/:id/annotations", (req, res) => {
    const document = store.library.getDocument(req.userId, req.params.id);
    if (!document) throw new HttpError(404, "Document not found");
    const body = req.body ?? {};
    const kind = ["highlight", "underline", "note"].includes(body.kind) ? body.kind : "highlight";
    const rects = Array.isArray(body.rects)
      ? body.rects
          .map((rect: any) => ({
            x: Number(rect.x),
            y: Number(rect.y),
            width: Number(rect.width),
            height: Number(rect.height),
          }))
          .filter((rect: any) => [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite))
      : [];
    res.status(201).json(
      store.library.addAnnotation(req.userId, {
        documentId: document.id,
        page: Math.max(1, Math.floor(Number(body.page) || 1)),
        kind,
        color: /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : "#facc15",
        text: String(body.text ?? ""),
        note: typeof body.note === "string" ? body.note : undefined,
        rects,
      }),
    );
  });

  api.delete("/annotations/:id", (req, res) => {
    if (!store.library.deleteAnnotation(req.userId, req.params.id)) throw new HttpError(404, "Annotation not found");
    res.status(204).end();
  });

  // ------------------------------------------------------------ conversation
  api.get("/books/:id/messages", (req, res) => {
    bookOr404(req.userId, req.params.id);
    const before = req.query.before ? Number(req.query.before) : null;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    res.json(store.messages.page(req.userId, req.params.id, Number.isFinite(before) ? before : null, limit));
  });

  api.delete("/books/:id/messages", (req, res) => {
    bookOr404(req.userId, req.params.id);
    store.messages.clear(req.userId, req.params.id);
    res.status(204).end();
  });

  api.post(
    "/chat",
    limited,
    route(async (req, res) => {
      const body = req.body as ChatRequest;
      bookOr404(req.userId, String(body?.bookId));
      const request: ChatRequest = {
        bookId: String(body.bookId),
        message: requireString(body.message, "message", 8000),
        focus: body.focus
          ? {
              documentId: typeof body.focus.documentId === "string" ? body.focus.documentId : undefined,
              page: Number.isFinite(Number(body.focus.page)) ? Number(body.focus.page) : undefined,
              selection: typeof body.focus.selection === "string" ? body.focus.selection : undefined,
            }
          : undefined,
        deep: Boolean(body.deep),
        web: Boolean(body.web),
        language: typeof body.language === "string" ? body.language.slice(0, 5) : "en",
      };
      const sse = openSse(res);
      await ctx.tutor.runChatTurn(req.userId, req.learnerName, request, sse);
      sse.close();
    }),
  );

  // ------------------------------------------------------------ learning
  api.post(
    "/quiz/:id/answer",
    limited,
    route(async (req, res) => {
      const graded = await ctx.learning.gradeQuiz(
        req.userId,
        req.params.id,
        { choice: req.body?.choice, text: req.body?.text },
        String(req.body?.language ?? "en"),
      );
      if (!graded) throw new HttpError(404, "Quiz not found");
      res.json(graded);
    }),
  );

  api.get("/books/:id/guide", (req, res) => {
    const book = bookOr404(req.userId, req.params.id);
    const { guide } = store.guides.get(book.id, book.title);
    const mastery: Record<string, number> = {};
    const concepts = store.learning.conceptsForBook(req.userId, book.id);
    for (const concept of guide.concepts) {
      const match = concepts.find((row) => row.name.toLowerCase() === concept.label.toLowerCase());
      if (match) mastery[concept.id] = match.attempts ? match.mastery : -1;
    }
    res.json({ guide, mastery, syncing: ctx.guide.isSyncing(book.id) });
  });

  api.post("/books/:id/guide/sync", limited, (req, res) => {
    const book = bookOr404(req.userId, req.params.id);
    ctx.guide.syncNow(req.userId, book.id, String(req.body?.language ?? "en"));
    res.status(202).json({ syncing: true });
  });

  api.get("/cards", (req, res) => {
    res.json(
      store.learning.listCards(req.userId, {
        bookId: typeof req.query.bookId === "string" ? req.query.bookId : undefined,
        dueOnly: req.query.due === "1",
        limit: Math.min(500, Number(req.query.limit) || 200),
      }),
    );
  });

  api.post("/cards/:id/review", (req, res) => {
    const grade = String(req.body?.grade) as ReviewGrade;
    if (!["again", "hard", "good", "easy"].includes(grade))
      throw new HttpError(400, "grade must be again|hard|good|easy");
    const reviewed = ctx.learning.reviewCard(req.userId, req.params.id, grade);
    if (!reviewed) throw new HttpError(404, "Card not found");
    res.json(reviewed);
  });

  api.post(
    "/diagram/tour",
    limited,
    route(async (req, res) => {
      const mermaid = requireString(req.body?.mermaid, "mermaid", 6000);
      const steps = await ctx.learning.diagramTour(
        req.userId,
        mermaid,
        String(req.body?.context ?? ""),
        String(req.body?.language ?? "en"),
      );
      res.json({ steps });
    }),
  );

  // Read-aloud: streams raw PCM16 so the client can start playing immediately.
  api.post(
    "/tts",
    limited,
    route(async (req, res) => {
      if (!ctx.speech?.available) throw new HttpError(503, "Server speech is not configured");
      const text = toSpeakableText(requireString(req.body?.text, "text", 6000)).slice(0, 1900);
      if (!text) throw new HttpError(400, "Nothing to read");
      const controller = new AbortController();
      res.on("close", () => controller.abort());
      const sampleRate = config.speech.ttsSampleRate;
      res.status(200);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("X-Sample-Rate", String(sampleRate));
      res.setHeader("Cache-Control", "no-store");
      for await (const chunk of ctx.speech.synthesize(text, {
        language: String(req.body?.language ?? "en"),
        sampleRate,
        signal: controller.signal,
      })) {
        if (!res.write(chunk)) await new Promise((resolve) => res.once("drain", resolve));
      }
      res.end();
    }),
  );

  api.post("/voice/ticket", limited, (req, res) => {
    store.library.ensureUser(req.userId, req.learnerName);
    res.json({
      ticket: ctx.voice.issueTicket(req.userId, req.learnerName),
      path: "/ws/voice",
      serverSpeech: Boolean(ctx.speech?.available),
    });
  });

  // ------------------------------------------------------------ analytics
  api.get("/analytics", (req, res) => {
    const tz = Number(req.query.tz);
    res.json(store.activity.summary(req.userId, { days: 14, tzOffsetMinutes: Number.isFinite(tz) ? tz : 0 }));
  });

  api.get("/analytics/usage", (req, res) => {
    res.json(store.activity.usage(req.userId));
  });

  api.post("/activity", (req, res) => {
    const seconds = Math.min(600, Math.max(0, Number(req.body?.seconds) || 0));
    if (seconds > 0)
      store.activity.record(
        req.userId,
        "study_seconds",
        seconds,
        typeof req.body?.bookId === "string" ? req.body.bookId : undefined,
      );
    res.status(204).end();
  });

  return api;
}
