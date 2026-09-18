import PDFDocument from "pdfkit";

export interface PolicyPdfData {
  id: string;
  title: string;
  policy_type: string;
  version: string;
  status: string;
  content: string;
  effective_date?: string;
  published_at?: string;
  summary_of_changes?: string;
  region_code?: string;
}

/**
 * Generates an official, immutable PDF document for any policy revision.
 */
export async function generatePolicyPdf(policy: PolicyPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: `Peto — ${policy.title} (v${policy.version})`,
          Author: "Peto Legal & Compliance",
          Subject: `${policy.title} Version ${policy.version}`,
          Keywords: "Peto, Policy, Compliance, Legal, Privacy, Terms",
          CreationDate: new Date(),
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      const primaryColor = "#0058be";
      const secondaryColor = "#534434";
      const textColor = "#151c27";
      const borderColor = "#e2e8f8";
      const lightBgColor = "#f0f3ff";

      // ----------------------------------------------------
      // HEADER BANNER
      // ----------------------------------------------------
      doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text("PETO", 50, 45, { characterSpacing: 2 });

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(secondaryColor)
        .text("LEGAL & COMPLIANCE REGULATORY DOCUMENT", 50, 72, { characterSpacing: 1 });

      doc
        .moveTo(50, 88)
        .lineTo(545, 88)
        .lineWidth(1.5)
        .strokeColor(primaryColor)
        .stroke();

      // ----------------------------------------------------
      // DOCUMENT METADATA BOX
      // ----------------------------------------------------
      const boxTop = 100;
      const boxHeight = 70;
      doc
        .rect(50, boxTop, 495, boxHeight)
        .fillColor(lightBgColor)
        .fill();

      doc
        .rect(50, boxTop, 495, boxHeight)
        .lineWidth(1)
        .strokeColor(borderColor)
        .stroke();

      // Box Content
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor(textColor)
        .text(policy.title, 65, boxTop + 12);

      const effectiveDateStr = policy.effective_date
        ? new Date(policy.effective_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : policy.published_at
        ? new Date(policy.published_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Pending Publication";

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(secondaryColor)
        .text(`Version: `, 65, boxTop + 38, { continued: true })
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text(`v${policy.version}  `, { continued: true })
        .font("Helvetica")
        .fillColor(secondaryColor)
        .text(`•  Effective Date: `, { continued: true })
        .font("Helvetica-Bold")
        .fillColor(textColor)
        .text(`${effectiveDateStr}  `, { continued: true })
        .font("Helvetica")
        .fillColor(secondaryColor)
        .text(`•  Status: `, { continued: true })
        .font("Helvetica-Bold")
        .fillColor(policy.status === "PUBLISHED" ? "#006c49" : "#ba1a1a")
        .text(policy.status);

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(secondaryColor)
        .text(
          `Document Ref: ${policy.id}  |  Jurisdiction / Scope: ${policy.region_code || "GLOBAL"}`,
          65,
          boxTop + 52
        );

      doc.y = boxTop + boxHeight + 25;

      // ----------------------------------------------------
      // MARKDOWN BODY PARSING
      // ----------------------------------------------------
      const lines = policy.content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) {
          doc.moveDown(0.5);
          continue;
        }

        // H1 (# Title)
        if (line.startsWith("# ")) {
          doc.moveDown(0.8);
          doc
            .fontSize(18)
            .font("Helvetica-Bold")
            .fillColor(primaryColor)
            .text(line.replace(/^#\s+/, ""));
          doc.moveDown(0.4);
          continue;
        }

        // H2 (## Section)
        if (line.startsWith("## ")) {
          doc.moveDown(0.7);
          doc
            .fontSize(14)
            .font("Helvetica-Bold")
            .fillColor(primaryColor)
            .text(line.replace(/^##\s+/, ""));
          doc.moveDown(0.3);
          continue;
        }

        // H3 (### Subsection)
        if (line.startsWith("### ")) {
          doc.moveDown(0.6);
          doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .fillColor(textColor)
            .text(line.replace(/^###\s+/, ""));
          doc.moveDown(0.2);
          continue;
        }

        // Horizontal Rule
        if (line === "---" || line === "***" || line === "___") {
          doc.moveDown(0.5);
          const currentY = doc.y;
          doc
            .moveTo(50, currentY)
            .lineTo(545, currentY)
            .lineWidth(0.5)
            .strokeColor(borderColor)
            .stroke();
          doc.moveDown(0.5);
          continue;
        }

        // Bullet Point (- item or * item)
        if (line.startsWith("- ") || line.startsWith("* ")) {
          const itemText = line.replace(/^[-*]\s+/, "");
          const cleanText = itemText.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
          doc
            .fontSize(9.5)
            .font("Helvetica")
            .fillColor(textColor)
            .text(`•  ${cleanText}`, 65, doc.y, {
              lineGap: 3,
              width: 480,
            });
          doc.x = 50;
          continue;
        }

        // Numbered List Item
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const itemText = numMatch[2].replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
          doc
            .fontSize(9.5)
            .font("Helvetica")
            .fillColor(textColor)
            .text(`${num}.  ${itemText}`, 65, doc.y, {
              lineGap: 3,
              width: 480,
            });
          doc.x = 50;
          continue;
        }

        // Blockquote
        if (line.startsWith("> ")) {
          const quoteText = line.replace(/^>\s+/, "").replace(/\*\*(.*?)\*\*/g, "$1");
          const startY = doc.y;
          doc
            .fontSize(9)
            .font("Helvetica-Oblique")
            .fillColor(secondaryColor)
            .text(quoteText, 70, startY, { width: 470, lineGap: 2 });
          const endY = doc.y;

          doc
            .moveTo(58, startY)
            .lineTo(58, endY)
            .lineWidth(2)
            .strokeColor(primaryColor)
            .stroke();

          doc.x = 50;
          doc.moveDown(0.4);
          continue;
        }

        // Normal Paragraph
        const cleanParagraph = line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
        doc
          .fontSize(9.5)
          .font("Helvetica")
          .fillColor(textColor)
          .text(cleanParagraph, 50, doc.y, {
            align: "justify",
            lineGap: 3,
            width: 495,
          });
        doc.moveDown(0.4);
      }

      // Summary of changes callout if present
      if (policy.summary_of_changes) {
        doc.moveDown(1);
        doc
          .rect(50, doc.y, 495, 36)
          .fillColor("#faf5ef")
          .fill();

        doc
          .rect(50, doc.y - 36, 495, 36)
          .lineWidth(0.5)
          .strokeColor("#e5dcd3")
          .stroke();

        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor(secondaryColor)
          .text("REVISION NOTES & MODIFICATIONS:", 60, doc.y - 28);

        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor(textColor)
          .text(policy.summary_of_changes, 60, doc.y - 16, { width: 475 });

        doc.moveDown(0.8);
      }

      // ----------------------------------------------------
      // NUMBER PAGES & LEGAL FOOTER
      // ----------------------------------------------------
      const range = doc.bufferedPageRange();
      for (let p = 0; p < range.count; p++) {
        doc.switchToPage(p);

        // Footer divider
        doc
          .moveTo(50, 770)
          .lineTo(545, 770)
          .lineWidth(0.5)
          .strokeColor(borderColor)
          .stroke();

        // Footer left: Peto notice
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor(secondaryColor)
          .text(
            `Peto Official Legal Document — ${policy.title} v${policy.version}`,
            50,
            778
          );

        // Footer right: Page number
        doc
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .fillColor(secondaryColor)
          .text(`Page ${p + 1} of ${range.count}`, 450, 778, {
            align: "right",
            width: 95,
          });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
