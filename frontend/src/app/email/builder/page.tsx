import { EmailBuilderClient } from "./EmailBuilderClient";

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  return <EmailBuilderClient template={template} />;
}
