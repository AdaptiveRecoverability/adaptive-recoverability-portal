import React, { useState } from "react";
import Login from "./pages/Login";
import AppShell from "./components/AppShell";
import ARGCommercialAssessment from "./ARGCommercialAssessment"; // the dashboard file we've been iterating on

/**
 * Deliberately minimal auth state — no context provider, no router yet.
 * This is a starting skeleton, not a finished auth system: `session` is
 * just { email } for now. Swap handleLogin's body for a real call to
 * whatever auth backend gets chosen (custom JWT endpoint on the same
 * Railway service as the API, or a managed provider) — nothing else in
 * this file needs to change, since the rest of the app only depends on
 * `session` being truthy or null.
 */
export default function App() {
  const [session, setSession] = useState(null);

  const handleLogin = async (email, password) => {
    // TODO: replace with a real call, e.g.:
    // const res = await fetch(`${PORTAL_API_BASE_URL}/auth/login`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ email, password }),
    // });
    // if (!res.ok) throw new Error("Invalid email or password.");
    // const data = await res.json();
    // setSession({ email, token: data.token });
    throw new Error("Auth backend not connected yet — see App.jsx TODO.");
  };

  const handleSignOut = () => setSession(null);

  if (!session) {
    return <Login onSubmit={handleLogin} />;
  }

  return (
    <AppShell clientName={session.email} onSignOut={handleSignOut}>
      <ARGCommercialAssessment />
    </AppShell>
  );
}
