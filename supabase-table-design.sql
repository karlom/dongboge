-- 联系表单数据表设计
-- 表名: contact_submissions

CREATE TABLE contact_submissions (
    -- 主键和系统字段
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
    
    -- 咨询类型（存储为JSON数组）
    consultation_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- 需求描述
    requirements TEXT NOT NULL,
    
    -- 预算范围
    budget VARCHAR(50),
    
    -- 处理状态
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    
    -- 处理备注（内部使用）
    admin_notes TEXT,
    
    -- 处理人员
    handled_by VARCHAR(100),
    
    -- 处理时间
    handled_at TIMESTAMP WITH TIME ZONE,
    
    -- 来源信息
    source VARCHAR(50) DEFAULT 'website' NOT NULL,
    user_agent TEXT,
    ip_address INET,
    
    -- 约束
    CONSTRAINT valid_status CHECK (status IN ('pending', 'contacted', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 创建索引
CREATE INDEX idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_company_name ON contact_submissions(company_name);
CREATE INDEX idx_contact_submissions_contact_name ON contact_submissions(contact_name);
CREATE INDEX idx_contact_submissions_phone ON contact_submissions(phone);

-- 创建更新时间触发器
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

-- 添加表注释
COMMENT ON TABLE contact_submissions IS '联系表单提交记录';
COMMENT ON COLUMN contact_submissions.id IS '主键UUID';
COMMENT ON COLUMN contact_submissions.created_at IS '创建时间';
COMMENT ON COLUMN contact_submissions.updated_at IS '更新时间';
COMMENT ON COLUMN contact_submissions.company_name IS '企业名称';
COMMENT ON COLUMN contact_submissions.industry IS '所属行业';
COMMENT ON COLUMN contact_submissions.contact_name IS '联系人姓名';
COMMENT ON COLUMN contact_submissions.position IS '职位';
COMMENT ON COLUMN contact_submissions.phone IS '联系电话';
COMMENT ON COLUMN contact_submissions.email IS '邮箱地址';
COMMENT ON COLUMN contact_submissions.consultation_types IS '咨询类型（JSON数组）';
COMMENT ON COLUMN contact_submissions.requirements IS '具体需求描述';
COMMENT ON COLUMN contact_submissions.budget IS '预算范围';
COMMENT ON COLUMN contact_submissions.status IS '处理状态：pending-待处理, contacted-已联系, in_progress-处理中, completed-已完成, cancelled-已取消';
COMMENT ON COLUMN contact_submissions.admin_notes IS '管理员备注';
COMMENT ON COLUMN contact_submissions.handled_by IS '处理人员';
COMMENT ON COLUMN contact_submissions.handled_at IS '处理时间';
COMMENT ON COLUMN contact_submissions.source IS '来源渠道';
COMMENT ON COLUMN contact_submissions.user_agent IS '用户代理信息';
COMMENT ON COLUMN contact_submissions.ip_address IS 'IP地址';