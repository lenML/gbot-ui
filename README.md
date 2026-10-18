# baby-grok-bot

`x.ai/bot` 中 `.baby-grok-bot` 根节点内部完整业务系统的 React 复刻。

## Install And Build

```bash
pnpm install
pnpm dev
pnpm build
```

`pnpm dev` 启动完整示例。视口宽度大于 `767px` 显示 desktop shell，小于等于 `767px` 显示 mobile surface；两者共享同一 store。

构建输出：

- `dist-lib/index.js`：组件库 ESM
- `dist-lib/index.css`：组件库样式
- `dist-lib/fonts/`：组件库字体
- `dist-lib/wallpapers/`：桌面场景壁纸
- `dist-lib/types/`：TypeScript declarations
- `dist/`：只渲染 `.baby-grok-bot` 业务的完整示例站

单独构建：

```bash
pnpm build:lib
pnpm build:demo
```

## Minimal Usage

```tsx
import { GrokBotApp } from "baby-grok-bot";
import "baby-grok-bot/style.css";

export function App() {
  return (
    <div className="h-dvh">
      <GrokBotApp activeConversationId="sidekick" className="h-full" />
    </div>
  );
}
```

## Bot 与私有 Chat

Bot profile 与 chat session 分开：

- `botId` 标识稳定 Bot；name、头像、tools、computer 和 settings 属于它。
- 默认每个 Bot 只有一条 direct conversation；transcript、pin、unread 和删除按 conversation 隔离。
- `createConversation(botId)` 打开已有私聊，只有缺失时才创建。
- `activeAgentId` 保留兼容，新接入使用 `activeConversationId`。

```tsx
const actions = useGrokBotActions();

actions.createConversation("sidekick");
actions.openConversation("chat-123");
actions.renameConversation("chat-123", "Trip planning");
actions.createAgent("Researcher"); // 新 Bot + 私聊
```

`Open chat` 只选择已有 Bot 并打开其私聊；`New bot` 才创建 profile。

Dark theme 可直接指定，也可在 desktop Settings 或 mobile header 按钮中切换：

```tsx
<GrokBotApp theme="cursor-dark" />
```

主题选择会持久化到 `localStorage`；`theme="auto"` 跟随系统。

## Extensibility Lab

开发服务提供独立入口：

```text
http://localhost:5173/#replica
http://localhost:5173/#extensibility
```

`#extensibility` 实时展示 Content、Identity、Appearance、Runtime、Slots、Headless 六层 public API，并单独标记尚未稳定的 transport boundary。Lab 可独立开关四个 slot，验证默认回退、desktop/mobile 布局和 store quick action。

## Slot Overrides

`slots` 可替换 conversation row、chat header、transcript entry 和 composer。Header/composer 会收到 `surface`；mobile header 额外收到 `onBack`。

```tsx
import {
  GrokBotApp,
  useGrokBotActions,
  type GrokBotComposerSlotProps,
} from "baby-grok-bot";

function CustomComposer({ surface, children }: GrokBotComposerSlotProps) {
  const actions = useGrokBotActions();

  return (
    <section data-surface={surface}>
      <button
        onClick={() =>
          actions.sendMessage({ text: "Status ping", attachments: [] })
        }
        type="button"
      >
        Status ping
      </button>
      {children}
    </section>
  );
}

export function App() {
  return (
    <GrokBotApp
      className="h-full"
      slots={{ composer: CustomComposer }}
    />
  );
}
```

替换 row/header 时必须转发 slot props 的交互回调；替换 transcript entry/composer 时应继续渲染 `children`，以保留默认时间线、附件、ASR 和提交逻辑。

`GrokBotApp` 默认使用 `DEFAULT_DEMO_CONTENT`。传入自有 `GrokBotContent` 可替换 agent、transcript、tools、computers、replies 与 settings。

```tsx
<GrokBotApp
  activeAgentId="ops"
  className="h-full"
  content={content}
/>
```

## Integrations

`GrokBotAppProps.integrations` 接收 `computer`、`asr` 与 `reply` adapter。adapter 类型从组件库入口导出。

```tsx
import {
  GrokBotApp,
  type GrokBotAsrAdapter,
  type GrokBotComputerAdapter,
  type GrokBotContent,
  type GrokBotReplyAdapter,
} from "baby-grok-bot";
import "baby-grok-bot/style.css";

const reply: GrokBotReplyAdapter = {
  async *stream({ message, signal }) {
    yield { type: "thinking", text: "Reading the request." };

    for (const word of message.text.split(" ")) {
      if (signal.aborted) return;
      yield { type: "text-delta", delta: `${word} ` };
    }

    yield { type: "done" };
  },
};

const computer: GrokBotComputerAdapter = {
  connect(session) {
    console.info("computer connect", session.id, session.endpoint);
  },
  disconnect(session) {
    console.info("computer disconnect", session.id);
  },
  render(session) {
    if (!session.endpoint) {
      return <div>No computer endpoint</div>;
    }

    // endpoint 为托管 noVNC viewer 的 HTTP(S) URL 时可直接 iframe。
    // endpoint 为 ws(s):// RFB 地址时，在宿主项目中挂载 noVNC RFB。
    return (
      <iframe
        className="h-full w-full border-0"
        src={session.endpoint}
        title={`VNC ${session.id}`}
      />
    );
  },
};

let stopAsrTransport: (() => Promise<void>) | null = null;

const asr: GrokBotAsrAdapter = {
  getCapability() {
    return {
      supported: true,
      partialResults: true,
      finalResults: true,
      permission: "prompt",
      languages: ["en-US"],
    };
  },
  async start({ agentId, onError, onFinal, onPartial, onPhase }) {
    onPhase?.("requesting-permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // createAsrTransport 由接入方实现；负责上传音频并回调 partial/final/error。
      stopAsrTransport = await createAsrTransport({
        agentId,
        stream,
        onError,
        onFinal,
        onPartial,
      });
      onPhase?.("recording");
    } catch (error) {
      onPhase?.("error");
      onError(error);
    }
  },
  async stop() {
    await stopAsrTransport?.();
    stopAsrTransport = null;
  },
};

export function App({ content }: { content: GrokBotContent }) {
  return (
    <div className="h-dvh">
      <GrokBotApp
        activeAgentId="ops"
        className="h-full"
        content={content}
        integrations={{ computer, asr, reply }}
      />
    </div>
  );
}
```

`onPhase` 可选且权威；adapter 不调用时，`start()` promise 成功后才进入 `recording`。`stop()` 后的最终状态由 `onFinal` 或 `onError` 收尾。

computer 资源使用 `kind: "vnc"` 与 `endpoint`。agent 使用 `computerId` 绑定资源：

```tsx
const content = {
  // ...
  computers: [
    {
      id: "vnc-1",
      label: "Build machine",
      kind: "vnc",
      endpoint: "https://viewer.example.com/vnc.html?autoconnect=true&resize=scale",
      status: "available",
      capabilities: ["screen", "browser", "terminal"],
    },
  ],
  agents: [
    {
      agent: {
        // ...
        computerId: "vnc-1",
      },
      transcript: [],
    },
  ],
} satisfies GrokBotContent;
```

详细契约、群聊、settings、avatar 与移动端行为见 [`docs/replica/10-v1-iteration-final.md`](../docs/replica/10-v1-iteration-final.md)。

## API Boundary

- 公共主入口：`GrokBotApp`。
- 公共状态入口：`GrokBotStoreProvider`、`useGrokBotStore`、`useGrokBotActions`、`setTheme`、active/content selector hooks。
- 公共类型：`GrokBotContent`、`GrokBotIntegrations`、`GrokBotComputerAdapter`、`GrokBotAsrAdapter`、`GrokBotReplyAdapter`、`GrokBotReplyStreamEvent`、`GrokBotSlots`、`GrokBotSlotSurface`、transcript entry union、agent/tool/computer settings。
- Slot override：`conversationRow`、`chatHeader`、`transcriptEntry`、`composer`；header/composer 覆盖同时服务 desktop/mobile。
- `ComputerSurface`、`AsrButton`、`AttachmentMenu`、`ContextMenu`、`CreateConversationSheet`、`CreateGroupDialog`、`AgentSettingsPanel`、`GrokBotAvatarMark` 同时作为低层组件导出；主接入入口仍推荐 `GrokBotApp`。
- computer adapter 接入 `computer-use` transcript card、desktop 右侧 computer preview 与 screen overlay。三者共用 `ComputerSurface` 生命周期。
- 省略 `integrations.computer` 时使用 `RemoteDesktopViewport` demo；省略 `integrations.asr` 时使用 demo partial/final transcript。

## Scope

包含 `.baby-grok-bot` 根节点内部完整业务：

- desktop shell、统一 conversation list、搜索、折叠、拖拽与 pinned 排序
- agent/group 切换、new chat、new group、最多 6 个成员的 member picker
- PC 右侧 computer/settings pane、profile、tools、computer assignment、notifications
- chat header、transcript、composer、mentions、消息 source、typing 与 unread 状态
- message、system、multiple-choice、computer-use、pull-request、outbound-message entries
- 动态 SVG avatar 的 5 种 shape、7 种 state、group member stack 与 reduced motion
- desktop pane、screen overlay、remote desktop、VNC/noVNC adapter bridge
- context menu、键盘触发、位置收敛、焦点恢复与原生交互排除
- mobile unified conversation list、create chat/group sheets、chat、screen bottom sheet、ASR、context attachments 与 composer
- desktop/mobile light、dark、system theme、持久化与 scoped dark wallpaper
- 统一 store、actions、异步 script、draft、unread、settings 与面板状态

不包含 `.baby-grok-bot` 根节点以外的 hero、feature cards、pricing、avatar row、recording take、页面导航或动画 fixture。

默认字体和壁纸 URL 是 `/fonts/*`、`/wallpapers/*`。接入方需将 `dist-lib/fonts` 与 `dist-lib/wallpapers` 放到应用 public root；`RemoteDesktopViewport` 支持直接传 `wallpaperUrl` 覆盖。
