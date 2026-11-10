interface Props { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; disabled?: boolean; testId?: string }
export function Slider({ label, value, min, max, step = 0.01, onChange, format, disabled, testId }: Props) {
  return (
    <div className={`slider${disabled ? ' disabled' : ''}`}>
      <label>{label}</label>
      <output>{format ? format(value) : `${Math.round(value * 100)}%`}</output>
      <input type="range" aria-label={label} data-testid={testId} min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}
