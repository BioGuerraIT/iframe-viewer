import DataGrid from '@/components/DataGrid';

const Index = () => {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Gerenciador de Dados
          </h1>
          <p className="text-sm text-muted-foreground">
            Edite, filtre e ordene seus dados com facilidade
          </p>
        </div>
      </header>

      {/* Grid Container */}
      <main className="flex-1 overflow-hidden">
        <DataGrid />
      </main>
    </div>
  );
};

export default Index;
