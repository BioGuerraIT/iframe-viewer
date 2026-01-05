import { useState, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  GridReadyEvent,
  CellValueChangedEvent,
  CellClickedEvent,
  ModuleRegistry,
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  RowSelectionModule,
  TextEditorModule,
  NumberEditorModule,
  SelectEditorModule,
  UndoRedoEditModule,
  CellStyleModule,
  ColumnAutoSizeModule,
  ValidationModule
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Download, RefreshCw, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

// Register AG Grid modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  RowSelectionModule,
  TextEditorModule,
  NumberEditorModule,
  SelectEditorModule,
  UndoRedoEditModule,
  CellStyleModule,
  ColumnAutoSizeModule,
  ValidationModule
]);

interface RowData {
  [key: string]: unknown;
}

const DataGrid = () => {
  const gridRef = useRef<AgGridReact>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rowData, setRowData] = useState<RowData[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [selectedRows, setSelectedRows] = useState<RowData[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [cellStats, setCellStats] = useState<{ sum: number; count: number; avg: number } | null>(null);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    editable: true,
    minWidth: 100,
  }), []);

  const processSpreadsheet = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<RowData>(worksheet, { defval: '' });
        
        if (jsonData.length === 0) {
          toast.error('A planilha está vazia');
          return;
        }

        // Generate columns from first row keys
        const keys = Object.keys(jsonData[0]);
        const newColumnDefs: ColDef[] = keys.map((key, index) => ({
          field: key,
          headerName: key,
          flex: index === 0 ? undefined : 1,
          width: index === 0 ? 80 : undefined,
          filter: detectFilterType(jsonData, key),
        }));

        setColumnDefs(newColumnDefs);
        setRowData(jsonData);
        setFileName(file.name);
        toast.success(`Planilha "${file.name}" importada com ${jsonData.length} linhas`);
      } catch (error) {
        console.error('Erro ao processar planilha:', error);
        toast.error('Erro ao processar a planilha. Verifique o formato do arquivo.');
      }
    };

    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo');
    };

    reader.readAsBinaryString(file);
  }, []);

  const detectFilterType = (data: RowData[], key: string): string => {
    const sampleValues = data.slice(0, 10).map(row => row[key]);
    const numericCount = sampleValues.filter(v => !isNaN(Number(v)) && v !== '').length;
    
    if (numericCount > sampleValues.length * 0.7) {
      return 'agNumberColumnFilter';
    }
    return 'agTextColumnFilter';
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processSpreadsheet(file);
    }
    // Reset input value to allow re-uploading same file
    event.target.value = '';
  }, [processSpreadsheet]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (validExtensions.includes(ext)) {
        processSpreadsheet(file);
      } else {
        toast.error('Formato não suportado. Use .xlsx, .xls ou .csv');
      }
    }
  }, [processSpreadsheet]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent<RowData>) => {
    toast.success(`Campo "${event.colDef.headerName}" atualizado`);
  }, []);

  const onSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    const selectedData = selectedNodes?.map(node => node.data).filter(Boolean) as RowData[];
    setSelectedRows(selectedData || []);
  }, []);

  // Calculate stats from selected rows
  const calculateStats = useCallback(() => {
    if (selectedRows.length === 0) {
      setCellStats(null);
      return;
    }

    let sum = 0;
    let count = 0;

    selectedRows.forEach(row => {
      Object.values(row).forEach(value => {
        const numValue = parseFloat(String(value));
        if (!isNaN(numValue)) {
          sum += numValue;
          count++;
        }
      });
    });

    if (count > 0) {
      setCellStats({
        sum: Math.round(sum * 100) / 100,
        count,
        avg: Math.round((sum / count) * 100) / 100
      });
    } else {
      setCellStats(null);
    }
  }, [selectedRows]);

  // Update stats when selection changes
  useMemo(() => {
    calculateStats();
  }, [selectedRows, calculateStats]);

  const addRow = useCallback(() => {
    if (columnDefs.length === 0) {
      toast.error('Importe uma planilha primeiro');
      return;
    }
    const newRow: RowData = {};
    columnDefs.forEach(col => {
      if (col.field) {
        newRow[col.field] = '';
      }
    });
    setRowData([...rowData, newRow]);
    toast.success('Nova linha adicionada');
  }, [rowData, columnDefs]);

  const deleteSelectedRows = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.error('Selecione pelo menos uma linha para excluir');
      return;
    }
    const newData = rowData.filter(row => !selectedRows.includes(row));
    setRowData(newData);
    setSelectedRows([]);
    toast.success(`${selectedRows.length} linha(s) excluída(s)`);
  }, [rowData, selectedRows]);

  const exportToCSV = useCallback(() => {
    if (rowData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    gridRef.current?.api.exportDataAsCsv({
      fileName: fileName ? `editado_${fileName.replace(/\.[^/.]+$/, '')}.csv` : 'dados-exportados.csv'
    });
    toast.success('Dados exportados com sucesso');
  }, [fileName, rowData]);

  const exportToExcel = useCallback(() => {
    if (rowData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(rowData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
    XLSX.writeFile(workbook, fileName ? `editado_${fileName.replace(/\.[^/.]+$/, '')}.xlsx` : 'dados-exportados.xlsx');
    toast.success('Planilha Excel exportada');
  }, [rowData, fileName]);

  const clearData = useCallback(() => {
    setRowData([]);
    setColumnDefs([]);
    setFileName('');
    setSelectedRows([]);
    toast.success('Dados limpos');
  }, []);

  // Empty state - no data loaded
  if (rowData.length === 0) {
    return (
      <div 
        className="flex-1 flex flex-col items-center justify-center p-8"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />
        
        <div 
          className="w-full max-w-xl p-12 border-2 border-dashed border-muted-foreground/30 rounded-xl bg-muted/20 hover:bg-muted/40 hover:border-primary/50 transition-all cursor-pointer"
          onClick={triggerFileInput}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <FileSpreadsheet className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Importe sua Planilha
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Arraste e solte seu arquivo Excel ou CSV aqui, ou clique para selecionar
            </p>
            <Button size="lg" className="gap-2">
              <Upload className="w-5 h-5" />
              Selecionar Arquivo
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Formatos suportados: .xlsx, .xls, .csv
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-4 bg-card border-b border-border">
        <Button onClick={triggerFileInput} size="sm" variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
        <Button onClick={addRow} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Linha
        </Button>
        <Button 
          onClick={deleteSelectedRows} 
          size="sm" 
          variant="destructive" 
          className="gap-2"
          disabled={selectedRows.length === 0}
        >
          <Trash2 className="h-4 w-4" />
          Excluir ({selectedRows.length})
        </Button>
        
        <div className="h-6 w-px bg-border mx-2" />
        
        <Button onClick={exportToCSV} size="sm" variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          CSV
        </Button>
        <Button onClick={exportToExcel} size="sm" variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </Button>
        
        <div className="h-6 w-px bg-border mx-2" />
        
        <Button onClick={clearData} size="sm" variant="ghost" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Limpar
        </Button>

        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          {cellStats && (
            <span className="flex items-center gap-3 px-3 py-1.5 bg-primary/10 rounded-md font-medium text-primary">
              <span>Soma: {cellStats.sum.toLocaleString('pt-BR')}</span>
              <span className="text-primary/50">|</span>
              <span>Média: {cellStats.avg.toLocaleString('pt-BR')}</span>
              <span className="text-primary/50">|</span>
              <span>Células: {cellStats.count}</span>
            </span>
          )}
          {fileName && (
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {fileName}
            </span>
          )}
          <span>
            {rowData.length} registro(s) | {selectedRows.length} selecionado(s)
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 ag-theme-alpine" style={{ width: '100%', height: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          onSelectionChanged={onSelectionChanged}
          rowSelection="multiple"
          animateRows={true}
          enableCellTextSelection={true}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={20}
          stopEditingWhenCellsLoseFocus={true}
          rowHeight={42}
          headerHeight={48}
        />
      </div>
    </div>
  );
};

export default DataGrid;
