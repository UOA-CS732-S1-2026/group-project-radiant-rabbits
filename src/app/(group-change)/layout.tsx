export default function GroupChangeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Group-selection screens own their full-page layout so they can be shown
  // before a current group exists and without the authenticated app chrome.
  return <main className="min-h-screen">{children}</main>;
}
