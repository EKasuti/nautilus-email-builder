export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  return (
    <div className="p-8">
      <p className="text-gray-400 text-sm">
        Builder template: <span className="font-medium text-gray-700">{template ?? "none"}</span>
      </p>
    </div>
  );
}
