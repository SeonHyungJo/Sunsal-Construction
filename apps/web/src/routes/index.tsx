import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "../lib/orpc";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const health = useQuery(orpc.health.queryOptions());
  return (
    <main className="mx-auto max-w-screen-md p-4">
      <h1 className="text-2xl font-bold">순살시공</h1>
      <p className="text-sm text-gray-500">API: {health.data?.ok ? "ok" : "…"}</p>
    </main>
  );
}
