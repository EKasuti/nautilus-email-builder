import { EmailBuilderClient } from "./EmailBuilderClient";

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; saved?: string }>;
}) {
  const { template, saved } = await searchParams;
  return <EmailBuilderClient template={template} savedId={saved} />;
}
