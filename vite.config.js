import { defineConfig, loadEnv } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import vue2Jsx from '@vitejs/plugin-vue2-jsx'
import svgLoader from 'vite-svg-loader'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { viteMockServe } from 'vite-plugin-mock'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

const gitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch (e) {
    return 'unknown'
  }
})()

const buildDate = new Date().toLocaleString()

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableMock = env.VITE_ENABLE_MOCK === 'true'

  return {
    base: './',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@$': fileURLToPath(new URL('./src', import.meta.url)),
        // pro-layout 1.x 仍引用 webpack 专用插件 client，用 shim 兼容
        'webpack-theme-color-replacer/client': fileURLToPath(new URL('./src/shims/webpack-theme-color-replacer-client.js', import.meta.url))
      }
    },
    define: {
      APP_VERSION: JSON.stringify(pkg.version),
      GIT_HASH: JSON.stringify(gitHash),
      BUILD_DATE: JSON.stringify(buildDate),
      // 兼容旧代码中的 process.env.VUE_APP_* 引用 —— 直接映射到 import.meta.env.VITE_*
      'process.env.VUE_APP_PREVIEW': JSON.stringify(env.VITE_PREVIEW || ''),
      'process.env.VUE_APP_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || ''),
      'process.env.VUE_APP_PYTHON_API_BASE_URL': JSON.stringify(env.VITE_PYTHON_API_BASE_URL || ''),
      'process.env.VUE_APP_PYODIDE_CDN_BASE': JSON.stringify(env.VITE_PYODIDE_CDN_BASE || ''),
      'process.env.VUE_APP_PYODIDE_LOCAL_BASE': JSON.stringify(env.VITE_PYODIDE_LOCAL_BASE || ''),
      'process.env.VUE_APP_PYODIDE_PREFER_CDN': JSON.stringify(env.VITE_PYODIDE_PREFER_CDN || '')
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          modifyVars: {
            'border-radius-base': '2px'
          }
        }
      }
    },
    plugins: [
      vue2(),
      vue2Jsx(),
      svgLoader({ defaultImport: 'url' }),
      Components({
        dts: false,
        resolvers: [
          AntDesignVueResolver({
            resolveIcons: true,
            importStyle: 'less'
          })
        ]
      }),
      viteMockServe({
        mockPath: 'src/mock/services',
        enable: enableMock,
        watchFiles: true,
        logger: true
      })
    ],
    server: {
      port: 8000,
      proxy: {
        '/api': {
          target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000',
          ws: true,
          changeOrigin: true,
          timeout: 600000,
          proxyTimeout: 600000
        }
      }
    },
    worker: {
      format: 'es'
    },
    optimizeDeps: {
      // pyodide 自己通过 Worker 内 importScripts 加载，不参与 Vite 预构建
      exclude: ['pyodide']
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            'ant-design-vue': ['ant-design-vue'],
            echarts: ['echarts'],
            klinecharts: ['klinecharts'],
            'lightweight-charts': ['lightweight-charts'],
            codemirror: ['codemirror']
          }
        }
      }
    }
  }
})
