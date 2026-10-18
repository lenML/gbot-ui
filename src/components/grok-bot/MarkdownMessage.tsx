import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getAgentPalette } from "../../lib/types";
import { GrokBotMark } from "../GrokBotMark";

export interface GrokBotMarkdownContentProps {
  content: string;
  role: "user" | "assistant";
  streaming?: boolean;
}

type ListItem = {
  text: string;
  task?: boolean;
  checked?: boolean;
};

type MarkdownBlock =
  | { kind: "paragraph"; offset: number; text: string }
  | {
      kind: "heading";
      offset: number;
      level: 1 | 2 | 3 | 4 | 5 | 6;
      text: string;
    }
  | {
      kind: "list";
      offset: number;
      ordered: boolean;
      start?: number;
      items: ListItem[];
    }
  | { kind: "blockquote"; offset: number; text: string }
  | { kind: "horizontal-rule"; offset: number }
  | {
      kind: "table";
      offset: number;
      headers: string[];
      rows: string[][];
    }
  | { kind: "code"; offset: number; language: string; code: string }
  | { kind: "math"; offset: number; expression: string; closed: boolean };

const INLINE_PATTERN =
  /\\\(([^\\\n]*?)\\\)|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"']+)|(\*\*|__)(?=\S)([^\n]*?\S)\5|(\*|_)(?=\S)([^\n]*?\S)\7|~~(?=\S)([^\n]*?\S)~~|`([^`\n]+)`|(@\[[^\]\n]+\])/giu;

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function Mention({ name }: { name: string }) {
  const palette = getAgentPalette(name);
  return (
    <span
      className="baby-grok-bot-message-mention"
      style={{ color: palette.pillForeground }}
    >
      <span className="baby-grok-bot-message-mention__face">
        <span
          className="grok-bot-lazy grok-bot-mark--fill"
          style={{ width: 14, height: 14 }}
        >
          <GrokBotMark
            background="var(--grok-bot-bg-editor, #ffffff)"
            foreground={palette.avatar}
          />
        </span>
      </span>
      {name}
    </span>
  );
}

function renderInline(content: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = new RegExp(INLINE_PATTERN.source, INLINE_PATTERN.flags);
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) != null) {
    if (match.index > cursor) {
      nodes.push(content.slice(cursor, match.index));
    }

    const key = `${keyPrefix}-${match.index}`;
    if (match[1] != null) {
      nodes.push(
        <code className="baby-grok-bot-md-math" key={key}>
          {match[1]}
        </code>,
      );
    } else if (match[2] != null || match[4] != null) {
      const markdownLabel = match[2];
      const rawUrl = match[3] ?? match[4] ?? "";
      const trailing =
        markdownLabel == null
          ? (rawUrl.match(/[),.!?;:\]}]+$/u)?.[0] ?? "")
          : "";
      const href = rawUrl.slice(0, rawUrl.length - trailing.length);
      if (!isHttpUrl(href)) {
        nodes.push(match[0]);
      } else {
        nodes.push(
          <a
            className="baby-grok-bot-md-link"
            href={href}
            key={key}
            rel="noopener noreferrer"
            target="_blank"
          >
            {markdownLabel == null ? href : renderInline(markdownLabel, key)}
          </a>,
        );
        if (trailing) nodes.push(trailing);
      }
    } else if (match[5] != null) {
      nodes.push(
        <strong key={key}>{renderInline(match[6] ?? "", key)}</strong>,
      );
    } else if (match[7] != null) {
      nodes.push(<em key={key}>{renderInline(match[8] ?? "", key)}</em>);
    } else if (match[9] != null) {
      nodes.push(<s key={key}>{renderInline(match[9], key)}</s>);
    } else if (match[10] != null) {
      nodes.push(
        <code className="baby-grok-bot-md-inline-code" key={key}>
          {match[10]}
        </code>,
      );
    } else if (match[11] != null) {
      nodes.push(<Mention key={key} name={match[11].slice(2, -1)} />);
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < content.length) nodes.push(content.slice(cursor));
  return nodes;
}

function splitTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;
  const withoutLeading = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const withoutTrailing = withoutLeading.endsWith("|")
    ? withoutLeading.slice(0, -1)
    : withoutLeading;
  const cells = withoutTrailing.split("|").map((cell) => cell.trim());
  return cells.length > 1 ? cells : null;
}

function isTableSeparator(cells: string[]): boolean {
  return (
    cells.length > 1 &&
    cells.every((cell) => /^:?-{3,}:?$/u.test(cell))
  );
}

export function parseGrokBotMarkdown(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const paragraphLines: string[] = [];
  const lines = content.split(/\r?\n/);
  let activeList: Extract<MarkdownBlock, { kind: "list" }> | null = null;
  let activeQuote: string[] | null = null;
  let activeQuoteOffset = 0;
  let paragraphOffset = 0;
  let offset = 0;

  const flushParagraph = () => {
    if (paragraphLines.some((line) => line.trim().length > 0)) {
      blocks.push({
        kind: "paragraph",
        offset: paragraphOffset,
        text: paragraphLines.join("\n"),
      });
    }
    paragraphLines.length = 0;
  };
  const flushList = () => {
    if (activeList) blocks.push(activeList);
    activeList = null;
  };
  const flushQuote = () => {
    if (activeQuote?.length) {
      blocks.push({
        kind: "blockquote",
        offset: activeQuoteOffset,
        text: activeQuote.join("\n"),
      });
    }
    activeQuote = null;
  };
  const flushAll = () => {
    flushList();
    flushQuote();
    flushParagraph();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const lineOffset = offset;
    offset += line.length + 1;

    const fenceMatch = /^\s{0,3}```([A-Za-z0-9_+.-]*)\s*$/u.exec(line);
    if (fenceMatch) {
      flushAll();
      const codeLines: string[] = [];
      let closingIndex = index + 1;
      while (
        closingIndex < lines.length &&
        !/^\s{0,3}```\s*$/u.test(lines[closingIndex] ?? "")
      ) {
        codeLines.push(lines[closingIndex] ?? "");
        closingIndex += 1;
      }
      blocks.push({
        kind: "code",
        offset: lineOffset,
        language: fenceMatch[1] ?? "",
        code: codeLines.join("\n"),
      });
      if (closingIndex < lines.length) {
        offset += lines
          .slice(index + 1, closingIndex + 1)
          .reduce((total, value) => total + value.length + 1, 0);
        index = closingIndex;
      } else {
        offset += codeLines.reduce(
          (total, value) => total + value.length + 1,
          0,
        );
        index = lines.length;
      }
      continue;
    }

    if (/^\s{0,3}\$\$\s*$/u.test(line)) {
      flushAll();
      const mathLines: string[] = [];
      let closingIndex = index + 1;
      while (
        closingIndex < lines.length &&
        !/^\s{0,3}\$\$\s*$/u.test(lines[closingIndex] ?? "")
      ) {
        mathLines.push(lines[closingIndex] ?? "");
        closingIndex += 1;
      }
      blocks.push({
        kind: "math",
        offset: lineOffset,
        expression: mathLines.join("\n"),
        closed: closingIndex < lines.length,
      });
      if (closingIndex < lines.length) {
        offset += lines
          .slice(index + 1, closingIndex + 1)
          .reduce((total, value) => total + value.length + 1, 0);
        index = closingIndex;
      } else {
        offset += mathLines.reduce(
          (total, value) => total + value.length + 1,
          0,
        );
        index = lines.length;
      }
      continue;
    }

    const quoteMatch = /^\s*>\s?(.*)$/u.exec(line);
    if (quoteMatch) {
      flushList();
      flushParagraph();
      if (!activeQuote) activeQuoteOffset = lineOffset;
      activeQuote ??= [];
      activeQuote.push(quoteMatch[1] ?? "");
      continue;
    }
    flushQuote();

    const headers = splitTableRow(line);
    const separators = splitTableRow(lines[index + 1] ?? "");
    if (
      headers &&
      separators &&
      headers.length === separators.length &&
      isTableSeparator(separators)
    ) {
      flushList();
      flushParagraph();
      const rows: string[][] = [];
      let rowIndex = index + 2;
      while (rowIndex < lines.length) {
        const row = splitTableRow(lines[rowIndex] ?? "");
        if (!row || row.length !== headers.length) break;
        rows.push(row);
        rowIndex += 1;
      }
      blocks.push({ kind: "table", offset: lineOffset, headers, rows });
      offset += lines
        .slice(index + 1, rowIndex)
        .reduce((total, value) => total + value.length + 1, 0);
      index = rowIndex - 1;
      continue;
    }

    if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/u.test(line)) {
      flushList();
      flushParagraph();
      blocks.push({ kind: "horizontal-rule", offset: lineOffset });
      continue;
    }

    const headingMatch = /^\s{0,3}(#{1,6})\s+(.+?)\s*$/u.exec(line);
    if (headingMatch) {
      flushList();
      flushParagraph();
      blocks.push({
        kind: "heading",
        offset: lineOffset,
        level: headingMatch[1]?.length as 1 | 2 | 3 | 4 | 5 | 6,
        text: headingMatch[2]?.trim() ?? "",
      });
      continue;
    }

    const orderedMatch = /^\s*(\d+)\.\s+(.+)$/u.exec(line);
    const unorderedMatch = /^\s*[-+*]\s+(.+)$/u.exec(line);
    if (orderedMatch || unorderedMatch) {
      const ordered = orderedMatch != null;
      if (!activeList || activeList.ordered !== ordered) {
        flushList();
        flushParagraph();
        activeList = {
          kind: "list",
          offset: lineOffset,
          ordered,
          ...(orderedMatch
            ? { start: Number.parseInt(orderedMatch[1] ?? "1", 10) }
            : {}),
          items: [],
        };
      }
      const itemText = (orderedMatch?.[2] ?? unorderedMatch?.[1] ?? "").trim();
      const taskMatch = /^\[([ xX])\]\s+(.+)$/u.exec(itemText);
      activeList.items.push(
        taskMatch
          ? {
              text: taskMatch[2] ?? "",
              task: true,
              checked: taskMatch[1]?.toLowerCase() === "x",
            }
          : { text: itemText },
      );
      continue;
    }

    flushList();
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    if (paragraphLines.length === 0) paragraphOffset = lineOffset;
    paragraphLines.push(line);
  }

  flushAll();
  return blocks;
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1_200);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <button
      aria-label={copied ? "Copied" : "Copy code"}
      className="baby-grok-bot-md-copy"
      data-copied={copied || undefined}
      onClick={() => {
        if (!navigator.clipboard) return;
        void navigator.clipboard
          .writeText(code)
          .then(() => setCopied(true))
          .catch(() => undefined);
      }}
      type="button"
    >
      <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
        {copied ? (
          <path
            d="m3.75 8.25 2.5 2.5 6-6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        ) : (
          <>
            <rect
              height="8.5"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.2"
              width="8.5"
              x="3.75"
              y="4.25"
            />
            <path
              d="M6 4.25V3.5A1.5 1.5 0 0 1 7.5 2h5A1.5 1.5 0 0 1 14 3.5v5a1.5 1.5 0 0 1-1.5 1.5H12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.2"
            />
          </>
        )}
      </svg>
    </button>
  );
}

function StreamingCaret() {
  return (
    <span
      aria-hidden="true"
      className="baby-grok-bot-md-caret"
      data-streaming-caret=""
    />
  );
}

function MarkdownBlockView({
  block,
  streamingCaret = false,
}: {
  block: MarkdownBlock;
  streamingCaret?: boolean;
}) {
  const keyPrefix = `${block.kind}-${block.offset}`;
  const caret = streamingCaret ? <StreamingCaret /> : null;

  switch (block.kind) {
    case "paragraph":
      return (
        <p>
          {renderInline(block.text, keyPrefix)}
          {caret}
        </p>
      );
    case "heading": {
      const Heading = `h${block.level}` as
        | "h1"
        | "h2"
        | "h3"
        | "h4"
        | "h5"
        | "h6";
      return (
        <Heading>
          {renderInline(block.text, keyPrefix)}
          {caret}
        </Heading>
      );
    }
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List start={block.ordered ? block.start : undefined}>
          {block.items.map((item, index) => (
            <li key={`${keyPrefix}-item-${index}`}>
              {item.task ? (
                <span
                  aria-checked={item.checked === true}
                  aria-disabled="true"
                  aria-label={`${item.checked ? "Completed" : "Incomplete"} task: ${item.text}`}
                  className="baby-grok-bot-md-task"
                  role="checkbox"
                />
              ) : null}
              {item.task ? " " : null}
              {renderInline(item.text, `${keyPrefix}-item-${index}`)}
              {index === block.items.length - 1 ? caret : null}
            </li>
          ))}
        </List>
      );
    }
    case "blockquote":
      return (
        <blockquote>
          {renderInline(block.text, keyPrefix)}
          {caret}
        </blockquote>
      );
    case "horizontal-rule":
      return <hr />;
    case "table":
      return (
        <div className="baby-grok-bot-md-table-scroll">
          <table>
            <thead>
              <tr>
                {block.headers.map((header, index) => (
                  <th key={`${keyPrefix}-head-${index}`}>
                    {renderInline(header, `${keyPrefix}-head-${index}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${keyPrefix}-row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${keyPrefix}-cell-${rowIndex}-${cellIndex}`}>
                      {renderInline(
                        cell,
                        `${keyPrefix}-cell-${rowIndex}-${cellIndex}`,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "code":
      return (
        <figure className="baby-grok-bot-md-code" data-language={block.language}>
          <div className="baby-grok-bot-md-code__scroll">
            <pre>
              <code
                className={
                  block.language ? `language-${block.language}` : undefined
                }
              >
                {block.code}
                {caret}
              </code>
            </pre>
          </div>
          <figcaption className="baby-grok-bot-md-code__label">
            {block.language || "code"}
          </figcaption>
          <CopyCodeButton code={block.code} />
        </figure>
      );
    case "math":
      return (
        <div
          className="baby-grok-bot-md-math-block"
          data-closed={block.closed || undefined}
        >
          {block.expression}
          {caret}
        </div>
      );
  }
}

export function GrokBotMarkdownContent({
  content,
  role,
  streaming = false,
}: GrokBotMarkdownContentProps) {
  const blocks = parseGrokBotMarkdown(content);

  return (
    <div
      className="baby-grok-bot-md-content"
      data-role={role}
      data-streaming={streaming || undefined}
    >
      {blocks.length === 0 && streaming ? <StreamingCaret /> : null}
      {blocks.map((block, index) => (
        <Fragment key={`${block.kind}-${block.offset}`}>
          <MarkdownBlockView
            block={block}
            streamingCaret={streaming && index === blocks.length - 1}
          />
        </Fragment>
      ))}
    </div>
  );
}

export default GrokBotMarkdownContent;
