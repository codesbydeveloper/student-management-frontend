import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'

/**
 * @param {{ active: 'hub' | 'login' | 'smtp' }} props
 */
export function SettingsNav({ active }) {
  const tab = (key, to, label) => (
    <Link to={to}>
      <Button type="button" size="sm" variant={active === key ? 'primary' : 'secondary'}>
        {label}
      </Button>
    </Link>
  )
  return (
    <div className="flex flex-wrap gap-2">
      {tab('hub', '/settings', 'All settings')}
      {tab('login', '/settings/login-branding', 'Login appearance')}
      {tab('smtp', '/settings/smtp', 'Email (SMTP)')}
    </div>
  )
}
