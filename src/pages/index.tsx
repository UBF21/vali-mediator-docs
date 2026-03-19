import { type ReactNode, useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

/* ─── Copy Button ─────────────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      className={clsx(styles.copyBtn, copied && styles.copyBtnDone)}
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy'}
      aria-label="Copy install command"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

/* ─── Data ────────────────────────────────────────────────────────────────── */

interface Feature {
  title: string;
  icon: string;
  description: string;
}

interface Package {
  name: string;
  description: string;
  install: string;
  nuget: string;
}

type Token = { text: string; cls: string };

const features: Feature[] = [
  {
    title: 'CQRS & Mediator',
    icon: '⇄',
    description:
      'IRequest, INotification, IFireAndForget, IStreamRequest — clean separation of commands, queries and events out of the box.',
  },
  {
    title: 'Pipeline Behaviors',
    icon: '⛓',
    description:
      'Compose IPipelineBehavior layers — logging, validation, caching, idempotency — without touching your handlers.',
  },
  {
    title: 'Resilience Policies',
    icon: '🛡',
    description:
      'Retry, CircuitBreaker, Timeout, Bulkhead, Hedge, RateLimiter, Chaos, Fallback — fluent builder, zero extra dependencies.',
  },
  {
    title: 'Result Pattern',
    icon: '✓',
    description:
      'Result<T> and Result with Map, Bind, Match, Tap, OnFailure — typed error handling without exceptions.',
  },
  {
    title: 'Caching & Idempotency',
    icon: '⚡',
    description:
      'ICacheable, IInvalidatesCache, IIdempotent — declarative caching and idempotent requests as pipeline behaviors.',
  },
  {
    title: 'OpenTelemetry Ready',
    icon: '◎',
    description:
      'Built-in ActivitySource, IMetricsCollector, IRequestObserver — plug in your tracing backend in one line.',
  },
];

const packages: Package[] = [
  {
    name: 'Vali-Mediator',
    description: 'Core mediator, CQRS, Result pattern, pipeline, streaming.',
    install: 'dotnet add package Vali-Mediator',
    nuget: 'https://www.nuget.org/packages/Vali-Mediator/',
  },
  {
    name: 'Vali-Mediator.Resilience',
    description: 'Retry, CircuitBreaker, Timeout, Bulkhead, Hedge, RateLimiter, Chaos, Fallback.',
    install: 'dotnet add package Vali-Mediator.Resilience',
    nuget: 'https://www.nuget.org/packages/Vali-Mediator.Resilience/',
  },
  {
    name: 'Vali-Mediator.Caching',
    description: 'Declarative pipeline caching with ICacheable and IInvalidatesCache.',
    install: 'dotnet add package Vali-Mediator.Caching',
    nuget: 'https://www.nuget.org/packages/Vali-Mediator.Caching/',
  },
  {
    name: 'Vali-Mediator.Observability',
    description: 'OpenTelemetry ActivitySource, metrics collector, request observers.',
    install: 'dotnet add package Vali-Mediator.Observability',
    nuget: 'https://www.nuget.org/packages/Vali-Mediator.Observability/',
  },
  {
    name: 'Vali-Mediator.Idempotency',
    description: 'Idempotent request handling via IIdempotent and IIdempotencyStore.',
    install: 'dotnet add package Vali-Mediator.Idempotency',
    nuget: 'https://www.nuget.org/packages/Vali-Mediator.Idempotency/',
  },
  {
    name: 'Vali-Mediator.AspNetCore',
    description: 'Maps Result<T> to HTTP responses for controllers and Minimal APIs.',
    install: 'dotnet add package Vali-Mediator.AspNetCore',
    nuget: 'https://www.nuget.org/packages/Vali-Mediator.AspNetCore/',
  },
];

// prettier-ignore
const CODE_TOKENS: Token[][] = [
  [
    { text: 'services', cls: 'cVar' },
    { text: '.', cls: 'cPunc' },
    { text: 'AddValiMediator', cls: 'cMethod' },
    { text: '(', cls: 'cPunc' },
    { text: 'cfg', cls: 'cVar' },
    { text: ' => ', cls: 'cPunc' },
    { text: 'cfg', cls: 'cVar' },
  ],
  [
    { text: '    .', cls: 'cPunc' },
    { text: 'AddBehavior', cls: 'cMethod' },
    { text: '<', cls: 'cPunc' },
    { text: 'LoggingBehavior', cls: 'cType' },
    { text: '>()', cls: 'cPunc' },
  ],
  [
    { text: '    .', cls: 'cPunc' },
    { text: 'AddBehavior', cls: 'cMethod' },
    { text: '<', cls: 'cPunc' },
    { text: 'ValidationBehavior', cls: 'cType' },
    { text: '>());', cls: 'cPunc' },
  ],
  [],
  [
    { text: '// Send a query', cls: 'cComment' },
  ],
  [
    { text: 'var', cls: 'cKw' },
    { text: ' result ', cls: 'cVar' },
    { text: '= ', cls: 'cPunc' },
    { text: 'await', cls: 'cKw' },
    { text: ' mediator', cls: 'cVar' },
    { text: '.', cls: 'cPunc' },
    { text: 'Send', cls: 'cMethod' },
    { text: '(', cls: 'cPunc' },
    { text: 'new', cls: 'cKw' },
    { text: ' ', cls: 'cPunc' },
    { text: 'GetUserQuery', cls: 'cType' },
    { text: '(', cls: 'cPunc' },
    { text: 'userId', cls: 'cVar' },
    { text: '));', cls: 'cPunc' },
  ],
  [],
  [
    { text: 'result', cls: 'cVar' },
    { text: '.', cls: 'cPunc' },
    { text: 'Match', cls: 'cMethod' },
    { text: '(', cls: 'cPunc' },
  ],
  [
    { text: '    ', cls: 'cPunc' },
    { text: 'onSuccess', cls: 'cProp' },
    { text: ': ', cls: 'cPunc' },
    { text: 'user', cls: 'cVar' },
    { text: ' => ', cls: 'cPunc' },
    { text: 'Ok', cls: 'cMethod' },
    { text: '(', cls: 'cPunc' },
    { text: 'user', cls: 'cVar' },
    { text: '),', cls: 'cPunc' },
  ],
  [
    { text: '    ', cls: 'cPunc' },
    { text: 'onFailure', cls: 'cProp' },
    { text: ': ', cls: 'cPunc' },
    { text: 'err', cls: 'cVar' },
    { text: ' => ', cls: 'cPunc' },
    { text: 'Problem', cls: 'cMethod' },
    { text: '(', cls: 'cPunc' },
    { text: 'err', cls: 'cVar' },
    { text: '.', cls: 'cPunc' },
    { text: 'Message', cls: 'cProp' },
    { text: '));', cls: 'cPunc' },
  ],
];

/* ─── CodeBlock ───────────────────────────────────────────────────────────── */

function CodeBlock() {
  const [copied, setCopied] = useState(false);
  const fullCode = CODE_TOKENS.map(line =>
    line.map(t => t.text).join('')
  ).join('\n');

  function handleCopy() {
    navigator.clipboard.writeText(fullCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={styles.codeCard}>
      {/* Chrome header */}
      <div className={styles.codeChrome}>
        <span className={clsx(styles.chromeDot, styles.chromeDotRed)} />
        <span className={clsx(styles.chromeDot, styles.chromeDotYellow)} />
        <span className={clsx(styles.chromeDot, styles.chromeDotGreen)} />
        <span className={styles.codeFile}>Program.cs</span>
        <button
          className={clsx(styles.codeCopyBtn, styles.copyBtn, copied && styles.copyBtnDone)}
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy'}
          aria-label="Copy code"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>

      {/* Code body */}
      <div className={styles.codeBody}>
        {/* Line numbers */}
        <div className={styles.codeLineNumbers} aria-hidden="true">
          {CODE_TOKENS.map((_, i) => (
            <span key={i} className={styles.codeLineNum}>{i + 1}</span>
          ))}
        </div>
        {/* Code */}
        <pre className={styles.codePre}>
          <code>
            {CODE_TOKENS.map((line, i) => (
              <div key={i} className={styles.codeLine}>
                {line.length === 0
                  ? '\u00a0'
                  : line.map((token, j) => (
                      <span key={j} className={styles[token.cls as keyof typeof styles]}>{token.text}</span>
                    ))}
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Glow bar */}
      <div className={styles.codeGlowBar} />
    </div>
  );
}

/* ─── FeatureCard ─────────────────────────────────────────────────────────── */

function FeatureCard({ icon, title, description, index }: Feature & { index: number }) {
  return (
    <div
      className={styles.featureCard}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <span className={styles.featureNumber}>{String(index + 1).padStart(2, '0')}</span>
      <div className={styles.featureIconWrap}>
        <span className={styles.featureIconGlyph}>{icon}</span>
      </div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}

/* ─── PackageCard ─────────────────────────────────────────────────────────── */

function PackageCard({ name, description, install, nuget }: Package) {
  return (
    <div className={styles.packageCard}>
      <div className={styles.packageAccent} aria-hidden="true" />
      <div className={styles.packageHeader}>
        <a href={nuget} target="_blank" rel="noopener noreferrer" className={styles.packageName}>
          <span className={styles.packageChip}>{name}</span>
        </a>
      </div>
      <p className={styles.packageDescription}>{description}</p>
      <div className={styles.packageInstall}>
        <code className={styles.packageInstallCode}>{install}</code>
        <CopyButton text={install} />
      </div>
    </div>
  );
}

/* ─── HeroSection ─────────────────────────────────────────────────────────── */

function HeroSection() {
  const [copied, setCopied] = useState(false);
  const cmd = 'dotnet add package Vali-Mediator';
  function handleCopy() {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <header className={styles.hero}>
      <div className={styles.heroGrid} />
      <div className={styles.heroOrb1} />
      <div className={styles.heroOrb2} />
      <div className={styles.heroOrb3} />
      <div className={styles.heroInner}>
        <div className={styles.heroBadge}>
          <span className={styles.heroBadgePulse} />
          .NET 7 · .NET 8 · .NET 9
        </div>
        <h1 className={styles.heroTitle}>Vali-Mediator</h1>
        <p className={styles.heroTagline}>
          <span className={styles.heroTaglineComment}>//</span>{' '}mediator pattern for .NET
        </p>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>6</span>
            <span className={styles.heroStatLabel}>packages</span>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>CQRS</span>
            <span className={styles.heroStatLabel}>+ pipeline</span>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>Result</span>
            <span className={styles.heroStatLabel}>{'<T>'} pattern</span>
          </div>
        </div>
        <div className={styles.heroCta}>
          <Link className={styles.btnPrimary} to="/docs/quick-start">
            Get started →
          </Link>
          <Link className={styles.btnSecondary} to="/docs/introduction">
            Read the docs
          </Link>
        </div>
        <div className={styles.heroInstallWrap}>
          <div className={styles.heroInstall}>
            <span className={styles.heroInstallPrompt}>$</span>
            <code className={styles.heroInstallCode}>{cmd}</code>
            <button className={styles.heroInstallCopy} onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─── FeaturesSection ─────────────────────────────────────────────────────── */

function FeaturesSection() {
  return (
    <section className={styles.featuresSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Everything you need for the Mediator pattern</h2>
          <p className={styles.sectionSubtitle}>
            Built for .NET developers who value clarity, resilience and observability.
          </p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── QuickExampleSection ─────────────────────────────────────────────────── */

function QuickExampleSection() {
  return (
    <section className={styles.exampleSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>See it in action</h2>
          <p className={styles.sectionSubtitle}>
            Send queries, handle results, compose behaviors — all in a few lines.
          </p>
        </div>
        <div className={styles.exampleCodeWrap}>
          <CodeBlock />
        </div>
      </div>
    </section>
  );
}

/* ─── PackagesSection ─────────────────────────────────────────────────────── */

function PackagesSection() {
  return (
    <section className={styles.packagesSection}>
      <div className={styles.packagesDivider} aria-hidden="true" />
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>6 NuGet packages. Install only what you need.</h2>
          <p className={styles.sectionSubtitle}>
            Each package is independent — add the features your project requires.
          </p>
        </div>
        <div className={styles.packagesGrid}>
          {packages.map((pkg) => (
            <PackageCard key={pkg.name} {...pkg} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── AuthorSection ───────────────────────────────────────────────────────── */

function AuthorSection() {
  return (
    <section className={styles.authorSection}>
      <div className={styles.authorDivider} aria-hidden="true" />
      <div className="container">
        <div className={styles.authorCard}>
          <div className={styles.avatarRingWrap}>
            <div className={styles.avatarRing} aria-hidden="true" />
            <div className={styles.authorAvatar}>
              <span className={styles.authorAvatarInitials}>FM</span>
            </div>
          </div>
          <div className={styles.authorInfo}>
            <span className={styles.authorBuiltBy}>Built by</span>
            <a
              href="https://github.com/UBF21"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.authorName}
            >
              Felipe Rafael Montenegro Morriberon
            </a>
            <p className={styles.authorBio}>
              .NET developer and open-source enthusiast. Creator of Vali-Mediator and Vali-Validation.
            </p>
          </div>
          <div className={styles.authorLinks}>
            <a
              href="https://github.com/UBF21"
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(styles.authorSocialLink, styles.authorSocialLinkGithub)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              GitHub
            </a>
            <a
              href="https://www.nuget.org/profiles/UBF21"
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(styles.authorSocialLink, styles.authorSocialLinkNuget)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zm-5.5-4.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0zM7 8.5v7h2v-2.5h2c1.657 0 3-1.343 3-3S12.657 7 11 7H7v1.5zm2 1.5h2a1 1 0 0 1 0 2H9v-2z" />
              </svg>
              NuGet
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Home ────────────────────────────────────────────────────────────────── */

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Lightweight Mediator Pattern for .NET — CQRS, Resilience, Caching, Observability, Idempotency"
    >
      <HeroSection />
      <main>
        <FeaturesSection />
        <QuickExampleSection />
        <PackagesSection />
        <AuthorSection />
      </main>
    </Layout>
  );
}
