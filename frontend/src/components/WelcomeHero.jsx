// Shown above the chat until the first message is sent.
export default function WelcomeHero() {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <h1 id="welcome-title" className="welcome-title">
        Welcome to FormEase AI
      </h1>
      <p className="welcome-subtitle">
        Your voice. Your language. Your form. Made easy.
      </p>
    </section>
  )
}
