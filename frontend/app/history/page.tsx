import { DocumentList } from "@/components/document-list";

export default function HistoryPage() {
  return (
    <div className="space-y-7">
      <header className="max-w-2xl">
        <p className="eyebrow">Clinical archive</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.03em] text-ink md:text-4xl">Document history</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">Find and reopen the clinical notes and patient handouts available to your organization.</p>
      </header>
      <DocumentList />
    </div>
  );
}
