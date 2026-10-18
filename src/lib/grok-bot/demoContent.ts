import type {
  AgentSetting,
  AgentToolConfig,
  GrokBotAgentContent,
  GrokBotComputerResource,
  GrokBotContent,
  GrokBotReply,
} from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function createDemoContent(): GrokBotContent {
  const now = Date.now();

  const settings: AgentSetting[] = [
    {
      id: "desktop-notifications",
      label: "Notifications",
      description: "Get notified when this agent finishes or needs input.",
      isEnabled: true,
    },
    {
      id: "auto-run",
      label: "Automatic runs",
      description: "Let routines start without asking first.",
      isEnabled: true,
    },
  ];

  const tools: AgentToolConfig[] = [
    {
      id: "browser",
      label: "Browser",
      description: "Read and operate web pages.",
      isEnabled: true,
      permission: "ask",
    },
    {
      id: "terminal",
      label: "Terminal",
      description: "Run commands on the assigned computer.",
      isEnabled: true,
      permission: "ask",
    },
    {
      id: "files",
      label: "Files",
      description: "Read and write workspace files.",
      isEnabled: true,
      permission: "allow",
    },
    {
      id: "email",
      label: "Email",
      description: "Draft and send email.",
      isEnabled: true,
      permission: "ask",
    },
    {
      id: "calendar",
      label: "Calendar",
      description: "Read and schedule events.",
      isEnabled: false,
      permission: "ask",
    },
    {
      id: "github",
      label: "GitHub",
      description: "Inspect repositories and pull requests.",
      isEnabled: true,
      permission: "ask",
    },
    {
      id: "slack",
      label: "Slack",
      description: "Read and send workspace messages.",
      isEnabled: false,
      permission: "ask",
    },
    {
      id: "screen",
      label: "Screen",
      description: "View and hand over the agent computer.",
      isEnabled: true,
      permission: "allow",
    },
  ];

  const computers: GrokBotComputerResource[] = [
    {
      id: "cloud-1",
      label: "Cloud computer 1",
      kind: "cloud",
      status: "available",
      capabilities: ["screen", "browser", "terminal"],
    },
    {
      id: "user-computer",
      label: "My computer",
      kind: "vnc",
      endpoint: "vnc://demo.invalid/agent",
      status: "available",
      capabilities: ["screen", "browser", "terminal"],
    },
    {
      id: "research-box",
      label: "Research box",
      kind: "remote",
      status: "busy",
      capabilities: ["screen", "browser"],
    },
  ];

  const agents: GrokBotAgentContent[] = [
    {
      agent: {
        id: "sidekick",
        name: "Sidekick",
        title: "Assistant",
        description:
          "Everyday personal assistant for calendar, travel, research, and morning prep.",
        hue: "teal",
        avatarModel: { shape: "blob", motion: "idle" },
        lastEntry: {
          kind: "text",
          text: "renewed the domain and filed the receipt.",
        },
        lastActivityAt: now - 2 * MINUTE,
        hasUnread: false,
        isPinned: true,
        isRunning: false,
        isComposingMessage: false,
        status: null,
        isGroup: false,
        memberIds: [],
        automations: [
          {
            id: "sidekick-routine-1",
            name: "Morning briefing",
            triggerDescription: "Weekdays at 8:00 AM",
          },
          {
            id: "sidekick-routine-2",
            name: "Trip watch",
            triggerDescription: "Every day at 6:00 PM",
          },
        ],
      },
      transcript: [
        {
          kind: "send-message",
          id: "sidekick-1",
          timestampMs: now - 3 * HOUR,
          message: {
            type: "text",
            content:
              "Hi, I am Sidekick. I have my own computer, so I can browse, run apps, and keep files organized for you. What should we start with?",
          },
        },
        {
          kind: "message",
          id: "sidekick-2",
          role: "user",
          content: "Keep track of my week and prep me every morning.",
          timestampMs: now - 170 * MINUTE,
        },
        {
          kind: "multiple-choice",
          id: "sidekick-3",
          timestampMs: now - 168 * MINUTE,
          question: "What should the morning prep cover?",
          hint: "Pick the closest fit, or type your own.",
          selection: "single",
          options: [
            {
              id: "meetings",
              label: "Meetings, with prep notes",
            },
            {
              id: "due-soon",
              label: "Anything due in 48 hours",
            },
            {
              id: "inbox",
              label: "Flagged email",
            },
          ],
          allowCustomAnswer: true,
          answer: { kind: "options", optionIds: ["meetings"] },
        },
        {
          kind: "system",
          id: "sidekick-4",
          timestampMs: now - 165 * MINUTE,
          event: {
            type: "created-routine",
            name: "Morning briefing",
            triggerDescription: "Weekdays at 8:00 AM",
          },
        },
        {
          kind: "message",
          id: "sidekick-5",
          role: "user",
          content: "Renew the domain before it lapses.",
          timestampMs: now - 12 * MINUTE,
        },
        {
          kind: "computer-use",
          id: "sidekick-6",
          timestampMs: now - 11 * MINUTE,
          instruction:
            "Approve the passkey prompt on the registrar so I can finish the renewal.",
          ask: "Approve the passkey prompt",
          status: "done",
          screenKind: "browser",
        },
        {
          kind: "pull-request",
          id: "sidekick-7",
          timestampMs: now - 9 * MINUTE,
          status: "done",
          title: "Add renewal reminders to the workspace",
          repository: "acme/workspace",
          branch: "sidekick/renewal-reminders",
          number: 184,
          additions: 72,
          deletions: 11,
          url: "https://example.com/acme/workspace/pull/184",
        },
        {
          kind: "outbound-message",
          id: "sidekick-8",
          timestampMs: now - 7 * MINUTE,
          status: "ready",
          subject: "Domain renewal confirmation",
          body:
            "Hi Sam,\n\nThe domain is renewed through 2029. I filed the receipt in Finance/Domains and enabled automatic renewal.\n\nSidekick",
          workspace: "Gmail",
          to: "sam@acme.co",
          thread: "Domain renewal",
          from: "sidekick@acme.co",
          channel: "email",
        },
        {
          kind: "send-message",
          id: "sidekick-9",
          timestampMs: now - 2 * MINUTE,
          message: {
            type: "text",
            content:
              "Renewed through **2029**, filed the receipt in `Finance/Domains`, and turned on auto-renew.",
          },
        },
      ],
    },
    {
      agent: {
        id: "deep-dive",
        name: "Deep Dive",
        title: "Researcher",
        description:
          "Research analyst for docs, benchmarks, and competitive landscape.",
        hue: "blue",
        avatarModel: { shape: "pebble", motion: "thinking" },
        lastEntry: {
          kind: "text",
          text: "drafting the normalized comparison table.",
        },
        lastActivityAt: now - 18 * MINUTE,
        hasUnread: false,
        isPinned: true,
        isRunning: true,
        isComposingMessage: false,
        composingBeat: {
          state: "researching",
          label: "Comparing vendor terms",
        },
        status: { icon: "globe", label: "Browsing the web" },
        isGroup: false,
        memberIds: [],
        automations: [
          {
            id: "deep-dive-routine-1",
            name: "Competitor sweep",
            triggerDescription: "Mondays at 7:30 AM",
          },
        ],
      },
      transcript: [
        {
          kind: "message",
          id: "deep-dive-1",
          role: "user",
          content: "Compare the top three infrastructure vendors for us.",
          timestampMs: now - 2 * HOUR,
        },
        {
          kind: "send-message",
          id: "deep-dive-2",
          timestampMs: now - 70 * MINUTE,
          message: {
            type: "text",
            content:
              "First read: Northwind is cheapest on paper, Basalt has the broadest SLA, and Veritas is the only vendor that will sign a custom DPA.",
          },
        },
        {
          kind: "system",
          id: "deep-dive-3",
          timestampMs: now - 42 * MINUTE,
          event: {
            type: "shared-context",
            source: { name: "Sidekick", hue: "teal" },
            summary: "Current usage and renewal dates",
          },
        },
        {
          kind: "send-message",
          id: "deep-dive-4",
          timestampMs: now - 18 * MINUTE,
          streaming: true,
          message: {
            type: "text",
            content:
              "I am normalizing the pricing units now. The raw sheets mix GB-months and GiB-months, so they are not directly comparable.",
          },
        },
      ],
    },
    {
      agent: {
        id: "mailroom",
        name: "Mailroom",
        title: "Inbox triage",
        description:
          "Archives noise, drafts replies, and flags messages that need a decision.",
        hue: "orange",
        avatarModel: { shape: "squircle", motion: "idle" },
        lastEntry: {
          kind: "text",
          text: "the Acme reply is ready for review.",
        },
        lastActivityAt: now - 36 * MINUTE,
        hasUnread: true,
        unreadCount: 3,
        isRunning: false,
        isComposingMessage: false,
        status: null,
        isGroup: false,
        memberIds: [],
        automations: [
          {
            id: "mailroom-routine-1",
            name: "Inbox sweep",
            triggerDescription: "Weekdays at 7:00 AM",
          },
        ],
      },
      transcript: [
        {
          kind: "message",
          id: "mailroom-1",
          role: "user",
          content: "Draft a reply to Vicky and attach last quarter's summary.",
          timestampMs: now - 58 * MINUTE,
        },
        {
          kind: "outbound-message",
          id: "mailroom-2",
          timestampMs: now - 42 * MINUTE,
          status: "ready",
          subject: "Re: Q3 numbers for the vendor brief",
          body:
            "Hi Vicky,\n\nLast quarter's summary is attached. Revenue and churn are on page two, and the vendor line items start on page four.\n\nThanks,\nSam",
          workspace: "Gmail",
          to: "vicky@acme.co",
          thread: "Q3 numbers for the vendor brief",
          from: "sam@acme.co",
          channel: "email",
        },
        {
          kind: "send-message",
          id: "mailroom-3",
          timestampMs: now - 36 * MINUTE,
          message: {
            type: "text",
            content:
              "The Acme reply is ready. I attached the summary and left it in drafts until you approve it.",
          },
        },
      ],
    },
    {
      agent: {
        id: "research-room",
        name: "Renewal room",
        title: "Group chat",
        description: "Three agents cross-checking renewal terms.",
        hue: "teal",
        avatarModel: { shape: "tablet", motion: "working" },
        lastEntry: {
          kind: "text",
          text: "Atlas shared the vendor comparison.",
        },
        lastActivityAt: now - 4 * MINUTE,
        hasUnread: false,
        isPinned: false,
        isRunning: false,
        isComposingMessage: false,
        status: null,
        isGroup: true,
        memberIds: ["sidekick", "deep-dive", "mailroom"],
        members: [
          {
            id: "sidekick",
            name: "Sidekick",
            title: "Assistant",
            hue: "teal",
            avatarModel: { shape: "blob", motion: "idle" },
          },
          {
            id: "deep-dive",
            name: "Deep Dive",
            title: "Researcher",
            hue: "blue",
            avatarModel: { shape: "pebble", motion: "thinking" },
          },
          {
            id: "mailroom",
            name: "Mailroom",
            title: "Inbox triage",
            hue: "orange",
            avatarModel: { shape: "squircle", motion: "idle" },
          },
        ],
      },
      transcript: [
        {
          kind: "message",
          id: "research-room-1",
          role: "user",
          content: "Can you all compare the renewal options and flag anything risky?",
          timestampMs: now - 18 * MINUTE,
          source: { id: "viewer", kind: "human", name: "Sam Reyes" },
        },
        {
          kind: "send-message",
          id: "research-room-2",
          timestampMs: now - 14 * MINUTE,
          author: { name: "Deep Dive", hue: "blue" },
          source: {
            id: "deep-dive",
            kind: "agent",
            name: "Deep Dive",
            hue: "blue",
            avatarShape: "pebble",
          },
          message: {
            type: "text",
            content:
              "I found a 12% increase on the current plan. The custom DPA still has the strongest terms.",
          },
        },
        {
          kind: "send-message",
          id: "research-room-3",
          timestampMs: now - 9 * MINUTE,
          author: { name: "Mailroom", hue: "orange" },
          source: {
            id: "mailroom",
            kind: "agent",
            name: "Mailroom",
            hue: "orange",
            avatarShape: "squircle",
          },
          message: {
            type: "text",
            content:
              "I checked the billing dates and drafted the approval note. Nothing needs your signature yet.",
          },
        },
        {
          kind: "system",
          id: "research-room-4",
          timestampMs: now - 4 * MINUTE,
          event: {
            type: "shared-context",
            source: { name: "Sidekick", hue: "teal" },
            summary: "Vendor comparison table",
          },
        },
      ],
    },
  ];

  const replies: GrokBotReply[] = [
    {
      match: "computer",
      entries: [
        {
          kind: "computer-use",
          instruction: "Sign in to the stock library so I can approve the license.",
          ask: "Sign in to the stock library",
          screenKind: "browser",
          autoResolveMs: 9_000,
        },
        {
          kind: "message",
          content: "License approved. I filed the receipt with this month's expenses.",
        },
      ],
    },
    {
      match: "pull request",
      entries: [
        {
          kind: "pull-request",
          title: "Wire the pricing toggle to real plan data",
          repository: "acme/website",
          branch: "workbench/pricing-toggle",
          number: 185,
          additions: 128,
          deletions: 14,
          url: "https://example.com/acme/website/pull/185",
          createMs: 2_400,
        },
        {
          kind: "message",
          content: "The pull request is up with the test run attached.",
        },
      ],
    },
    {
      match: "outbound",
      entries: [
        {
          kind: "system",
          event: {
            type: "received-context",
            sources: [{ name: "Deep Dive", hue: "blue" }],
          },
        },
        {
          kind: "outbound-message",
          subject: "Vendor follow-up",
          body:
            "Hi team,\n\nThe vendor comparison is ready for review. I folded in current usage and renewal dates.\n\nSam",
          workspace: "Gmail",
          to: "team@acme.co",
          from: "sam@acme.co",
          channel: "email",
          autoResolveMs: 9_000,
        },
      ],
    },
    {
      match: "morning",
      entries: [
        {
          kind: "system",
          event: {
            type: "created-routine",
            name: "Morning briefing",
            triggerDescription: "Weekdays at 8:30 AM",
          },
        },
        {
          kind: "message",
          content:
            "It runs at **8:30am** on weekdays. You can change the time or turn it off from the routines list.",
        },
      ],
    },
    {
      match: "what",
      entries: [
        {
          kind: "multiple-choice",
          question: "What do you want me around for?",
          hint: "Pick the closest fit, or type your own.",
          selection: "multiple",
          options: [
            {
              id: "day-to-day",
              label: "Day-to-day tasks",
              description: "Reminders, digests, research, and small chores",
            },
            {
              id: "coding",
              label: "Work and coding",
              description: "Repositories, pull requests, and debugging",
            },
            {
              id: "project",
              label: "A specific project",
            },
          ],
          allowCustomAnswer: true,
        },
      ],
    },
    {
      entries: [
        {
          kind: "message",
          thinking: {
            text: "Reading the request, checking available tools, and shaping a concise response.",
            durationMs: 1_100,
          },
          pending: {
            state: "working",
            label: "Waiting for first token",
            minMs: 900,
            maxMs: 900,
          },
          chunkSize: 4,
          intervalMs: 65,
          content:
            "On it. I will take this from here and come back when there is something for you to review.",
        },
      ],
    },
  ];

  return {
    appName: "Grok Bot",
    viewer: { name: "Sam Reyes", initials: "SR" },
    agents,
    replies,
    settings,
    tools,
    computers,
  };
}

export const DEFAULT_DEMO_CONTENT = createDemoContent();
