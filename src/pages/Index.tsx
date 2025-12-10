const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2 text-center">
          Spreadsheet Preview
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          OneDrive Excel Embed
        </p>
        
        <div className="bg-card rounded-xl shadow-lg border border-border p-4 sm:p-6">
          <iframe 
            src="https://onedrive.live.com/embed?resid=9E616E84A8C7F050%2173030&authkey=%21APzdyvAJBRmvRpY&em=2&AllowTyping=True&wdDownloadButton=True&wdInConfigurator=True&wdInConfigurator=True"
            width="100%" 
            height="500" 
            frameBorder="0" 
            scrolling="no"
            className="rounded-md"
            title="OneDrive Excel Spreadsheet"
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
