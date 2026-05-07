import { Link } from 'react-router-dom'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ParentNotificationFeed } from '../components/parent/ParentNotificationFeed'

export default function ParentNotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/parent-dashboard">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-teal-200/80 bg-white !text-teal-900 hover:border-teal-300 hover:bg-teal-50 hover:!text-teal-950"
          >
            Family dashboard
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader
          title="School messages"
          subtitle="Signed-in parents load notices from the school (GET /api/parents/messages). Without a server session, the list uses the in-app demo feed."
        />
        <ParentNotificationFeed />
      </Card>
    </div>
  )
}
