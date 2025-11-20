const SUPABASE_URL = "https://oekrtypfqaierhkhulab.supabase.co";
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9la3J0eXBmcWFpZXJoa2h1bGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDgwMTYsImV4cCI6MjA3ODQyNDAxNn0.61ouoN7hBsGFibzrijeNG7i6HOcukDImbQjYRBZjQiA';

// Инициализация клиента
// Мы берем библиотеку из window.supabase и инициализируем клиент
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Делаем клиент доступным глобально для других скриптов (auth.js и cabinet.js)
window.supabase = client;