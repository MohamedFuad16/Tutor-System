import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { FloatingSkillsMenu } from "../src/components/FloatingSkillsMenu";
import { Navigation } from "../src/components/Navigation";
import { PatternCard, themes } from "../src/components/PatternCard";
import { SettingsButton } from "../src/components/SettingsModal";
import { SiriLiquidGlass } from "../src/components/SiriLiquidGlass";
import { useStore } from "../src/store";

const resetUiStore = () => {
  useStore.setState({
    accessMode: "user",
    activeView: "study",
    animationsEnabled: false,
    language: "en",
    learnerName: "Learner",
  });
};

beforeEach(() => {
  resetUiStore();
});

describe("rendered reusable Tutor components", () => {
  it("renders Navigation as page buttons and changes the active route", async () => {
    const user = userEvent.setup();

    const { rerender } = render(<Navigation />);

    expect(screen.getByRole("button", { name: "Study" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("button", { name: "Admin" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Analytics" }));
    expect(useStore.getState().activeView).toBe("analytics");

    act(() => {
      useStore.setState({ accessMode: "admin" });
    });
    rerender(<Navigation />);
    expect(screen.getByRole("button", { name: "Admin" })).toBeInTheDocument();
  });

  it("renders Settings as an accessible modal and saves user-mode preferences", async () => {
    const user = userEvent.setup();
    useStore.setState({ animationsEnabled: true });

    render(<SettingsButton />);

    await user.click(screen.getByRole("button", { name: "App Settings" }));
    expect(
      screen.getByRole("heading", { name: "App Settings" }),
    ).toBeInTheDocument();

    const learnerName = screen.getByLabelText("Learner Name");
    await user.clear(learnerName);
    await user.type(learnerName, "Ada");
    fireEvent.change(screen.getByLabelText("App Language"), {
      target: { value: "ja" },
    });

    const animationToggle = screen.getByRole("button", {
      name: "Toggle animations",
    });
    expect(animationToggle).toHaveAttribute("aria-pressed", "true");
    await user.click(animationToggle);
    expect(animationToggle).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(useStore.getState().learnerName).toBe("Ada");
    expect(useStore.getState().language).toBe("ja");
    expect(useStore.getState().animationsEnabled).toBe(false);
    expect(screen.queryByRole("heading", { name: "App Settings" })).toBeNull();
  });

  it("lets PatternCard activate by click and keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const theme = themes[0];

    render(
      <PatternCard
        bgClass={theme.bg}
        bloomColor={theme.bloom}
        bloomOpacity={theme.bloomOpacity}
        SvgComponent={theme.SvgComponent}
        onClick={onClick}
        layoutId="pattern-test"
        animateDots={false}
      >
        <span>Open study card</span>
      </PatternCard>,
    );

    const card = screen.getByRole("button", { name: "Open study card" });
    expect(card).toHaveAttribute("data-layout-id", "pattern-test");

    await user.click(card);
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("loads FloatingSkillsMenu items, selects a skill, and closes by icon button", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const onSelectSkill = vi.fn();

    render(
      <FloatingSkillsMenu
        isOpen
        onClose={onClose}
        onSelectSkill={onSelectSkill}
      />,
    );

    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close skills menu" }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSelectSkill).toHaveBeenCalledWith("Search");
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Close skills menu" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders SiriLiquidGlass as decorative stateful animation media", () => {
    const { container } = render(
      <SiriLiquidGlass isActive isValid={false} animated={false} />,
    );

    const glass = container.firstElementChild;
    expect(glass).toHaveAttribute("aria-hidden", "true");
    expect(glass).toHaveAttribute("data-active", "true");
    expect(glass).toHaveAttribute("data-valid", "false");
    expect(container.querySelectorAll(".rounded-full")).toHaveLength(4);
  });
});
