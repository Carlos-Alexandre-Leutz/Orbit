import Link from 'next/link';

export interface LegalSection {
  title: string;
  /** Paragraphs; a string starting with "- " is a list item. */
  body: string[];
}

/** A page of plain legal text: the title, the date, numbered sections and the contact line. */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  const contact = process.env.SUPPORT_EMAIL?.trim();
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-gray-400">Last updated: {updated}</p>
        <p className="text-gray-300">{intro}</p>
      </div>
      {sections.map((section, index) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-lg font-semibold">
            {index + 1}. {section.title}
          </h2>
          {section.body.map((text) =>
            text.startsWith('- ') ? (
              <p key={text} className="ml-4 text-sm text-gray-300">
                • {text.slice(2)}
              </p>
            ) : (
              <p key={text} className="text-sm text-gray-300">
                {text}
              </p>
            ),
          )}
        </section>
      ))}
      <p className="text-sm text-gray-300">
        Questions about this page:{' '}
        {contact ? (
          <a href={`mailto:${contact}`} className="text-blue-400 underline">
            {contact}
          </a>
        ) : (
          'use the contact e-mail published on the Orbit website.'
        )}
      </p>
      <p className="text-sm">
        <Link href="/terms" className="text-blue-400 hover:underline">
          Terms of Use
        </Link>
        {' · '}
        <Link href="/privacy" className="text-blue-400 hover:underline">
          Privacy Policy
        </Link>
      </p>
    </main>
  );
}
