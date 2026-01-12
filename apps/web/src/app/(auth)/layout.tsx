export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Background that covers full viewport */}
      <div className="fixed inset-0 z-0">
        {/* Mobile: Primary background for registration section */}
        <div className="absolute inset-0 bg-primary dark:bg-primary/30 lg:hidden">
          {/* Decorative blobs for mobile */}
          <div className="absolute inset-0 opacity-10 dark:opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          </div>
        </div>

        {/* Desktop: Base background + Diagonal overlay */}
        <div className="hidden lg:block">
          <div className="absolute inset-0 bg-background" />
          <div
            className="absolute inset-0 bg-primary dark:bg-primary/30"
            style={{ clipPath: 'polygon(60% 0, 100% 0, 100% 100%, 45% 100%)' }}
          >
            {/* Decorative blobs */}
            <div className="absolute inset-0 opacity-10 dark:opacity-5">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </>
  )
}
