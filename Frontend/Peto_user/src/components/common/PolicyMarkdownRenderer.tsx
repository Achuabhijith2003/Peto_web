import React, { useMemo } from "react";

interface PolicyMarkdownRendererProps {
  content: string;
  className?: string;
}

interface ParsedBlock {
  type: "h1" | "h2" | "h3" | "h4" | "p" | "ul" | "ol" | "blockquote" | "hr" | "table";
  content?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokenRegex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = linkMatch[2].trim();
      const isAllowedProtocol =
        url.startsWith("https://") ||
        url.startsWith("http://") ||
        url.startsWith("mailto:") ||
        url.startsWith("/");

      if (isAllowedProtocol) {
        return (
          <a
            key={index}
            href={url}
            target={url.startsWith("/") ? "_self" : "_blank"}
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium transition"
          >
            {label}
          </a>
        );
      }
      return <span key={index}>{label}</span>;
    }

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline Code: `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 font-mono text-xs border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function parseMarkdown(md: string): ParsedBlock[] {
  if (!md) return [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: ParsedBlock[] = [];

  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let currentBlockquote: string[] | null = null;

  const flushList = () => {
    if (currentList) {
      blocks.push({ type: currentList.type, items: currentList.items });
      currentList = null;
    }
  };

  const flushTable = () => {
    if (currentTable) {
      blocks.push({
        type: "table",
        headers: currentTable.headers,
        rows: currentTable.rows,
      });
      currentTable = null;
    }
  };

  const flushBlockquote = () => {
    if (currentBlockquote) {
      blocks.push({
        type: "blockquote",
        content: currentBlockquote.join(" "),
      });
      currentBlockquote = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Empty line
    if (!line) {
      flushList();
      flushTable();
      flushBlockquote();
      continue;
    }

    // Horizontal Rule
    if (line === "---" || line === "***" || line === "___") {
      flushList();
      flushTable();
      flushBlockquote();
      blocks.push({ type: "hr" });
      continue;
    }

    // Headings
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      flushList();
      flushTable();
      flushBlockquote();
      blocks.push({ type: "h1", content: line.slice(2).trim() });
      continue;
    }
    if (line.startsWith("## ") && !line.startsWith("### ")) {
      flushList();
      flushTable();
      flushBlockquote();
      blocks.push({ type: "h2", content: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("### ") && !line.startsWith("#### ")) {
      flushList();
      flushTable();
      flushBlockquote();
      blocks.push({ type: "h3", content: line.slice(4).trim() });
      continue;
    }
    if (line.startsWith("#### ")) {
      flushList();
      flushTable();
      flushBlockquote();
      blocks.push({ type: "h4", content: line.slice(5).trim() });
      continue;
    }

    // Blockquote (> text)
    if (line.startsWith(">")) {
      flushList();
      flushTable();
      let cleaned = line.replace(/^>\s?/, "").trim();
      cleaned = cleaned.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, "**$1:**");
      if (!currentBlockquote) {
        currentBlockquote = [cleaned];
      } else {
        currentBlockquote.push(cleaned);
      }
      continue;
    } else {
      flushBlockquote();
    }

    // Unordered list (- item or * item)
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushTable();
      const itemText = line.slice(2).trim();
      if (currentList && currentList.type === "ul") {
        currentList.items.push(itemText);
      } else {
        flushList();
        currentList = { type: "ul", items: [itemText] };
      }
      continue;
    }

    // Ordered list (1. item)
    if (/^\d+\.\s/.test(line)) {
      flushTable();
      const itemText = line.replace(/^\d+\.\s/, "").trim();
      if (currentList && currentList.type === "ol") {
        currentList.items.push(itemText);
      } else {
        flushList();
        currentList = { type: "ol", items: [itemText] };
      }
      continue;
    } else {
      flushList();
    }

    // Tables (| col1 | col2 |)
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
      if (isSeparator) continue;

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // Standard Paragraph
    blocks.push({ type: "p", content: line });
  }

  flushList();
  flushTable();
  flushBlockquote();

  return blocks;
}

export const PolicyMarkdownRenderer: React.FC<PolicyMarkdownRendererProps> = ({
  content,
  className = "",
}) => {
  const blocks = useMemo(() => parseMarkdown(content || ""), [content]);

  return (
    <div className={`space-y-4 text-slate-700 leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return (
              <h1
                key={idx}
                className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight pt-4 pb-2 border-b border-slate-200"
              >
                {renderInlineMarkdown(block.content || "")}
              </h1>
            );

          case "h2":
            return (
              <h2
                key={idx}
                className="text-lg sm:text-xl font-bold text-blue-900 tracking-tight pt-5 pb-1 border-b border-slate-100"
              >
                {renderInlineMarkdown(block.content || "")}
              </h2>
            );

          case "h3":
            return (
              <h3
                key={idx}
                className="text-base sm:text-lg font-semibold text-slate-900 pt-3 pb-1"
              >
                {renderInlineMarkdown(block.content || "")}
              </h3>
            );

          case "h4":
            return (
              <h4
                key={idx}
                className="text-sm font-semibold text-slate-800 pt-2"
              >
                {renderInlineMarkdown(block.content || "")}
              </h4>
            );

          case "p":
            return (
              <p key={idx} className="leading-relaxed">
                {renderInlineMarkdown(block.content || "")}
              </p>
            );

          case "ul":
            return (
              <ul key={idx} className="space-y-1.5 pl-6 list-disc text-slate-700">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {renderInlineMarkdown(item)}
                  </li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={idx} className="space-y-1.5 pl-6 list-decimal text-slate-700">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {renderInlineMarkdown(item)}
                  </li>
                ))}
              </ol>
            );

          case "blockquote":
            return (
              <blockquote
                key={idx}
                className="border-l-4 border-blue-600 bg-blue-50/70 px-4 py-3 rounded-r-xl text-sm text-slate-700 italic my-3"
              >
                {renderInlineMarkdown(block.content || "")}
              </blockquote>
            );

          case "hr":
            return <hr key={idx} className="my-6 border-slate-200" />;

          case "table":
            return (
              <div key={idx} className="overflow-x-auto my-4 rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                    <tr>
                      {block.headers?.map((h, hIdx) => (
                        <th key={hIdx} className="p-3">
                          {renderInlineMarkdown(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {block.rows?.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/80">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-3 text-slate-700">
                            {renderInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
};

export default PolicyMarkdownRenderer;
