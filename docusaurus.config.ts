import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Vali-Mediator',
  tagline: '// communication core for .NET',
  favicon: 'img/favicon.ico',

  future: { v4: true },

  url: 'https://ubf21.github.io',
  baseUrl: '/',

  organizationName: 'UBF21',
  projectName: 'Vali-Mediator',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  stylesheets: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Space+Mono:wght@400;500&display=swap',
      type: 'text/css',
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    localeConfigs: {
      en: { label: 'English', direction: 'ltr', htmlLang: 'en' },
      es: { label: 'Español', direction: 'ltr', htmlLang: 'es' },
    },
  },

  headTags: [
    {
      tagName: 'link',
      attributes: { rel: 'canonical', href: 'https://ubf21.github.io/' },
    },
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Vali-Mediator',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        description: 'Lightweight .NET mediator library enabling clean CQRS patterns with built-in resilience, caching, and observability.',
        url: 'https://www.nuget.org/packages/Vali-Mediator',
        downloadUrl: 'https://www.nuget.org/packages/Vali-Mediator',
        author: {
          '@type': 'Person',
          name: 'Felipe Rafael Montenegro Morriberon',
          url: 'https://www.linkedin.com/in/felipe-rafael-montenegro-morriberon-a79a341b2/',
        },
        programmingLanguage: 'C#',
        license: 'https://opensource.org/licenses/MIT',
      }),
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl: 'https://github.com/UBF21/Vali-Mediator/tree/main/',
          showLastUpdateTime: false,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.png',
    metadata: [
      { name: 'description', content: 'Vali-Mediator is a lightweight mediator library for .NET that enables clean CQRS patterns with built-in resilience, caching, and observability support.' },
      { name: 'keywords', content: 'Vali-Mediator, dotnet, .NET mediator, CQRS, command handler, query handler, resilience, caching, observability, NuGet, C# mediator library' },
      { name: 'author', content: 'Felipe Rafael Montenegro Morriberon' },
      { name: 'robots', content: 'index, follow, max-image-preview:large' },
      { name: 'theme-color', content: '#0ea5e9' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Vali-Mediator Docs' },
      { property: 'og:title', content: 'Vali-Mediator — Communication Core for .NET' },
      { property: 'og:description', content: 'Lightweight .NET mediator library for clean CQRS patterns with built-in resilience, caching, and observability. Available on NuGet.' },
      { property: 'og:url', content: 'https://ubf21.github.io/' },
      { property: 'og:image', content: 'https://ubf21.github.io/img/logo.png' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:locale:alternate', content: 'es_ES' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Vali-Mediator — Communication Core for .NET' },
      { name: 'twitter:description', content: 'Lightweight .NET mediator library for clean CQRS patterns with resilience, caching, and observability. Available on NuGet.' },
      { name: 'twitter:image', content: 'https://ubf21.github.io/img/logo.png' },
    ],
    colorMode: { defaultMode: 'light', respectPrefersColorScheme: true },
    navbar: {
      title: 'Vali-Mediator',
      logo: { alt: 'Vali-Mediator', src: 'img/logo.png' },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        { type: 'localeDropdown', position: 'right' },
        {
          href: 'https://www.nuget.org/packages/Vali-Mediator',
          label: 'NuGet',
          position: 'right',
        },
        {
          href: 'https://github.com/UBF21/Vali-Mediator',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/introduction' },
            { label: 'Quick Start', to: '/docs/quick-start' },
            { label: 'Resilience', to: '/docs/resilience/overview' },
            { label: 'Caching', to: '/docs/caching/overview' },
          ],
        },
        {
          title: 'Packages',
          items: [
            { label: 'Vali-Mediator', href: 'https://www.nuget.org/packages/Vali-Mediator' },
            { label: 'Vali-Mediator.Resilience', href: 'https://www.nuget.org/packages/Vali-Mediator.Resilience' },
            { label: 'Vali-Mediator.Caching', href: 'https://www.nuget.org/packages/Vali-Mediator.Caching' },
            { label: 'Vali-Mediator.Observability', href: 'https://www.nuget.org/packages/Vali-Mediator.Observability' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/UBF21/Vali-Mediator' },
            { label: 'Vali-Validation', href: 'https://github.com/UBF21/Vali-Validation' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Felipe Montenegro. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['csharp', 'bash', 'json', 'yaml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
