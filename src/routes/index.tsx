import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "~/lib/auth";
import toast from "react-hot-toast";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/pipeline" });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error("Credenciais inválidas. Tente novamente.");
    } else {
      navigate({ to: "/pipeline" });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "2.5rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ margin: "0 auto 1rem" }}
          >
            <rect width="56" height="56" rx="12" fill="#141414" />
            <text
              x="28"
              y="38"
              textAnchor="middle"
              fill="#d4d4d4"
              fontSize="22"
              fontWeight="700"
              fontFamily="Inter, sans-serif"
            >
              LA
            </text>
          </svg>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>
            LACrm
          </h1>
          <p style={{ margin: "0.5rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Faça login para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              htmlFor="email"
              style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--muted)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.8rem",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--foreground)",
                fontSize: "0.95rem",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--muted)" }}
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.8rem",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--foreground)",
                fontSize: "0.95rem",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "0.5rem",
              padding: "0.7rem",
              background: submitting ? "var(--border)" : "var(--foreground)",
              color: "var(--background)",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
