import { Modal } from '../Modal'
import { Button } from '../ui/Button'

export function DeliveryModal({ open, onClose, parentCount, title }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delivery simulation"
      footer={
        <Button type="button" onClick={onClose}>
          OK
        </Button>
      }
    >
      <p className="text-sm leading-relaxed text-slate-700">
        <span className="font-semibold text-slate-900">{title || 'This notification'}</span> was marked{' '}
        <span className="font-semibold text-emerald-700">approved</span>. In production it would be sent to guardians.
      </p>
      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-950">
        <p className="font-semibold">
          Notification delivered to {parentCount} parent{parentCount === 1 ? '' : 's'} (mocked).
        </p>
        <p className="mt-2 text-xs leading-relaxed text-indigo-900/90">
          Recipients were resolved from your target (class / section / student) and de-duplicated per guardian — no
          duplicate in-app message per parent (simulation only).
        </p>
      </div>
    </Modal>
  )
}
