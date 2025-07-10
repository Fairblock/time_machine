import ClientLayout from "@/app/ClientLayout";
import "./globals.css";
import { HowItWorksProvider } from "@/contexts/HowItWorksContext";
// import Header from '@/components/header/Header';
// import { useActiveToken } from '@/hooks/useActiveToken';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // const { data: active } = useActiveToken();
  return (
    <html lang="en">
      <head>
        {/* load Inter from Google */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
        />
      </head>
      <body className="font-neue">
        {/* <Header /> */}
        <HowItWorksProvider>
          <ClientLayout>{children}</ClientLayout>
        </HowItWorksProvider>
      </body>
    </html>
  );
}
