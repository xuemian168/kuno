import { Metadata } from 'next'
import { ContentAssistantManager } from '@/components/admin/content-assistant-manager'

export const metadata: Metadata = {
  title: 'Content Assistant - Admin',
  description: 'AI-powered content creation and optimization tools',
}

export default function ContentAssistantPage() {
  return (
    <div className="container mx-auto py-6">
      <ContentAssistantManager />
    </div>
  )
}