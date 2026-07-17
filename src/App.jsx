import React, { useState } from "react";
import Login from "./pages/Login";
import AppShell from "./components/AppShell";
import ARGCommercialAssessment from "./ARGCommercialAssessment"; // the dashboard file we've been iterating on

/**
 * Deliberately minimal auth state — no context provider, no router yet.
 * This is a starting skeleton, not a finished auth system: `session` is
 * just { email } for now.
 */
export default function App() {
  const [session, setSession] = useState(null);

  const handleLogin = async (email, password) => {
    // TEMPORARY — accepts any email/password to test the portal → API
    // wiring end-to-end. This is NOT real authentication and provides
    // no actual access control. Replace with a real call before this
    // portal is used with actual clients or client evidence, e.g.:
    // const res = await fetch(`${PORTAL_API_BASE_URL}/auth/login`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ email, password }),
    // });
    // if (!res.ok) throw new Error("Invalid email or password.");
    // const data = await res.json();
    // setSession({ email, token: data.token });
    setSession({ email });
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
