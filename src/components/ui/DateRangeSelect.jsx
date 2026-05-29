import { Select } from './Select'
import { DATE_RANGE_PRESETS } from '../../utils/listDateRange'

/**
 * Date range dropdown for notice history (admin / principal).
 */
export function DateRangeSelect({
  value,
  onChange,
  disabled = false,
  className = '',
  selectClassName = '',
  id = 'date-range',
  hideLabel = false,
}) {
  return (
    <div className={className}>
      {hideLabel ? null : (
        <label htmlFor={id} className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Date range
        </label>
      )}
      <Select
        id={id}
        value={value}
        disabled={disabled}
        className={`w-full min-w-[11rem] ${selectClassName}`}
        onChange={(e) => onChange(e.target.value)}
      >
        {DATE_RANGE_PRESETS.map((preset) => (
          <option key={preset.key} value={preset.key}>
            {preset.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
