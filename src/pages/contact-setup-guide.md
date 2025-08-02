# 表单数据接收配置指南

## 方案 1：Formspree（推荐，适用于任何静态网站）

### 步骤：

1. 访问 https://formspree.io
2. 注册账号
3. 创建新表单，获得表单 ID
4. 修改 contact.astro 中的表单 action

```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST"></form>
```

### 查看数据：

- Formspree 控制台：https://formspree.io/forms
- 邮件通知：自动发送到你的邮箱

---

## 方案 2：Netlify Forms（如果部署在 Netlify）

### 当前已配置，查看方式：

1. 登录 https://app.netlify.com
2. 选择网站 → Forms 标签页
3. 查看所有提交数据

---

## 方案 3：EmailJS（直接发邮件）

### 步骤：

1. 访问 https://www.emailjs.com
2. 注册并配置邮件服务
3. 获取 Service ID、Template ID、Public Key
4. 修改 JavaScript 代码

---

## 方案 4：自建后端 API

如果需要更复杂的数据处理，可以：

1. 创建 Node.js/Python 后端
2. 配置数据库存储
3. 提供管理界面

---

## 推荐配置

对于个人网站，推荐使用 Formspree：

- 免费额度：每月 50 次提交
- 自动邮件通知
- 垃圾邮件过滤
- 简单易用
