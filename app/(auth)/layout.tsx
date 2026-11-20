'use client'

import { checkGuest } from "@/utils/login"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function AuthLayout({ children }: { children: React.ReactNode}) {
    const router = useRouter()
    const [isGuest, setIsGuest] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลังเปิดหน้าเท่านั้น
        setIsGuest(checkGuest(router))
    }, [router])

    if(!isGuest) return null

    return <>{children}</>
}