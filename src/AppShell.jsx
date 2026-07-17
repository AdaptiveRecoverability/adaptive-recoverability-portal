import React from "react";
import { COLORS, FONTS } from "../theme";

/**
 * Wraps every authenticated portal page. Deliberately mirrors the public
 * site's fixed header (same blur, same border, same brand mark treatment)
 * so a client moving from adaptiverecoverability.com into the portal never
 * feels like they've landed on a different product — just a different
 * section of the same one, the way an admin area should feel to a marketing
 * site.
 */
export default function AppShell({ clientName, onSignOut, children }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.ink, fontFamily: FONTS.body }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(11, 25, 41, 0.85)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/shield.png"
              alt="Adaptive Recoverability Systems"
              style={{ width: 28, height: 28, objectFit: "contain" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <div
                style={{
                  fontSize: 12.5,
                  letterSpacing: "0.12em",
                  color: COLORS.white,
                  fontWeight: 500,
                }}
              >
                ADAPTIVE <span style={{ color: COLORS.gold }}>RECOVERABILITY</span>
              </div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 9.5,
                  letterSpacing: "0.04em",
                  color: COLORS.silver,
                  opacity: 0.75,
                }}
              >
                CLIENT PORTAL
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {clientName && (
              <span style={{ fontSize: 13, color: COLORS.silver, fontFamily: FONTS.body }}>
                {clientName}
              </span>
            )}
            {onSignOut && (
              <button
                onClick={onSignOut}
                style={{
                  background: "transparent",
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 2,
                  color: COLORS.silver,
                  padding: "8px 16px",
                  fontFamily: FONTS.body,
                  fontSize: 12.5,
                  letterSpacing: "0.03em",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLORS.gold;
                  e.currentTarget.style.color = COLORS.goldBright;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = COLORS.line;
                  e.currentTarget.style.color = COLORS.silver;
                }}
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
