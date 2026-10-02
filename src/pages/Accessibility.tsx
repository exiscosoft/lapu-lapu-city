import Section from '../components/ui/Section';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { Heading } from '../components/ui/Heading';
import { Text } from '../components/ui/Text';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';

const issuesUrl = 'https://github.com/exiscosoft/betterlapulapu/issues';

const practices = [
  'A “Skip to main content” link is the first thing you reach with the Tab key.',
  'Pages use headings, lists and landmarks so screen readers can move through them.',
  'Images that carry meaning have text alternatives.',
  'Menus, links and the search box can be used with a keyboard. Press Escape to close a menu.',
  'Text can be enlarged to 200% with your browser zoom without losing content.',
  'Pages declare their language so screen readers pronounce them correctly.',
];

const limitations = [
  'Charts on the Reports and Statistics dashboard can be hard to follow with a screen reader. The figures come from the city’s Full Disclosure Policy reports, which are linked from each section.',
  'Some source documents published by the city are scanned PDFs without a text layer. We link to them as published and cannot change them.',
  'Content is currently available in English only.',
];

export default function Accessibility() {
  return (
    <>
      <SEO
        title="Accessibility"
        description={`How the ${import.meta.env.VITE_GOVERNMENT_NAME} portal works for people with disabilities, and how to report a problem.`}
      />
      <Section className="p-3 mb-12">
        <Breadcrumbs className="mb-8" />
        <Heading>Accessibility</Heading>
        <Text className="text-gray-600 mb-8">
          This portal should be usable by everyone, including people who use
          screen readers, keyboard navigation, magnification or other assistive
          technology.
        </Text>

        <div className="max-w-3xl space-y-10 text-gray-700">
          <div>
            <Heading level={2}>Our standard</Heading>
            <p>
              We aim to meet the{' '}
              <a
                href="https://www.w3.org/TR/WCAG21/"
                className="underline hover:text-primary-600"
              >
                Web Content Accessibility Guidelines (WCAG) 2.1
              </a>{' '}
              at level AA. The site is still being built, so some pages may fall
              short of that. We fix problems as we find them.
            </p>
          </div>

          <div>
            <Heading level={2}>What we do</Heading>
            <ul className="list-disc space-y-2 pl-6">
              {practices.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <Heading level={2}>Plain-text versions</Heading>
            <p>
              Every service and government page is also available as plain
              Markdown text. Add <code>.md</code> to the end of a page address
              to open it. The{' '}
              <Link to="/sitemap" className="underline hover:text-primary-600">
                sitemap
              </Link>{' '}
              lists every page on one screen, and{' '}
              <a
                href="/llms-full.txt"
                className="underline hover:text-primary-600"
              >
                llms-full.txt
              </a>{' '}
              holds the full text of the site in a single file.
            </p>
          </div>

          <div>
            <Heading level={2}>Known limitations</Heading>
            <ul className="list-disc space-y-2 pl-6">
              {limitations.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <Heading level={2}>Report a problem</Heading>
            <p>
              If something on this site is hard to use, or you need information
              in a different format, tell us. Include the page address and what
              went wrong. You can{' '}
              <a
                href={issuesUrl}
                className="underline hover:text-primary-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                open an issue on GitHub
              </a>
              .
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
