import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BusStudentOverview } from '../components/transport/BusStudentOverview'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

/** Teacher — read-only buses / students overview (same table as admin assign-bus page). */
export default function TeacherBusOverviewPage() {
  const { token } = useAuth()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard">
          <Button type="button" size="sm" variant="secondary">
            Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Buses"
          subtitle="Students on each bus. Tap View students for names and classes."
        />
        {!token ? (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            Sign in as a teacher to load bus assignments from the server.
          </p>
        ) : null}
      </Card>

      <BusStudentOverview token={token} showExport showViewStudents />
    </div>
  )
}
