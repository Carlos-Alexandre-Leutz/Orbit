import type { TemplateId } from '@/lib/templates';

/** A small drawing of how a template lays out a storefront, so a seller can compare them at a glance. */
export function TemplatePreview({
  id,
  color,
}: {
  id: TemplateId;
  color: string;
}) {
  const card = <div className="aspect-square rounded-sm bg-gray-700" />;
  return (
    <div
      aria-hidden="true"
      className="space-y-2 rounded border border-gray-700 bg-gray-950 p-2"
    >
      {id === 'minimal' ? (
        <div className="h-2 w-1/3 rounded-sm bg-gray-400" />
      ) : (
        <div
          className={`rounded-sm ${id === 'bold' ? 'h-14' : 'h-8'}`}
          style={{ backgroundColor: color }}
        />
      )}
      <div
        className={`grid gap-1 ${
          id === 'classic'
            ? 'grid-cols-3'
            : id === 'bold'
              ? 'grid-cols-2'
              : 'grid-cols-4'
        }`}
      >
        {Array.from({
          length: id === 'classic' ? 3 : id === 'bold' ? 2 : 4,
        }).map((_, i) => (
          <div key={i}>{card}</div>
        ))}
      </div>
    </div>
  );
}
