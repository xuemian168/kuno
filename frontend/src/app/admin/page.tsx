'use client'

import { useEffect } from 'react'
import { redirect } from 'next/navigation'

export default function AdminPage() {
  useEffect(() => {
    // Redirect to locale-aware admin page
    redirect('/zh/admin')
  }, [])

  return null
}