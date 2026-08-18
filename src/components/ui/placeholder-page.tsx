export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold font-display text-gray-900 mb-2">{title}</h1>
      {description && <p className="text-gray-500 text-sm max-w-2xl">{description}</p>}
    </div>
  );
}
