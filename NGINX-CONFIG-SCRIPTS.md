# Nginx配置更新脚本说明

## 脚本概述

基于部署脚本中的Nginx配置逻辑，创建了两个专门的脚本来处理Nginx配置更新：

### 1. `deploy/update-nginx-config.sh` - 完整版本

**用途**: 手动运行，提供完整的Nginx配置更新和验证功能

**功能特性**:

- ✅ 自动备份现有配置
- ✅ 智能选择配置文件（按优先级）
- ✅ 生成标准配置（如果没有预设文件）
- ✅ 完整的配置测试和验证
- ✅ 详细的状态检查和响应测试
- ✅ 彩色输出和详细日志
- ✅ 错误回滚机制

**配置文件优先级**:

1. `deploy/nginx-working.conf` - 工作配置（基于服务器实际运行配置）
2. `deploy/nginx-fixed-routing.conf` - 固定路由配置
3. `deploy/nginx-server-mode.conf` - 服务器模式配置
4. `deploy/nginx.conf` - 默认配置
5. 自动生成标准配置

### 2. `deploy/deploy-nginx-config.sh` - 简化版本

**用途**: 部署流程中调用，轻量级配置更新

**功能特性**:

- ✅ 快速配置更新
- ✅ 基本备份功能
- ✅ 配置测试
- ✅ 适合自动化流程
- ✅ 最小化输出

## 使用方法

### 手动更新Nginx配置

```bash
# 在服务器上运行
cd /var/www/dongboge
sudo ./deploy/update-nginx-config.sh
```

### 部署时更新配置

```bash
# 在部署脚本中调用
./deploy/deploy-nginx-config.sh
```

## 配置文件结构

### 标准配置特性

- **SSL支持**: 自动HTTPS重定向
- **混合架构**: 静态文件 + 动态服务
- **代理配置**:
  - `/api/` → Node.js服务器
  - `/admin/` → Node.js服务器
  - `/contact` → Node.js服务器
- **静态资源优化**: 长期缓存
- **Gzip压缩**: 提升性能
- **安全头**: 基本安全配置

### 路由优先级

1. **动态路由** (最高优先级)
   - `/api/` - API端点
   - `/admin/` - 管理后台
   - `/contact` - 联系表单页面

2. **静态资源** (高优先级)
   - `.js`, `.css`, `.png`, `.jpg` 等

3. **静态页面** (默认)
   - HTML文件和其他内容

## 集成到部署脚本

### 在deploy.yml中使用

```yaml
- name: 更新Nginx配置
  script: |
    cd /var/www/dongboge
    chmod +x deploy/deploy-nginx-config.sh
    ./deploy/deploy-nginx-config.sh
```

### 在complete-deploy.yml中使用

```yaml
- name: 更新Nginx配置
  script: |
    cd /var/www/dongboge
    chmod +x deploy/deploy-nginx-config.sh
    ./deploy/deploy-nginx-config.sh

    # 重载Nginx
    sudo systemctl reload nginx
```

## 验证和测试

### 配置验证

脚本会自动执行以下验证：

- Nginx配置语法测试
- 服务重载测试
- 端口监听检查
- HTTP/HTTPS响应测试

### 手动验证命令

```bash
# 测试配置语法
sudo nginx -t

# 检查服务状态
sudo systemctl status nginx

# 测试网站响应
curl -I https://dongboge.cn/
curl -I https://dongboge.cn/contact
```

## 错误处理

### 自动回滚

如果配置更新失败，完整版本脚本会：

1. 自动恢复备份配置
2. 重新加载Nginx
3. 显示错误信息

### 常见问题解决

1. **权限问题**: 确保有sudo权限
2. **配置文件缺失**: 脚本会自动生成标准配置
3. **SSL证书问题**: 检查证书路径是否正确
4. **端口占用**: 检查是否有其他服务占用80/443端口

## 备份管理

### 备份文件命名

- 格式: `dongboge.conf.backup.YYYYMMDD-HHMMSS`
- 位置: `/etc/nginx/sites-available/`

### 恢复备份

```bash
# 查看备份文件
ls -la /etc/nginx/sites-available/dongboge.conf.backup.*

# 恢复特定备份
sudo cp /etc/nginx/sites-available/dongboge.conf.backup.20240205-143022 /etc/nginx/sites-available/dongboge.conf
sudo nginx -t && sudo systemctl reload nginx
```

## 注意事项

1. **权限要求**: 脚本需要sudo权限来修改Nginx配置
2. **服务依赖**: 确保Node.js服务在3000端口运行
3. **SSL证书**: 确保Let's Encrypt证书有效
4. **域名配置**: 脚本假设域名为dongboge.cn
5. **目录结构**: 脚本假设部署目录为/var/www/dongboge

## 自定义配置

如果需要自定义配置，可以：

1. 修改现有的配置文件模板
2. 创建新的配置文件并放在deploy目录
3. 修改脚本中的配置文件优先级

## 监控和日志

### 查看Nginx日志

```bash
# 访问日志
sudo tail -f /var/log/nginx/access.log

# 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 查看脚本执行日志

脚本执行时会输出详细的状态信息，包括：

- 配置文件选择
- 备份创建
- 测试结果
- 响应验证

这些脚本提供了一个可靠、自动化的方式来管理Nginx配置，确保部署过程中的配置更新能够顺利进行。
