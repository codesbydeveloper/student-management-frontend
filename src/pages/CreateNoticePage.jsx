import { Card, CardHeader } from '../components/ui/Card'
import { CreateNoticeForm } from '../components/notifications/CreateNoticeForm'

export default function CreateNoticePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Create Notice"
          subtitle="Compose a notice with optional banner, videos, and links. This screen is UI-only until you connect your notice API."
        />
        <div className="border-t border-slate-100 px-4 py-6 sm:px-6">
          <CreateNoticeForm />
        </div>
      </Card>
    </div>
  )
}
