import React from 'react';
import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const from =
    location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setFormError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(
        err.message ||
          "Could not sign in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold text-ink">
            Document AI
          </h1>

          <p className="mt-2 text-sm text-ink-soft">
            Sign in to your knowledge base
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-sm border border-border bg-surface p-6 shadow-sm"
        >
          {formError && (
            <div className="mb-4 rounded-sm border border-error-600/30 bg-error-50 px-3 py-2 text-sm text-error-600">
              {formError}
            </div>
          )}

          <label
            className="mb-1 block text-sm font-medium text-ink"
            htmlFor="email"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal-600"
            placeholder="you@company.com"
          />

          <label
            className="mb-1 block text-sm font-medium text-ink"
            htmlFor="password"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal-600"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Signing in…"
              : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Don't have an account?{" "}

          <Link
            to="/register"
            className="font-medium text-teal-600 hover:text-teal-700"
          >
            Create one
          </Link>
        </p>

      </div>
    </div>
  );
}
