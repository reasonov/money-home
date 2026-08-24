export async function applyAppUpdate() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.allSettled(
      registrations.map(async (registration) => {
        await registration.update()
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
      }),
    )
  }
  window.location.reload()
}
