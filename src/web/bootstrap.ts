import { installTheme } from './theme.js'

if (window.parent !== window) document.documentElement.classList.add('in-frame')
installTheme()
