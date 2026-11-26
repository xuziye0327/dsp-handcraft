interface Window {
  dsphcTheme: (theme: 'light' | 'dark') => void
  DSPHC?: { icon?: (item: { id: number; name: string }) => string | undefined }
}
