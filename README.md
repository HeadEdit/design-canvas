# DesignCanvas

[English](#english) · [中文](#中文)

---

## 中文

**DesignCanvas**（AI 策划工作台）是一款本地优先的浏览器工作区，用于将自然语言需求转化为结构化创意卡片，浏览与筛选卡片，对选中卡片进行独立深挖对话，并导出 JSON 或 Markdown。

### 本地运行

```bash
npm install
npm run dev
```

生产构建请执行 `npm run build`，然后使用任意静态 HTTP 服务器托管生成的 `dist/` 目录。

请使用最新版桌面 Chrome 或 Edge 浏览器。视口宽度低于 1024px 时会显示桌面浏览器提示。

### 配置 AI

打开 **AI 设置**，填写 OpenAI 兼容的 Base URL、API Key 和模型。Base URL 为服务商根地址，例如 `https://api.deepseek.com/v1`，不要包含 `/chat/completions`。服务商需允许浏览器 CORS 请求。

API Key 保存在本机浏览器的 IndexedDB 中，便于本地使用，但不适合共享或不可信设备。密钥不会出现在卡片、导出内容或错误信息中。

### 首次工作流

首次启动会创建完整工作流：需求解析、组合生成、卡片浏览、深挖对话与导出。选中解析节点，输入需求并配置 AI 后运行工作流。生成阶段会分四批产出 20 张卡片。在卡片浏览器中可搜索、筛选、收藏、选中、深挖或导出。每张卡片的深挖会话相互独立，刷新后仍保存在本地。

游戏概念或聊天生成的 TextStruct 可连接到「结构化策划案」；双击节点可检查系统模块。保存当前版本会更新正式输出并将下游标记为过期，AI 再生成内容则先进入「最新候选」。

结构化策划案只保留明确系统和核心循环必需系统；文档总览、假设、验收示例等章节不会成为模块。模块生成完成后可在「依赖图谱」中分别查看当前版本和最新候选，人工修改模块会将对应图谱标记为过期。

所有工作区状态（含工作流布局与卡片选择）均持久化在 IndexedDB 中。需要立即落盘时可使用工具栏保存操作。

### 工作区导入与导出

工作区侧栏可将当前工作区导出为带版本号的 JSON 文件。导入该文件时始终会创建并打开独立副本，不会覆盖已有工作区。快照包含画布、运行记录、卡片与聊天会话，但不包含 AI 设置、服务配置与 API Key。

### 许可证

本项目采用 [MIT License](LICENSE)。

---

## English

**DesignCanvas** is a local-first desktop browser workspace for turning a requirement into a structured set of idea cards, browsing and selecting cards, running isolated deep-dive conversations, and exporting JSON or Markdown.

### Run locally

```bash
npm install
npm run dev
```

For a production build, run `npm run build` and serve the generated `dist/` directory with any static HTTP server.

Use a current desktop Chrome or Edge browser. Viewports below 1024px show a desktop-browser notice.

### Configure AI

Open **AI settings** and provide an OpenAI-compatible Base URL, API key, and model. The Base URL is the provider root, for example `https://api.deepseek.com/v1`; do not include `/chat/completions`. The provider must allow browser CORS requests.

The API key is stored in this browser's local IndexedDB. This is convenient for a local tool, but it is not suitable for shared or untrusted devices. Keys are never rendered into cards, exports, or error messages.

### First workflow

The first launch creates a complete workflow: requirement parser, combinatorial generation, card browser, deep-dive chat, and export. Select the parser node, enter a requirement, configure AI, and run the workflow. Generation produces 20 cards in four batches. Open the card browser to search, filter, star, select, deep-dive, or export cards. Deep-dive sessions are isolated per card and persist locally across refreshes.

TextStruct output from game concepts or chat can connect to the structured plan node; double-click a node to inspect system modules. Saving the current version updates the official output and marks downstream nodes stale; AI-regenerated content enters "latest candidate" first.

The structured plan keeps only explicit systems and those required by the core loop; overview, assumptions, and acceptance-example sections do not become modules. After modules are generated, view current version and latest candidate separately in the dependency graph; manual module edits mark the corresponding graph stale.

All workspace state, including workflow layout and card selections, is persisted in IndexedDB. Use the toolbar save action when you want an immediate persistence point.

### Workspace import and export

The workspace rail can export the active workspace as a versioned JSON file. Importing that file always creates and opens an independent copy; it never overwrites an existing workspace. The snapshot includes the canvas, runs, cards, and chat sessions, but excludes AI settings, service configuration, and API keys.

### License

This project is licensed under the [MIT License](LICENSE).
