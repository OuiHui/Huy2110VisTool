import { defineConfig } from 'vite'
import path from "node:path";
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite';
import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'

// https://vite.dev/config/
export default defineConfig({
  base: "/2110VisTool/",
  plugins: [
    tailwindcss(),
    vue(),
    Components({
      resolvers: [
        PrimeVueResolver(),
        IconsResolver({
          prefix: false,
          enabledCollections: ['mdi', 'simple-icons'],
          alias: {
            'si': 'simple-icons'
          }
        }),
      ]
    }),
    Icons({
      scale: 1.5,
      compiler: 'vue3'
    }),
  ],
  resolve: {
      alias: [
          { find: "@", replacement: path.resolve(__dirname, "./src") }
      ]
  }
})
