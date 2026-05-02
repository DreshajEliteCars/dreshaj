"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import LocalCarsManager from "../../components/LocalCarsManager";
import AppSettingsManager from "../../components/AppSettingsManager";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        router.push("/login");
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ padding: '100px', textAlign: 'center', minHeight: '60vh' }}>Duke u ngarkuar...</div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', minHeight: 'calc(100vh - 200px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Paneli i Menaxhimit (Dashboard)</h1>
          <button 
            onClick={async () => {
              await getSupabase()?.auth.signOut();
              router.push('/login');
            }}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#dc3545', 
              color: 'white',
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Dil (Log out)
          </button>
        </div>
        
        <AppSettingsManager />
        <LocalCarsManager />
      </div>
      <Footer />
    </>
  );
}
