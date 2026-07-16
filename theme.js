// Design tokens extracted directly from adaptiverecoverability.com's CSS.
// This file is the single source of truth for the portal's visual identity —
// every portal page should import from here rather than hardcoding colors,
// so the marketing site and the portal never drift apart as either evolves.

export const COLORS = {
  ink: "#0B1929",       // primary background
  panel: "#0F1D2C",     // card / section background
  panelAlt: "#122A52",  // secondary panel background (from dashboard)
  line: "#1E2D3D",      // borders, dividers
  gold: "#C9A24B",
  goldBright: "#D4AF6A",
  goldSoft: "#C9A961",  // dashboard's slightly warmer gold, used interchangeably
  silver: "#9FB4C7",
  silverLight: "#C7D4E2",
  white: "#E8ECF1",
  green: "#3D8B6E",
  yellow: "#D2B03C",
  amber: "#C9762B",
  rust: "#A33B2B",
};

export const FONTS = {
  display: "'Fraunces', serif",       // headings — optical sizing, weight 400 default
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace", // data, labels, eyebrows, technical values
};

export const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap";

// Shared type scale conventions used across the site — kept here as reference
// values rather than enforced classes, since some pages (e.g. the dashboard)
// use inline styles with slightly different but compatible naming.
export const TYPE = {
  eyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: COLORS.gold,
    fontWeight: 500,
  },
  h1: {
    fontFamily: FONTS.display,
    fontWeight: 400,
    color: COLORS.white,
    letterSpacing: "-0.01em",
  },
};

export const RADIUS = {
  sharp: 2,   // buttons, badges — matches the site's near-square corners
  card: 4,    // panels, demo blocks
};
