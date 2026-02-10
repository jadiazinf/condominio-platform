import { getUserCookieServer } from '@/libs/cookies/server'
import { LandingNavbar } from './components/LandingNavbar'
import { SectionNav } from './components/SectionNav'

export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserCookieServer()
  const isAuthenticated = user !== null

  return (
    <div className="relative">
      <LandingNavbar isAuthenticated={isAuthenticated} />
      <SectionNav />
      <main className="snap-container">
        {children}
      </main>
    </div>
  )
}
