import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { DataGrid } from "react-data-grid";
import "react-data-grid/lib/styles.css";

interface SpreadsheetViewerProps {
  filePath: string;
  frozenColumns?: number;
  frozenRows?: number;
}

type CellValue = string | number | boolean | null | undefined;

interface RowData {
  [key: string]: CellValue;
}

const SpreadsheetViewer = ({ 
  filePath, 
  frozenColumns = 1, 
}: SpreadsheetViewerProps) => {
  const [rawData, setRawData] = useState<CellValue[][]>([]);
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
        const jsonData = XLSX.utils.sheet_to_json<CellValue[]>(firstSheet, { 
          header: 1,
          defval: ""
        });
        setRawData(jsonData);
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
    const jsonData = XLSX.utils.sheet_to_json<CellValue[]>(sheet, { 
      header: 1,
      defval: ""
    });
    setRawData(jsonData);
  };

  const { columns, rows } = useMemo(() => {
    if (rawData.length === 0) return { columns: [], rows: [] };

    const maxCols = Math.max(...rawData.map(row => row?.length || 0));
    
    // Generate column letters (A, B, C, ..., Z, AA, AB, ...)
    const getColName = (index: number): string => {
      let name = "";
      let i = index;
      while (i >= 0) {
        name = String.fromCharCode(65 + (i % 26)) + name;
        i = Math.floor(i / 26) - 1;
      }
      return name;
    };

    const cols = Array.from({ length: maxCols }, (_, i) => ({
      key: `col${i}`,
      name: getColName(i),
      frozen: i < frozenColumns,
      width: 120,
      resizable: true,
    }));

    const rowsData: RowData[] = rawData.map((row, rowIndex) => {
      const rowObj: RowData = { id: rowIndex };
      for (let i = 0; i < maxCols; i++) {
        rowObj[`col${i}`] = row?.[i] ?? "";
      }
      return rowObj;
    });

    return { columns: cols, rows: rowsData };
  }, [rawData, frozenColumns]);

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

  return (
    <div className="flex flex-col gap-4">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 flex-wrap border-b border-border pb-2">
          {sheets.map((sheet) => (
            <button
              key={sheet}
              onClick={() => handleSheetChange(sheet)}
              className={`px-4 py-2 text-sm rounded-t-md transition-colors border-b-2 ${
                activeSheet === sheet
                  ? "bg-card border-primary text-foreground font-medium"
                  : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {sheet}
            </button>
          ))}
        </div>
      )}

      {/* Data Grid */}
      <div className="border border-border rounded-lg overflow-hidden" style={{ height: 500 }}>
        <DataGrid
          columns={columns}
          rows={rows}
          rowKeyGetter={(row) => row.id as number}
          className="rdg-light"
          style={{ height: "100%" }}
        />
      </div>

      {/* Info */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{rows.length} rows × {columns.length} columns</span>
        <span>
          {frozenColumns} frozen column(s) • Click cells to select • Drag to resize columns
        </span>
      </div>
    </div>
  );
};

export default SpreadsheetViewer;
