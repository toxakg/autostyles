const SUPABASE_URL = "https://oekrtypfqaierhkhulab.supabase.co";
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9la3J0eXBmcWFpZXJoa2h1bGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDgwMTYsImV4cCI6MjA3ODQyNDAxNn0.61ouoN7hBsGFibzrijeNG7i6HOcukDImbQjYRBZjQiA';

if (typeof supabase === 'undefined') {
    console.error('Supabase library not loaded!');
} else {
    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            storageKey: 'supabase-auth-token',
            storage: window.localStorage,
            autoRefreshToken: true,
            persistSession: true
        }
    });
    console.log('Supabase client initialized with session persistence');
      window.supabaseClient = window.sb;
}

