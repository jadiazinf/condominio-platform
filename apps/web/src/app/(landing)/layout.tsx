import { Footer } from './components/Footer'
import { HeroBackground } from './components/HeroBackground'

import { Navbar } from '@/ui/components/navbar/Navbar'

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col min-h-screen">
      <HeroBackground />
      <Navbar />
      <main className="relative z-10 container mx-auto max-w-7xl pt-16 px-6 flex-grow">
        {children}
      </main>
      <div className="container mx-auto max-w-7xl px-6">
        <Footer />
      </div>
    </div>
  )
}
