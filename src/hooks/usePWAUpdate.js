import { useRegisterSW } from 'virtual:pwa-register/react'

export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  async function checkForUpdate() {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.update()
  }

  return {
    updateAvailable: needRefresh,
    applyUpdate: () => {
      updateServiceWorker(true)
      setNeedRefresh(false)
    },
    checkForUpdate,
  }
}
