import { Outlet, ScrollRestoration } from 'react-router'

/** Scrolls to the top on navigation, or to #anchors such as /help#shortcuts. */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}
