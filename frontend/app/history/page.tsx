import { DocumentList } from "@/components/document-list";

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div><p className="eyebrow">Clinical archive</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Document history</h1><p className="mt-2 text-sm text-slate-500">Search and revisit generated notes and patient handouts.</p></div>
      <DocumentList />
    </div>
  );
}
