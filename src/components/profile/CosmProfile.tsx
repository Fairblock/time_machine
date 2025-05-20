'use client';

import { useAccount, useDisconnect } from 'graz';

export function CosmProfile() {
  const { data: account } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <section className="w-full bg-gray-100 rounded-xl p-4 shadow">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-700">
          <p className="font-medium">Connected Wallet:</p>
          <p className="text-xs break-all">{account?.bech32Address}</p>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg"
        >
          Disconnect
        </button>
      </div>
    </section>
  );
}
