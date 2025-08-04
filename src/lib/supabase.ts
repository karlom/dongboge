// Supabase客户端配置
import { createClient } from '@supabase/supabase-js'

// 从环境变量获取配置
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 表单提交数据类型定义
export interface ContactSubmission {
  company_name: string
  industry?: string
  contact_name: string
  position?: string
  phone: string
  email?: string
  consultation_types: string[]
  requirements: string
  budget?: string
  source?: string
  user_agent?: string
}

// 提交联系表单到Supabase
export async function submitContactForm(data: ContactSubmission) {
  try {
    const { error } = await supabase
      .from('contact_submissions')
      .insert([{
        ...data,
        source: 'website',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      }])
      // 移除 .select() 避免权限问题

    if (error) {
      throw error
    }

    return { success: true, data: null }
  } catch (error) {
    console.error('表单提交失败:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '提交失败，请稍后重试' 
    }
  }
}

// 获取所有提交记录（需要认证）
export async function getContactSubmissions() {
  try {
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('查询失败:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '查询失败' 
    }
  }
}

// 更新提交记录状态（需要认证）
export async function updateSubmissionStatus(
  id: string, 
  status: string, 
  notes?: string,
  handledBy?: string
) {
  try {
    const { data, error } = await supabase
      .from('contact_submissions')
      .update({
        status,
        admin_notes: notes,
        handled_by: handledBy,
        handled_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('更新失败:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '更新失败' 
    }
  }
}