import { Footer } from './components/Footer'

import { Navbar } from '@/ui/components/navbar/Navbar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col min-h-screen">
      <Navbar />
      <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">{children}</main>
      <div className="container mx-auto max-w-7xl px-6">
        <Footer />
      </div>
    </div>
  )
}
