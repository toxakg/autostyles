// const SUPABASE_URL = "https://oekrtypfqaierhkhulab.supabase.co";
// const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9la3J0eXBmcWFpZXJoa2h1bGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDgwMTYsImV4cCI6MjA3ODQyNDAxNn0.61ouoN7hBsGFibzrijeNG7i6HOcukDImbQjYRBZjQiA';


// // Проверяем, загружена ли библиотека supabase
// if (typeof supabase === 'undefined') {
//     console.error('Supabase library not loaded! Check that the script is included.');
// } else {
//     // Создаем клиент с настройками
//     window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
//         auth: {
//             storageKey: 'supabase-auth-token',
//             storage: window.localStorage,
//             autoRefreshToken: true,
//             persistSession: true
//         }
//     });
    
//     // Алиас для обратной совместимости
//     window.supabaseClient = window.sb;
//     window.supabase = window.sb;
    
//     console.log('✅ Supabase client initialized successfully');
// }

/**
 * AUTOSTYLES — Supabase Client Initialization
 * Этот файл должен загружаться ПЕРЕД admin.js
 */

// Проверяем, загружена ли библиотека supabase
if (typeof supabase === 'undefined') {
    console.error('Supabase library not loaded! Check that the script is included.');
} else {
    // Создаем клиент с настройками
    window.sb = supabase.createClient(
        "https://oekrtypfqaierhkhulab.supabase.co",
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9la3J0eXBmcWFpZXJoa2h1bGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDgwMTYsImV4cCI6MjA3ODQyNDAxNn0.61ouoN7hBsGFibzrijeNG7i6HOcukDImbQjYRBZjQiA',
        {
            auth: {
                storageKey: 'supabase-auth-token',
                storage: window.localStorage,
                autoRefreshToken: true,
                persistSession: true
            }
        }
    );
    
    // Алиас для обратной совместимости
    window.supabaseClient = window.sb;
    window.supabase = window.sb;
    
    console.log('✅ Supabase client initialized successfully');
}
