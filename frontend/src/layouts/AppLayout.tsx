import type { PropsWithChildren } from 'react'

function AppLayout({ children }: PropsWithChildren) {
  return <main className="app-shell">{children}</main>
}

export default AppLayout
