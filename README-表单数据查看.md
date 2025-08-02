# 如何查看用户提交的表单数据

## 当前配置：Netlify Forms

你的联系表单已经配置为使用 Netlify Forms。以下是查看用户提交数据的方法：

### 方法 1：Netlify 控制台（推荐）

1. **登录 Netlify**

   - 访问：https://app.netlify.com
   - 使用你的账号登录

2. **选择网站**

   - 在仪表板中找到并点击你的网站

3. **查看表单数据**
   - 点击顶部导航栏的 "Forms" 标签
   - 你会看到所有提交的表单数据
   - 可以查看详细信息、导出数据、设置通知等

### 方法 2：邮件通知（可选配置）

在 Netlify Forms 设置中，你可以：

- 设置邮件通知，每次有新提交时收到邮件
- 配置 Slack 通知
- 设置 Webhook 集成

## 如果网站不在 Netlify 部署

如果你的网站部署在其他平台，可以切换到以下服务：

### 选项 1：Formspree

1. 注册 https://formspree.io
2. 创建表单获得 ID
3. 修改表单 action 为：`https://formspree.io/f/YOUR_FORM_ID`

### 选项 2：Netlify Forms（静态表单）

即使不在 Netlify 部署，也可以使用 Netlify 的表单服务：

1. 在 Netlify 创建一个简单的静态站点
2. 使用 Netlify 的表单端点

### 选项 3：EmailJS

直接发送到你的邮箱：

1. 注册 https://www.emailjs.com
2. 配置邮件模板
3. 修改 JavaScript 代码

## 表单字段说明

用户提交的数据包含以下字段：

- `companyName`: 企业名称
- `industry`: 所属行业
- `contactName`: 联系人姓名
- `position`: 职位
- `phone`: 联系电话
- `email`: 邮箱地址
- `consultationTypes`: 咨询类型（多选，用逗号分隔）
- `requirements`: 具体需求描述
- `budget`: 预算范围

## 数据安全

- 所有数据都通过 HTTPS 加密传输
- Netlify 提供垃圾邮件过滤
- 可以设置数据保留期限
- 支持 GDPR 合规性

## 需要帮助？

如果需要修改表单配置或切换到其他服务，请告诉我你的具体需求。
