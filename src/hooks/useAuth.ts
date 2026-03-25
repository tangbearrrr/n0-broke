import { useEffect, useState } from "react"
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth"
import type { User } from "firebase/auth"
import { auth, provider } from "@/lib/firebase"

const ALLOWED_EMAIL = "spz7th@gmail.com"

function isAllowed(u: User | null) {
  return u?.email?.toLowerCase() === ALLOWED_EMAIL
}

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && !isAllowed(u)) {
        await signOut(auth)
        setUser(null)
        setError("Access denied. This account is not authorized.")
      } else {
        setUser(u)
        setError(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = async () => {
    setError(null)
    const result = await signInWithPopup(auth, provider)
    // Check immediately after popup resolves — before onAuthStateChanged fires
    if (!isAllowed(result.user)) {
      await signOut(auth)
      setUser(null)
      setError("Access denied. This account is not authorized.")
    }
  }

  const logOut = () => signOut(auth)

  return { user, loading, error, signIn, logOut }
}
