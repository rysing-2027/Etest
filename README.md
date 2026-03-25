# Timekettle 翻译引擎评测系统

双盲 A/B 测试平台，用于对比评估不同翻译引擎的翻译质量。

## 功能特性

- **双盲测试**：测试人员不知道左右两侧分别是哪个引擎，保证评测客观性
- **随机分配**：每个测试会话随机决定左右引擎位置，避免位置偏差
- **多语言对支持**：可创建多个语言对（如 zh-en、de-en 等）
- **音频评测**：支持上传原始音频和翻译音频，测试人员可播放对比
- **Excel 批量导入**：支持通过 Excel 批量导入语言对、语料、测试人员
- **魔法导入**：一次上传自动创建语言对并导入语料
- **进度保存**：测试人员可随时暂停，下次继续
- **结果导出**：支持导出评测明细和汇总统计 Excel

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.11 + FastAPI + SQLAlchemy |
| 数据库 | SQLite |
| 前端 | React + TypeScript + Vite + Tailwind CSS |
| 认证 | JWT (python-jose) |
| 部署 | Docker 多阶段构建 |

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 18+（开发模式需要，生产部署可选）
- Docker（可选）

### 方式一：本地运行

```bash
# 安装后端依赖
cd backend && pip install -r requirements.txt && cd ..

# 安装前端依赖并构建
cd frontend && npm install && npm run build && cd ..

# 启动服务
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

访问 http://localhost:8000

### 方式二：Docker 部署

```bash
docker build -t etest .
docker run -p 8000:8000 -v $(pwd)/data:/app/data etest
```

### 默认管理员账号

| 账号 | 密码 |
|------|------|
| admin | admin123 |

> 可通过环境变量 `ADMIN_USER_ID` 和 `ADMIN_PASSWORD` 修改

## 使用流程

### 管理员操作

1. **创建语言对**：设置源语言、目标语言、编码和显示名称
2. **导入语料**：支持单条添加或 Excel 批量导入
3. **上传音频**：将音频文件放到 `backend/uploads/{pair_code}/{source|engine1|engine2}/` 目录，然后点击"扫描音频"
4. **创建测试人员**：可指定测试人员可评测的语言对
5. **查看结果**：实时查看测试进度和评分详情，支持导出 Excel

### 测试人员操作

1. 使用测试账号登录
2. 选择语言对开始测试
3. 依次播放原始音频和左右两侧翻译音频
4. 选择评分：
   - 左边更好 (-2)
   - 左边好一点 (-1)
   - 差不多 (0)
   - 右边好一点 (+1)
   - 右边更好 (+2)
5. 点击下一句继续，可随时暂停

## Excel 导入格式

### 语料导入模板

| 列 | 字段 |
|----|------|
| A | 语料ID |
| B | 原始文本 |
| C | 音频时长(秒) |
| D | 源语言 |
| E | 目标语言 |
| F | 引擎1翻译文本 |
| G | 引擎1识别文本 |
| H | 引擎2翻译文本 |
| I | 引擎2识别文本 |

### 测试人员导入模板

| 列 | 字段 |
|----|------|
| A | 账号 |
| B | 密码（可选，默认 123456） |

## 项目结构

```
├── backend/
│   ├── main.py            # FastAPI 应用入口
│   ├── models.py          # SQLAlchemy 数据模型
│   ├── database.py        # 数据库连接配置
│   ├── auth.py            # JWT 认证
│   ├── requirements.txt   # Python 依赖
│   └── uploads/           # 音频文件存储目录
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # 路由配置
│   │   ├── api.ts         # API 客户端
│   │   ├── pages/         # 页面组件
│   │   └── components/    # 通用组件
│   └── package.json
├── data/
│   ├── db/                # SQLite 数据库文件
│   └── uploads/           # 音频文件（按语言对分目录）
├── Dockerfile
└── README.md
```

## API 接口

### 认证
- `POST /api/login` - 登录获取 JWT Token

### 测试人员
- `GET /api/language-pairs` - 获取可测语言对列表
- `POST /api/test/start` - 开始/继续测试
- `GET /api/test/sentence` - 获取当前句子
- `POST /api/test/rate` - 提交评分
- `POST /api/test/pause` - 暂停保存进度
- `POST /api/test/complete` - 完成测试

### 管理员
- `GET/POST/DELETE /api/admin/language-pairs` - 语言对管理
- `GET/POST/DELETE /api/admin/sentences` - 语料管理
- `POST /api/admin/sentences/import-excel` - Excel 导入语料
- `POST /api/admin/sentences/scan-audio` - 扫描匹配音频文件
- `GET/POST/DELETE /api/admin/testers` - 测试人员管理
- `GET /api/admin/results` - 查看评测结果

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| ADMIN_USER_ID | 管理员账号 | admin |
| ADMIN_PASSWORD | 管理员密码 | admin123 |
| CORS_ORIGINS | CORS 允许的源（逗号分隔） | * |

## License

MIT