/** PTM lifecycle — core rows + school workflow statuses from the API */
export const PTM_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  PENDING_PRINCIPAL: 'pending_principal',
  PRINCIPAL_REJECTED: 'principal_rejected',
}

/** Lead pipeline — matches SOW (5 columns rendered by `LeadStageStepper`). */
export const LEAD_STAGES = ['new', 'contacted', 'visit', 'enrolled', 'closed']

/**
 * Stage strings the backend actually accepts on PATCH `/api/leads/:id/stage`,
 * `/teacher/:id`, etc. These are the *only* valid values to send to the
 * server. The SOW's 5-step pipeline (Visit / Enrolled / Closed) is a UI
 * abstraction — the backend uses Visited / Admitted / Lost plus extra
 * granular states.
 */
export const LEAD_STAGE_API_OPTIONS = [
  'new',
  'contacted',
  'visit_scheduled',
  'visited',
  'applied',
  'admitted',
  'lost',
]

export const LEAD_STAGE_LABELS = {
  // 5 stepper column keys
  new: 'New',
  contacted: 'Contacted',
  visit: 'Visit',
  enrolled: 'Enrolled',
  closed: 'Closed',
  // Backend stage values (also used in dropdowns / pills / current-stage text)
  visit_scheduled: 'Visit scheduled',
  visited: 'Visited',
  applied: 'Applied',
  admitted: 'Admitted',
  lost: 'Lost',
}

/**
 * Map any backend stage onto a column in the 5-step SOW stepper.
 *
 * - `visit_scheduled`, `visited` → Visit
 * - `applied`, `admitted`        → Enrolled
 * - `lost`                       → Closed
 */
export function leadStageIndexForStepper(stage) {
  const s = String(stage ?? '').toLowerCase().trim()
  if (!s) return 0
  const i = LEAD_STAGES.indexOf(s)
  if (i >= 0) return i
  switch (s) {
    case 'visit_scheduled':
    case 'visited':
      return LEAD_STAGES.indexOf('visit')
    case 'applied':
    case 'admitted':
      return LEAD_STAGES.indexOf('enrolled')
    case 'lost':
      return LEAD_STAGES.indexOf('closed')
    default:
      if (s.startsWith('visit')) return LEAD_STAGES.indexOf('visit')
      return 0
  }
}

/** Map backend stage to the matching pipeline value (for the Update stage dropdown). */
export function apiStageToUiStage(apiStage) {
  const idx = leadStageIndexForStepper(apiStage)
  return LEAD_STAGES[idx] ?? 'new'
}

/**
 * Map a pipeline dropdown value to a stage accepted by PATCH `/api/leads/:id/stage`.
 * If the lead is already in the same UI column, keeps the current granular API value when applicable.
 */
export function uiStageToApiStage(uiStage, currentApiStage = '') {
  const cur = String(currentApiStage ?? '').toLowerCase().trim()
  const s = String(uiStage ?? '').toLowerCase().trim()
  switch (s) {
    case 'new':
      return 'new'
    case 'contacted':
      return 'contacted'
    case 'visit':
      if (cur === 'visited' || cur === 'visit_scheduled') return cur
      return 'visit_scheduled'
    case 'enrolled':
      if (cur === 'admitted' || cur === 'applied') return cur
      return 'applied'
    case 'closed':
      return 'lost'
    default:
      if (LEAD_STAGE_API_OPTIONS.includes(s)) return s
      return 'new'
  }
}

/**
 * Encode a pipeline or raw API stage for GET `?stage=` filtering.
 * Returns comma-separated API stages when the UI bucket maps to several DB values.
 * Backend should treat this as "match any" (SQL IN / OR).
 */
export function encodeLeadStageFilterForQuery(stageParam) {
  const s = String(stageParam ?? '').toLowerCase().trim()
  if (!s) return ''
  const ui = LEAD_STAGES.includes(s) ? s : apiStageToUiStage(s)
  switch (ui) {
    case 'new':
    case 'contacted':
      return ui
    case 'visit':
      return 'visit_scheduled,visited'
    case 'enrolled':
      return 'applied,admitted'
    case 'closed':
      return 'lost'
    default:
      return LEAD_STAGE_API_OPTIONS.includes(s) ? s : ''
  }
}

export const PTM_STATUS_LABELS = {
  [PTM_STATUS.REQUESTED]: 'Requested',
  [PTM_STATUS.APPROVED]: 'Approved',
  [PTM_STATUS.REJECTED]: 'Rejected',
  [PTM_STATUS.COMPLETED]: 'Completed',
  [PTM_STATUS.PENDING_PRINCIPAL]: 'pending ',
  [PTM_STATUS.PRINCIPAL_REJECTED]: 'declined',
}
