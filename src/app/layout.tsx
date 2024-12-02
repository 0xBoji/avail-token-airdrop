'use client';

import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../config/wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import { ThemeProvider } from "@/components/theme-provider"
import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientProvider client={queryClient}>
            <WagmiConfig config={wagmiConfig}>
              <RainbowKitProvider>
                <div className="relative flex min-h-screen flex-col">
                  <div className="flex-1">{children}</div>
                </div>
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 5000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      theme: {
                        primary: '#4aed88',
                      },
                    },
                    error: {
                      duration: 4000,
                      theme: {
                        primary: '#ff4b4b',
                      },
                    },
                    className: '',
                    style: {
                      background: '#363636',
                      color: '#fff',
                      padding: '16px',
                      borderRadius: '8px',
                    },
                  }} 
                />
              </RainbowKitProvider>
            </WagmiConfig>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
