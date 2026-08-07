import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Main-process deps are bundled inline (not externalized) so the packaged app is self-contained —
  // electron-builder.yml only ships out/**/*, not node_modules. This works because our main-process
  // deps (fontkit, and later xlsx/pdf-lib) are pure JS with no native bindings; 'electron' and Node
  // builtins stay external automatically regardless. If a future dep needs native compilation, it'll
  // need externalizeDepsPlugin() back plus a files: entry in electron-builder.yml for node_modules.
  main: {
    // electron-vite auto-applies externalizeDepsPlugin() by default (build.externalizeDeps
    // defaults to true) even without adding the plugin ourselves — turn that off so our
    // pure-JS main-process deps (fontkit, and later xlsx/pdf-lib) bundle inline instead of
    // staying as runtime require()s, since electron-builder.yml doesn't ship node_modules.
    build: {
      externalizeDeps: false
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
