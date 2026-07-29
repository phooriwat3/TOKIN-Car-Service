export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 h-6 w-[3px] flex-shrink-0 bg-brand" />
        <div>
          <h1 className="text-xl font-bold text-ink leading-snug">{title}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
