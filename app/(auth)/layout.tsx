'use client'

import { checkGuest } from "@/utils/login"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function AuthLayout({ children }: { children: React.ReactNode}) {
    const router = useRouter()
    const [isGuest, setIsGuest] = useState(false)

    useEffect(() => {
        setIsGuest(checkGuest(router))
    }, [router])

    if(!isGuest) return null

    return <>{children}</>
}