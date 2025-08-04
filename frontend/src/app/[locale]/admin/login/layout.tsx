import { generateBasicMetadata } from '@/lib/metadata-utils'

export async function generateMetadata() {
  return generateBasicMetadata({
    title: 'Admin Login',
    description: 'Admin login for content management'
  })
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}