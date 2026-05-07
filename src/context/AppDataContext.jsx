import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react'
import { SEED_TEACHERS } from '../data/seedTeachers'
import { SEED_CLASSES } from '../data/seedClasses'
import { SEED_STUDENTS } from '../data/seedStudents'
import { SEED_PARENTS } from '../data/seedParents'
import { STORAGE_KEYS } from '../utils/constants'

const AppDataContext = createContext(null)

const defaultState = () => ({
  teachers: SEED_TEACHERS.map((t) => ({ ...t })),
  classes: SEED_CLASSES.map((c) => ({ ...c, teacherIds: [...c.teacherIds] })),
  students: SEED_STUDENTS.map((s) => ({ ...s })),
  parents: SEED_PARENTS.map((p) => ({ ...p, studentIds: [...p.studentIds] })),
})

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APP_DATA)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.teachers || !data?.classes || !data?.students || !data?.parents) {
      return null
    }
    return data
  } catch {
    return null
  }
}

function savePersisted(state) {
  localStorage.setItem(STORAGE_KEYS.APP_DATA, JSON.stringify(state))
}

export function AppDataProvider({ children }) {
  const [state, setState] = useState(defaultState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const persisted = loadPersisted()
    if (persisted) setState(persisted)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    savePersisted(state)
  }, [state, hydrated])

  const setTeachers = useCallback((updater) => {
    setState((s) => ({
      ...s,
      teachers: typeof updater === 'function' ? updater(s.teachers) : updater,
    }))
  }, [])

  const setClasses = useCallback((updater) => {
    setState((s) => ({
      ...s,
      classes: typeof updater === 'function' ? updater(s.classes) : updater,
    }))
  }, [])

  const setStudents = useCallback((updater) => {
    setState((s) => ({
      ...s,
      students: typeof updater === 'function' ? updater(s.students) : updater,
    }))
  }, [])

  const setParents = useCallback((updater) => {
    setState((s) => ({
      ...s,
      parents: typeof updater === 'function' ? updater(s.parents) : updater,
    }))
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      hydrated,
      setTeachers,
      setClasses,
      setStudents,
      setParents,
    }),
    [state, hydrated, setTeachers, setClasses, setStudents, setParents],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
