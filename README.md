# Travel Assistant MVP

公司内部差旅 AI Agent（MVP）  
技术栈：Next.js 全栈 + 本地 JSON 知识库 + 阿里云 Qwen Plus（OpenAI 兼容接口）

## 功能概览

- 员工问答（中英双语）
- 严格知识库模式（未命中直接提示转人工）
- 管理员入口（无登录，`/admin?key=...`）
- 管理员可新增/删除知识条目
- 对话“有帮助 / 没帮助”反馈按钮

## 快速开始

```bash
npm install
cp .env.example .env
```

配置 `.env`：

```env
QWEN_API_BASE_URL=https://llm-sx2qy7imh5bxbc2o.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
QWEN_API_KEY=your_real_key
ADMIN_KEY=your_admin_key
```

启动开发环境：

```bash
npm run dev
```

默认地址：
- 用户端：`http://localhost:3000`
- 管理端：`http://localhost:3000/admin?key=your_admin_key`

## 目录说明

- `app/` 页面与 API
- `components/` 前端组件
- `lib/` 检索、鉴权、模型封装
- `data/knowledge.json` 知识库数据
- `data/feedback.json` 反馈数据
- `tests/` 单元测试

## 测试

```bash
npm run test
```

## 严格模式说明

1. 先进行规则分类与知识检索
2. 无可靠命中：直接返回“知识库暂无可确认信息”并给人工支持建议
3. 有命中：将命中片段发送给 Qwen 生成结构化回答
4. 输出格式固定为：结论 -> 说明 -> 下一步建议（附来源）