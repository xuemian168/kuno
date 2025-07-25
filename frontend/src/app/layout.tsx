// This file only provides fallback routing for the root locale
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // With next-intl locale routing, this layout should not include html/body tags
  // The actual HTML structure is handled by [locale]/layout.tsx
  return children
}
