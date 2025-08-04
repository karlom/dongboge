# Supabase 权限设置详细指南

## 🎯 目标

- 匿名用户（网站访客）可以提交表单数据
- 只有认证用户（管理员）可以查看和管理数据

## 📋 操作步骤

### 步骤 1：登录 Supabase 并创建表

1. 登录 [Supabase 控制台](https://supabase.com/dashboard)
2. 选择你的项目
3. 点击左侧菜单的 **"SQL Editor"**
4. 运行我提供的 `create-contact-table.sql` 脚本

### 步骤 2：启用行级安全（RLS）

在 SQL 编辑器中运行：

```sql
-- 启用RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
```

或者通过界面操作：

1. 点击左侧菜单的 **"Table Editor"**
2. 选择 `contact_submissions` 表
3. 点击表右上角的 **"Settings"** 按钮
4. 在弹出的设置中找到 **"Enable RLS"** 并开启

### 步骤 3：创建 RLS 策略

#### 3.1 允许匿名用户插入数据（表单提交）

```sql
CREATE POLICY "Allow anonymous insert" ON contact_submissions
    FOR INSERT
    TO anon
    WITH CHECK (true);
```

#### 3.2 允许认证用户查看所有数据

```sql
CREATE POLICY "Allow authenticated select" ON contact_submissions
    FOR SELECT
    TO authenticated
    USING (true);
```

#### 3.3 允许认证用户更新数据

```sql
CREATE POLICY "Allow authenticated update" ON contact_submissions
    FOR UPDATE
    TO authenticated
    USING (true);
```

#### 3.4 允许认证用户删除数据（可选）

```sql
CREATE POLICY "Allow authenticated delete" ON contact_submissions
    FOR DELETE
    TO authenticated
    USING (true);
```

### 步骤 4：通过界面管理 RLS 策略（可选）

你也可以通过 Supabase 界面来管理策略：

1. 点击左侧菜单的 **"Authentication"** → **"Policies"**
2. 找到 `contact_submissions` 表
3. 点击 **"New Policy"**
4. 选择操作类型（SELECT, INSERT, UPDATE, DELETE）
5. 选择目标角色（anon, authenticated）
6. 设置策略条件

## 🔑 获取 API 密钥

### 匿名访问密钥（anon key）

1. 点击左侧菜单的 **"Settings"** → **"API"**
2. 复制 **"anon public"** 密钥
3. 这个密钥用于前端表单提交

### 服务密钥（service_role key）

1. 在同一页面复制 **"service_role"** 密钥
2. 这个密钥用于管理后台（绕过 RLS）
3. ⚠️ **注意：服务密钥非常重要，不要暴露在前端代码中**

## 🧪 测试权限设置

### 测试匿名插入

使用 anon key 测试表单提交：

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_ANON_KEY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 这应该成功
const { data, error } = await supabase.from("contact_submissions").insert([
  {
    company_name: "测试公司",
    contact_name: "测试用户",
    phone: "13800138000",
    consultation_types: ["AI技术咨询"],
    requirements: "测试需求",
  },
]);
```

### 测试匿名查询（应该失败）

```javascript
// 这应该返回空结果或错误
const { data, error } = await supabase.from("contact_submissions").select("*");
```

### 测试认证用户查询

```javascript
// 首先需要用户登录
const { data: authData, error: authError } =
  await supabase.auth.signInWithPassword({
    email: "admin@example.com",
    password: "your-password",
  });

// 登录后可以查询数据
const { data, error } = await supabase.from("contact_submissions").select("*");
```

## 🔧 环境变量配置

在你的项目中设置环境变量：

```env
# .env.local
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🚨 安全注意事项

1. **anon key** 可以在前端使用，它受 RLS 策略限制
2. **service_role key** 绕过所有 RLS 策略，只能在服务端使用
3. 定期检查和更新 RLS 策略
4. 监控数据库访问日志

## 📊 策略验证

运行以下查询来验证策略是否正确设置：

```sql
-- 查看表的RLS状态
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'contact_submissions';

-- 查看所有策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'contact_submissions';
```

## 🎯 完整的策略设置脚本

```sql
-- 一次性设置所有策略
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- 匿名用户可以插入
CREATE POLICY "Allow anonymous insert" ON contact_submissions
    FOR INSERT TO anon WITH CHECK (true);

-- 认证用户可以查看
CREATE POLICY "Allow authenticated select" ON contact_submissions
    FOR SELECT TO authenticated USING (true);

-- 认证用户可以更新
CREATE POLICY "Allow authenticated update" ON contact_submissions
    FOR UPDATE TO authenticated USING (true);

-- 认证用户可以删除（可选）
CREATE POLICY "Allow authenticated delete" ON contact_submissions
    FOR DELETE TO authenticated USING (true);
```

这样设置后，你的表单就可以接受匿名提交，而只有登录的管理员才能查看和管理这些数据。
