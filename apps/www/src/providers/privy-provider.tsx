'use client';

import React from 'react';

import { PrivyProvider } from '@privy-io/react-auth';

import { env } from '~/env';

export const PrivyAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <PrivyProvider
      appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#0A0A0A',
          logo: undefined,
          showWalletLoginFirst: true,
        },
        loginMethods: ['wallet', 'email'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
};
