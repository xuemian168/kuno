"use client"

import { useState, useEffect } from "react"
import { SettingsForm } from "@/components/admin/settings-form"

interface SettingsPageProps {
  params: Promise<{ locale: string }>
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const [locale, setLocale] = useState<string>('zh')

  useEffect(() => {
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  return <SettingsForm locale={locale} />
}