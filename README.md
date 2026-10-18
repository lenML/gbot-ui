# gbot-ui

`gbot-ui` 是 `.baby-grok-bot` 完整业务界面的 React 源码组件库。包含 desktop/mobile shell、统一 conversation list、群聊、settings、computer/screen、ASR、动态 SVG avatar、context menu、transcript 与 composer。

推荐方式和 shadcn/ui 一样：**复制源码到你的项目**，而不是把它当成不可修改的黑盒依赖。所有组件、store、schema、动画和样式都在仓库里，可直接改。

在线 Demo：<https://lenml.github.io/gbot-ui/>

- `#replica`：完整业务复现。
- `#extensibility`：组件扩展能力和 slot 实时代验。

## 直接复制使用

先取得源码：

```bash
git clone --depth=1 https://github.com/lenML/gbot-ui.git gbot-ui-source
```

把下面目录复制到你的 React 项目。保持相对目录结构，组件内部使用相对 import：

```text
gbot-ui-source/
├─ src/
│  ├─ components/        # UI、shell、avatar、adapter surface
│  ├─ lib/grok-bot/      # store、actions、types、content schema
│  ├─ lib/theme.ts
│  ├─ lib/types.ts
│  ├─ styles/            # 组件库样式、token、修复层
│  ├─ grok-bot.ts        # copy-first 公共导出入口
│  └─ index.css          # 统一样式入口
└─ public/
   ├─ fonts/
   └─ wallpapers/
```

PowerShell：

```powershell
Copy-Item -Recurse .\gbot-ui-source\src\components .\src\components
Copy-Item -Recurse .\gbot-ui-source\src\lib .\src\lib
Copy-Item -Recurse .\gbot-ui-source\src\styles .\src\styles
Copy-Item .\gbot-ui-source\src\grok-bot.ts .\src\grok-bot.ts
Copy-Item .\gbot-ui-source\src\index.css .\src\gbot-ui.css
Copy-Item -Recurse .\gbot-ui-source\public\fonts .\public\fonts
Copy-Item -Recurse .\gbot-ui-source\public\wallpapers .\public\wallpapers
```

安装运行依赖：

```bash
pnpm add react react-dom motion
pnpm add -D tailwindcss @tailwindcss/vite
```

在 Vite 项目挂载 Tailwind：

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

最小接入：

```tsx
// src/App.tsx
import { GrokBotApp } from "./grok-bot";
import "./gbot-ui.css";

export default function App() {
  return (
    <div className="h-dvh">
      <GrokBotApp activeAgentId="sidekick" className="h-full" />
    </div>
  );
}
```

`GrokBotApp` 默认使用 `DEFAULT_DEMO_CONTENT`。不传 `content` 时可直接看到完整 demo。

## 本地开发和构建

```bash
pnpm install
pnpm dev
pnpm build
```

输出：

```text
dist-lib/index.js
dist-lib/index.css
dist-lib/types/
dist/
```

`pnpm dev` 同时支持 desktop/mobile，断点为 `767px`。

## 模块设计

### 1. UI surfaces

`src/components/grok-bot/`

- `GrokBotApp`：完整入口，创建 provider，并组合 desktop/mobile。
- `DesktopShell` / `GrokBotMobileApp`：两端 shell 和响应式路由。
- `Sidebar` / `MobileChatList`：统一 bot、direct、group conversation list。
- `ChatHeader` / `GrokBotTranscript` / `Composer`：chat 核心 surface。
- `GrokBotDesktopPane` / `GrokBotScreenOverlay` / `ComputerSurface`：settings 和 computer。
- `ContextMenu` / `CreateConversationSheet` / `CreateGroupDialog`：交互模块。
- `AgentAvatar` / `GrokBotAvatarMark`：动态 SVG avatar。

### 2. Headless business layer

`src/lib/grok-bot/`

- `store.tsx`：`GrokBotStoreProvider`、state projector、actions、selector hooks。
- `types.ts`：`GrokBotContent`、agent、transcript、tool、computer、adapter 类型。
- `demoContent.ts`：完整 demo 数据，可用作内容模板。
- `extensions.ts`：slot 类型和 surface contract。
- `format.ts`、`avatarShapes.ts`：纯函数与 avatar 映射。

UI 不直接持有 transport 生命周期。宿主可只复用 store/actions，再自己排 surface。

### 3. Styles and assets

- `src/styles/tokens.css`：设计 token。
- `src/styles/baby-grok-bot.css`：`.baby-grok-bot` 业务样式。
- `src/styles/avatar.css`、`v1-fixes.css`：avatar 与补丁层。
- `public/fonts`：组件字体。
- `public/wallpapers`：computer fallback 壁纸。

接入方需要让 `/fonts/*` 和 `/wallpapers/*` 可从 public root 访问。默认 `RemoteDesktopViewport` 也支持传入自有 `wallpaperUrl`。

### 4. Adapters

- `GrokBotComputerAdapter`：连接、断开、渲染 computer/VNC/noVNC surface。
- `GrokBotAsrAdapter`：语音权限、partial/final transcript、phase 和停止生命周期。

## 接入方式

### 替换 Content

```tsx
import {
  DEFAULT_DEMO_CONTENT,
  GrokBotApp,
  type GrokBotContent,
} from "./grok-bot";

const content = {
  ...DEFAULT_DEMO_CONTENT,
  appName: "My Agent Workspace",
  agents: DEFAULT_DEMO_CONTENT.agents,
  computers: DEFAULT_DEMO_CONTENT.computers,
} satisfies GrokBotContent;

export function App() {
  return (
    <div className="h-dvh">
      <GrokBotApp
        activeAgentId="sidekick"
        className="h-full"
        content={content}
      />
    </div>
  );
}
```

### 接 VNC / noVNC

```tsx
import {
  GrokBotApp,
  type GrokBotComputerAdapter,
} from "./grok-bot";

const computer: GrokBotComputerAdapter = {
  async connect(session) {
    await myRfbClient.connect(session.endpoint);
  },
  async disconnect(session) {
    await myRfbClient.disconnect(session.id);
  },
  render(session) {
    // endpoint 是 iframe viewer 时可直接渲染；
    // endpoint 是 ws(s):// RFB 时，由宿主挂载 noVNC RFB。
    return (
      <iframe
        className="h-full w-full border-0"
        src={session.endpoint}
        title={`VNC ${session.id}`}
      />
    );
  },
};

export function App() {
  return (
    <div className="h-dvh">
      <GrokBotApp
        className="h-full"
        integrations={{ computer }}
      />
    </div>
  );
}
```

### 接 ASR

```tsx
import type { GrokBotAsrAdapter } from "./grok-bot";

let stopTransport: (() => Promise<void>) | null = null;

const asr: GrokBotAsrAdapter = {
  getCapability() {
    return {
      supported: true,
      partialResults: true,
      finalResults: true,
      permission: "prompt",
      languages: ["zh-CN", "en-US"],
    };
  },
  async start({ onError, onFinal, onPartial, onPhase }) {
    onPhase?.("requesting-permission");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stopTransport = await createAsrTransport({
      stream,
      onError,
      onFinal,
      onPartial,
    });
    onPhase?.("recording");
  },
  async stop() {
    await stopTransport?.();
    stopTransport = null;
  },
};
```

### Slots

四个稳定 slot：

- `conversationRow`：替换 sidebar/mobile list 行。
- `chatHeader`：替换 desktop/mobile header。
- `transcriptEntry`：包装或替换单条 transcript entry。
- `composer`：包装默认 composer 或加入业务 quick action。

`chatHeader` 和 `composer` 都收到 `surface: "desktop" | "mobile"`。mobile header 还会收到 `onBack`，替换时必须保留返回行为。

```tsx
import {
  GrokBotApp,
  useGrokBotActions,
  type GrokBotComposerSlotProps,
} from "./grok-bot";

function ApprovalComposer({
  agent,
  children,
  surface,
}: GrokBotComposerSlotProps) {
  const actions = useGrokBotActions();

  return (
    <section data-surface={surface}>
      <button
        onClick={() =>
          actions.sendMessage({
            text: `Run approval check for ${agent?.name ?? "agent"}.`,
            attachments: [],
          })
        }
        type="button"
      >
        Approval check
      </button>
      {children}
    </section>
  );
}

export function App() {
  return (
    <div className="h-dvh">
      <GrokBotApp
        className="h-full"
        slots={{ composer: ApprovalComposer }}
      />
    </div>
  );
}
```

替换 row/header 时，必须转发 slot props 中的 `onOpen`、`onContextMenu`、`onKeyDown`、`onBack` 等交互回调。替换 transcript entry/composer 时，建议继续渲染 `children`，以保留默认动画、附件、ASR 和提交逻辑。

### Headless composition

```tsx
import {
  GrokBotStoreProvider,
  useActiveAgent,
  useActiveTranscript,
  useGrokBotActions,
} from "./grok-bot";

function MyChat() {
  const agent = useActiveAgent();
  const entries = useActiveTranscript();
  const actions = useGrokBotActions();

  return (
    <section>
      <h1>{agent?.name}</h1>
      <p>{entries.length} entries</p>
      <button
        onClick={() =>
          actions.sendMessage({ text: "Ping", attachments: [] })
        }
      >
        Send
      </button>
    </section>
  );
}

export function App() {
  return (
    <GrokBotStoreProvider content={myContent}>
      <MyChat />
    </GrokBotStoreProvider>
  );
}
```

### Theme

```tsx
<GrokBotApp theme="cursor-dark" />
```

`auto` 跟随系统，`cursor-light` / `cursor-dark` 可显式指定。组件也暴露 `.baby-grok-bot` CSS variables，宿主可做 scoped token override。

## 当前扩展边界

稳定 public contract：

- `content`、agent identity、theme、className、CSS variables。
- computer / ASR adapters。
- desktop/mobile 四 slots。
- store、actions、selector hooks 与低层组件。

尚未稳定开放：

- conversation/group data source adapter。
- message transport 和 stream source。
- persistence/layout adapter。
- 动态 action registry。

需要替换这些深层能力时，当前应 fork 对应 store 逻辑，不要假设它们已稳定。

## GitHub Pages

仓库 workflow 会自动构建并发布 `dist/` 到：

<https://lenml.github.io/gbot-ui/>

Actions 配置：

```yaml
VITE_BASE_PATH: /gbot-ui/
```

Vite 会同步重写 JS、CSS、fonts 和 wallpapers 的 base path。项目使用 hash 入口，不需要 SPA fallback。

## License

MIT
