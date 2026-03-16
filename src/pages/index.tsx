import { type ReactNode, useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

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

function HeroSection() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className={clsx('container', styles.heroInner)}>

        <div className={styles.heroBadge}>
          .NET 7 · .NET 8 · .NET 9
        </div>

        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>

        <p className={styles.heroSubtitle}>
          {siteConfig.tagline}
        </p>

        <div className={styles.badges}>
          <img
            src="https://img.shields.io/badge/.NET-7%20|%208%20|%209-512BD4?style=flat-square&logo=dotnet"
            alt=".NET"
          />
          <img
            src="https://img.shields.io/badge/license-Apache--2.0-34d399?style=flat-square"
            alt="License"
          />
          <img
            src="https://img.shields.io/badge/NuGet-Vali--Mediator-004880?style=flat-square&logo=nuget"
            alt="NuGet"
          />
          <img
            src="https://img.shields.io/badge/zero-dependencies-059669?style=flat-square"
            alt="Zero dependencies"
          />
        </div>

        <div className={styles.buttons}>
          <Link className={styles.buttonPrimary} to="/docs/quick-start">
            Get started →
          </Link>
          <Link className={styles.buttonGhost} to="/docs/introduction">
            Read the docs
          </Link>
        </div>

        <div className={styles.installBlock}>
          <span className={styles.installDollar}>$</span>
          <span>dotnet add package Vali-Mediator</span>
        </div>

      </div>
    </header>
  );
}

function FeaturesSection() {
  return (
    <section className={styles.features}>
      <div className="container">
        <Heading as="h2" className={styles.featuresTitle}>
          Everything you need for the Mediator pattern
        </Heading>
        <p className={styles.featuresSubtitle}>
          Built for .NET developers who value clarity, resilience and observability.
        </p>
        <div className="row">
          {features.map(({ title, icon, description }) => (
            <div key={title} className={clsx('col col--4', styles.featureCol)}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>{icon}</div>
                <p className={styles.featureTitle}>{title}</p>
                <p className={styles.featureDesc}>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PackagesSection() {
  return (
    <section className={styles.packages}>
      <div className="container">
        <Heading as="h2" className={styles.packagesTitle}>
          Choose your integration
        </Heading>
        <div className={styles.packageGrid}>
          {packages.map(({ name, description, install, nuget }) => (
            <div key={name} className={styles.packageCard}>
              <a href={nuget} target="_blank" rel="noopener noreferrer" className={styles.packageName}>
                {name}
              </a>
              <p className={styles.packageDesc}>{description}</p>
              <div className={styles.packageInstall}>
                <span className={styles.packageInstallDollar}>$</span>
                <code className={styles.packageInstallCmd}>{install}</code>
                <CopyButton text={install} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AuthorSection() {
  return (
    <section className={styles.author}>
      <div className="container">
        <div className={styles.authorCard}>
          <div className={styles.authorAvatar}>FM</div>
          <div className={styles.authorInfo}>
            <p className={styles.authorLabel}>// built by</p>
            <p className={styles.authorName}>Felipe Rafael Montenegro Morriberon</p>
            <p className={styles.authorBio}>
              .NET developer and open-source enthusiast. Creator of Vali-Mediator and Vali-Validation.
            </p>
            <div className={styles.authorLinks}>
              <a
                href="https://www.linkedin.com/in/felipe-rafael-montenegro-morriberon-a79a341b2/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.authorLinkLinkedIn}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
              <a
                href="https://github.com/UBF21"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.authorLinkGitHub}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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
        <PackagesSection />
        <AuthorSection />
      </main>
    </Layout>
  );
}
