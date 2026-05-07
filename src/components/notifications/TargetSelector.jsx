import { useMemo } from 'react'
import { Label } from '../ui/Label'
import { SearchableMultiSelect } from '../SearchableMultiSelect'
import { NOTIFICATION_TARGET_TYPES } from '../../utils/notificationConstants'

export function TargetSelector({ targetType, value, onChange, disabled, classes, students }) {
  const classOptions = useMemo(
    () =>
      classes.map((c) => ({
        value: c.id,
        label: c.name,
        subtext: `Grade ${c.gradeLevel} · Section ${c.section || '—'} · Room ${c.room || '—'}`,
      })),
    [classes],
  )

  const sectionOptions = useMemo(
    () =>
      classes.map((c) => ({
        value: `${c.id}|${c.section || ''}`,
        label: `${c.name} — Section ${c.section || '—'}`,
        subtext: `Grade ${c.gradeLevel} · Room ${c.room || '—'}`,
      })),
    [classes],
  )

  const studentOptions = useMemo(
    () =>
      students.map((s) => {
        const cls = classes.find((c) => c.id === s.classId)
        return {
          value: s.id,
          label: s.fullName,
          subtext: [s.email, cls?.name].filter(Boolean).join(' · '),
        }
      }),
    [students, classes],
  )

  if (targetType === NOTIFICATION_TARGET_TYPES.CLASS) {
    return (
      <div>
        <SearchableMultiSelect
          id="target-class"
          label="Target classes"
          options={classOptions}
          value={value}
          onChange={onChange}
          disabled={disabled}
          searchPlaceholder="Search classes…"
          emptyText="No classes found."
          collapsedHint="Select one or more classes…"
        />
      </div>
    )
  }

  if (targetType === NOTIFICATION_TARGET_TYPES.SECTION) {
    return (
      <div>
        <SearchableMultiSelect
          id="target-section"
          label="Target sections"
          options={sectionOptions}
          value={value}
          onChange={onChange}
          disabled={disabled}
          searchPlaceholder="Search sections…"
          emptyText="No sections found."
          collapsedHint="Select one or more sections…"
        />
      </div>
    )
  }

  if (targetType === NOTIFICATION_TARGET_TYPES.STUDENT) {
    return (
      <div>
        <SearchableMultiSelect
          id="target-student"
          label="Target students"
          options={studentOptions}
          value={value}
          onChange={onChange}
          disabled={disabled}
          searchPlaceholder="Search students…"
          emptyText="No students found."
          collapsedHint="Select one or more students…"
        />
      </div>
    )
  }

  return (
    <div>
      <Label>Targets</Label>
      <p className="mt-1 text-sm text-slate-500">Choose a target type above.</p>
    </div>
  )
}
