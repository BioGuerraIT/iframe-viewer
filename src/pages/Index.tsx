import { useState } from "react";
import SpreadsheetViewer from "@/components/SpreadsheetViewer";

const Index = () => {
  const [frozenCols, setFrozenCols] = useState(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 sm:p-8">
      <div className="w-full max-w-[95vw] mx-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2 text-center">
          Excel Viewer
        </h1>
        <p className="text-muted-foreground text-center mb-6">
          Powered by React Data Grid - Excel-like experience
        </p>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6 p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Frozen Columns:</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFrozenCols(Math.max(0, frozenCols - 1))}
                className="px-3 py-1.5 bg-muted rounded-md hover:bg-muted/80 text-sm font-medium"
              >
                -
              </button>
              <span className="w-8 text-center font-medium">{frozenCols}</span>
              <button
                onClick={() => setFrozenCols(Math.min(10, frozenCols + 1))}
                className="px-3 py-1.5 bg-muted rounded-md hover:bg-muted/80 text-sm font-medium"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border p-2 sm:p-4">
          <SpreadsheetViewer 
            filePath="/data/sample.xls" 
            frozenColumns={frozenCols}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
