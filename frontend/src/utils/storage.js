// Small per-browser preferences (localStorage). Every access is wrapped in
// try/catch, because storage can be blocked. The app works without it.

const SPEAK_KEY = 'formease.speakReplies'

export function getSpeakReplies() {
  try {
    return window.localStorage.getItem(SPEAK_KEY) === 'true'
  } catch {
    return false
  }
}

export function setSpeakReplies(value) {
  try {
    window.localStorage.setItem(SPEAK_KEY, String(value))
  } catch {
    // Ignore: the setting simply will not be remembered.
  }
}
