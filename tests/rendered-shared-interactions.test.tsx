import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FloatingSkillsMenu } from "../src/components/FloatingSkillsMenu";
import { Navigation } from "../src/components/Navigation";
import { PatternCard, themes } from "../src/components/PatternCard";
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

const renderPatternCard = (
  props: Partial<ComponentProps<typeof PatternCard>> = {},
) => {
  const theme = themes[0];

  return render(
    <PatternCard
      bgClass={theme.bg}
      bloomColor={theme.bloom}
      bloomOpacity={theme.bloomOpacity}
      SvgComponent={theme.SvgComponent}
      {...props}
    >
      <span>Open study card</span>
    </PatternCard>,
  );
};

beforeEach(() => {
  resetUiStore();
});

describe("rendered shared interaction components", () => {
  it("gates Navigation admin access and moves aria-current after route clicks", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Navigation />);

    const studyButton = screen.getByRole("button", { name: "Study" });
    expect(studyButton).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Admin" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Analytics" }));
    expect(screen.getByRole("button", { name: "Analytics" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(studyButton).not.toHaveAttribute("aria-current");
    expect(useStore.getState().activeView).toBe("analytics");

    act(() => {
      useStore.setState({ accessMode: "admin" });
    });
    rerender(<Navigation />);

    const adminButton = screen.getByRole("button", { name: "Admin" });
    expect(adminButton).toBeInTheDocument();

    await user.click(adminButton);
    expect(adminButton).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("button", { name: "Analytics" }),
    ).not.toHaveAttribute("aria-current");
    expect(useStore.getState().activeView).toBe("admin");
  });

  it("updates PatternCard pointer CSS vars, drag callbacks, and keyboard activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onDragOver = vi.fn();
    const onDragLeave = vi.fn();
    const onDrop = vi.fn();

    renderPatternCard({
      layoutId: "pattern-shared-test",
      onClick,
      onDragOver,
      onDragLeave,
      onDrop,
    });

    const card = screen.getByRole("button", { name: "Open study card" });
    expect(card).toHaveAttribute("data-layout-id", "pattern-shared-test");

    fireEvent.mouseMove(card, { clientX: 24, clientY: 37 });
    expect(card).toHaveStyle({ "--mouse-x": "24px", "--mouse-y": "37px" });

    fireEvent.dragOver(card);
    fireEvent.dragLeave(card);
    fireEvent.drop(card);

    expect(onDragOver).toHaveBeenCalledTimes(1);
    expect(onDragLeave).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledTimes(1);

    card.focus();
    expect(card).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("renders PatternCard press dots only when enabled", () => {
    const { container, rerender } = renderPatternCard({ animateDots: true });
    const theme = themes[0];

    expect(container.querySelectorAll(".z-30 span")).toHaveLength(16);

    rerender(
      <PatternCard
        bgClass={theme.bg}
        bloomColor={theme.bloom}
        bloomOpacity={theme.bloomOpacity}
        SvgComponent={theme.SvgComponent}
        animateDots={false}
      >
        <span>Open study card</span>
      </PatternCard>,
    );

    expect(container.querySelectorAll(".z-30 span")).toHaveLength(0);
  });

  it("keeps FloatingSkillsMenu closed when requested", () => {
    render(
      <FloatingSkillsMenu
        isOpen={false}
        onClose={vi.fn()}
        onSelectSkill={vi.fn()}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Skills" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
  });

  it("shows FloatingSkillsMenu skeleton before 400ms, then selects and closes Search", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const onSelectSkill = vi.fn();
    const { container } = render(
      <FloatingSkillsMenu
        isOpen
        onClose={onClose}
        onSelectSkill={onSelectSkill}
      />,
    );

    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSelectSkill).toHaveBeenCalledWith("Search");
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Close skills menu" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reflects SiriLiquidGlass active and valid data attrs as decorative media", () => {
    const { container, rerender } = render(
      <SiriLiquidGlass isActive isValid={false} animated={false} />,
    );

    const glass = container.firstElementChild;
    expect(glass).toHaveAttribute("aria-hidden", "true");
    expect(glass).toHaveAttribute("data-active", "true");
    expect(glass).toHaveAttribute("data-valid", "false");

    rerender(<SiriLiquidGlass isActive={false} isValid animated={false} />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveAttribute("data-active", "false");
    expect(container.firstElementChild).toHaveAttribute("data-valid", "true");
  });
});
