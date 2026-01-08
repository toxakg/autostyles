// js/supabaseClient.js

// 1. Определение ключей
const SUPABASE_URL = "https://oekrtypfqaierhkhulab.supabase.co";
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9la3J0eXBmcWFpZXJoa2h1bGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDgwMTYsImV4cCI6MjA3ODQyNDAxNn0.61ouoN7hBsGFibzrijeNG7i6HOcukDImbQjYRBZjQiA';


// 2. Проверяем, загрузилась ли библиотека
if (typeof supabase === 'undefined') {
    console.error('Supabase library not loaded!');
} else {
    // 3. Создаем клиента ОДИН раз, используя настройки сессии для запоминания входа
    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            // Эти настройки решают проблему "не запоминает вход"
            storageKey: 'supabase-auth-token',
            storage: window.localStorage,      // Хранить в localStorage
            autoRefreshToken: true,
            persistSession: true
        }
    });
    console.log('Supabase client initialized with session persistence');
}

// Убедитесь, что больше нет дублирующих строк ниже этого блока.