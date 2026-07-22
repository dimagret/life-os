import Link from 'next/link';
import type { Locale } from '@/i18n/routing';
import styles from './PublicLanding.module.css';

const COPY = {
  ru: {
    nav: ['Как работает', 'Возможности', 'Вопросы'],
    eyebrow: 'Система личной дисциплины',
    title: 'Превращайте цели в выполненные действия каждый день',
    lead: 'Life OS помогает выбрать главное, собрать реалистичный план, провести фокус-сессию и честно разобрать результат дня.',
    start: 'Создать аккаунт', login: 'Войти',
    cycleTitle: 'Один понятный цикл вместо разрозненных списков',
    cycleLead: 'Система связывает долгосрочную цель с сегодняшним действием и помогает корректировать нагрузку по фактическому результату.',
    steps: [
      ['01', 'Определите цель', 'Зафиксируйте результат, к которому хотите прийти.'],
      ['02', 'Соберите день', 'Выберите до трёх конкретных действий на сегодня.'],
      ['03', 'Работайте в фокусе', 'Запустите сессию и удерживайте внимание на одном действии.'],
      ['04', 'Разберите результат', 'Отметьте выполненное и скорректируйте следующий день.'],
    ],
    benefitsTitle: 'Что объединяет Life OS',
    benefits: [
      ['Цели и действия', 'Долгосрочное направление остаётся связано с ежедневным планом.'],
      ['Фокус-сессии', 'Отдельный режим помогает работать над выбранной задачей без переключений.'],
      ['Честный разбор', 'Вечерний обзор фиксирует результат, причины срыва и следующий шаг.'],
      ['Адаптация нагрузки', 'План следующего дня уточняется на основе выполненных действий.'],
    ],
    audienceTitle: 'Для тех, кому нужен рабочий ритм',
    audience: 'Life OS подходит тем, кто устал переносить задачи, теряет фокус между несколькими целями или хочет видеть связь между ежедневной работой и долгосрочным результатом.',
    faqTitle: 'Частые вопросы',
    faq: [
      ['Что такое Life OS?', 'Это веб-система личной дисциплины: цели, план дня, фокус-сессии и разбор результата собраны в одном цикле.'],
      ['Нужно ли устанавливать приложение?', 'Нет. Life OS работает в браузере. Для сохранения и синхронизации данных нужен аккаунт.'],
      ['Как начинается работа?', 'После регистрации вы проходите настройку, определяете режим и собираете первый план действий.'],
    ],
    finalTitle: 'Начните с одного честно собранного дня',
    finalLead: 'Создайте аккаунт, настройте систему под свой ритм и выберите первое действие.',
    legal: ['Политика обработки данных', 'Согласие', 'Cookies'],
  },
  en: {
    nav: ['How it works', 'Features', 'Questions'],
    eyebrow: 'Personal discipline system',
    title: 'Turn goals into completed actions every day',
    lead: 'Life OS helps you choose what matters, build a realistic plan, run a focus session, and review the result of your day.',
    start: 'Create account', login: 'Sign in',
    cycleTitle: 'One clear cycle instead of scattered lists',
    cycleLead: 'The system connects a long-term goal to today’s action and helps adjust your workload using actual results.',
    steps: [
      ['01', 'Define the goal', 'Describe the result you want to reach.'],
      ['02', 'Build the day', 'Choose up to three concrete actions for today.'],
      ['03', 'Work in focus', 'Start a session and stay with one selected action.'],
      ['04', 'Review the result', 'Record what happened and adjust the next day.'],
    ],
    benefitsTitle: 'What Life OS brings together',
    benefits: [
      ['Goals and actions', 'Keep long-term direction connected to the daily plan.'],
      ['Focus sessions', 'A dedicated mode helps you work without switching tasks.'],
      ['Honest review', 'The evening review records results, blockers, and the next step.'],
      ['Adaptive workload', 'The next plan is refined using completed actions.'],
    ],
    audienceTitle: 'For people who need a workable rhythm',
    audience: 'Life OS is for people who keep postponing tasks, lose focus between several goals, or want a clear link between daily work and long-term results.',
    faqTitle: 'Frequently asked questions',
    faq: [
      ['What is Life OS?', 'It is a web-based personal discipline system combining goals, daily planning, focus sessions, and result reviews.'],
      ['Do I need to install an app?', 'No. Life OS works in a browser. An account is required to save and synchronize data.'],
      ['How do I get started?', 'After registration, you configure your working mode and build your first action plan.'],
    ],
    finalTitle: 'Start with one honestly planned day',
    finalLead: 'Create an account, adapt the system to your rhythm, and choose your first action.',
    legal: ['Privacy policy', 'Consent', 'Cookies'],
  },
} as const;

export function PublicLanding({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lifeosclub.ru';
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: 'Life OS', url: `${siteUrl}/${locale}`, inLanguage: locale },
      { '@type': 'SoftwareApplication', '@id': `${siteUrl}/#software`, name: 'Life OS', applicationCategory: 'ProductivityApplication', operatingSystem: 'Web', url: `${siteUrl}/${locale}`, inLanguage: locale, description: copy.lead },
      { '@type': 'FAQPage', '@id': `${siteUrl}/${locale}#faq`, mainEntity: copy.faq.map(([name, answer]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
    ],
  };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className={styles.header}>
        <Link className={styles.brand} href={`/${locale}`} aria-label="Life OS"><span className={styles.mark}>OS</span><span><strong>Life OS</strong><small>discipline system</small></span></Link>
        <nav aria-label={locale === 'ru' ? 'Основная навигация' : 'Main navigation'}><a href="#how">{copy.nav[0]}</a><a href="#features">{copy.nav[1]}</a><a href="#faq">{copy.nav[2]}</a></nav>
        <Link className={styles.headerLogin} href={`/${locale}/login`}>{copy.login}</Link>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}><p className={styles.eyebrow}>{copy.eyebrow}</p><h1>{copy.title}</h1><p className={styles.lead}>{copy.lead}</p><div className={styles.actions}><Link className={styles.primary} href={`/${locale}/register`}>{copy.start}<span aria-hidden="true">→</span></Link><Link className={styles.secondary} href={`/${locale}/login`}>{copy.login}</Link></div></div>
          <div className={styles.preview} aria-label={locale === 'ru' ? 'Цикл дня Life OS' : 'Life OS daily cycle'}><span className={styles.previewLabel}>{locale === 'ru' ? 'Сегодня' : 'Today'}</span><strong>{locale === 'ru' ? 'Главное действие' : 'Primary action'}</strong><div className={styles.focusLine}><span /><span>{locale === 'ru' ? 'Фокус · 45 минут' : 'Focus · 45 minutes'}</span></div><ol>{copy.steps.slice(0, 3).map((step, index) => <li key={step[1]}><span>{index + 1}</span>{step[1]}</li>)}</ol></div>
        </section>

        <section className={styles.section} id="how"><p className={styles.sectionIndex}>01 / {locale === 'ru' ? 'ПРОЦЕСС' : 'PROCESS'}</p><h2>{copy.cycleTitle}</h2><p className={styles.sectionLead}>{copy.cycleLead}</p><ol className={styles.stepGrid}>{copy.steps.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></section>
        <section className={styles.section} id="features"><p className={styles.sectionIndex}>02 / {locale === 'ru' ? 'ВОЗМОЖНОСТИ' : 'FEATURES'}</p><h2>{copy.benefitsTitle}</h2><div className={styles.featureGrid}>{copy.benefits.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section>
        <section className={styles.audience}><div><p className={styles.sectionIndex}>03 / {locale === 'ru' ? 'ДЛЯ КОГО' : 'FOR WHOM'}</p><h2>{copy.audienceTitle}</h2></div><p>{copy.audience}</p></section>
        <section className={styles.section} id="faq"><p className={styles.sectionIndex}>04 / FAQ</p><h2>{copy.faqTitle}</h2><div className={styles.faq}>{copy.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
        <section className={styles.finalCta}><p className={styles.eyebrow}>Life OS</p><h2>{copy.finalTitle}</h2><p>{copy.finalLead}</p><Link className={styles.primary} href={`/${locale}/register`}>{copy.start}<span aria-hidden="true">→</span></Link></section>
      </main>

      <footer className={styles.footer}><span>© Life OS</span><div><Link href={`/${locale}/legal/privacy`}>{copy.legal[0]}</Link><Link href={`/${locale}/legal/consent`}>{copy.legal[1]}</Link><Link href={`/${locale}/legal/cookies`}>{copy.legal[2]}</Link></div><Link href={locale === 'ru' ? '/en' : '/ru'} hrefLang={locale === 'ru' ? 'en' : 'ru'}>{locale === 'ru' ? 'English' : 'Русский'}</Link></footer>
    </div>
  );
}
