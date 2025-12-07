import { createClient } from '@supabase/supabase-js'

// 🔴 请将下面两行替换为你在 Supabase 设置里看到的真实数据
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ogeyqtgwfiwenuvmxibh.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZXlxdGd3Zml3ZW51dm14aWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNzU2NjAsImV4cCI6MjA0ODk1MTY2MH0.0U-kKidbn_8D7dDZtCUaTg_CrV7Loze8IjRkPEfwSAo'

export const supabase = createClient(supabaseUrl, supabaseKey)
