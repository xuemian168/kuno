import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { generatePageMetadata } from '@/lib/metadata-utils'
import { LLMsTxtManager } from '@/components/admin/llms-txt-manager'

interface PageProps {
  params: Promise<{
    locale: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  
  return await generatePageMetadata({
    locale,
    title: t('ai.llms_txt_manager'),
    description: t('ai.llms_txt_description'),
    robots: { index: false, follow: false } // Admin pages should not be indexed
  })
}

export default async function LLMsTxtPage({ params }: PageProps) {
  const { locale } = await params
  
  return (
    <div className="container mx-auto py-8 px-4">
      <LLMsTxtManager locale={locale} />
    </div>
  )
}