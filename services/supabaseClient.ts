import { createClient } from '@supabase/supabase-js';

// NOTA: Em um ambiente de produção real (React/Vite), usamos import.meta.env.VITE_SUPABASE_URL
// Como estamos em um ambiente web direto aqui, usaremos as strings diretas que você forneceu.
// Quando for para o GitHub, o ideal é usar variáveis de ambiente.

const SUPABASE_URL = 'https://bivvbxhhzwbjappvgrdi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpdnZieGhoendiamFwcHZncmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTMzNjQsImV4cCI6MjA4MDE2OTM2NH0.PEhhnxsGM8XJrmnx40r7hiIk_BIqHqb-mky6zd_6gMs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);