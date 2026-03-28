export function FooterBar() {
  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>Rate limit: — / 5000</span>
        <span>Last synced: —</span>
      </div>
      <span>Gira v0.1.0</span>
    </footer>
  );
}
