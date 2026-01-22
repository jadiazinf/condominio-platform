import { SettingsSidebar } from './components/SettingsSidebar'
import { UserProfileHeader } from './components/UserProfileHeader'

interface ISettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: ISettingsLayoutProps) {
  return (
    <div className="max-w-6xl mx-auto">
      <UserProfileHeader />

      <div className="flex flex-col md:flex-row gap-8 mt-6">
        <SettingsSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
