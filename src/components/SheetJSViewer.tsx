import { useEffect, useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { Search, ArrowUpDown, Copy, Download, Plus, Minus, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface SheetJSViewerProps {
  filePath: string;
  frozenColumns?: number;
  frozenRows?: number;
}

type CellValue = string | number | boolean | null | undefined;

interface Selection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

const SheetJSViewer = ({ 
  filePath, 
  frozenColumns = 1,
  frozenRows = 1,
}: SheetJSViewerProps) => {
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
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [rowHeights, setRowHeights] = useState<number[]>([]);
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const [resizingRow, setResizingRow] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: number; col: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const DEFAULT_COL_WIDTH = 100;
  const DEFAULT_ROW_HEIGHT = 28;

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
        
        const maxCols = Math.max(...jsonData.map(row => row?.length || 0), 1);
        setColWidths(new Array(maxCols).fill(DEFAULT_COL_WIDTH));
        setRowHeights(new Array(jsonData.length).fill(DEFAULT_ROW_HEIGHT));
        
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
    
    const maxCols = Math.max(...jsonData.map(row => row?.length || 0), 1);
    setColWidths(new Array(maxCols).fill(DEFAULT_COL_WIDTH));
    setRowHeights(new Array(jsonData.length).fill(DEFAULT_ROW_HEIGHT));
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

  // Column resize
  const handleColResizeStart = (colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingCol(colIndex);
    const startX = e.clientX;
    const startWidth = colWidths[colIndex] || DEFAULT_COL_WIDTH;

    const handleMouseMove = (moveE: MouseEvent) => {
      const diff = moveE.clientX - startX;
      setColWidths(prev => {
        const newWidths = [...prev];
        newWidths[colIndex] = Math.max(50, startWidth + diff);
        return newWidths;
      });
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Row resize
  const handleRowResizeStart = (rowIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingRow(rowIndex);
    const startY = e.clientY;
    const startHeight = rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT;

    const handleMouseMove = (moveE: MouseEvent) => {
      const diff = moveE.clientY - startY;
      setRowHeights(prev => {
        const newHeights = [...prev];
        newHeights[rowIndex] = Math.max(20, startHeight + diff);
        return newHeights;
      });
    };

    const handleMouseUp = () => {
      setResizingRow(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Selection handlers
  const handleCellMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (e.button === 2) return; // Right click
    if (e.shiftKey && selection) {
      setSelection({ ...selection, endRow: row, endCol: col });
    } else {
      setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
      setIsSelecting(true);
    }
  }, [selection]);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (isSelecting && selection) {
      setSelection({ ...selection, endRow: row, endCol: col });
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

  // Context menu
  const handleContextMenu = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, row, col });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    document.addEventListener("click", closeContextMenu);
    return () => document.removeEventListener("click", closeContextMenu);
  }, []);

  // Insert/delete rows/cols
  const insertRow = (afterIndex: number) => {
    const newData = [...data];
    const maxCols = Math.max(...data.map(row => row?.length || 0), 1);
    newData.splice(afterIndex + 1, 0, new Array(maxCols).fill(""));
    setData(newData);
    setRowHeights(prev => {
      const newHeights = [...prev];
      newHeights.splice(afterIndex + 1, 0, DEFAULT_ROW_HEIGHT);
      return newHeights;
    });
    toast.success("Row inserted");
  };

  const deleteRow = (index: number) => {
    if (data.length <= 1) return;
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
    setRowHeights(prev => {
      const newHeights = [...prev];
      newHeights.splice(index, 1);
      return newHeights;
    });
    toast.success("Row deleted");
  };

  const insertColumn = (afterIndex: number) => {
    const newData = data.map(row => {
      const newRow = [...(row || [])];
      newRow.splice(afterIndex + 1, 0, "");
      return newRow;
    });
    setData(newData);
    setColWidths(prev => {
      const newWidths = [...prev];
      newWidths.splice(afterIndex + 1, 0, DEFAULT_COL_WIDTH);
      return newWidths;
    });
    toast.success("Column inserted");
  };

  const deleteColumn = (index: number) => {
    const maxCols = Math.max(...data.map(row => row?.length || 0), 1);
    if (maxCols <= 1) return;
    const newData = data.map(row => {
      const newRow = [...(row || [])];
      newRow.splice(index, 1);
      return newRow;
    });
    setData(newData);
    setColWidths(prev => {
      const newWidths = [...prev];
      newWidths.splice(index, 1);
      return newWidths;
    });
    toast.success("Column deleted");
  };

  // Edit
  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    setEditingCell({ row, col });
    setEditValue(String(data[row]?.[col] ?? ""));
  }, [data]);

  const handleEditComplete = useCallback(() => {
    if (editingCell) {
      const newData = [...data];
      if (!newData[editingCell.row]) newData[editingCell.row] = [];
      newData[editingCell.row][editingCell.col] = editValue;
      setData(newData);
    }
    setEditingCell(null);
  }, [editingCell, editValue, data]);

  // Copy
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
    toast.success(`Copied ${maxRow - minRow + 1} × ${maxCol - minCol + 1} cells`);
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
        startRow: results[0].row, startCol: results[0].col,
        endRow: results[0].row, endCol: results[0].col
      });
      toast.success(`Found ${results.length} matches`);
    } else {
      toast.error("No matches found");
    }
  }, [searchTerm, data]);

  // Sort
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
      return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    setData(sortedData);
    setSortConfig({ col: colIndex, direction });
    toast.success(`Sorted by ${getColName(colIndex)} (${direction})`);
  }, [data, sortConfig]);

  // Export
  const exportToExcel = useCallback(() => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, ws, "Sheet1");
    XLSX.writeFile(newWb, "export.xlsx");
    toast.success("Exported!");
  }, [data]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") copySelection();
      if (e.key === "Escape") { setEditingCell(null); setSelection(null); }
      if (selection && !editingCell && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const { startRow, startCol } = selection;
        let newRow = startRow, newCol = startCol;
        if (e.key === "ArrowUp") newRow = Math.max(0, startRow - 1);
        if (e.key === "ArrowDown") newRow = Math.min(data.length - 1, startRow + 1);
        if (e.key === "ArrowLeft") newCol = Math.max(0, startCol - 1);
        if (e.key === "ArrowRight") newCol = Math.min(maxCols - 1, startCol + 1);
        if (e.shiftKey) setSelection({ ...selection, endRow: newRow, endCol: newCol });
        else setSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol });
      }
      if (e.key === "Enter" && selection && !editingCell) {
        handleCellDoubleClick(selection.startRow, selection.startCol);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selection, editingCell, copySelection, handleCellDoubleClick, data.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-muted/30 rounded-lg">
        <div className="text-muted-foreground">Loading SheetJS...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80 bg-destructive/10 rounded-lg">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  const maxCols = Math.max(...data.map(row => row?.length || 0), 1);
  const frozenColLeft = (colIndex: number) => 50 + colWidths.slice(0, colIndex).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-green-600 dark:text-green-400">SheetJS (Custom)</h3>
        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
          Open Source
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1 flex-1 min-w-[150px]">
          <Search className="w-3 h-3" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs"
          />
        </div>
        <button onClick={copySelection} className="p-1 bg-muted rounded hover:bg-muted/80" title="Copy">
          <Copy className="w-3 h-3" />
        </button>
        <button onClick={exportToExcel} className="p-1 bg-muted rounded hover:bg-muted/80" title="Export">
          <Download className="w-3 h-3" />
        </button>
      </div>

      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {sheets.map((sheet) => (
            <button
              key={sheet}
              onClick={() => handleSheetChange(sheet)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeSheet === sheet
                  ? "bg-green-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {sheet}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div ref={tableRef} className="relative overflow-auto border border-border rounded-lg bg-background max-h-[400px] select-none flex-1">
        <table className="border-collapse text-xs">
          <thead className="sticky top-0 z-30">
            <tr>
              <th className="sticky left-0 z-40 bg-muted border border-border w-[50px] h-7" />
              {Array.from({ length: maxCols }).map((_, colIndex) => (
                <th
                  key={colIndex}
                  className={`bg-muted border border-border h-7 text-center font-medium text-muted-foreground relative group ${
                    colIndex < frozenColumns ? "sticky z-30" : ""
                  }`}
                  style={{ 
                    width: colWidths[colIndex] || DEFAULT_COL_WIDTH,
                    minWidth: colWidths[colIndex] || DEFAULT_COL_WIDTH,
                    left: colIndex < frozenColumns ? `${frozenColLeft(colIndex)}px` : undefined
                  }}
                >
                  <div 
                    className="flex items-center justify-center gap-1 cursor-pointer"
                    onClick={() => sortColumn(colIndex)}
                  >
                    {getColName(colIndex)}
                    {sortConfig?.col === colIndex && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-primary/50"
                    onMouseDown={(e) => handleColResizeStart(colIndex, e)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ height: rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT }}>
                <td className="sticky left-0 z-20 bg-muted border border-border text-center text-muted-foreground font-medium w-[50px] relative group">
                  {rowIndex + 1}
                  {/* Row resize handle */}
                  <div
                    className="absolute left-0 right-0 bottom-0 h-1 cursor-row-resize bg-transparent hover:bg-primary/50"
                    onMouseDown={(e) => handleRowResizeStart(rowIndex, e)}
                  />
                </td>
                {Array.from({ length: maxCols }).map((_, colIndex) => {
                  const cellValue = row?.[colIndex] ?? "";
                  const isSelected = isInSelection(rowIndex, colIndex);
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                  const isFrozen = colIndex < frozenColumns;
                  const isFrozenRow = rowIndex < frozenRows;
                  const isSearchMatch = searchResults.some(r => r.row === rowIndex && r.col === colIndex);
                  
                  return (
                    <td
                      key={colIndex}
                      onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                      onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                      onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
                      className={`border border-border px-1 cursor-cell ${
                        isSelected ? "bg-primary/20" : isSearchMatch ? "bg-yellow-200 dark:bg-yellow-900" : isFrozenRow ? "bg-muted/50" : "bg-card hover:bg-muted/30"
                      } ${isFrozen ? "sticky z-10" : ""}`}
                      style={{ 
                        width: colWidths[colIndex] || DEFAULT_COL_WIDTH,
                        minWidth: colWidths[colIndex] || DEFAULT_COL_WIDTH,
                        maxWidth: colWidths[colIndex] || DEFAULT_COL_WIDTH,
                        height: rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT,
                        left: isFrozen ? `${frozenColLeft(colIndex)}px` : undefined,
                        backgroundColor: isFrozen && !isSelected ? "hsl(var(--card))" : undefined
                      }}
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
                          className="w-full bg-background border-none outline-none p-0 text-xs"
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

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-card border border-border rounded-lg shadow-lg py-1 z-50 text-xs"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2" onClick={() => { insertRow(contextMenu.row); closeContextMenu(); }}>
              <Plus className="w-3 h-3" /> Insert Row Below
            </button>
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2" onClick={() => { deleteRow(contextMenu.row); closeContextMenu(); }}>
              <Minus className="w-3 h-3" /> Delete Row
            </button>
            <div className="border-t border-border my-1" />
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2" onClick={() => { insertColumn(contextMenu.col); closeContextMenu(); }}>
              <Plus className="w-3 h-3" /> Insert Column Right
            </button>
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2" onClick={() => { deleteColumn(contextMenu.col); closeContextMenu(); }}>
              <Minus className="w-3 h-3" /> Delete Column
            </button>
            <div className="border-t border-border my-1" />
            <button className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2" onClick={() => { copySelection(); closeContextMenu(); }}>
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Features:</p>
        <ul className="grid grid-cols-2 gap-x-2">
          <li>✓ Frozen rows/columns</li>
          <li>✓ Column sorting</li>
          <li>✓ Search with highlight</li>
          <li>✓ Context menu</li>
          <li>✓ Copy selection</li>
          <li>✓ Resize rows/cols</li>
          <li>✓ Insert/delete rows</li>
          <li>✓ Insert/delete cols</li>
          <li>✓ Keyboard navigation</li>
          <li>✓ Export to Excel</li>
        </ul>
      </div>
    </div>
  );
};

export default SheetJSViewer;
