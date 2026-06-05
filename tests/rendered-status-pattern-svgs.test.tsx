import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";

import { SvgBeige, SvgDark, SvgOrange } from "../src/components/PatternSVGs";
import {
  ExpiredIcon,
  FailedIcon,
  PendingIcon,
  ProgressIcon,
  ReviewIcon,
  StatusBadge,
  SubmittedIcon,
  SuccessIcon,
} from "../src/components/StatusBadge";

const statusCases = [
  {
    status: "pending",
    label: "Pending",
    background: "bg-[#FDF1E8]",
    color: "text-[#D87A2C]",
    svgCount: 3,
  },
  {
    status: "progress",
    label: "In progress",
    background: "bg-[#E7F3FF]",
    color: "text-[#0A7DFF]",
    svgCount: 1,
  },
  {
    status: "submitted",
    label: "Submitted",
    background: "bg-[#F1EAFC]",
    color: "text-[#6929F4]",
    svgCount: 1,
  },
  {
    status: "review",
    label: "In review",
    background: "bg-[#FDF4DD]",
    color: "text-[#D49B23]",
    svgCount: 3,
  },
  {
    status: "success",
    label: "Success",
    background: "bg-[#E6F8EA]",
    color: "text-[#36AA55]",
    svgCount: 2,
  },
  {
    status: "failed",
    label: "Failed",
    background: "bg-[#FEEDED]",
    color: "text-[#EF4C43]",
    svgCount: 2,
  },
  {
    status: "expired",
    label: "Expired",
    background: "bg-[#F3F3F3]",
    color: "text-[#6A6A6A]",
    svgCount: 1,
  },
] as const;

describe.each(statusCases)(
  "StatusBadge $status state",
  ({ status, label, background, color, svgCount }) => {
    it("renders the canonical label, status palette, and decorative icon", () => {
      render(<StatusBadge status={status} />);

      const badge = screen.getByText(label);
      expect(badge).toHaveClass(background, color);
      expect(badge.querySelectorAll("svg")).toHaveLength(svgCount);
      expect(badge.firstElementChild).toHaveAttribute("aria-hidden", "true");
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("renders a custom label without changing the selected status palette", () => {
      const override = `${label} custom`;
      render(<StatusBadge status={status} labelOverride={override} />);

      expect(screen.getByText(override)).toHaveClass(background, color);
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });

    it("keeps the shared stable badge layout classes", () => {
      render(<StatusBadge status={status} />);

      expect(screen.getByText(label)).toHaveClass(
        "inline-flex",
        "items-center",
        "gap-2",
        "px-5",
        "py-2",
        "rounded-[14px]",
        "text-[17px]",
        "font-medium",
        "tracking-tight",
      );
    });
  },
);

const iconCases: ReadonlyArray<{
  name: string;
  Icon: ComponentType;
  svgCount: number;
  pathCount: number;
  viewBox: string;
  rootTag: "DIV" | "svg";
  firstSvgWidth: string;
  firstSvgHeight: string;
  strokeWidth: string;
  lineCap: string;
}> = [
  {
    name: "PendingIcon",
    Icon: PendingIcon,
    svgCount: 3,
    pathCount: 3,
    viewBox: "0 0 48 44",
    rootTag: "DIV",
    firstSvgWidth: "24",
    firstSvgHeight: "22",
    strokeWidth: "5.43245",
    lineCap: "square",
  },
  {
    name: "ProgressIcon",
    Icon: ProgressIcon,
    svgCount: 1,
    pathCount: 1,
    viewBox: "0 0 48 48",
    rootTag: "svg",
    firstSvgWidth: "22",
    firstSvgHeight: "22",
    strokeWidth: "4.72342",
    lineCap: "round",
  },
  {
    name: "SubmittedIcon",
    Icon: SubmittedIcon,
    svgCount: 1,
    pathCount: 1,
    viewBox: "0 0 48 48",
    rootTag: "svg",
    firstSvgWidth: "22",
    firstSvgHeight: "22",
    strokeWidth: "5.43245",
    lineCap: "round",
  },
  {
    name: "ReviewIcon",
    Icon: ReviewIcon,
    svgCount: 3,
    pathCount: 3,
    viewBox: "0 0 43 43",
    rootTag: "DIV",
    firstSvgWidth: "22",
    firstSvgHeight: "22",
    strokeWidth: "4.72342",
    lineCap: "round",
  },
  {
    name: "SuccessIcon",
    Icon: SuccessIcon,
    svgCount: 2,
    pathCount: 2,
    viewBox: "0 0 48 48",
    rootTag: "DIV",
    firstSvgWidth: "24",
    firstSvgHeight: "24",
    strokeWidth: "5.43245",
    lineCap: "round",
  },
  {
    name: "FailedIcon",
    Icon: FailedIcon,
    svgCount: 2,
    pathCount: 2,
    viewBox: "0 0 48 48",
    rootTag: "DIV",
    firstSvgWidth: "24",
    firstSvgHeight: "24",
    strokeWidth: "5.43245",
    lineCap: "round",
  },
  {
    name: "ExpiredIcon",
    Icon: ExpiredIcon,
    svgCount: 1,
    pathCount: 1,
    viewBox: "0 0 55 55",
    rootTag: "svg",
    firstSvgWidth: "22",
    firstSvgHeight: "22",
    strokeWidth: "5.43245",
    lineCap: "round",
  },
];

describe.each(iconCases)(
  "$name export",
  ({
    Icon,
    svgCount,
    pathCount,
    viewBox,
    rootTag,
    firstSvgWidth,
    firstSvgHeight,
    strokeWidth,
    lineCap,
  }) => {
    it("renders its expected vector composition as decorative media", () => {
      const { container } = render(<Icon />);

      expect(container.firstElementChild).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      expect(container.querySelectorAll("svg")).toHaveLength(svgCount);
      expect(container.querySelectorAll("path")).toHaveLength(pathCount);
      expect(container.querySelector("svg")).toHaveAttribute(
        "viewBox",
        viewBox,
      );
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("keeps its root and primary vector footprint stable", () => {
      const { container } = render(<Icon />);
      const root = container.firstElementChild;
      const svg = container.querySelector("svg");

      expect(root?.tagName).toBe(rootTag);
      expect(svg).toHaveAttribute("width", firstSvgWidth);
      expect(svg).toHaveAttribute("height", firstSvgHeight);
      if (rootTag === "DIV") {
        expect(root).toHaveClass("relative", "w-[22px]", "h-[22px]");
      } else {
        expect(root).toHaveAttribute("width", "22");
        expect(root).toHaveAttribute("height", "22");
      }
    });

    it("keeps its primary path on the current-color stroke system", () => {
      const { container } = render(<Icon />);
      const path = container.querySelector("path");

      expect(path).toHaveAttribute("stroke", "currentColor");
      expect(path).toHaveAttribute("stroke-width", strokeWidth);
      expect(path).toHaveAttribute("stroke-linecap", lineCap);
      expect(path?.getAttribute("d")?.length).toBeGreaterThan(20);
    });
  },
);

describe("StatusBadge label and transition behavior", () => {
  it("falls back to the canonical label for an empty override", () => {
    render(<StatusBadge status="review" labelOverride="" />);

    expect(screen.getByText("In review")).toBeInTheDocument();
  });

  it("preserves an explicitly supplied whitespace override", () => {
    const { container } = render(
      <StatusBadge status="success" labelOverride="  " />,
    );

    expect(container.querySelector("span")).toHaveTextContent("");
    expect(container.querySelector("span")?.textContent).toBe("  ");
  });

  it("updates label, palette, and icon composition when status changes", () => {
    const { rerender } = render(<StatusBadge status="pending" />);

    expect(screen.getByText("Pending").querySelectorAll("svg")).toHaveLength(3);
    rerender(<StatusBadge status="expired" />);
    const expired = screen.getByText("Expired");
    expect(expired).toHaveClass("bg-[#F3F3F3]", "text-[#6A6A6A]");
    expect(expired.querySelectorAll("svg")).toHaveLength(1);
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
  });

  it("uses a non-interactive span for status semantics", () => {
    const { container } = render(<StatusBadge status="submitted" />);

    expect(container.firstElementChild?.tagName).toBe("SPAN");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("accepts a long label without changing the badge sizing classes", () => {
    const label = "Ready for a deliberately detailed review session";
    render(<StatusBadge status="success" labelOverride={label} />);

    expect(screen.getByText(label)).toHaveClass("px-5", "py-2", "gap-2");
  });

  it("retains the intended opacity transition and hover feedback", () => {
    render(<StatusBadge status="progress" />);

    expect(screen.getByText("In progress")).toHaveClass(
      "transition-opacity",
      "duration-200",
      "hover:opacity-90",
    );
  });
});

const patternCases: ReadonlyArray<{
  name: string;
  Pattern: ComponentType;
  color: string;
  circleCount: number;
  groupCount: number;
  originGroupCount: number;
  delayedGroupCount: number;
  uniqueRadii: number;
  verticalMarker: string;
  opacityTiers: string[];
}> = [
  {
    name: "dark",
    Pattern: SvgDark,
    color: "#fefefe",
    circleCount: 40,
    groupCount: 42,
    originGroupCount: 20,
    delayedGroupCount: 15,
    uniqueRadii: 16,
    verticalMarker: "167.89999999999995",
    opacityTiers: ["0.17842588235294118", "0.1811764705882353", "1"],
  },
  {
    name: "orange",
    Pattern: SvgOrange,
    color: "#fefefe",
    circleCount: 36,
    groupCount: 38,
    originGroupCount: 18,
    delayedGroupCount: 13,
    uniqueRadii: 15,
    verticalMarker: "91.70000000000002",
    opacityTiers: ["0.17842588235294118", "0.1811764705882353", "1"],
  },
  {
    name: "beige",
    Pattern: SvgBeige,
    color: "#ff6e00",
    circleCount: 28,
    groupCount: 30,
    originGroupCount: 14,
    delayedGroupCount: 9,
    uniqueRadii: 13,
    verticalMarker: "116.33390000000003",
    opacityTiers: [
      "0.17842588235294118",
      "0.1811764705882353",
      "0.18386117647058825",
      "1",
    ],
  },
];

const horizontalLattice = [
  "114.3",
  "12.7",
  "38.099999999999994",
  "63.5",
  "88.89999999999999",
];

describe.each(patternCases)(
  "$name pattern export",
  ({
    Pattern,
    color,
    circleCount,
    groupCount,
    originGroupCount,
    delayedGroupCount,
    uniqueRadii,
    verticalMarker,
    opacityTiers,
  }) => {
    it("renders one hidden SVG with stable dimensions", () => {
      const { container } = render(<Pattern />);
      const svg = container.querySelector("svg");

      expect(container.querySelectorAll("svg")).toHaveLength(1);
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("width", "127");
      expect(svg).toHaveAttribute("height", "334.57575757575756");
      expect(svg).toHaveAttribute("viewBox", "0 0 127 334.57575757575756");
    });

    it("preserves the root overflow and 3D composition styles", () => {
      const { container } = render(<Pattern />);

      expect(container.querySelector("svg")).toHaveStyle({
        overflow: "visible",
        transformStyle: "preserve-3d",
      });
    });

    it("keeps its exact circle and group composition", () => {
      const { container } = render(<Pattern />);

      expect(container.querySelectorAll("circle")).toHaveLength(circleCount);
      expect(container.querySelectorAll("g")).toHaveLength(groupCount);
    });

    it("uses only its theme color for filled dots and ring strokes", () => {
      const { container } = render(<Pattern />);
      const circles = Array.from(container.querySelectorAll("circle"));
      const fills = new Set(
        circles.map((circle) => circle.getAttribute("fill")),
      );
      const strokes = new Set(
        circles.map((circle) => circle.getAttribute("stroke")).filter(Boolean),
      );

      expect(fills).toEqual(new Set([color, "none"]));
      expect(strokes).toEqual(new Set([color]));
    });

    it("composes every dot from a filled circle and matching outline ring", () => {
      const { container } = render(<Pattern />);
      const originGroups = Array.from(
        container.querySelectorAll<SVGGElement>("g[style*='transform-origin']"),
      );

      expect(originGroups).toHaveLength(originGroupCount);
      for (const group of originGroups) {
        const circles = group.querySelectorAll("circle");
        expect(circles).toHaveLength(2);
        expect(circles[0]).toHaveAttribute("fill", color);
        expect(circles[1]).toHaveAttribute("fill", "none");
        expect(circles[1]).toHaveAttribute("stroke", color);
        expect(circles[1]).toHaveAttribute(
          "stroke-width",
          "1.3106399999999998",
        );
      }
    });

    it("keeps the intended number of delayed transform groups", () => {
      const { container } = render(<Pattern />);
      const delayedGroups = Array.from(
        container.querySelectorAll<SVGGElement>(
          "g[style*='transition: transform']",
        ),
      );

      expect(delayedGroups).toHaveLength(delayedGroupCount);
      expect(
        delayedGroups.every((group) =>
          group.style.transition.includes(
            "transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          ),
        ),
      ).toBe(true);
      expect(
        delayedGroups.every(
          (group) => group.style.transform === "translate(0px, 0px)",
        ),
      ).toBe(true);
    });

    it("separates the active and faded fields into two root groups", () => {
      const { container } = render(<Pattern />);
      const svg = container.querySelector("svg");
      const rootGroups = Array.from(svg?.children ?? []);

      expect(rootGroups).toHaveLength(2);
      expect(
        rootGroups.every((group) => group.tagName.toLowerCase() === "g"),
      ).toBe(true);
      expect(
        rootGroups.every((group) =>
          group.getAttribute("style")?.includes("transition: opacity 420ms"),
        ),
      ).toBe(true);
    });

    it("keeps every dot on the five-column horizontal lattice", () => {
      const { container } = render(<Pattern />);
      const xCoordinates = Array.from(
        new Set(
          Array.from(container.querySelectorAll(`circle[fill="${color}"]`)).map(
            (circle) => circle.getAttribute("cx") ?? "",
          ),
        ),
      ).sort();

      expect(xCoordinates).toEqual(horizontalLattice);
    });

    it("keeps its nine-row vertical geometry and variant marker", () => {
      const { container } = render(<Pattern />);
      const yCoordinates = new Set(
        Array.from(container.querySelectorAll(`circle[fill="${color}"]`)).map(
          (circle) => circle.getAttribute("cy"),
        ),
      );

      expect(yCoordinates).toHaveLength(9);
      expect(yCoordinates.has(verticalMarker)).toBe(true);
    });

    it("keeps its deliberate radius diversity", () => {
      const { container } = render(<Pattern />);
      const radii = Array.from(
        new Set(
          Array.from(container.querySelectorAll("circle")).map((circle) =>
            Number(circle.getAttribute("r")),
          ),
        ),
      );

      expect(radii).toHaveLength(uniqueRadii);
      expect(Math.min(...radii)).toBeLessThan(1);
      expect(Math.max(...radii)).toBeGreaterThan(10.9);
    });

    it("keeps its active and fade opacity tiers", () => {
      const { container } = render(<Pattern />);
      const tiers = Array.from(
        new Set(
          Array.from(container.querySelectorAll("g[opacity]")).map(
            (group) => group.getAttribute("opacity") ?? "",
          ),
        ),
      ).sort();

      expect(tiers).toEqual(opacityTiers);
    });

    it("remains decorative and contributes no image role", () => {
      const { container } = render(<Pattern />);

      expect(container.firstElementChild?.tagName).toBe("DIV");
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("rerenders to the same deterministic vector composition", () => {
      const { container, rerender } = render(<Pattern />);
      const initialMarkup = container.innerHTML;

      rerender(<Pattern />);
      expect(container.innerHTML).toBe(initialMarkup);
    });
  },
);

const separationCases: ReadonlyArray<{
  leftName: string;
  Left: ComponentType;
  rightName: string;
  Right: ComponentType;
}> = [
  { leftName: "dark", Left: SvgDark, rightName: "orange", Right: SvgOrange },
  { leftName: "dark", Left: SvgDark, rightName: "beige", Right: SvgBeige },
  { leftName: "orange", Left: SvgOrange, rightName: "beige", Right: SvgBeige },
];

describe.each(separationCases)(
  "$leftName and $rightName pattern separation",
  ({ Left, Right }) => {
    it("keeps distinct vector markup and dot counts", () => {
      const left = render(<Left />).container;
      const right = render(<Right />).container;

      expect(left.innerHTML).not.toBe(right.innerHTML);
      expect(left.querySelectorAll("circle").length).not.toBe(
        right.querySelectorAll("circle").length,
      );
    });
  },
);

const signaturePointCases: ReadonlyArray<{
  name: string;
  Pattern: ComponentType;
  color: string;
  cx: string;
  cy: string;
  radius: string;
}> = [
  {
    name: "dark upper anchor",
    Pattern: SvgDark,
    color: "#fefefe",
    cx: "63.5",
    cy: "12.7",
    radius: "10.920623213974629",
  },
  {
    name: "dark right micro-dot",
    Pattern: SvgDark,
    color: "#fefefe",
    cx: "114.3",
    cy: "38.099999999999994",
    radius: "0.22233519193053425",
  },
  {
    name: "orange upper-left micro-dot",
    Pattern: SvgOrange,
    color: "#fefefe",
    cx: "12.7",
    cy: "12.7",
    radius: "2.3040526438548743",
  },
  {
    name: "orange lower-right anchor",
    Pattern: SvgOrange,
    color: "#fefefe",
    cx: "88.89999999999999",
    cy: "114.3",
    radius: "9.214384139603217",
  },
  {
    name: "beige upper anchor",
    Pattern: SvgBeige,
    color: "#ff6e00",
    cx: "63.5",
    cy: "12.7",
    radius: "10.920617933152299",
  },
  {
    name: "beige lower-right fade point",
    Pattern: SvgBeige,
    color: "#ff6e00",
    cx: "88.89999999999999",
    cy: "116.33390000000003",
    radius: "6.307212042685606",
  },
];

describe.each(signaturePointCases)(
  "$name geometry",
  ({ Pattern, color, cx, cy, radius }) => {
    it("keeps the signature filled point paired with its outline ring", () => {
      const { container } = render(<Pattern />);
      const point = container.querySelector(
        `circle[fill="${color}"][cx="${cx}"][cy="${cy}"][r="${radius}"]`,
      );
      const pair = point?.parentElement?.querySelectorAll("circle");

      expect(point).toBeInTheDocument();
      expect(pair).toHaveLength(2);
      expect(pair?.[1]).toHaveAttribute("cx", cx);
      expect(pair?.[1]).toHaveAttribute("cy", cy);
      expect(pair?.[1]).toHaveAttribute("fill", "none");
      expect(pair?.[1]).toHaveAttribute("stroke", color);
    });
  },
);
