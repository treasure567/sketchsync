import { Link } from 'react-router'
import { ContentPage } from '@/components/layout/ContentPage'

export function TermsPage() {
  return (
    <ContentPage title="Terms of Service" intro="The ground rules for using SketchSync, in plain language." updated="30 October 2026">
      <section id="using">
        <h2>Using SketchSync</h2>
        <p>SketchSync is a free whiteboard you can use for study, teaching and work. By using it you agree to these terms.</p>
      </section>

      <section id="your-content">
        <h2>Your content</h2>
        <ul>
          <li>Everything you draw, write or upload belongs to you.</li>
          <li>Your boards are stored on your device (see the <Link to="/privacy">Privacy Policy</Link>). You are responsible for backing up anything important with Save to file.</li>
          <li>Only add images and content you have the right to use.</li>
        </ul>
      </section>

      <section id="acceptable-use">
        <h2>Acceptable use</h2>
        <p>Don&apos;t use SketchSync to share unlawful, harmful or harassing content, to infringe others&apos; rights, or to attack or overload the service.</p>
      </section>

      <section id="availability">
        <h2>Availability and changes</h2>
        <p>
          SketchSync is provided as is, without warranties. Features may change as the product develops, including the arrival of accounts and real-time
          collaboration. We will update these terms when that happens.
        </p>
      </section>

      <section id="liability">
        <h2>Liability</h2>
        <p>To the extent the law allows, we are not liable for lost data or indirect losses from using SketchSync. Keep copies of work that matters.</p>
      </section>
    </ContentPage>
  )
}
