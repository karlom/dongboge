# Supabase 联系表单数据表设计说明

## 📊 表结构概览

**表名**: `contact_submissions`  
**用途**: 存储网站联系表单提交的数据  
**预计数据量**: 中等（每月几百到几千条记录）

## 🏗️ 字段详细说明

### 🔑 系统字段

| 字段名       | 类型                     | 约束                    | 说明                     |
| ------------ | ------------------------ | ----------------------- | ------------------------ |
| `id`         | UUID                     | PRIMARY KEY             | 主键，自动生成 UUID      |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 记录创建时间             |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 记录更新时间（自动更新） |

### 🏢 企业信息

| 字段名         | 类型         | 约束     | 说明     | 表单字段对应  |
| -------------- | ------------ | -------- | -------- | ------------- |
| `company_name` | VARCHAR(255) | NOT NULL | 企业名称 | `companyName` |
| `industry`     | VARCHAR(100) | 可选     | 所属行业 | `industry`    |

### 👤 联系人信息

| 字段名         | 类型         | 约束     | 说明       | 表单字段对应  |
| -------------- | ------------ | -------- | ---------- | ------------- |
| `contact_name` | VARCHAR(100) | NOT NULL | 联系人姓名 | `contactName` |
| `position`     | VARCHAR(100) | 可选     | 职位       | `position`    |

### 📞 联系方式

| 字段名  | 类型         | 约束               | 说明     | 表单字段对应 |
| ------- | ------------ | ------------------ | -------- | ------------ |
| `phone` | VARCHAR(20)  | NOT NULL           | 联系电话 | `phone`      |
| `email` | VARCHAR(255) | 可选，邮箱格式验证 | 邮箱地址 | `email`      |

### 💼 咨询信息

| 字段名               | 类型        | 约束                   | 说明         | 表单字段对应              |
| -------------------- | ----------- | ---------------------- | ------------ | ------------------------- |
| `consultation_types` | JSONB       | NOT NULL, DEFAULT '[]' | 咨询类型数组 | `consultationType` 多选框 |
| `requirements`       | TEXT        | NOT NULL               | 具体需求描述 | `requirements`            |
| `budget`             | VARCHAR(50) | 可选                   | 预算范围     | `budget`                  |

### 📋 处理状态

| 字段名        | 类型                     | 约束                        | 说明           |
| ------------- | ------------------------ | --------------------------- | -------------- |
| `status`      | VARCHAR(20)              | NOT NULL, DEFAULT 'pending' | 处理状态       |
| `admin_notes` | TEXT                     | 可选                        | 管理员内部备注 |
| `handled_by`  | VARCHAR(100)             | 可选                        | 处理人员姓名   |
| `handled_at`  | TIMESTAMP WITH TIME ZONE | 可选                        | 处理时间       |

### 🔍 来源信息

| 字段名       | 类型        | 约束                        | 说明               |
| ------------ | ----------- | --------------------------- | ------------------ |
| `source`     | VARCHAR(50) | NOT NULL, DEFAULT 'website' | 来源渠道           |
| `user_agent` | TEXT        | 可选                        | 浏览器用户代理信息 |
| `ip_address` | INET        | 可选                        | 用户 IP 地址       |

## 📝 状态枚举值

`status` 字段的可选值：

| 值            | 说明   | 使用场景                     |
| ------------- | ------ | ---------------------------- |
| `pending`     | 待处理 | 新提交的表单，默认状态       |
| `contacted`   | 已联系 | 已经联系客户，等待进一步沟通 |
| `in_progress` | 处理中 | 正在为客户提供咨询服务       |
| `completed`   | 已完成 | 咨询服务已完成               |
| `cancelled`   | 已取消 | 客户取消或无效咨询           |

## 🎯 咨询类型示例

`consultation_types` 字段存储的 JSON 数组示例：

```json
["AI技术咨询", "智能体定制", "Dify私有化部署"]
```

对应表单中的多选框选项：

- AI 技术咨询
- 智能体（Agent）定制
- Dify 私有化部署
- 企业 AI 内训

## 🔧 索引策略

为了优化查询性能，创建了以下索引：

1. **时间索引**: `idx_contact_submissions_created_at` - 按创建时间降序排列
2. **状态索引**: `idx_contact_submissions_status` - 按处理状态查询
3. **企业名称索引**: `idx_contact_submissions_company_name` - 企业名称搜索
4. **联系人索引**: `idx_contact_submissions_contact_name` - 联系人姓名搜索
5. **电话索引**: `idx_contact_submissions_phone` - 电话号码查询

## 🛡️ 数据约束

1. **邮箱格式验证**: 使用正则表达式验证邮箱格式
2. **状态值约束**: 限制 status 字段只能使用预定义的枚举值
3. **必填字段**: 企业名称、联系人姓名、电话、需求描述为必填
4. **自动时间戳**: 创建和更新时间自动维护

## 🔄 触发器

创建了 `update_updated_at_column()` 触发器，自动更新 `updated_at` 字段。

## 📊 使用示例

### 插入新记录

```sql
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
    '广州科技有限公司',
    '互联网科技',
    '张三',
    'CTO',
    '13800138000',
    'zhangsan@example.com',
    '["AI技术咨询", "智能体定制"]'::jsonb,
    '希望了解如何在我们的产品中集成AI功能',
    '10-20万'
);
```

### 查询待处理的记录

```sql
SELECT
    id,
    company_name,
    contact_name,
    phone,
    consultation_types,
    created_at
FROM contact_submissions
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### 更新处理状态

```sql
UPDATE contact_submissions
SET
    status = 'contacted',
    handled_by = '东波哥',
    handled_at = NOW(),
    admin_notes = '已通过电话联系客户，约定明天上午10点进行详细咨询'
WHERE id = 'your-uuid-here';
```

## 🔐 权限建议

在 Supabase 中建议设置以下 RLS（Row Level Security）策略：

1. **公开插入**: 允许匿名用户插入新记录（表单提交）
2. **管理员查看**: 只有认证的管理员可以查看所有记录
3. **管理员更新**: 只有认证的管理员可以更新记录状态和备注

这样的设计既保证了表单数据的完整性，又便于后续的客户关系管理和数据分析。
