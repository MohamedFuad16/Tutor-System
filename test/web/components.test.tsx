import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Markdown } from "@/components/Markdown";
import { Composer } from "@/features/chat/Composer";
import { QuizCard } from "@/features/chat/parts";
import { queryClient } from "@/lib/queries";
import { useApp } from "@/store/app";

const wrap = (node: ReactNode) => render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);

beforeEach(() => {
  useApp.setState({
    selection: null,
    deepMode: false,
    webMode: false,
    jumpTo: null,
    activeBookId: "book_1",
    view: "revision",
  });
});

describe("Markdown", () => {
  it("turns [D1 p.3] citations into chips that jump to the page", async () => {
    wrap(<Markdown text="Chlorophyll absorbs light [D1 p.3]." docs={[{ id: "doc_a", title: "Biology" }]} />);
    const chip = screen.getByRole("button", { name: "p.3" });
    expect(chip).toHaveAttribute("title", "Biology — page 3");
    expect(screen.queryByText(/#cite/)).toBeNull();
    await userEvent.click(chip);
    const state = useApp.getState();
    expect(state.jumpTo).toMatchObject({ documentId: "doc_a", page: 3 });
    expect(state.view).toBe("study");
  });

  it("links web citations to their sources", () => {
    wrap(
      <Markdown
        text="GDP grew 2% [W1]."
        web={[{ title: "Stats", url: "https://example.org/gdp", domain: "example.org" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute("href", "https://example.org/gdp");
  });

  it("shows a sketching indicator while a mermaid block is still streaming", () => {
    wrap(<Markdown text={"Here is the flow:\n```mermaid\nflowchart TD\n  A --> B"} streaming />);
    expect(screen.getByText("Sketching a diagram…")).toBeInTheDocument();
    expect(screen.queryByText(/flowchart TD/)).toBeNull();
  });
});

describe("Composer", () => {
  it("sends on Enter, keeps Shift+Enter as a newline", async () => {
    const onSend = vi.fn();
    render(<Composer busy={false} onSend={onSend} onStop={vi.fn()} onVoice={vi.fn()} placeholder="Ask" />);
    const box = screen.getByLabelText("Message the tutor");
    await userEvent.type(box, "line one{Shift>}{Enter}{/Shift}line two");
    expect(onSend).not.toHaveBeenCalled();
    await userEvent.type(box, "{Enter}");
    expect(onSend).toHaveBeenCalledWith("line one\nline two");
  });

  it("turns the send button into stop while answering", async () => {
    const onStop = vi.fn();
    render(<Composer busy onSend={vi.fn()} onStop={onStop} onVoice={vi.fn()} placeholder="Ask" />);
    await userEvent.click(screen.getByRole("button", { name: "Stop answer" }));
    expect(onStop).toHaveBeenCalled();
  });

  it("offers voice mode and a highlighted-passage chip", async () => {
    const onVoice = vi.fn();
    useApp.setState({ selection: { documentId: "doc_a", page: 4, text: "Light-dependent reactions" } });
    const onSend = vi.fn();
    render(<Composer busy={false} onSend={onSend} onStop={vi.fn()} onVoice={onVoice} placeholder="Ask" />);
    expect(screen.getByText("Light-dependent reactions")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start voice conversation" }));
    expect(onVoice).toHaveBeenCalled();
    // With a passage highlighted, an empty send asks to explain it.
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalledWith("Explain this passage.");
  });
});

describe("QuizCard", () => {
  it("grades a multiple-choice answer through the API and shows feedback", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            result: {
              quizId: "quiz_1",
              correct: true,
              score: 1,
              feedback: "Because chlorophyll absorbs light.",
              mastery: 0.47,
            },
            quiz: {
              id: "quiz_1",
              concept: "Chlorophyll",
              question: "What absorbs light?",
              options: ["Chlorophyll", "Water"],
              answerIndex: 0,
              answer: "Chlorophyll",
              explanation: "",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    wrap(
      <QuizCard
        bookId="book_1"
        quiz={{
          id: "quiz_1",
          concept: "Chlorophyll",
          question: "What absorbs light?",
          options: ["Chlorophyll", "Water"],
          answerIndex: -1,
          answer: "",
          explanation: "",
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    fireEvent.click(screen.getByText("Chlorophyll"));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await waitFor(() => expect(screen.getByText("Nailed it.")).toBeInTheDocument());
    expect(screen.getByText("Mastery 47%")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/quiz/quiz_1/answer");
    expect(JSON.parse(String(init.body))).toMatchObject({ choice: 0 });
    vi.unstubAllGlobals();
  });
});
