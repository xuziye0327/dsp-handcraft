interface Window {
  dsphcDefaultLang: 'auto' | 'en' | 'zh'
  dsphcLang: 'zh' | 'en'
  dsphcRoot?: string
  dsphcAlt?: { lang: 'zh' | 'en'; href: string } | null
  dsphcGen?: string
  dsphcLangHint?: boolean
  dsphcTr?: (text: string, quiet?: boolean) => string
  dsphcFlush?: () => void
  dsphcMissing?: Set<string>
  dsphcTheme: (theme: 'light' | 'dark') => void
  DSPHC?: { icon?: (item: { id: number; name: string }) => string | undefined }
}

declare function loadWorkerRuntime(): Pick<typeof import('./worker.js'), 'createInlineRunner'>
declare const WORKER_SRC: string
