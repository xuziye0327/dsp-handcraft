export * from './src/index.js'

if (import.meta.main) await import('./web/dev.js')
