// API端点：处理联系表单提交
import type { APIRoute } from 'astro';
import { submitContactForm } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 解析表单数据
    const formData = await request.formData();
    
    // 提取表单字段
    const companyName = formData.get('companyName') as string;
    const industry = formData.get('industry') as string;
    const contactName = formData.get('contactName') as string;
    const position = formData.get('position') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const requirements = formData.get('requirements') as string;
    const budget = formData.get('budget') as string;
    
    // 处理多选框数据
    const consultationTypesStr = formData.get('consultationTypes') as string;
    let consultationTypes: string[] = [];
    
    if (consultationTypesStr) {
      try {
        consultationTypes = JSON.parse(consultationTypesStr);
      } catch {
        // 如果JSON解析失败，尝试按逗号分割
        consultationTypes = consultationTypesStr.split(',').map(s => s.trim());
      }
    }

    // 验证必填字段
    if (!companyName || !contactName || !phone || !requirements) {
      return new Response(JSON.stringify({
        success: false,
        error: '请填写所有必填字段'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    if (consultationTypes.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: '请至少选择一种咨询类型'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // 准备提交数据
    const submissionData = {
      company_name: companyName,
      industry: industry || undefined,
      contact_name: contactName,
      position: position || undefined,
      phone: phone,
      email: email || undefined,
      consultation_types: consultationTypes,
      requirements: requirements,
      budget: budget || undefined,
    };

    // 提交到Supabase
    const result = await submitContactForm(submissionData);

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: '感谢您的咨询申请！我们将在24小时内与您联系。'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

  } catch (error) {
    console.error('API错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '服务器内部错误，请稍后重试'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};