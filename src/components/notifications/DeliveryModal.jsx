import { Modal } from '../Modal'
import { Button } from '../ui/Button'

export function DeliveryModal({ open, onClose, title }) {
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
    </Modal>
  )
}
