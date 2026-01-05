import { useState, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  GridReadyEvent,
  CellValueChangedEvent,
  RowEditingStoppedEvent,
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
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Download, RefreshCw } from 'lucide-react';
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
  id: number;
  nome: string;
  email: string;
  departamento: string;
  cargo: string;
  salario: number;
  dataAdmissao: string;
  status: string;
}

const DataGrid = () => {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<RowData[]>([
    { id: 1, nome: 'João Silva', email: 'joao@email.com', departamento: 'TI', cargo: 'Desenvolvedor', salario: 8500, dataAdmissao: '2022-03-15', status: 'Ativo' },
    { id: 2, nome: 'Maria Santos', email: 'maria@email.com', departamento: 'RH', cargo: 'Analista', salario: 6200, dataAdmissao: '2021-07-20', status: 'Ativo' },
    { id: 3, nome: 'Pedro Costa', email: 'pedro@email.com', departamento: 'Financeiro', cargo: 'Gerente', salario: 12000, dataAdmissao: '2019-01-10', status: 'Ativo' },
    { id: 4, nome: 'Ana Oliveira', email: 'ana@email.com', departamento: 'Marketing', cargo: 'Coordenadora', salario: 9800, dataAdmissao: '2020-11-05', status: 'Ativo' },
    { id: 5, nome: 'Carlos Ferreira', email: 'carlos@email.com', departamento: 'TI', cargo: 'Tech Lead', salario: 15000, dataAdmissao: '2018-06-22', status: 'Ativo' },
    { id: 6, nome: 'Lucia Mendes', email: 'lucia@email.com', departamento: 'Vendas', cargo: 'Vendedora', salario: 5500, dataAdmissao: '2023-02-14', status: 'Inativo' },
    { id: 7, nome: 'Roberto Lima', email: 'roberto@email.com', departamento: 'Financeiro', cargo: 'Analista', salario: 7200, dataAdmissao: '2021-09-30', status: 'Ativo' },
    { id: 8, nome: 'Fernanda Alves', email: 'fernanda@email.com', departamento: 'RH', cargo: 'Diretora', salario: 18000, dataAdmissao: '2017-04-18', status: 'Ativo' },
  ]);

  const [selectedRows, setSelectedRows] = useState<RowData[]>([]);

  const columnDefs: ColDef<RowData>[] = useMemo(() => [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 80,
      editable: false,
      filter: 'agNumberColumnFilter'
    },
    { 
      field: 'nome', 
      headerName: 'Nome', 
      flex: 1,
      minWidth: 150,
      editable: true,
      filter: 'agTextColumnFilter'
    },
    { 
      field: 'email', 
      headerName: 'E-mail', 
      flex: 1,
      minWidth: 200,
      editable: true,
      filter: 'agTextColumnFilter'
    },
    { 
      field: 'departamento', 
      headerName: 'Departamento', 
      width: 140,
      editable: true,
      filter: 'agTextColumnFilter',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['TI', 'RH', 'Financeiro', 'Marketing', 'Vendas', 'Operações']
      }
    },
    { 
      field: 'cargo', 
      headerName: 'Cargo', 
      width: 140,
      editable: true,
      filter: 'agTextColumnFilter'
    },
    { 
      field: 'salario', 
      headerName: 'Salário', 
      width: 130,
      editable: true,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params) => {
        if (params.value == null) return '';
        return new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(params.value);
      }
    },
    { 
      field: 'dataAdmissao', 
      headerName: 'Data Admissão', 
      width: 140,
      editable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        return date.toLocaleDateString('pt-BR');
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 110,
      editable: true,
      filter: 'agTextColumnFilter',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Ativo', 'Inativo', 'Férias', 'Afastado']
      },
      cellStyle: (params) => {
        if (params.value === 'Ativo') {
          return { backgroundColor: 'hsl(142 76% 90%)', color: 'hsl(142 76% 30%)' };
        } else if (params.value === 'Inativo') {
          return { backgroundColor: 'hsl(0 84% 90%)', color: 'hsl(0 84% 30%)' };
        } else if (params.value === 'Férias') {
          return { backgroundColor: 'hsl(217 91% 90%)', color: 'hsl(217 91% 30%)' };
        }
        return { backgroundColor: 'hsl(45 93% 90%)', color: 'hsl(45 93% 25%)' };
      }
    }
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
  }), []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent<RowData>) => {
    toast.success(`Campo "${event.colDef.headerName}" atualizado para "${event.newValue}"`);
  }, []);

  const onSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    const selectedData = selectedNodes?.map(node => node.data).filter(Boolean) as RowData[];
    setSelectedRows(selectedData || []);
  }, []);

  const addRow = useCallback(() => {
    const newId = Math.max(...rowData.map(r => r.id), 0) + 1;
    const newRow: RowData = {
      id: newId,
      nome: '',
      email: '',
      departamento: 'TI',
      cargo: '',
      salario: 0,
      dataAdmissao: new Date().toISOString().split('T')[0],
      status: 'Ativo'
    };
    setRowData([...rowData, newRow]);
    toast.success('Nova linha adicionada');
  }, [rowData]);

  const deleteSelectedRows = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.error('Selecione pelo menos uma linha para excluir');
      return;
    }
    const selectedIds = selectedRows.map(r => r.id);
    setRowData(rowData.filter(r => !selectedIds.includes(r.id)));
    setSelectedRows([]);
    toast.success(`${selectedRows.length} linha(s) excluída(s)`);
  }, [rowData, selectedRows]);

  const exportToCSV = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: 'dados-exportados.csv'
    });
    toast.success('Dados exportados com sucesso');
  }, []);

  const refreshData = useCallback(() => {
    // Simulate data refresh
    toast.success('Dados atualizados');
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-4 bg-card border-b border-border">
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
        <Button onClick={exportToCSV} size="sm" variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
        <Button onClick={refreshData} size="sm" variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {rowData.length} registro(s) | {selectedRows.length} selecionado(s)
        </span>
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
          suppressRowClickSelection={true}
          rowHeight={42}
          headerHeight={48}
        />
      </div>
    </div>
  );
};

export default DataGrid;
