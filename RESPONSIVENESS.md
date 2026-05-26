# Responsive Design Guidelines

## Breakpoints Overview
Breakpoints are screen-width checks in our CSS/Tailwind configuration that apply specific layout rules.

### Types of Breakpoints
- **Layout breakpoints:** For overall page layout adjustments.
- **Component breakpoints:** For inner layout adjustments on individual components.
- **Orientation breakpoints:** For adjustments based on device orientation (portrait/landscape).
- **Content- and device-based breakpoints:** Adding breakpoints when content naturally dictates rather than targeting specific devices.

## Tailwind Breakpoint Mapping
Our conceptual sizes map to Tailwind CSS default breakpoints as follows:
- **Extra Small (XS)** (320px, 360px): Base default styles without prefix.
- **Small (S)** (480px, 640px): Maps to `sm:` prefix (min-width: 640px).
- **Medium (M)** (768px, 1024px): Maps to `md:` (min-width: 768px) and `lg:` (min-width: 1024px) prefixes.
- **Large (L)** (1200px, 1440px): Maps to `xl:` prefix (min-width: 1280px).
- **Extra Large (XL)** (1920px): Maps to `2xl:` prefix (min-width: 1536px).

## Best Practices

### 1. Mobile-First Design
- Always start styling for the smallest screen size (Extra Small) without any Tailwind breakpoint prefixes.
- Use breakpoint prefixes (e.g., `sm:`, `md:`, `lg:`) to progressively enhance the UI and apply overrides as the screen width increases.

### 2. Component Layout
- **Flexbox and CSS Grid:** Lean heavily on Flexbox and Grid to build flexible, fluid layouts that adapt efficiently across various viewports.
- Avoid fixed widths for containers. Use responsive sizing and percentage widths.

### 3. Typography Scaling
- Adjust typography sizes based on the screen width using Tailwind's responsive text classes (e.g., `text-sm md:text-base lg:text-lg`).
- Ensure line height (`leading`) and letter spacing (`tracking`) adjust accordingly for readability on larger screens.

### 4. Testing & Validation
- Continuously test components and layouts across all designated screen sizes to ensure breakpoints provide a seamless transition without broken layouts.
