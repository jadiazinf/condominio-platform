import { cookies } from 'next/headers'
import { LandingNavbar } from './components/LandingNavbar'
import { SectionNav } from './components/SectionNav'

export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAuthenticated = !!cookieStore.get('__session')?.value

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
