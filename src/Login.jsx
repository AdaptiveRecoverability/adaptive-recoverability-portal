import React, { useState } from "react";
import { COLORS, FONTS } from "../theme";

/**
 * Client entry point. Deliberately plain — no marketing copy, no illustration,
 * because a returning client wants the fastest possible path to their
 * assessment, not a second hero moment. The gold accent and hairline border
 * carry the brand; everything else stays quiet.
 *
 * onSubmit(email, password) => Promise — left to the caller so this component
 * has no opinion about which auth backend (custom JWT, Auth0, etc.) is used.
 */
export default function Login({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err.message || "Sign-in failed. Check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONTS.body,
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img
            src="/shield.png"
            alt="Adaptive Recoverability Systems"
            style={{ width: 72, height: 72, objectFit: "contain", margin: "0 auto 20px", display: "block" }}
          />
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: COLORS.gold,
              marginBottom: 10,
            }}
          >
            Client Portal
          </div>
          <h1
            style={{
              fontFamily: FONTS.display,
              fontWeight: 400,
              fontSize: 22,
              color: COLORS.white,
              margin: 0,
            }}
          >
            Sign in to your assessment
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 4,
            padding: 32,
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 12,
              letterSpacing: "0.04em",
              color: COLORS.silver,
              marginBottom: 8,
            }}
          >
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="you@institution.com"
          />

          <label
            style={{
              display: "block",
              fontSize: 12,
              letterSpacing: "0.04em",
              color: COLORS.silver,
              margin: "20px 0 8px",
            }}
          >
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="••••••••"
          />

          {error && (
            <div
              style={{
                marginTop: 16,
                fontSize: 12.5,
                color: COLORS.rust,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              marginTop: 24,
              padding: "13px 0",
              borderRadius: 2,
              border: "none",
              background: isSubmitting
                ? COLORS.line
                : `linear-gradient(135deg, ${COLORS.goldBright}, ${COLORS.gold})`,
              color: isSubmitting ? COLORS.silver : COLORS.ink,
              fontSize: 13,
              letterSpacing: "0.05em",
              fontWeight: 500,
              cursor: isSubmitting ? "wait" : "pointer",
            }}
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* No "forgot password" / self-serve signup yet — those need a real
            auth backend decision first. Placeholder removed deliberately
            rather than linking to a flow that doesn't exist. */}
        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 12.5,
            color: COLORS.silver,
            opacity: 0.8,
          }}
        >
          Access issues? Contact your account representative.
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 14px",
  borderRadius: 2,
  border: `1px solid ${COLORS.line}`,
  background: COLORS.ink,
  color: COLORS.white,
  fontFamily: FONTS.body,
  fontSize: 14,
  outline: "none",
};
