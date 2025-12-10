import { useState } from "react";
import SheetJSViewer from "@/components/SheetJSViewer";

const Index = () => {
  const [frozenCols, setFrozenCols] = useState(1);
  const [frozenRows, setFrozenRows] = useState(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-[98vw] mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-foreground">
            Excel Viewer - SheetJS
          </h1>
          <p className="text-sm text-muted-foreground">
            Open Source • Full Excel Features • Parse Any Format
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-4 p-3 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Frozen Cols:</label>
            <button
              onClick={() => setFrozenCols(Math.max(0, frozenCols - 1))}
              className="px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80"
            >-</button>
            <span className="w-6 text-center font-medium">{frozenCols}</span>
            <button
              onClick={() => setFrozenCols(Math.min(10, frozenCols + 1))}
              className="px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80"
            >+</button>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Frozen Rows:</label>
            <button
              onClick={() => setFrozenRows(Math.max(0, frozenRows - 1))}
              className="px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80"
            >-</button>
            <span className="w-6 text-center font-medium">{frozenRows}</span>
            <button
              onClick={() => setFrozenRows(Math.min(10, frozenRows + 1))}
              className="px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80"
            >+</button>
          </div>
        </div>

        {/* SheetJS Viewer */}
        <div className="bg-card rounded-xl shadow-lg border border-border p-4">
          <SheetJSViewer 
            filePath="/data/sample.xls" 
            frozenColumns={frozenCols}
            frozenRows={frozenRows}
          />
        </div>

        {/* SheetJS Supported Formats */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
          <h3 className="font-semibold mb-2">SheetJS Supported Formats:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.xlsx</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.xls</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.xlsm</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.xlsb</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.csv</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.txt</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.ods</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.fods</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.html</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.dif</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.sylk</span>
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">.prn</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;