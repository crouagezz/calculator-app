# GitHub Actions 自动构建APK指南

## 方法二：使用GitHub Actions自动构建APK

### 优势
- ✅ 无需安装Android Studio
- ✅ 无需配置本地环境
- ✅ 云端自动构建，速度快
- ✅ 每次推送代码自动构建
- ✅ 自动发布Release

### 操作步骤

#### 第一步：创建GitHub仓库

1. **注册GitHub账号**
   - 访问 https://github.com
   - 点击 "Sign up" 注册

2. **创建新仓库**
   - 点击右上角 "+" → "New repository"
   - Repository name: `calculator-app`
   - 选择 "Public"（免费）或 "Private"
   - 点击 "Create repository"

#### 第二步：上传代码到GitHub

**方法A：使用Git命令行**

```bash
# 1. 进入项目文件夹
cd calculator-app

# 2. 初始化Git仓库
git init

# 3. 添加所有文件
git add .

# 4. 提交代码
git commit -m "Initial commit"

# 5. 添加远程仓库（替换YOUR_USERNAME为你的GitHub用户名）
git remote add origin https://github.com/YOUR_USERNAME/calculator-app.git

# 6. 推送代码
git push -u origin main
```

**方法B：使用GitHub Desktop（推荐新手）**

1. 下载GitHub Desktop: https://desktop.github.com
2. 登录GitHub账号
3. 点击 "File" → "Add local repository"
4. 选择 `calculator-app` 文件夹
5. 点击 "Publish repository"

**方法C：直接上传**

1. 在GitHub仓库页面点击 "uploading an existing file"
2. 拖拽整个项目文件夹上传

#### 第三步：触发自动构建

1. **推送代码后自动触发**
   - 每次 `git push` 会自动触发构建

2. **手动触发**
   - 进入GitHub仓库
   - 点击 "Actions" 标签
   - 选择 "Build Android APK"
   - 点击 "Run workflow" → "Run workflow"

#### 第四步：下载APK

**方法A：从Artifacts下载（每次构建）**

1. 进入GitHub仓库
2. 点击 "Actions" 标签
3. 点击最新的工作流运行记录
4. 滚动到底部 "Artifacts" 部分
5. 点击 "app-debug" 下载APK

**方法B：从Releases下载（正式发布）**

1. 进入GitHub仓库
2. 点击右侧 "Releases"
3. 点击最新的Release版本
4. 下载 `app-debug.apk`

### 工作流程说明

```
推送代码 → GitHub Actions自动运行 → 构建APK → 上传到Artifacts → 发布Release
```

### 构建配置说明

工作流文件：`.github/workflows/build-apk.yml`

主要步骤：
1. **检出代码** - 获取最新代码
2. **安装Node.js** - 设置Node.js 20环境
3. **安装依赖** - 运行 `npm ci`
4. **构建Web** - 运行 `npm run build`
5. **设置JDK** - 安装Java 17
6. **设置Android SDK** - 安装Android构建工具
7. **同步Capacitor** - 同步Android平台
8. **构建APK** - 运行Gradle构建
9. **上传产物** - 保存APK文件
10. **发布Release** - 自动创建GitHub Release

### 常见问题

#### 1. 构建失败怎么办？
- 点击Actions → 失败的构建 → 查看日志
- 常见原因：
  - 代码编译错误
  - 依赖安装失败
  - 网络问题

#### 2. 如何修改构建配置？
- 编辑 `.github/workflows/build-apk.yml`
- 提交更改后自动生效

#### 3. 如何构建Release版本？
修改工作流文件中的：
```yaml
./gradlew assembleRelease --stacktrace
```
代替 `assembleDebug`

#### 4. 如何签名APK？
需要配置签名密钥，参考：
https://developer.android.com/studio/publish/app-signing

### 下一步

1. 创建GitHub仓库
2. 上传代码
3. 等待自动构建完成（约5-10分钟）
4. 下载APK安装到手机

### 需要帮助？

- GitHub Actions文档：https://docs.github.com/cn/actions
- Capacitor文档：https://capacitorjs.com/docs
