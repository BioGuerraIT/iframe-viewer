import { useState } from "react";
import SpreadsheetViewer from "@/components/SpreadsheetViewer";

const Index = () => {
  const [frozenCols, setFrozenCols] = useState(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 sm:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2 text-center">
          Excel Viewer com SheetJS
        </h1>
        <p className="text-muted-foreground text-center mb-6">
          Suporte a colunas congeladas (frozen columns)
        </p>

        {/* Frozen columns control */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <label className="text-sm text-muted-foreground">Colunas congeladas:</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFrozenCols(Math.max(0, frozenCols - 1))}
              className="px-3 py-1 bg-muted rounded hover:bg-muted/80 text-sm"
            >
              -
            </button>
            <span className="w-8 text-center font-medium">{frozenCols}</span>
            <button
              onClick={() => setFrozenCols(Math.min(5, frozenCols + 1))}
              className="px-3 py-1 bg-muted rounded hover:bg-muted/80 text-sm"
            >
              +
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border p-4 sm:p-6">
          <SpreadsheetViewer filePath="/data/sample.xls" frozenColumns={frozenCols} />
        </div>
      </div>
    </div>
  );
};

export default Index;
