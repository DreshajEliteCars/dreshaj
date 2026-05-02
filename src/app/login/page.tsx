"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "./page.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabase();
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace("/dashboard");
          return;
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabase();
    if (!supabase) {
      setError("Gabim në lidhjen me databazën.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Email ose fjalëkalim i pasaktë.");
      setLoading(false);
    } else {
      router.replace("/dashboard");
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div style={{ textAlign: 'center', padding: '50px' }}>Duke u ngarkuar...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.loginBox}>
          <h1 className={styles.title}>Kyçu</h1>
          <p className={styles.subtitle}>Qasu në panelin e administrimit</p>
          
          <form onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">Email adresa</label>
              <input 
                id="email"
                type="email" 
                className={styles.input} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@dreshaj.com"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="password">Fjalëkalimi</label>
              <input 
                id="password"
                type="password" 
                className={styles.input} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Duke u kyçur..." : "Kyçu"}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}
