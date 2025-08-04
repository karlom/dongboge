-- 在Supabase SQL编辑器中运行此脚本创建联系表单数据表

-- 1. 创建主表
CREATE TABLE contact_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- 企业信息
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    
    -- 联系人信息
    contact_name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    
    -- 联系方式
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    
    -- 咨询信息
    consultation_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    requirements TEXT NOT NULL,
    budget VARCHAR(50),
    
    -- 处理状态
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    admin_notes TEXT,
    handled_by VARCHAR(100),
    handled_at TIMESTAMP WITH TIME ZONE,
    
    -- 来源信息
    source VARCHAR(50) DEFAULT 'website' NOT NULL,
    user_agent TEXT,
    ip_address INET,
    
    -- 约束
    CONSTRAINT valid_status CHECK (status IN ('pending', 'contacted', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 2. 创建索引
CREATE INDEX idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_company_name ON contact_submissions(company_name);

-- 3. 创建自动更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contact_submissions_updated_at 
    BEFORE UPDATE ON contact_submissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 启用RLS（行级安全）
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- 5. 创建策略：允许匿名用户插入（表单提交）
CREATE POLICY "Allow anonymous insert" ON contact_submissions
    FOR INSERT 
    TO anon 
    WITH CHECK (true);

-- 6. 创建策略：只有认证用户可以查看和更新（管理员）
CREATE POLICY "Allow authenticated select" ON contact_submissions
    FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated update" ON contact_submissions
    FOR UPDATE 
    TO authenticated 
    USING (true);

-- 7. 插入测试数据（可选）
INSERT INTO contact_submissions (
    company_name,
    industry,
    contact_name,
    position,
    phone,
    email,
    consultation_types,
    requirements,
    budget
) VALUES (
    '测试科技有限公司',
    '互联网科技',
    '测试用户',
    'CTO',
    '13800138000',
    'test@example.com',
    '["AI技术咨询", "智能体定制"]'::jsonb,
    '这是一条测试数据，用于验证表结构是否正确',
    '10-20万'
);