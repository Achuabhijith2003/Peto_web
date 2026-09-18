import React, { useMemo } from "react";

export type ViewportMode = "desktop" | "tablet" | "mobile";

interface PolicyRendererProps {
  content: string;
  viewport?: ViewportMode;
  className?: string;
  showDeviceFrame?: boolean;
  title?: string;
  version?: string;
  effectiveDate?: string | null;
  showToc?: boolean;
}


interface ParsedBlock {
  type: "h1" | "h2" | "h3" | "h4" | "p" | "ul" | "ol" | "blockquote" | "hr" | "table";
  content?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

/**
 * Safely sanitizes inline markdown (bold, italic, code, links).
 * Strips dangerous javascript: schemes to prevent XSS.
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Regex to split by markdown tokens
  // Links: [text](url)
  // Bold: **text**
  // Italic: *text*
  // Inline code: `text`
  const tokenRegex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      let url = linkMatch[2].trim();

      // Protocol validation to prevent javascript: XSS
      const isAllowedProtocol =
        url.startsWith("https://") ||
        url.startsWith("http://") ||
        url.startsWith("mailto:") ||
        url.startsWith("/");

      if (!isAllowedProtocol) {
        return <span key={index}>{label}</span>;
      }

      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0058be] hover:underline font-medium"
        >
          {label}
        </a>
      );
    }

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-[#151c27]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic text-[#534434]">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline code: `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-[#f0f3ff] text-[#0058be] font-mono text-[11px] border border-[#dae2f3]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

/**
 * Parses markdown body into high-level structured blocks.
 */
function parseMarkdown(rawContent: string): ParsedBlock[] {
  const lines = rawContent.split(/\r?\n/);
  const blocks: ParsedBlock[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let currentTable: { headers: string[]; rows: string[][] } | null = null;

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: currentList.type,
        items: [...currentList.items],
      });
      currentList = null;
    }
  };

  const flushTable = () => {
    if (currentTable) {
      blocks.push({
        type: "table",
        headers: [...currentTable.headers],
        rows: [...currentTable.rows],
      });
      currentTable = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Empty line flushes active list or table
    if (!line) {
      flushList();
      flushTable();
      continue;
    }

    // Horizontal Rule
    if (line === "---" || line === "***" || line === "___") {
      flushList();
      flushTable();
      blocks.push({ type: "hr" });
      continue;
    }

    // Table row detection
    if (line.startsWith("|") && line.endsWith("|")) {
      flushList();
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());

      // Check if this is divider row (|---|---|)
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // Headings
    if (line.startsWith("# ")) {
      flushList();
      blocks.push({ type: "h1", content: line.replace(/^#\s+/, "") });
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      blocks.push({ type: "h2", content: line.replace(/^##\s+/, "") });
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      blocks.push({ type: "h3", content: line.replace(/^###\s+/, "") });
      continue;
    }
    if (line.startsWith("#### ")) {
      flushList();
      blocks.push({ type: "h4", content: line.replace(/^####\s+/, "") });
      continue;
    }

    // Unordered list item
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }

    // Numbered list item
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numMatch[2]);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushList();
      blocks.push({ type: "blockquote", content: line.replace(/^>\s+/, "") });
      continue;
    }

    // Normal Paragraph
    flushList();
    blocks.push({ type: "p", content: line });
  }

  flushList();
  flushTable();
  return blocks;
}

export const PolicyRenderer: React.FC<PolicyRendererProps> = ({
  content,
  viewport = "desktop",
  className = "",
  showDeviceFrame = false,
  title,
  version,
  effectiveDate,
  showToc = false,
}) => {
  const blocks = useMemo(() => parseMarkdown(content || ""), [content]);

  // Extract headings for Table of Contents
  const headings = useMemo(() => {
    return blocks
      .filter((b) => b.type === "h2" || b.type === "h3")
      .map((b) => ({ type: b.type, text: b.content || "" }));
  }, [blocks]);

  // Viewport container width constraints
  const viewportStyles = {
    desktop: "w-full",
    tablet: "max-w-[720px] mx-auto",
    mobile: "max-w-[390px] mx-auto",
  };

  const renderedBody = (
    <div className={`space-y-4 text-xs sm:text-sm text-[#151c27] leading-relaxed select-text ${className}`}>
      {/* Policy Header Box if metadata provided */}
      {title && (
        <div className="bg-[#f9faff] border border-[#dae2f3] rounded-2xl p-5 mb-6 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#151c27]">
              {title}
            </h1>
            {version && (
              <span className="px-3 py-1 rounded-full bg-[#f0f3ff] text-[#0058be] font-mono text-xs font-bold border border-[#dae2f3]">
                Version {version}
              </span>
            )}
          </div>
          {effectiveDate && (
            <p className="text-xs text-[#534434]">
              Effective Date:{" "}
              <span className="font-semibold text-[#151c27]">
                {new Date(effectiveDate).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Table of Contents */}
      {showToc && headings.length > 2 && (
        <div className="bg-[#fcfdff] border border-[#e2e8f8] rounded-2xl p-4 mb-6 text-xs">
          <span className="font-bold text-[#534434] uppercase tracking-wider text-[11px] block mb-2 font-heading">
            Table of Contents
          </span>
          <ul className="space-y-1">
            {headings.map((h, hIdx) => (
              <li
                key={hIdx}
                className={`text-[#0058be] hover:underline cursor-pointer ${
                  h.type === "h3" ? "pl-4 text-[11px] text-[#534434]" : "font-medium"
                }`}
              >
                • {h.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {blocks.length === 0 ? (
        <div className="text-center py-12 text-[#534434] italic">
          No policy content to preview.
        </div>
      ) : (

        blocks.map((block, idx) => {
          switch (block.type) {
            case "h1":
              return (
                <h1
                  key={idx}
                  className="text-xl sm:text-2xl font-bold font-heading text-[#151c27] tracking-tight pt-4 pb-2 border-b border-[#e2e8f8]"
                >
                  {renderInlineMarkdown(block.content || "")}
                </h1>
              );

            case "h2":
              return (
                <h2
                  key={idx}
                  className="text-base sm:text-lg font-bold font-heading text-[#0058be] tracking-tight pt-3 pb-1"
                >
                  {renderInlineMarkdown(block.content || "")}
                </h2>
              );

            case "h3":
              return (
                <h3
                  key={idx}
                  className="text-sm sm:text-base font-bold font-heading text-[#151c27] pt-2"
                >
                  {renderInlineMarkdown(block.content || "")}
                </h3>
              );

            case "h4":
              return (
                <h4 key={idx} className="text-xs sm:text-sm font-bold text-[#534434] pt-1">
                  {renderInlineMarkdown(block.content || "")}
                </h4>
              );

            case "p":
              return (
                <p key={idx} className="leading-relaxed text-[#151c27]/90 font-normal">
                  {renderInlineMarkdown(block.content || "")}
                </p>
              );

            case "ul":
              return (
                <ul key={idx} className="space-y-1.5 pl-5 list-disc text-[#151c27]/90">
                  {block.items?.map((item, itemIdx) => (
                    <li key={itemIdx} className="leading-relaxed">
                      {renderInlineMarkdown(item)}
                    </li>
                  ))}
                </ul>
              );

            case "ol":
              return (
                <ol key={idx} className="space-y-1.5 pl-5 list-decimal text-[#151c27]/90">
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
                  className="border-l-4 border-[#0058be] bg-[#f0f3ff]/60 px-4 py-3 rounded-r-xl text-xs text-[#534434] italic"
                >
                  {renderInlineMarkdown(block.content || "")}
                </blockquote>
              );

            case "hr":
              return <hr key={idx} className="my-6 border-[#e2e8f8]" />;

            case "table":
              return (
                <div key={idx} className="overflow-x-auto my-4 rounded-xl border border-[#e2e8f8]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#f0f3ff] text-[#151c27] font-bold font-heading border-b border-[#e2e8f8]">
                      <tr>
                        {block.headers?.map((h, hIdx) => (
                          <th key={hIdx} className="p-3">
                            {renderInlineMarkdown(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f8]">
                      {block.rows?.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#f9f9ff]">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-3 text-[#151c27]">
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
        })
      )}
    </div>
  );

  if (showDeviceFrame && viewport !== "desktop") {
    return (
      <div className="py-4 flex flex-col items-center justify-center">
        <div className="text-[10px] uppercase font-mono text-[#534434] font-bold mb-2 flex items-center gap-1.5">
          <span>Simulation Mode:</span>
          <span className="px-2 py-0.5 rounded-full bg-[#f0f3ff] text-[#0058be] border border-[#dae2f3]">
            {viewport === "mobile" ? "Mobile Viewport (390px)" : "Tablet Viewport (720px)"}
          </span>
        </div>
        <div
          className={`${viewportStyles[viewport]} w-full bg-white rounded-3xl border-4 border-[#151c27]/20 shadow-2xl p-6 min-h-[500px] transition-all`}
        >
          {renderedBody}
        </div>
      </div>
    );
  }

  return <div className={`${viewportStyles[viewport]} transition-all`}>{renderedBody}</div>;
};

export default PolicyRenderer;
