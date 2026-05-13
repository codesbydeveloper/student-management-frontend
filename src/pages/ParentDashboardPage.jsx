import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ParentDashboard } from '../components/parent/ParentDashboard'
import { fetchParentMyDriver, fetchParentMyStudents } from '../api/parentsApi'
import { SEED_CLASSES } from '../data/seedClasses'
import { SEED_STUDENTS } from '../data/seedStudents'
import { ROLES } from '../utils/constants'
import { getLinkedStudentIdsForParent } from '../utils/parentUtils'

function classForStudent(classId, classes) {
  return (
    classes.find((c) => String(c.id) === String(classId)) ||
    SEED_CLASSES.find((c) => String(c.id) === String(classId)) ||
    null
  )
}

function buildDemoChildRows(classes) {
  return SEED_STUDENTS.slice(0, 2).map((student) => ({
    student,
    cls: classForStudent(student.classId, classes),
  }))
}

export default function ParentDashboardPage() {
  const { user, token } = useAuth()
  const { parents, students, classes } = useAppData()

  /** `null` = not loaded yet; `[]` = loaded, no students from API. */
  const [myStudents, setMyStudents] = useState(null)
  const [myDriverRows, setMyDriverRows] = useState([])
  const [myDriverLoading, setMyDriverLoading] = useState(false)
  const [myDriverError, setMyDriverError] = useState('')

  useEffect(() => {
    if (!token || user?.role !== ROLES.PARENT) {
      // Clear server list when leaving parent session (sync reset is intentional here).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset queue when token/role no longer loads my-students
      setMyStudents(null)
      setMyDriverRows([])
      setMyDriverLoading(false)
      setMyDriverError('')
      return
    }
    let cancelled = false
    void (async () => {
      const res = await fetchParentMyStudents(token)
      if (cancelled) return
      if (res.ok) {
        setMyStudents(res.students)
      } else {
        setMyStudents([])
        toast.error(res.error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, user?.role])

  useEffect(() => {
    if (!token || user?.role !== ROLES.PARENT) {
      setMyDriverRows([])
      setMyDriverLoading(false)
      setMyDriverError('')
      return
    }
    let cancelled = false
    setMyDriverLoading(true)
    setMyDriverError('')
    void (async () => {
      const res = await fetchParentMyDriver(token)
      if (cancelled) return
      setMyDriverLoading(false)
      if (res.ok) {
        setMyDriverRows(res.rows)
      } else {
        setMyDriverRows([])
        setMyDriverError(res.error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, user?.role])

  const { childRows, childrenLoading, childrenSubtitle } = useMemo(() => {
    if (user?.role !== ROLES.PARENT) {
      return { childRows: [], childrenLoading: false, childrenSubtitle: '' }
    }

    if (Array.isArray(myStudents) && myStudents.length > 0) {
      return {
        childRows: myStudents.map((s) => ({
          student: s,
          cls: {
            id: s.classId,
            name: s.classDisplayName || '',
            section: s.classSection || '',
          },
        })),
        childrenLoading: false,
        childrenSubtitle: 'Loaded from your school (GET /api/parents/my-students).',
      }
    }

    const childIds = getLinkedStudentIdsForParent(user, parents)
    const local = childIds
      .map((id) => {
        const student = students.find((st) => String(st.id) === String(id))
        if (!student) return null
        const cls = classForStudent(student.classId, classes)
        return { student, cls }
      })
      .filter(Boolean)
    if (local.length > 0) {
      return {
        childRows: local,
        childrenLoading: false,
        childrenSubtitle: 'From saved school directory in this app.',
      }
    }

    if (myStudents === null && token) {
      return {
        childRows: [],
        childrenLoading: true,
        childrenSubtitle: '',
      }
    }

    return {
      childRows: buildDemoChildRows(classes),
      childrenLoading: false,
      childrenSubtitle:
        'Preview sample children until my-students returns your linked students or your school connects your account.',
    }
  }, [user, myStudents, token, parents, students, classes])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/parent-notifications">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-teal-200/80 bg-white !text-teal-900 hover:border-teal-300 hover:bg-teal-50 hover:!text-teal-950"
          >
            School messages
          </Button>
        </Link>
        <Link to="/parent-bus">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-indigo-200/80 bg-white !text-indigo-900 hover:border-indigo-300 hover:bg-indigo-50 hover:!text-indigo-950"
          >
            Bus tracking
          </Button>
        </Link>
        <Link to="/parent/ptm/request">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-violet-200/80 bg-white !text-violet-900 hover:border-violet-300 hover:bg-violet-50 hover:!text-violet-950"
          >
            Request PTM
          </Button>
        </Link>
        <Link to="/parent/ptm/history">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-violet-200/80 bg-white !text-violet-900 hover:border-violet-300 hover:bg-violet-50 hover:!text-violet-950"
          >
            PTM history
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-slate-200/90 bg-white !text-slate-800 hover:border-slate-300 hover:bg-slate-50 hover:!text-slate-900"
          >
            Main dashboard
          </Button>
        </Link>
      </div>
      <Card>
        <ParentDashboard
          parentName={user.fullName}
          childRows={childRows}
          childrenLoading={childrenLoading}
          childrenSubtitle={childrenSubtitle}
          myDriverRows={myDriverRows}
          myDriverLoading={myDriverLoading}
          myDriverError={myDriverError}
        />
      </Card>
    </div>
  )
}
