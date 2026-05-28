import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  console.log("Clicking Revision tab...");
  await page.getByRole("button", { name: /revision/i }).first().click();
  await page.waitForTimeout(2000);

  console.log("Clicking book 'Tutor System Architecture'...");
  await page.getByText("Tutor System Architecture").first().click({ force: true });
  await page.waitForTimeout(1000);

  console.log("Clicking Chapter 4 in the sidebar...");
  await page.getByText("Chapter 4: User Features").first().click();
  await page.waitForTimeout(1000);

  console.log("Applying dynamic shrink-0 fix to parent container...");
  const beforeAndAfter = await page.evaluate(`(() => {
    const sidebar = document.querySelector(".w-64.border-r");
    if (!sidebar) return { error: "Sidebar not found" };

    const parent = sidebar.parentElement;
    if (!parent) return { error: "Parent not found" };

    const getMetrics = () => {
      const computedParent = window.getComputedStyle(parent);
      const computedSidebar = window.getComputedStyle(sidebar);
      const scroller = document.querySelector(".custom-scroll");
      const computedScroller = scroller ? window.getComputedStyle(scroller) : null;
      return {
        parentHeight: computedParent.height,
        parentScrollHeight: parent.scrollHeight,
        sidebarHeight: computedSidebar.height,
        sidebarPosition: computedSidebar.position,
        sidebarTop: computedSidebar.top,
        scrollerHeight: computedScroller?.height,
        scrollerScrollHeight: scroller?.scrollHeight,
      };
    };

    const before = getMetrics();

    // Apply the fix: set flex-shrink to 0 on the parent container
    parent.style.flexShrink = "0";

    const after = getMetrics();

    return { before, after };
  })()`);

  console.log("Layout Metrics:", JSON.stringify(beforeAndAfter, null, 2));

  // Now let's scroll and take a screenshot to visually confirm
  console.log("Scrolling by 600px with the fix applied...");
  await page.evaluate(`(() => {
    const scroller = document.querySelector(".custom-scroll");
    if (scroller) {
      scroller.scrollTop = 600;
    }
  })()`);

  await page.waitForTimeout(1000);

  const outputDir = "/Users/mfuad16/.gemini/antigravity/brain/76b96699-aa61-47ab-a809-451dc061f0e6";
  await page.screenshot({ path: path.join(outputDir, "scratch_scrolled_with_fix.png") });
  console.log("Saved scratch_scrolled_with_fix.png");

  await browser.close();
}

main().catch(console.error);
