import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";

interface SpreadsheetViewerProps {
  filePath: string;
  frozenColumns?: number;
}

type CellValue = string | number | boolean | null | undefined;

const SpreadsheetViewer = ({ 
  filePath, 
  frozenColumns = 1,
}: SpreadsheetViewerProps) => {
  const [data, setData] = useState<CellValue[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");

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
    const jsonData = XLSX.utils.sheet_to_json<CellValue[]>(sheet, { 
      header: 1,
      defval: ""
    });
    setData(jsonData);
    setSelectedCell(null);
    setEditingCell(null);
  };

  const getColName = (index: number): string => {
    let name = "";
    let i = index;
    while (i >= 0) {
      name = String.fromCharCode(65 + (i % 26)) + name;
      i = Math.floor(i / 26) - 1;
    }
    return name;
  };

  const handleCellClick = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
  }, []);

  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    setEditingCell({ row, col });
    setEditValue(String(data[row]?.[col] ?? ""));
  }, [data]);

  const handleEditComplete = useCallback(() => {
    if (editingCell) {
      const newData = [...data];
      if (!newData[editingCell.row]) {
        newData[editingCell.row] = [];
      }
      newData[editingCell.row][editingCell.col] = editValue;
      setData(newData);
    }
    setEditingCell(null);
  }, [editingCell, editValue, data]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEditComplete();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  }, [handleEditComplete]);

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

  const maxCols = Math.max(...data.map(row => row?.length || 0), 1);

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

      {/* Spreadsheet container */}
      <div className="relative overflow-auto border border-border rounded-lg bg-background max-h-[550px]">
        <table className="border-collapse text-sm">
          {/* Column headers */}
          <thead className="sticky top-0 z-30">
            <tr>
              {/* Corner cell */}
              <th className="sticky left-0 z-40 bg-muted border border-border min-w-[50px] h-8" />
              
              {/* Column letters */}
              {Array.from({ length: maxCols }).map((_, colIndex) => (
                <th
                  key={colIndex}
                  className={`bg-muted border border-border px-2 h-8 text-center font-medium text-muted-foreground min-w-[100px] ${
                    colIndex < frozenColumns ? "sticky z-30" : ""
                  }`}
                  style={colIndex < frozenColumns ? { left: `${50 + colIndex * 100}px` } : undefined}
                >
                  {getColName(colIndex)}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {/* Row number */}
                <td
                  className="sticky left-0 z-20 bg-muted border border-border px-2 py-1 text-center text-muted-foreground font-medium min-w-[50px]"
                >
                  {rowIndex + 1}
                </td>
                
                {/* Data cells */}
                {Array.from({ length: maxCols }).map((_, colIndex) => {
                  const cellValue = row?.[colIndex] ?? "";
                  const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                  const isFrozen = colIndex < frozenColumns;
                  
                  return (
                    <td
                      key={colIndex}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                      className={`border border-border px-2 py-1 min-w-[100px] max-w-[200px] cursor-cell transition-colors ${
                        isSelected ? "bg-primary/10 outline outline-2 outline-primary" : "bg-card hover:bg-muted/30"
                      } ${isFrozen ? "sticky z-10 bg-card" : ""}`}
                      style={isFrozen ? { left: `${50 + colIndex * 100}px` } : undefined}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleEditComplete}
                          onKeyDown={handleKeyDown}
                          className="w-full bg-background border-none outline-none p-0"
                          autoFocus
                        />
                      ) : (
                        <div className="truncate" title={String(cellValue)}>
                          {String(cellValue)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{data.length} rows × {maxCols} columns</span>
        <div className="flex gap-4">
          {selectedCell && (
            <span className="font-medium text-foreground">
              {getColName(selectedCell.col)}{selectedCell.row + 1}: {String(data[selectedCell.row]?.[selectedCell.col] ?? "")}
            </span>
          )}
          <span>Click to select • Double-click to edit • {frozenColumns} frozen col(s)</span>
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetViewer;
