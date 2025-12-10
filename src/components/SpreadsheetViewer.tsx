import { useEffect, useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { Search, ArrowUpDown, Copy, Download } from "lucide-react";
import { toast } from "sonner";

interface SpreadsheetViewerProps {
  filePath: string;
  frozenColumns?: number;
}

type CellValue = string | number | boolean | null | undefined;

interface Selection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

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
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<{ row: number; col: number }[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ col: number; direction: "asc" | "desc" } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

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
    setSelection(null);
    setEditingCell(null);
    setSortConfig(null);
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

  // Selection handlers
  const handleCellMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (e.shiftKey && selection) {
      setSelection({
        ...selection,
        endRow: row,
        endCol: col
      });
    } else {
      setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
      setIsSelecting(true);
    }
  }, [selection]);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (isSelecting && selection) {
      setSelection({
        ...selection,
        endRow: row,
        endCol: col
      });
    }
  }, [isSelecting, selection]);

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  const isInSelection = (row: number, col: number): boolean => {
    if (!selection) return false;
    const minRow = Math.min(selection.startRow, selection.endRow);
    const maxRow = Math.max(selection.startRow, selection.endRow);
    const minCol = Math.min(selection.startCol, selection.endCol);
    const maxCol = Math.max(selection.startCol, selection.endCol);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  // Double-click to edit
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

  // Copy selection
  const copySelection = useCallback(() => {
    if (!selection) return;
    
    const minRow = Math.min(selection.startRow, selection.endRow);
    const maxRow = Math.max(selection.startRow, selection.endRow);
    const minCol = Math.min(selection.startCol, selection.endCol);
    const maxCol = Math.max(selection.startCol, selection.endCol);
    
    const selectedData: string[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const rowData: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        rowData.push(String(data[r]?.[c] ?? ""));
      }
      selectedData.push(rowData);
    }
    
    const text = selectedData.map(row => row.join("\t")).join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${maxRow - minRow + 1} rows × ${maxCol - minCol + 1} cols`);
  }, [selection, data]);

  // Search
  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results: { row: number; col: number }[] = [];
    const term = searchTerm.toLowerCase();
    
    data.forEach((row, rowIndex) => {
      row?.forEach((cell, colIndex) => {
        if (String(cell).toLowerCase().includes(term)) {
          results.push({ row: rowIndex, col: colIndex });
        }
      });
    });
    
    setSearchResults(results);
    setCurrentSearchIndex(0);
    
    if (results.length > 0) {
      setSelection({
        startRow: results[0].row,
        startCol: results[0].col,
        endRow: results[0].row,
        endCol: results[0].col
      });
      toast.success(`Found ${results.length} matches`);
    } else {
      toast.error("No matches found");
    }
  }, [searchTerm, data]);

  const goToNextResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    const result = searchResults[nextIndex];
    setSelection({
      startRow: result.row,
      startCol: result.col,
      endRow: result.row,
      endCol: result.col
    });
  }, [searchResults, currentSearchIndex]);

  // Sort column
  const sortColumn = useCallback((colIndex: number) => {
    const direction = sortConfig?.col === colIndex && sortConfig.direction === "asc" ? "desc" : "asc";
    
    const sortedData = [...data].sort((a, b) => {
      const aVal = a?.[colIndex] ?? "";
      const bVal = b?.[colIndex] ?? "";
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (direction === "asc") {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
    
    setData(sortedData);
    setSortConfig({ col: colIndex, direction });
    toast.success(`Sorted by column ${getColName(colIndex)} (${direction})`);
  }, [data, sortConfig]);

  // Export
  const exportToExcel = useCallback(() => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, ws, "Sheet1");
    XLSX.writeFile(newWb, "export.xlsx");
    toast.success("Exported to export.xlsx");
  }, [data]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        copySelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
      if (e.key === "Escape") {
        setEditingCell(null);
        setSelection(null);
      }
      // Arrow key navigation
      if (selection && !editingCell && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const { startRow, startCol } = selection;
        let newRow = startRow;
        let newCol = startCol;
        
        if (e.key === "ArrowUp") newRow = Math.max(0, startRow - 1);
        if (e.key === "ArrowDown") newRow = Math.min(data.length - 1, startRow + 1);
        if (e.key === "ArrowLeft") newCol = Math.max(0, startCol - 1);
        if (e.key === "ArrowRight") newCol = Math.min(maxCols - 1, startCol + 1);
        
        if (e.shiftKey) {
          setSelection({ ...selection, endRow: newRow, endCol: newCol });
        } else {
          setSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol });
        }
      }
      // Enter to edit
      if (e.key === "Enter" && selection && !editingCell) {
        handleCellDoubleClick(selection.startRow, selection.startCol);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selection, editingCell, copySelection, handleCellDoubleClick, data.length]);

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
  const selectionInfo = selection ? {
    rows: Math.abs(selection.endRow - selection.startRow) + 1,
    cols: Math.abs(selection.endCol - selection.startCol) + 1
  } : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            id="search-input"
            type="text"
            placeholder="Search... (Ctrl+F)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={handleSearch}
            className="px-2 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
          >
            Find
          </button>
          {searchResults.length > 0 && (
            <button
              onClick={goToNextResult}
              className="px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80"
            >
              Next ({currentSearchIndex + 1}/{searchResults.length})
            </button>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={copySelection}
            disabled={!selection}
            className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80 disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {sheets.map((sheet) => (
            <button
              key={sheet}
              onClick={() => handleSheetChange(sheet)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
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
      <div className="relative overflow-auto border border-border rounded-lg bg-background max-h-[500px] select-none">
        <table ref={tableRef} className="border-collapse text-sm">
          {/* Column headers */}
          <thead className="sticky top-0 z-30">
            <tr>
              <th className="sticky left-0 z-40 bg-muted border border-border min-w-[50px] h-8" />
              {Array.from({ length: maxCols }).map((_, colIndex) => (
                <th
                  key={colIndex}
                  onClick={() => sortColumn(colIndex)}
                  className={`bg-muted border border-border px-2 h-8 text-center font-medium text-muted-foreground min-w-[100px] cursor-pointer hover:bg-muted/80 ${
                    colIndex < frozenColumns ? "sticky z-30" : ""
                  }`}
                  style={colIndex < frozenColumns ? { left: `${50 + colIndex * 100}px` } : undefined}
                >
                  <div className="flex items-center justify-center gap-1">
                    {getColName(colIndex)}
                    {sortConfig?.col === colIndex && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="sticky left-0 z-20 bg-muted border border-border px-2 py-1 text-center text-muted-foreground font-medium min-w-[50px]">
                  {rowIndex + 1}
                </td>
                
                {Array.from({ length: maxCols }).map((_, colIndex) => {
                  const cellValue = row?.[colIndex] ?? "";
                  const isSelected = isInSelection(rowIndex, colIndex);
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                  const isFrozen = colIndex < frozenColumns;
                  const isSearchMatch = searchResults.some(r => r.row === rowIndex && r.col === colIndex);
                  
                  return (
                    <td
                      key={colIndex}
                      onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                      onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                      className={`border border-border px-2 py-1 min-w-[100px] max-w-[200px] cursor-cell ${
                        isSelected ? "bg-primary/20" : isSearchMatch ? "bg-yellow-200 dark:bg-yellow-900" : "bg-card hover:bg-muted/30"
                      } ${isFrozen ? "sticky z-10" : ""}`}
                      style={isFrozen ? { left: `${50 + colIndex * 100}px`, backgroundColor: isSelected ? undefined : "hsl(var(--card))" } : undefined}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleEditComplete}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditComplete();
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          className="w-full bg-background border-none outline-none p-0"
                          autoFocus
                        />
                      ) : (
                        <div className="truncate">{String(cellValue)}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex justify-between items-center text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded">
        <span>{data.length} rows × {maxCols} columns</span>
        <div className="flex gap-4">
          {selectionInfo && selectionInfo.rows * selectionInfo.cols > 1 && (
            <span className="font-medium text-foreground">
              Selection: {selectionInfo.rows} × {selectionInfo.cols}
            </span>
          )}
          {selection && (
            <span className="font-medium">
              {getColName(selection.startCol)}{selection.startRow + 1}
            </span>
          )}
          <span className="hidden sm:inline">
            Ctrl+C: Copy • Ctrl+F: Search • Enter: Edit • Arrows: Navigate
          </span>
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetViewer;
