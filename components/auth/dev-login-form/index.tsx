"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dev-login-form.module.scss";

export function DevLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("dev@bitbybit.local");
  const [username, setUsername] = useState("dev-user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/onboard");
      router.refresh();
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className={styles.devBadge}>DEV MODE</div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.submitButton} type="submit" disabled={loading}>
          {loading ? "..." : "Dev Login"}
        </button>
      </form>
    </div>
  );
}
