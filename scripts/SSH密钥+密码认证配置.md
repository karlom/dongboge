# SSH密钥+密码认证配置说明

## 概述

简化部署脚本现在支持SSH密钥文件+密码的组合认证方式，这是一种更安全的认证方法。

## 环境变量配置

### 必需的环境变量

```bash
# 服务器基本信息
HOST=your-server-ip-or-domain
USERNAME=your-username
PORT=22  # 可选，默认22

# SSH认证配置
SSH_KEY_PATH=~/.ssh/id_rsa  # SSH密钥文件路径
SSH_PASSPHRASE=your-key-password  # SSH密钥的密码

# 部署路径
DEPLOY_PATH=/var/www/dongboge/client  # 可选，有默认值
```

### 可选的环境变量（用于CI/CD）

```bash
# 如果在CI/CD环境中，可以直接提供密钥内容
SSH_PRIVATE_KEY="-----BEGIN OPENSSH PRIVATE KEY-----
your-private-key-content-here
-----END OPENSSH PRIVATE KEY-----"
```

## 本地开发配置

### 1. 创建 .env 文件

在项目根目录创建 `.env` 文件：

```bash
# 服务器配置
HOST=your-server.com
USERNAME=your-username
PORT=22
SSH_KEY_PATH=~/.ssh/id_rsa
SSH_PASSPHRASE=your-key-password

# CDN配置（可选）
TENCENT_SECRET_ID=your-secret-id
TENCENT_SECRET_KEY=your-secret-key
TENCENT_COS_BUCKET=your-bucket-name
TENCENT_COS_REGION=ap-guangzhou
```

### 2. 确保SSH密钥文件存在

```bash
# 检查密钥文件是否存在
ls -la ~/.ssh/id_rsa

# 如果不存在，生成新的密钥对
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
```

### 3. 将公钥添加到服务器

```bash
# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/id_rsa.pub your-username@your-server.com

# 或手动添加
cat ~/.ssh/id_rsa.pub | ssh your-username@your-server.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

## GitHub Actions配置

在GitHub仓库的Settings > Secrets and variables > Actions中添加以下secrets：

```
HOST=your-server.com
USERNAME=your-username
PORT=22
SSH_PRIVATE_KEY=<your-private-key-content>
SSH_PASSPHRASE=your-key-password
```

## 测试配置

### 1. 测试SSH连接

```bash
# 测试服务器连接
npm run deploy:test-server
```

### 2. 测试完整流程

```bash
# 测试整个部署流程（不实际部署）
npm run deploy:test
```

### 3. 手动SSH测试

```bash
# 手动测试SSH连接
ssh -i ~/.ssh/id_rsa -p 22 your-username@your-server.com
```

## 系统要求

### 本地环境

- **Node.js** 18+
- **expect** 工具（用于处理密码输入）

安装expect：

```bash
# macOS
brew install expect

# Ubuntu/Debian
sudo apt-get install expect

# CentOS/RHEL
sudo yum install expect
```

### 服务器环境

- **SSH服务** 正常运行
- **rsync** 已安装
- **正确的目录权限**

## 故障排除

### 1. SSH连接失败

```bash
# 检查SSH配置
ssh -v -i ~/.ssh/id_rsa your-username@your-server.com

# 检查密钥权限
chmod 600 ~/.ssh/id_rsa
chmod 700 ~/.ssh
```

### 2. 密码认证失败

```bash
# 确认密钥密码正确
ssh-keygen -y -f ~/.ssh/id_rsa
# 会提示输入密码，确认密码正确
```

### 3. expect工具未安装

```bash
# 检查expect是否安装
which expect

# 如果未安装，按上面的方法安装
```

### 4. 权限问题

```bash
# 检查服务器目录权限
ssh your-username@your-server.com "ls -la /var/www/"

# 确保用户有写权限
ssh your-username@your-server.com "sudo chown -R your-username:your-username /var/www/dongboge"
```

## 安全建议

1. **密钥权限**：确保私钥文件权限为600
2. **密码强度**：使用强密码保护私钥
3. **定期更换**：定期更换SSH密钥和密码
4. **限制访问**：在服务器上限制SSH访问的IP地址
5. **备份密钥**：安全备份SSH密钥文件

## 使用示例

### 本地测试

```bash
# 1. 设置环境变量
export HOST=your-server.com
export USERNAME=your-username
export SSH_KEY_PATH=~/.ssh/id_rsa
export SSH_PASSPHRASE=your-password

# 2. 测试连接
npm run deploy:test-server

# 3. 运行简化部署
npm run deploy:simple
```

### CI/CD环境

GitHub Actions会自动使用配置的secrets，无需额外设置。

## 常见问题

### Q: 为什么需要密钥+密码？

A: 这提供了双重认证，即使密钥文件泄露，没有密码也无法使用。

### Q: 可以只使用密码吗？

A: 不建议，密钥认证比密码认证更安全。

### Q: expect工具是必需的吗？

A: 是的，用于自动输入SSH密钥密码。

### Q: 如何在Windows上使用？

A: 建议使用WSL或Git Bash，确保安装了expect工具。
