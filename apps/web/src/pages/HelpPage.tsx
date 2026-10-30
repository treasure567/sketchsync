import { Link } from 'react-router'
import { generalShortcuts } from '@/components/board/shortcuts'
import { tools } from '@/components/board/tools'
import { ContentPage } from '@/components/layout/ContentPage'
import { Kbd } from '@/components/ui/Kbd'

const faqs: [question: string, answer: string][] = [
  ['Where are my boards saved?', 'In this browser on this device. They autosave as you draw and survive reloads and restarts. Use Save to file in the board menu to back a board up or move it to another device.'],
  ['Does it work offline?', 'Yes. Once you have opened SketchSync, it keeps working without a connection, including opening boards you created before.'],
  ['How do I share a board?', 'Press Share on a board to copy its link and set the default role and expiry. Live editing with other people arrives with the SketchSync sync server; for now a board lives in the browser that made it.'],
  ['How do I export?', 'Open the board menu (☰) and choose Export PNG, SVG or PDF. Exports include the whole board on a white background.'],
  ['Can I use a stylus?', 'Yes. The pencil follows pen pressure, and touches are ignored while you write so a resting palm does not draw.'],
  ['Can I use SketchSync without a mouse or screen?', 'Every action has a keyboard shortcut, arrow keys nudge the selection, and Alt O opens a text outline of the board that screen readers can read and act on.'],
]

export function HelpPage() {
  return (
    <ContentPage title="Help & shortcuts" intro="Everything you need to start sketching, plus every tool and shortcut in one place.">
      <section id="getting-started">
        <h2>Getting started</h2>
        <ul>
          <li>
            Open the <Link to="/dashboard">dashboard</Link> and press <strong>New board</strong>, or start from a template.
          </li>
          <li>Pick a tool from the toolbar (or press its key) and click and drag on the canvas.</li>
          <li>Select anything to change its colour, fill, stroke and more in the style panel.</li>
          <li>Hold Space and drag to move around; pinch or Ctrl + scroll to zoom.</li>
        </ul>
      </section>

      <section id="tools">
        <h2>Tools</h2>
        <ul className="!list-none !pl-0">
          {tools.map(({ id, label, shortcut, icon: Icon, hint }) => (
            <li key={id} className="flex items-start gap-3 border-b border-line py-2.5 last:border-b-0">
              <Icon className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
              <span className="flex-1">
                <strong>{label}</strong> <span className="text-ink-muted">— {hint}</span>
              </span>
              <Kbd>{shortcut}</Kbd>
            </li>
          ))}
        </ul>
      </section>

      <section id="shortcuts">
        <h2>Keyboard shortcuts</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {generalShortcuts.map(([action, keys]) => (
              <tr key={action} className="border-b border-line last:border-b-0">
                <td className="py-2 pr-4">{action}</td>
                <td className="py-2 text-right font-mono text-xs text-ink-muted">{keys}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-ink-muted">On a Mac, use ⌘ instead of Ctrl.</p>
      </section>

      <section id="faq">
        <h2>Questions</h2>
        {faqs.map(([question, answer]) => (
          <div key={question} className="mt-5">
            <h3 className="font-semibold">{question}</h3>
            <p className="!mt-1 text-ink-muted">{answer}</p>
          </div>
        ))}
      </section>
    </ContentPage>
  )
}
