import { createClient } from '@supabase/supabase-js'

// 🔴 请将下面两行替换为你在 Supabase 设置里看到的真实数据
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ogeyqtgwfiwenuvmxibh.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZXlxdGd3Zml3ZW51dm14aWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NDU4NzEsImV4cCI6MjA4MDIyMTg3MX0.xwsCidGOViwbxmTJs1w493wIiC6G3ARJ9-w4r0643Tk'

export const supabase = createClient(supabaseUrl, supabaseKey)
