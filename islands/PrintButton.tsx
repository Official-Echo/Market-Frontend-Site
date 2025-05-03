import { useState } from "preact/hooks";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface TableOption {
  title?: string;
  headers: string[];
  getRows?: () => (string | number | null | undefined)[][];
  columnWidths?: (number | "auto")[];
  footer?: string;

  autoTableOptions?: Record<string, any>;
}

interface PrintButtonProps {
  title: string;
  contentSelector?: string;
  orientation?: "portrait" | "landscape";
  paperSize?: "a4" | "letter";
  filename?: string;
  subtitle?: string;
  storeName?: string;
  tableOptions?: TableOption | TableOption[];
  footerText?: string;
}

export default function PrintButton({
  title,
  contentSelector,
  orientation = "portrait",
  paperSize = "a4",
  filename = "report.pdf",
  subtitle,
  storeName = "ZLAGODA",
  tableOptions,
  footerText,
}: PrintButtonProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generatePDF = () => {
    setGenerating(true);

    try {
      let pdfOrientation = orientation;
      let pdfPaperSize = paperSize;

      let maxColumns = 0;
      if (tableOptions) {
        const optionsArray = Array.isArray(tableOptions)
          ? tableOptions
          : [tableOptions];
        optionsArray.forEach((opt) => {
          if (opt.headers.length > maxColumns) {
            maxColumns = opt.headers.length;
          }
        });

        if (maxColumns > 6 && pdfOrientation === "portrait") {
          pdfOrientation = "landscape";
        }
      }

      const doc = new jsPDF({
        orientation: pdfOrientation,
        unit: "mm",
        format: pdfPaperSize,
      });

      const pageWidth = pdfOrientation === "portrait" ? 210 : 297;
      const pageHeight = pdfOrientation === "portrait" ? 297 : 210;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(storeName, margin, margin);

      const currentDate = new Date().toLocaleDateString();
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        currentDate,
        pageWidth - margin - doc.getTextWidth(currentDate),
        margin,
      );

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin, margin + 10);

      if (subtitle) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "italic");
        doc.text(subtitle, margin, margin + 18);
      }

      let yPos = margin + (subtitle ? 25 : 20);

      if (tableOptions) {
        yPos = drawDataTable(
          doc,
          tableOptions,
          margin,
          yPos,
          contentWidth,
          pageHeight,
          margin,
        );
      } else if (contentSelector) {
        const content = document.querySelector(contentSelector) as HTMLElement;
        if (!content) {
          throw new Error(`Content selector "${contentSelector}" not found`);
        }

        const buttons = content.querySelectorAll("button");
        buttons.forEach((btn) =>
          btn.setAttribute("data-original-text", btn.innerText)
        );
        buttons.forEach((btn) => btn.innerText = "");

        const tables = content.querySelectorAll("table");
        if (tables.length > 0) {
          yPos = addTablesToDocument(
            doc,
            tables,
            margin,
            yPos,
            contentWidth,
            pageHeight,
          );
        } else {
          const text = content.innerText
            .replace(/\n{3,}/g, "\n\n")
            .trim();

          const lines = text.split("\n");

          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");

          for (const line of lines) {
            if (yPos > pageHeight - margin - 20) {
              doc.addPage();
              addFooter(doc, pageWidth, pageHeight, margin, 1);
              yPos = margin;
            }

            if (line.trim().match(/^[A-Z][\w\s]{2,20}:?$/)) {
              doc.setFont("helvetica", "bold");
              yPos += 5;
            } else {
              doc.setFont("helvetica", "normal");
            }

            const textLines = doc.splitTextToSize(line, contentWidth);
            for (const textLine of textLines) {
              doc.text(textLine, margin, yPos);
              yPos += 6;
            }
          }
        }

        buttons.forEach((btn) => {
          const originalText = btn.getAttribute("data-original-text");
          if (originalText) btn.innerText = originalText;
          btn.removeAttribute("data-original-text");
        });
      } else {
        throw new Error(
          "No content source provided: Either 'tableOptions' or 'contentSelector' must be specified.",
        );
      }

      addFooter(doc, pageWidth, pageHeight, margin, 1);

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        addFooter(doc, pageWidth, pageHeight, margin, i, pageCount);
      }

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert(
        "Error generating PDF preview: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setGenerating(false);
    }
  };

  function drawDataTable(
    doc: any,
    options: PrintButtonProps["tableOptions"],
    x: number,
    y: number,
    width: number,
    pageHeight: number,
    margin: number,
  ): number {
    if (!options) return y + 10;

    const optionsArray = Array.isArray(options) ? options : [options];
    let currentY = y;

    optionsArray.forEach((tableConfig, index) => {
      if (tableConfig.title) {
        currentY += 15;
      }

      currentY = processTable(
        doc,
        tableConfig,
        x,
        currentY,
        width,
        pageHeight,
        margin,
      );

      if (tableConfig.footer) {
        currentY += 10;
      }

      if (index < optionsArray.length - 1) {
        currentY += 10;
      }
    });

    return currentY;

    function processTable(
      doc: any,
      tableConfig: TableOption,
      x: number,
      y: number,
      width: number,
      pageHeight: number,
      margin: number,
    ): number {
      const headers = tableConfig.headers;
      const rows = tableConfig.getRows ? tableConfig.getRows() : [];

      const columnStyles: { [key: number]: { cellWidth: number | "auto" } } =
        {};
      let useAutoTableWidths = true;
      if (
        tableConfig.columnWidths &&
        tableConfig.columnWidths.length === headers.length
      ) {
        useAutoTableWidths = false;
        tableConfig.columnWidths.forEach((colWidth, idx) => {
          if (typeof colWidth === "number") {
            columnStyles[idx] = { cellWidth: (colWidth / 100) * width };
          } else {
            columnStyles[idx] = { cellWidth: "auto" };
            useAutoTableWidths = true;
          }
        });
      }

      doc.autoTable({
        head: [headers],
        body: rows,
        startY: y,
        margin: { left: x, right: x },
        pageBreak: "auto",
        tableWidth: "wrap",

        columnStyles: useAutoTableWidths ? undefined : columnStyles,

        didDrawPage: (data: any) => {
          addFooter(
            doc,
            width + 2 * margin,
            pageHeight,
            margin,
            data.pageNumber,
          );
        },

        ...(tableConfig.autoTableOptions || {}),
      });

      return (doc as any).lastAutoTable.finalY + 10;
    }
  }

  function addTablesToDocument(
    doc: any,
    tables: NodeListOf<HTMLTableElement>,
    margin: number,
    yPos: number,
    contentWidth: number,
    pageHeight: number,
  ): number {
    tables.forEach((table) => {
      const headerCells = table.querySelectorAll("th");
      const headers = Array.from(headerCells).map((th) => th.innerText);

      const rows = Array.from(table.querySelectorAll("tr"))
        .filter((tr) => !tr.querySelector("th"))
        .map((tr) =>
          Array.from(tr.querySelectorAll("td"))
            .map((td) => td.innerText)
        );

      yPos += 10;

      const tableOptions = {
        headers,
        getRows: () => rows,
      };

      yPos = drawDataTable(
        doc,
        tableOptions,
        margin,
        yPos,
        contentWidth,
        pageHeight,
        margin,
      );
    });

    return yPos;
  }

  function addFooter(
    doc: any,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    currentPage: number,
    totalPages?: number,
  ) {
    const date = new Date().toLocaleDateString();

    const mainFooterStr = footerText || `${storeName} | Generated on ${date}`;

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    doc.text(
      mainFooterStr,
      margin,
      pageHeight - margin / 2,
      { align: "left" },
    );

    if (totalPages) {
      const pageStr = `Page ${currentPage} of ${totalPages}`;
      doc.text(
        pageStr,
        pageWidth - margin,
        pageHeight - margin / 2,
        { align: "right" },
      );
    }
  }

  const handlePrint = () => {
    if (showPreview && previewUrl) {
      const iframe = document.getElementById(
        "pdf-preview",
      ) as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.print();
      }
    }
  };

  const handleDownload = () => {
    if (previewUrl) {
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <>
      <div className="print-actions">
        {!showPreview
          ? (
            <button
              type="button"
              onClick={generating ? undefined : generatePDF}
              disabled={generating}
              className="print-button"
            >
              {generating ? "Generating Report..." : "Generate Report"}
            </button>
          )
          : (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="print-button"
              >
                Print Report
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="download-button"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreview(false);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                }}
                className="close-button"
              >
                Close Preview
              </button>
            </>
          )}
      </div>

      {showPreview && previewUrl && (
        <div className="pdf-preview">
          <h3>Report Preview</h3>
          <iframe
            id="pdf-preview"
            src={previewUrl}
            width="100%"
            height="600px"
            style={{
              border: "1px solid #ccc",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          />
        </div>
      )}
    </>
  );
}
