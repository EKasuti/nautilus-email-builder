import Link from "next/link";

export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Link href="/email" className="text-blue-600 underline underline-offset-4 text-sm">
        Go to Email Builder
      </Link>
    </div>
  );
}
