import { PageHeader } from "@/components/ui/PageHeader";
import { CreateCircleForm } from "./CreateCircleForm";

export default function NewCirclePage() {
  return (
    <main className="flex flex-col">
      <PageHeader title="Create a circle" backHref="/home" />
      <CreateCircleForm />
    </main>
  );
}
