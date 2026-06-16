type Props = {
  label: string
  value: string | number
  sub?: string
}

export default function KpiCard({ label, value, sub }: Props) {
  return (
    <div className="bg-an-bg-surface border border-an-border rounded-lg p-4">
      <p className="text-[12px] text-an-fg-subtle mb-2">{label}</p>
      <p className="text-[24px] font-medium text-an-fg-base leading-none">{value}</p>
      {sub && <p className="text-[12px] text-an-fg-muted mt-1">{sub}</p>}
    </div>
  )
}
