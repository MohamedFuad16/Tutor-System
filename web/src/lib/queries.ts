/**
 * Server state via React Query. Keys are centralised so background events
 * (guide synced, document ready) can invalidate exactly what changed.
 */
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StudyGuide } from "@shared/guide";
import type {
  AnalyticsSummary,
  Annotation,
  Book,
  ChatMessage,
  Flashcard,
  HealthInfo,
  QuizResult,
  QuizItem,
  ReviewGrade,
  StudyDocument,
} from "@shared/types";
import { api } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export const keys = {
  health: ["health"] as const,
  books: ["books"] as const,
  documents: (bookId: string) => ["documents", bookId] as const,
  messages: (bookId: string) => ["messages", bookId] as const,
  guide: (bookId: string) => ["guide", bookId] as const,
  cards: (bookId?: string, due?: boolean) => ["cards", bookId ?? "all", due ? "due" : "all"] as const,
  analytics: ["analytics"] as const,
  annotations: (documentId: string) => ["annotations", documentId] as const,
};

export const useHealth = () =>
  useQuery({ queryKey: keys.health, queryFn: () => api<HealthInfo>("/health"), staleTime: 60_000 });

export const useBooks = () => useQuery({ queryKey: keys.books, queryFn: () => api<Book[]>("/books") });

export function useDocuments(bookId: string | null) {
  return useQuery({
    queryKey: keys.documents(bookId ?? "none"),
    queryFn: () => api<StudyDocument[]>(`/books/${bookId}/documents`),
    enabled: Boolean(bookId),
    // Poll while anything is still being processed (events usually arrive first).
    refetchInterval: (query) => (query.state.data?.some((doc) => doc.status === "processing") ? 2_500 : false),
  });
}

export function useMessages(bookId: string | null) {
  return useQuery({
    queryKey: keys.messages(bookId ?? "none"),
    queryFn: () => api<ChatMessage[]>(`/books/${bookId}/messages?limit=80`),
    enabled: Boolean(bookId),
    staleTime: Infinity,
  });
}

export type GuideResponse = { guide: StudyGuide; mastery: Record<string, number>; syncing: boolean };

export function useGuide(bookId: string | null) {
  return useQuery({
    queryKey: keys.guide(bookId ?? "none"),
    queryFn: () => api<GuideResponse>(`/books/${bookId}/guide`),
    enabled: Boolean(bookId),
  });
}

export function useCards(bookId?: string, dueOnly = false) {
  return useQuery({
    queryKey: keys.cards(bookId, dueOnly),
    queryFn: () =>
      api<Flashcard[]>(
        `/cards?${new URLSearchParams({ ...(bookId ? { bookId } : {}), ...(dueOnly ? { due: "1" } : {}) })}`,
      ),
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: keys.analytics,
    queryFn: () => api<AnalyticsSummary>(`/analytics?tz=${new Date().getTimezoneOffset()}`),
    staleTime: 10_000,
  });
}

export function useAnnotations(documentId: string | null) {
  return useQuery({
    queryKey: keys.annotations(documentId ?? "none"),
    queryFn: () => api<Annotation[]>(`/documents/${documentId}/annotations`),
    enabled: Boolean(documentId),
  });
}

export function useCreateBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => api<Book>("/books", { method: "POST", json: { title } }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.books }),
  });
}

export function useRenameBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api<Book>(`/books/${id}`, { method: "PATCH", json: { title } }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.books }),
  });
}

export function useDeleteBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/books/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.books }),
  });
}

export function useUploadDocument(bookId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api<StudyDocument>(`/books/${bookId}/documents`, { method: "POST", body: form });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.documents(bookId ?? "none") });
      client.invalidateQueries({ queryKey: keys.books });
    },
  });
}

export function useDeleteDocument(bookId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api<void>(`/documents/${documentId}`, { method: "DELETE" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.documents(bookId ?? "none") });
      client.invalidateQueries({ queryKey: keys.books });
    },
  });
}

export function useAnswerQuiz() {
  return useMutation({
    mutationFn: ({
      quizId,
      choice,
      text,
      language,
    }: {
      quizId: string;
      choice?: number;
      text?: string;
      language?: string;
    }) =>
      api<{ result: QuizResult; quiz: QuizItem }>(`/quiz/${quizId}/answer`, {
        method: "POST",
        json: { choice, text, language },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.analytics });
    },
  });
}

export function useReviewCard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, grade }: { cardId: string; grade: ReviewGrade }) =>
      api<{ card: Flashcard; mastery?: number }>(`/cards/${cardId}/review`, { method: "POST", json: { grade } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["cards"] });
      client.invalidateQueries({ queryKey: keys.analytics });
    },
  });
}
