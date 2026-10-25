// @ts-check
import { satteri } from '@astrojs/markdown-satteri'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightLinksValidator from 'starlight-links-validator'
import starlightLlmActions from 'starlight-llm-actions'

import { tableLabels } from './src/table-labels.mjs'

const repository = 'https://github.com/whidrubeld/three-map-terrain'

/** The guide in reading order: the sidebar's, and llms.txt's. */
const LAYERS = ['buildings', 'roads', 'water', 'vegetation', 'base'].map(
  (layer) => `layers/${layer}`
)
const GUIDE = [
  'own-layers',
  'materials',
  'sources',
  'export',
  'large-areas',
  'performance'
]

export default defineConfig({
  // the examples are built on their own and copied under /examples/ (see
  // .github/workflows/gh-pages.yml)
  site: 'https://whidrubeld.github.io',
  base: '/three-map-terrain',
  // Starlight adds its own plugins to this processor
  markdown: { processor: satteri({ hastPlugins: [tableLabels] }) },
  integrations: [
    starlight({
      title: 'three-map-terrain',
      description:
        'Real-world 3D terrain for three.js from any map tiles — with buildings, roads and bridges, water and vegetation, and a frame for your own layers.',
      favicon: '/favicon.svg',
      logo: {
        dark: './src/assets/logo-dark.svg',
        light: './src/assets/logo-light.svg',
        alt: ''
      },
      social: [{ icon: 'github', label: 'GitHub', href: repository }],
      editLink: { baseUrl: `${repository}/edit/master/docs/` },
      customCss: ['./src/styles/theme.css', './src/styles/demo.css'],
      // the fonts, preloaded
      components: { Head: './src/components/Head.astro' },
      // square frames in the site's black and white, the file name a label;
      // shell blocks too look like code, not a terminal window
      expressiveCode: {
        themes: ['vesper', 'min-light'],
        defaultProps: { frame: 'code' },
        styleOverrides: {
          borderRadius: '0',
          borderColor: 'var(--line)',
          codeBackground: 'var(--panel)',
          codeFontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
          codeFontSize: '0.8125rem',
          uiFontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
          uiFontSize: '0.6875rem',
          frames: {
            shadowColor: 'transparent',
            editorTabBarBackground: 'var(--bg)',
            editorTabBarBorderBottomColor: 'var(--line)',
            editorActiveTabBackground: 'var(--panel)',
            editorActiveTabForeground: 'var(--fg)',
            editorActiveTabBorderColor: 'var(--line)',
            editorActiveTabIndicatorTopColor: 'var(--fg)',
            editorActiveTabIndicatorBottomColor: 'transparent',
            frameBoxShadowCssValue: 'none',
            inlineButtonBorder: 'var(--line-strong)',
            inlineButtonBackground: 'var(--bg)',
            inlineButtonForeground: 'var(--fg)',
            tooltipSuccessBackground: 'var(--fg)',
            tooltipSuccessForeground: 'var(--bg)'
          }
        }
      },
      sidebar: [
        {
          label: 'Guide',
          items: [
            'getting-started',
            {
              label: 'Layers',
              items: [{ slug: 'layers', label: 'Overview' }, ...LAYERS]
            },
            ...GUIDE
          ]
        },
        {
          label: 'Reference',
          items: ['api/map', 'api/layers', 'api/sources', 'api/exports']
        },
        { label: 'AI assistants', items: ['llms', 'skill'] },
        'examples',
        'attribution'
      ],
      plugins: [
        starlightLinksValidator({
          // the examples are apps of their own, not pages
          exclude: ({ link }) =>
            /^\/three-map-terrain\/examples\/\w+\//.test(link)
        }),
        starlightLlmActions({
          // pages as Markdown — the demos' code included, their chrome not
          renderMarkdown: { module: './src/markdown.ts' },
          linkAlternate: true,
          llmsTxt: {
            promote: [
              'index*',
              'getting-started*',
              'layers*',
              ...[...LAYERS, ...GUIDE, 'examples', 'llms', 'skill'].map(
                (slug) => `${slug}*`
              )
            ],
            demote: ['api/**', 'attribution*']
          }
        })
      ]
    })
  ],
  vite: {
    resolve: {
      // `three-map-terrain` is linked from the repo root: make it use this
      // package's copy of three instead of bundling a second one
      dedupe: ['three']
    }
  }
})
