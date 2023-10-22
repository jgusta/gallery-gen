// uno.config.ts

const {
  defineConfig,
  presetUno,
  presetIcons,
  presetTypography,
  presetAttributify
} = require("unocss")

module.exports = defineConfig({
  content: {
    filesystem: ["**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}"]
  },
  presets: [
    presetAttributify(),
    presetIcons({
      extraProperties: {
        display: "inline-block",
        "vertical-align": "middle"
      }
    }),
    presetUno(),
    presetTypography(),
  ]
})
