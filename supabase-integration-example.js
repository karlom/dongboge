// Supabase前端集成示例
// 这个文件展示如何在联系表单中集成Supabase

// 1. 安装Supabase客户端
// npm install @supabase/supabase-js

// 2. 创建Supabase客户端配置
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 3. 表单提交函数
async function submitContactForm(formData) {
  try {
    // 准备数据
    const submissionData = {
      company_name: formData.get('companyName'),
      industry: formData.get('industry'),
      contact_name: formData.get('contactName'),
      position: formData.get('position'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      consultation_types: JSON.parse(formData.get('consultationTypes') || '[]'),
      requirements: formData.get('requirements'),
      budget: formData.get('budget'),
      source: 'website',
      user_agent: navigator.userAgent,
      // IP地址需要通过服务端获取
    }

    // 提交到Supabase
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert([submissionData])
      .select()

    if (error) {
      throw error
    }

    console.log('表单提交成功:', data)
    return { success: true, data }

  } catch (error) {
    console.error('表单提交失败:', error)
    return { success: false, error: error.message }
  }
}

// 4. 修改现有表单的提交处理
document.getElementById('contactForm')?.addEventListener('submit', async function(e) {
  e.preventDefault() // 阻止默认提交

  const formData = new FormData(e.target)
  
  // 处理多选框数据
  const consultationTypes = Array.from(
    document.querySelectorAll('input[name="consultationType"]:checked')
  ).map(cb => cb.value)
  
  formData.set('consultationTypes', JSON.stringify(consultationTypes))

  // 显示加载状态
  const submitBtn = e.target.querySelector('button[type="submit"]')
  const originalText = submitBtn.innerHTML
  submitBtn.disabled = true
  submitBtn.innerHTML = '<svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2 inline animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>提交中...'

  try {
    // 提交表单
    const result = await submitContactForm(formData)

    if (result.success) {
      // 成功处理
      alert('感谢您的咨询申请！我们将在24小时内与您联系。')
      e.target.reset() // 重置表单
    } else {
      // 错误处理
      alert('提交失败，请稍后重试：' + result.error)
    }
  } catch (error) {
    alert('网络错误，请检查网络连接后重试')
  } finally {
    // 恢复按钮状态
    submitBtn.disabled = false
    submitBtn.innerHTML = originalText
  }
})

// 5. 管理后台查询示例（需要认证）
async function getContactSubmissions() {
  try {
    // 首先检查用户是否已登录
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('需要登录才能查看数据')
    }

    // 查询所有提交记录
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('查询失败:', error)
    return null
  }
}

// 6. 更新记录状态示例（需要认证）
async function updateSubmissionStatus(id, status, notes) {
  try {
    const { data, error } = await supabase
      .from('contact_submissions')
      .update({
        status: status,
        admin_notes: notes,
        handled_by: '管理员姓名',
        handled_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('更新失败:', error)
    return null
  }
}

// 7. 用户认证示例（管理员登录）
async function signInAdmin(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })

    if (error) {
      throw error
    }

    console.log('登录成功:', data)
    return data
  } catch (error) {
    console.error('登录失败:', error)
    return null
  }
}

// 8. 退出登录
async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
    console.log('退出成功')
  } catch (error) {
    console.error('退出失败:', error)
  }
}

// 导出函数供其他文件使用
export {
  supabase,
  submitContactForm,
  getContactSubmissions,
  updateSubmissionStatus,
  signInAdmin,
  signOut
}