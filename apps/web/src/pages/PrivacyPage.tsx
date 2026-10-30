import { ContentPage } from '@/components/layout/ContentPage'

export function PrivacyPage() {
  return (
    <ContentPage title="Privacy Policy" intro="SketchSync keeps your work on your device. Here is exactly what is stored and where." updated="30 October 2026">
      <section id="summary">
        <h2>In short</h2>
        <ul>
          <li>Your boards, profile and library are stored in your browser on your device. They are not uploaded anywhere.</li>
          <li>SketchSync uses no analytics, advertising or tracking, and sets no cookies.</li>
          <li>You can delete everything at any time from Account settings.</li>
        </ul>
      </section>

      <section id="storage">
        <h2>What we store</h2>
        <p>The app uses your browser&apos;s local storage to keep:</p>
        <ul>
          <li>your boards and their contents, names, stars and share settings;</li>
          <li>your profile: name, email, handle, role, avatar image, cursor colour and ink preference;</li>
          <li>library items you save and the last elements you copied.</li>
        </ul>
        <p>
          The app also caches its own code so it works offline. Because nothing is sent to a server, we cannot see, recover or delete this data for you, and it is
          not shared between your devices.
        </p>
      </section>

      <section id="cookies">
        <h2>Cookies</h2>
        <p>SketchSync sets no cookies. Local storage is used only to make the app work, as described above.</p>
      </section>

      <section id="sharing">
        <h2>Sharing and future accounts</h2>
        <p>
          Share links and invitations are saved with the board on your device. When real-time collaboration and accounts launch, they will need a server; this
          policy will be updated before any data leaves your device, and you will be asked first.
        </p>
      </section>

      <section id="security">
        <h2>Security</h2>
        <ul>
          <li>Data opened from files is validated before use, and the app runs under a strict Content Security Policy.</li>
          <li>Local storage is not encrypted. Anyone with access to your browser profile can read it, so use your device&apos;s own account protection.</li>
        </ul>
      </section>

      <section id="your-choices">
        <h2>Your choices</h2>
        <ul>
          <li>Back up or move a board with Save to file in the board menu.</li>
          <li>Delete a board from the dashboard, or everything with Delete account in Account settings.</li>
          <li>Clearing your browser&apos;s site data for SketchSync also removes everything.</li>
        </ul>
      </section>
    </ContentPage>
  )
}
