import { AppSettingsTab } from '../components/AppSettingsTab'

export function SettingsPage() {
  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        background: '#0B090D',
        padding: '24px',
      }}
    >
      <AppSettingsTab />
    </div>
  )
}
