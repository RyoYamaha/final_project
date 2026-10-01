import { Outlet } from 'react-router'
import { Navbar } from './Navbar'

export function BareLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="min-w-0 flex-1 p-4">
        <Outlet />
      </main>
    </div>
  )
}

export default BareLayout
