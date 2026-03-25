# Timekettle 翻译引擎测评系统

双盲 A/B 测试系统，用于对比"自研离线翻译引擎"与"讯飞离线翻译引擎"的翻译效果。

## 技术栈

- **后端**: Python FastAPI + SQLite + SQLAlchemy
- **前端**: React + TypeScript + Vite + Tailwind CSS

## 快速开始

### 环境要求

- Python 3.9+
- Node.js 18+

### 安装依赖

```bash
# 安装后端依赖
cd backend && pip3 install -r requirements.txt && cd ..

# 安装前端依赖
cd frontend && npm install && cd ..
```

### 启动服务

**生产模式** (构建前端 → 后端服务同时提供静态文件):

```bash
./start.sh
```

访问 http://localhost:8000

**开发模式** (前后端热重载):

```bash
./dev.sh
```

访问 http://localhost:5173

### 默认账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | admin | admin123 |

## 使用流程

### 管理员

1. 使用管理员账号登录
2. 在"语言对管理"中创建语言对（如 `zh-en`, `中文 → 英语`）
3. 进入语言对，上传语料（支持单条添加或 Excel 批量导入）
4. 在"测试人员"中创建测试账号
5. 在"测试结果"中查看和导出评测数据

### Excel 批量导入格式

| 列 | 内容 |
|----|------|
| A | 句子编号 |
| B | 原始文本 |
| C | 音频时长(秒) |
| D | 引擎1翻译文本 |
| E | 引擎1识别文本 |
| F | 引擎2翻译文本 |
| G | 引擎2识别文本 |

### 测试人员

1. 使用测试账号登录
2. 选择语言对开始测试
3. 依次播放原始音频和 A/B 两个引擎的翻译音频
4. 选择评分（左边更好 / 左边好一点 / 差不多 / 右边好一点 / 右边更好）
5. 点击下一句继续，可随时暂停保存进度
6. 完成全部评测后自动锁定，可下载结果 Excel

## 项目结构

```
├── backend/
│   ├── main.py            # FastAPI 主应用 + 路由
│   ├── models.py          # 数据库模型
│   ├── database.py        # 数据库连接
│   ├── auth.py            # 认证鉴权
│   ├── requirements.txt   # Python 依赖
│   └── uploads/           # 音频文件存储
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # 路由配置
│   │   ├── api.ts         # API 客户端
│   │   ├── pages/         # 页面组件
│   │   └── components/    # 通用组件
│   └── package.json
├── start.sh               # 生产启动脚本
├── dev.sh                 # 开发启动脚本
└── README.md
```
