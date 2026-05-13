import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { LEAD_STAGES, PTM_STATUS } from '../data/phase6Constants'

const STORAGE_PTM = 'scs_phase6_ptm_v1'
const STORAGE_VISITORS = 'scs_phase6_visitors_v1'
const STORAGE_VISITOR_AUDIT = 'scs_phase6_visitor_audit_v1'
const STORAGE_LEADS = 'scs_phase6_leads_v1'

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json)
    return v ?? fallback
  } catch {
    return fallback
  }
}

function loadJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  return safeParse(window.localStorage.getItem(key) || 'null', fallback)
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function hasActivePtmTriple(list, parentUserId, studentId, teacherUserId) {
  return list.some(
    (r) =>
      String(r.parentUserId) === String(parentUserId) &&
      String(r.studentId) === String(studentId) &&
      String(r.teacherUserId) === String(teacherUserId) &&
      (r.status === PTM_STATUS.REQUESTED || r.status === PTM_STATUS.APPROVED),
  )
}

const Phase6Context = createContext(null)

export function Phase6Provider({ children }) {
  const { user } = useAuth()
  const [ptmRequests, setPtmRequests] = useState(() => loadJson(STORAGE_PTM, []))
  const [visitors, setVisitors] = useState(() => loadJson(STORAGE_VISITORS, []))
  const [visitorAudit, setVisitorAudit] = useState(() => loadJson(STORAGE_VISITOR_AUDIT, []))
  const [leads, setLeads] = useState(() => loadJson(STORAGE_LEADS, []))

  const ptmRef = useRef(ptmRequests)
  const visitorsRef = useRef(visitors)
  useEffect(() => {
    ptmRef.current = ptmRequests
  }, [ptmRequests])
  useEffect(() => {
    visitorsRef.current = visitors
  }, [visitors])

  useEffect(() => saveJson(STORAGE_PTM, ptmRequests), [ptmRequests])
  useEffect(() => saveJson(STORAGE_VISITORS, visitors), [visitors])
  useEffect(() => saveJson(STORAGE_VISITOR_AUDIT, visitorAudit), [visitorAudit])
  useEffect(() => saveJson(STORAGE_LEADS, leads), [leads])

  const addPtmRequest = useCallback(({ studentId, studentName, teacherUserId, teacherName, reason }) => {
    if (!user?.id) return { ok: false, error: 'Not signed in' }
    const parentUserId = String(user.id)
    const parentName = String(user.fullName || 'Parent').trim()
    if (!studentId || !teacherUserId || !String(reason).trim()) {
      return { ok: false, error: 'Choose a child, teacher, and enter a reason.' }
    }
    if (hasActivePtmTriple(ptmRef.current, parentUserId, studentId, teacherUserId)) {
      return {
        ok: false,
        error:
          'You already have an open PTM with this teacher for this child. Wait until it is completed or rejected.',
      }
    }
    const now = new Date().toISOString()
    const row = {
      id: uid('ptm'),
      parentUserId,
      parentName,
      studentId: String(studentId),
      studentName: String(studentName || '').trim() || 'Student',
      teacherUserId: String(teacherUserId),
      teacherName: String(teacherName || '').trim() || 'Teacher',
      reason: String(reason).trim(),
      status: PTM_STATUS.REQUESTED,
      meetingAt: null,
      rejectionNote: null,
      createdAt: now,
      updatedAt: now,
    }
    setPtmRequests((prev) => [row, ...prev])
    return { ok: true }
  }, [user])

  const teacherApprovePtm = useCallback(
    (ptmId, meetingAtIso) => {
      if (!user?.id) return { ok: false, error: 'Not signed in' }
      const tid = String(user.id)
      const now = new Date().toISOString()
      setPtmRequests((prev) =>
        prev.map((r) => {
          if (r.id !== ptmId || String(r.teacherUserId) !== tid) return r
          if (r.status !== PTM_STATUS.REQUESTED) return r
          return {
            ...r,
            status: PTM_STATUS.APPROVED,
            meetingAt: meetingAtIso || null,
            updatedAt: now,
          }
        }),
      )
      return { ok: true }
    },
    [user],
  )

  const teacherRejectPtm = useCallback(
    (ptmId, note) => {
      if (!user?.id) return { ok: false, error: 'Not signed in' }
      const tid = String(user.id)
      const now = new Date().toISOString()
      setPtmRequests((prev) =>
        prev.map((r) => {
          if (r.id !== ptmId || String(r.teacherUserId) !== tid) return r
          if (r.status !== PTM_STATUS.REQUESTED) return r
          return {
            ...r,
            status: PTM_STATUS.REJECTED,
            rejectionNote: String(note || '').trim() || null,
            updatedAt: now,
          }
        }),
      )
      return { ok: true }
    },
    [user],
  )

  const teacherCompletePtm = useCallback(
    (ptmId) => {
      if (!user?.id) return { ok: false, error: 'Not signed in' }
      const tid = String(user.id)
      const now = new Date().toISOString()
      setPtmRequests((prev) =>
        prev.map((r) => {
          if (r.id !== ptmId || String(r.teacherUserId) !== tid) return r
          if (r.status !== PTM_STATUS.APPROVED) return r
          return { ...r, status: PTM_STATUS.COMPLETED, updatedAt: now }
        }),
      )
      return { ok: true }
    },
    [user],
  )

  const addVisitor = useCallback(
    ({ name, phone, purpose, visitAt }) => {
      if (!user?.id) return { ok: false, error: 'Not signed in' }
      const n = String(name || '').trim()
      const p = String(phone || '').trim()
      const pur = String(purpose || '').trim()
      if (!n || !p || !pur || !visitAt) {
        return { ok: false, error: 'Name, phone, purpose, and visit date/time are required.' }
      }
      const now = new Date().toISOString()
      const row = {
        id: uid('vis'),
        name: n,
        phone: p,
        purpose: pur,
        visitAt: new Date(visitAt).toISOString(),
        createdByUserId: String(user.id),
        createdByName: String(user.fullName || 'Admin').trim(),
        createdAt: now,
      }
      setVisitors((prev) => [row, ...prev])
      return { ok: true }
    },
    [user],
  )

  const deleteVisitor = useCallback(
    (visitorId) => {
      if (!user?.id) return { ok: false, error: 'Not signed in' }
      const snapshot = visitorsRef.current.find((x) => x.id === visitorId)
      if (!snapshot) return { ok: false, error: 'Entry not found.' }
      setVisitors((prev) => prev.filter((x) => x.id !== visitorId))
      const audit = {
        id: uid('aud'),
        visitorId: snapshot.id,
        visitorNameSnapshot: snapshot.name,
        deletedByUserId: String(user.id),
        deletedByName: String(user.fullName || 'Admin').trim(),
        deletedAt: new Date().toISOString(),
      }
      setVisitorAudit((prev) => [audit, ...prev])
      return { ok: true }
    },
    [user],
  )

  const createLead = useCallback(
    ({ studentName, parentName, phone, assignedTeacherUserId, assignedTeacherName }) => {
      if (!user?.id) return { ok: false, error: 'Not signed in' }
      const sn = String(studentName || '').trim()
      const pn = String(parentName || '').trim()
      const ph = String(phone || '').trim()
      if (!sn || !pn || !ph) {
        return { ok: false, error: 'Student name, parent name, and phone are required.' }
      }
      const now = new Date().toISOString()
      const row = {
        id: uid('lead'),
        studentName: sn,
        parentName: pn,
        phone: ph,
        assignedTeacherUserId: assignedTeacherUserId ? String(assignedTeacherUserId) : null,
        assignedTeacherName: String(assignedTeacherName || '').trim() || '—',
        stage: LEAD_STAGES[0],
        notes: [],
        followUps: [],
        createdAt: now,
        createdByUserId: String(user.id),
        createdByName: String(user.fullName || 'Admin').trim(),
      }
      setLeads((prev) => [row, ...prev])
      return { ok: true, id: row.id }
    },
    [user],
  )

  const updateLeadAssignment = useCallback((leadId, teacherUserId, teacherName) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              assignedTeacherUserId: teacherUserId ? String(teacherUserId) : null,
              assignedTeacherName: String(teacherName || '').trim() || '—',
            }
          : l,
      ),
    )
    return { ok: true }
  }, [])

  const updateLeadStage = useCallback((leadId, stage) => {
    if (!LEAD_STAGES.includes(stage)) return { ok: false, error: 'Invalid stage' }
    const now = new Date().toISOString()
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage, updatedAt: now } : l)),
    )
    return { ok: true }
  }, [])

  const addLeadNote = useCallback(
    (leadId, text) => {
      if (!user?.id) return { ok: false, error: 'Not signed in' }
      const t = String(text || '').trim()
      if (!t) return { ok: false, error: 'Note cannot be empty.' }
      const note = {
        id: uid('note'),
        at: new Date().toISOString(),
        userId: String(user.id),
        userName: String(user.fullName || 'User').trim(),
        text: t,
      }
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, notes: [...(l.notes || []), note] } : l)),
      )
      return { ok: true }
    },
    [user],
  )

  const addLeadFollowUp = useCallback(
    (leadId, { note, callStatus, visitStatus, done }) => {
      if (!user?.id) return { ok: false, error: 'Not signed in' }
      const row = {
        id: uid('fu'),
        at: new Date().toISOString(),
        done: Boolean(done),
        note: String(note || '').trim(),
        callStatus: String(callStatus || '').trim(),
        visitStatus: String(visitStatus || '').trim(),
      }
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, followUps: [...(l.followUps || []), row] } : l)),
      )
      return { ok: true }
    },
    [user],
  )

  const markFollowUpDone = useCallback((leadId, followUpId) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l
        return {
          ...l,
          followUps: (l.followUps || []).map((f) => (f.id === followUpId ? { ...f, done: true } : f)),
        }
      }),
    )
    return { ok: true }
  }, [])

  const deleteLead = useCallback((leadId) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
    return { ok: true }
  }, [])

  const parentPtmList = useMemo(() => {
    if (!user?.id) return []
    const pid = String(user.id)
    return ptmRequests.filter((r) => String(r.parentUserId) === pid)
  }, [ptmRequests, user])

  const teacherPtmPending = useMemo(() => {
    if (!user?.id) return []
    const tid = String(user.id)
    return ptmRequests.filter(
      (r) => String(r.teacherUserId) === tid && r.status === PTM_STATUS.REQUESTED,
    )
  }, [ptmRequests, user])

  const teacherPtmAll = useMemo(() => {
    if (!user?.id) return []
    const tid = String(user.id)
    return ptmRequests.filter((r) => String(r.teacherUserId) === tid)
  }, [ptmRequests, user])

  const teacherLeads = useMemo(() => {
    if (!user?.id) return []
    const tid = String(user.id)
    return leads.filter((l) => l.assignedTeacherUserId && String(l.assignedTeacherUserId) === tid)
  }, [leads, user])

  const value = useMemo(
    () => ({
      ptmRequests,
      visitors,
      visitorAudit,
      leads,
      addPtmRequest,
      teacherApprovePtm,
      teacherRejectPtm,
      teacherCompletePtm,
      addVisitor,
      deleteVisitor,
      createLead,
      updateLeadAssignment,
      updateLeadStage,
      addLeadNote,
      addLeadFollowUp,
      markFollowUpDone,
      deleteLead,
      parentPtmList,
      teacherPtmPending,
      teacherPtmAll,
      teacherLeads,
    }),
    [
      ptmRequests,
      visitors,
      visitorAudit,
      leads,
      addPtmRequest,
      teacherApprovePtm,
      teacherRejectPtm,
      teacherCompletePtm,
      addVisitor,
      deleteVisitor,
      createLead,
      updateLeadAssignment,
      updateLeadStage,
      addLeadNote,
      addLeadFollowUp,
      markFollowUpDone,
      deleteLead,
      parentPtmList,
      teacherPtmPending,
      teacherPtmAll,
      teacherLeads,
    ],
  )

  return <Phase6Context.Provider value={value}>{children}</Phase6Context.Provider>
}

export function usePhase6() {
  const ctx = useContext(Phase6Context)
  if (!ctx) throw new Error('usePhase6 must be used within Phase6Provider')
  return ctx
}
