export function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute top-0 left-0 w-full h-screen bg-cover bg-center bg-no-repeat z-0 pointer-events-none"
      style={{ backgroundImage: "url('/caracas-hero.webp')" }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70 dark:from-background/50 dark:via-background/70 dark:to-background/90" />
    </div>
  )
}
