module.exports = {
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: 'Laravel JSON:API',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: 'Build JSON:API compliant APIs in Laravel.',
  base: "/docs/",

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
  themeConfig: {
    repo: '',
    editLinks: false,
    searchPlaceholder: 'Search...',
    lastUpdated: 'Last Updated',
    sidebarDepth: 0,
    nav: [
      {
        text: "Home",
        link: "https://laraveljsonapi.io"
      },
      {
        text: "Version",
        link: "/",
        items: [
          {
            text: "1.0",
            link: "/1.0/"
          },
          {
            text: "2.0",
            link: "/2.0/"
          }
        ],
      }
    ],
    sidebar: {
      "/1.0/": require("./1.0"),
      "/2.0/": require("./2.0"),
    },
  },

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ],
}
