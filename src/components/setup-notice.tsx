export function SetupNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/70 p-5">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-black/60">{description}</p>
    </div>
  );
}
