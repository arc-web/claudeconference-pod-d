import './globals.css'

export const metadata = {
  title: 'People App',
  description: 'Manage people and notes',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
