export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="kpi-card">
      <span className="kpi-label">{label}</span>
      <div className="kpi-value">{value}</div>
      <div className="small-text">{detail}</div>
    </div>
  );
}
