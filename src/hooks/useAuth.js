import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, provider } from '../firebase/config.js'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  async function signIn() {
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      console.error(e)
    }
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return { user, authLoading, signIn, signOut }
}
