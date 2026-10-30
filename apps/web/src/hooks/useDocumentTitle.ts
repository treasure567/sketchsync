import { useEffect } from 'react'

const SITE_TITLE = 'SketchSync — Online whiteboard made simple'

/** Sets the browser tab title to "<title> · SketchSync", or the site title when none is given. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · SketchSync` : SITE_TITLE
  }, [title])
}
