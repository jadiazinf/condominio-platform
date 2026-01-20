import { ClientLoadingFlow } from './components/ClientLoadingFlow'
import { ServerSessionFlow } from './components/ServerSessionFlow'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ILoadingPageProps {
  searchParams: Promise<{ register?: string; signout?: string }>
}

interface ISearchParams {
  register?: string
  signout?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function isClientSideFlow(params: ISearchParams): boolean {
  return params.register === 'true' || params.signout === 'true'
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default async function AuthLoadingPage({ searchParams }: ILoadingPageProps) {
  const params = await searchParams

  // Special cases: delegate to Client Component
  // Registration requires sessionStorage, signout requires Firebase client SDK
  if (isClientSideFlow(params)) {
    return <ClientLoadingFlow />
  }

  // Server-side flow: calls API to set cookies and redirect
  return <ServerSessionFlow />
}
