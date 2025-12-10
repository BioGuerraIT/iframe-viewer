const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2 text-center">
          Iframe Preview
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Testing OneDrive embed visibility
        </p>
        
        <div className="bg-card rounded-xl shadow-lg border border-border p-4 sm:p-6">
          <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
            <iframe 
              src="https://1drv.ms/x/s!AlDwx6iEbmGehLpG_N3K8AkFGa9Glg?embed=1" 
              width="100%" 
              height="400" 
              frameBorder="0" 
              scrolling="no"
              className="rounded-md"
              title="OneDrive Embedded Content"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Original size: 98×120 • Displayed larger for better visibility
        </p>
      </div>
    </div>
  );
};

export default Index;
