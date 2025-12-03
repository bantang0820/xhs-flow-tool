import { createClient } from '@supabase/supabase-js'

// 🔴 请将下面两行替换为你在 Supabase 设置里看到的真实数据
const supabaseUrl = 'https://ogeyqtgwfiwenuvmxibh.supabase.co' 
const supabaseKey = 'sb_publishable_0U-kKidbn_8D7dDZtCUaTg_CrV7Loze'

export const supabase = createClient(supabaseUrl, supabaseKey)
