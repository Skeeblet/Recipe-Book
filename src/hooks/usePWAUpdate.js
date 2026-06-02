import { useRegisterSW } from 'virtual:pwa-register/react'

export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  return {
    updateAvailable: needRefresh,
    applyUpdate: () => {
      updateServiceWorker(true)
      setNeedRefresh(false)
    },
  }
}
