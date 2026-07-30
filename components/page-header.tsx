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
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink sm:text-[28px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500">{description}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}