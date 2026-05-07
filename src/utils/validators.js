export function required(value, label = 'This field') {
  const v = typeof value === 'string' ? value.trim() : value
  if (v === undefined || v === null || v === '') {
    return `${label} is required`
  }
  return ''
}

export function email(value) {
  const v = (value || '').trim()
  if (!v) return ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    return 'Enter a valid email'
  }
  return ''
}

export function minLength(value, min, label = 'This field') {
  const v = (value || '').trim()
  if (v.length > 0 && v.length < min) {
    return `${label} must be at least ${min} characters`
  }
  return ''
}
