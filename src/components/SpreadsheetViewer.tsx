import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface SpreadsheetViewerProps {
  filePath: string;
  frozenColumns?: number;
}

const SpreadsheetViewer = ({ filePath, frozenColumns = 1 }: SpreadsheetViewerProps) => {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  useEffect(() => {
    const loadFile = async () => {
      try {
        setLoading(true);
        const response = await fetch(filePath);
        const arrayBuffer = await response.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array" });
        
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        setActiveSheet(wb.SheetNames[0]);
        
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
        setData(jsonData);
        setLoading(false);
      } catch (err) {
        setError("Failed to load spreadsheet");
        setLoading(false);
      }
    };

    loadFile();
  }, [filePath]);

  const handleSheetChange = (sheetName: string) => {
    if (!workbook) return;
    setActiveSheet(sheetName);
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    setData(jsonData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/30 rounded-lg">
        <div className="text-muted-foreground">Loading spreadsheet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-destructive/10 rounded-lg">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  const maxCols = Math.max(...data.map(row => row?.length || 0));

  return (
    <div className="flex flex-col gap-4">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {sheets.map((sheet) => (
            <button
              key={sheet}
              onClick={() => handleSheetChange(sheet)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeSheet === sheet
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {sheet}
            </button>
          ))}
        </div>
      )}

      {/* Spreadsheet container */}
      <div className="relative overflow-auto border border-border rounded-lg bg-card max-h-[600px]">
        <table className="border-collapse min-w-full">
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex === 0 ? "bg-muted/50" : ""}>
                {/* Row number */}
                <td
                  className="sticky left-0 z-20 bg-muted border border-border px-2 py-1 text-xs text-muted-foreground text-center min-w-[40px]"
                  style={{ boxShadow: "2px 0 4px rgba(0,0,0,0.1)" }}
                >
                  {rowIndex + 1}
                </td>
                
                {/* Data cells */}
                {Array.from({ length: maxCols }).map((_, colIndex) => {
                  const cellValue = row?.[colIndex] ?? "";
                  const isFrozen = colIndex < frozenColumns;
                  const isHeader = rowIndex === 0;
                  
                  return (
                    <td
                      key={colIndex}
                      className={`border border-border px-2 py-1 text-sm whitespace-nowrap ${
                        isHeader ? "font-semibold bg-muted/50" : "bg-card"
                      } ${isFrozen ? "sticky z-10" : ""}`}
                      style={
                        isFrozen
                          ? {
                              left: `${40 + colIndex * 150}px`,
                              minWidth: "150px",
                              maxWidth: "200px",
                              backgroundColor: isHeader ? "hsl(var(--muted))" : "hsl(var(--card))",
                              boxShadow: colIndex === frozenColumns - 1 ? "2px 0 4px rgba(0,0,0,0.1)" : undefined,
                            }
                          : { minWidth: "100px" }
                      }
                    >
                      <div className="truncate" title={String(cellValue)}>
                        {String(cellValue)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground">
        {data.length} rows × {maxCols} columns • {frozenColumns} frozen column(s)
      </div>
    </div>
  );
};

export default SpreadsheetViewer;
