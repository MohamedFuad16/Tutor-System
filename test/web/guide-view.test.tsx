import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyGuide, type StudyGuide } from "@shared/guide";
import { GuideView } from "@/features/revision/GuideView";

const KEY = "tutor.guide.checks.book_test";

const guide = (): StudyGuide => ({
  ...emptyGuide("book_test", "Motion"),
  version: 2,
  updatedAt: Date.now(),
  summary: "How things move — fast or slow.",
  goals: ["By the end you can work out a speed"],
  concepts: [{ id: "speed", label: "Speed", kind: "core", blurb: "How fast something goes." }],
  sections: [
    {
      id: "speed",
      title: "Speed — the basics",
      icon: "math",
      format: "math",
      objective: "Calculate speed from distance and time",
      tldr: "Speed is distance — divided by time.",
      keyPoints: ["Speed is measured in metres per second"],
      explanation: "You divide the distance by the time it took.",
      terms: [{ term: "Speed", definition: "How far something goes each second." }],
      worked: {
        problem: "A car drives 120 km in 2 hours. How fast is it going?",
        steps: [
          { label: "Write the formula", work: "speed = distance / time" },
          { label: "Put in the numbers", work: "speed = 120 / 2" },
          { label: "Work it out", work: "speed = 60" },
        ],
        answer: "60 km per hour",
      },
      mistakes: [{ wrong: "Divide time by distance", right: "Divide distance by time." }],
      callouts: [{ kind: "tip", text: "Check the units first." }],
      selfCheck: [
        { q: "Why do we divide distance by time?", a: "Because speed is distance per unit of time." },
        { q: "A bike goes 30 km in 2 hours. How fast?", a: "15 km per hour." },
      ],
      conceptIds: ["speed"],
      sourcePages: [],
      updatedAt: 0,
    },
    {
      id: "velocity",
      title: "Velocity",
      icon: "idea",
      tldr: "Speed in a direction.",
      keyPoints: [],
      explanation: "",
      callouts: [],
      selfCheck: [],
      conceptIds: [],
      sourcePages: [],
      updatedAt: 0,
    },
  ],
});

const show = (data = guide()) => render(<GuideView guide={data} mastery={{}} onBack={vi.fn()} />);

// Motion measures `height: auto` for the answer reveal, which calls scrollTo (not in jsdom).
window.scrollTo = (() => undefined) as typeof window.scrollTo;

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("GuideView", () => {
  it("renders the guide as one numbered paper document with no em or en dashes", () => {
    const { container } = show();
    expect(screen.getByRole("heading", { level: 1, name: "Motion" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Speed: the basics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Velocity" })).toBeInTheDocument();
    expect(within(container.querySelector<HTMLElement>("#section-speed")!).getByText("01")).toBeInTheDocument();
    // Contents: a rail on wide screens and a list on small ones.
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Contents" })).toBeInTheDocument();
    expect(screen.getByText("By the end you can:")).toBeInTheDocument();
    expect(screen.getByText("Work out a speed")).toBeInTheDocument();
    expect(screen.getByText("Calculate speed from distance and time")).toBeInTheDocument();
    expect(screen.getByText("Speed is distance, divided by time.")).toBeInTheDocument();
    // Maths sections call their questions "Practice".
    expect(screen.getByRole("heading", { level: 3, name: "Practice" })).toBeInTheDocument();
    expect(screen.getByText("0 of 2 got it")).toBeInTheDocument();
    expect(screen.getByText("Divide distance by time.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[—–]/);
  });

  it("reveals an answer and remembers the self-rating", async () => {
    const { unmount } = show();
    expect(screen.queryByText("Because speed is distance per unit of time.")).toBeNull();
    await userEvent.click(screen.getAllByRole("button", { name: "Show answer" })[0]);
    expect(screen.getByText("Because speed is distance per unit of time.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.getByText("1 of 2 got it")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual({ "speed:why do we divide distance by time": "got" });
    unmount();
    show();
    expect(screen.getByText("1 of 2 got it")).toBeInTheDocument();
  });

  it("walks through a worked example one step at a time", async () => {
    show();
    expect(screen.queryByText("Write the formula")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByText("Write the formula")).toBeInTheDocument();
    expect(screen.queryByText("Put in the numbers")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByText("Put in the numbers")).toBeInTheDocument();
    expect(screen.getByText("Your turn: try the last step, then reveal it.")).toBeInTheDocument();
    expect(screen.queryByText("60 km per hour")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Reveal" }));
    expect(screen.getByText("Work it out")).toBeInTheDocument();
    expect(screen.getByText("60 km per hour")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Start again/ }));
    expect(screen.queryByText("Write the formula")).toBeNull();
  });

  it("hides key-term definitions for self-testing and reveals them one by one", async () => {
    show();
    const terms = screen.getByRole("heading", { level: 3, name: "Key terms" }).closest("div")!.parentElement!;
    await userEvent.click(within(terms).getByRole("button", { name: "Hide definitions" }));
    const reveal = within(terms).getByRole("button", { name: "Show the definition of Speed" });
    await userEvent.click(reveal);
    expect(within(terms).queryByRole("button", { name: "Show the definition of Speed" })).toBeNull();
    expect(within(terms).getByRole("button", { name: "Show definitions" })).toBeInTheDocument();
  });

  it("works without browser storage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    show();
    await userEvent.click(screen.getAllByRole("button", { name: "Show answer" })[1]);
    await userEvent.click(screen.getByRole("button", { name: "Not yet" }));
    expect(screen.getByText("0 of 2 got it")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not yet" })).toHaveAttribute("aria-pressed", "true");
  });
});
