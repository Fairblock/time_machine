import { defineChainInfo } from 'graz';

import { PUBLIC_ENVIRONMENT } from './env';

export const fairyring = defineChainInfo({
  chainId: PUBLIC_ENVIRONMENT.NEXT_PUBLIC_CHAIN_ID,
  currencies: [
    {
      coinDenom: 'fairy',
      coinMinimalDenom: 'ufairy',
      coinDecimals: 6,
      coinGeckoId: 'fairy',
    },
  ],
  rest: PUBLIC_ENVIRONMENT.NEXT_PUBLIC_COSMOS_API_URL,
  rpc: PUBLIC_ENVIRONMENT.NEXT_PUBLIC_TENDERMINT_URL,
  bech32Config: {
    bech32PrefixAccAddr: 'fairy',
    bech32PrefixAccPub: 'fairypub',
    bech32PrefixValAddr: 'fairyvaloper',
    bech32PrefixValPub: 'fairyvaloperpub',
    bech32PrefixConsAddr: 'fairyvalcons',
    bech32PrefixConsPub: 'fairyvalconspub',
  },
  chainName: 'Fairblock FairyRing Testnet',
  feeCurrencies: [
    {
      coinDenom: 'fairy',
      coinMinimalDenom: 'ufairy',
      coinDecimals: 6,
      coinGeckoId: 'fairy',
    },
  ],
  stakeCurrency: {
    coinDenom: 'fairy',
    coinMinimalDenom: 'ufairy',
    coinDecimals: 6,
    coinGeckoId: 'fairy',
  },
  bip44: {
    coinType: 118,
  },
});

export const stargaze = defineChainInfo({
  chainId: 'stargaze-1',
  currencies: [
    {
      coinDenom: 'stars',
      coinMinimalDenom: 'ustars',
      coinDecimals: 6,
      coinGeckoId: 'stargaze',
    },
    {
      coinDenom: 'strdst',
      coinMinimalDenom: 'factory/stars16da2uus9zrsy83h23ur42v3lglg5rmyrpqnju4/dust',
      coinDecimals: 6,
      coinGeckoId: '',
    },
    {
      coinDenom: 'GAZE',
      coinMinimalDenom: 'factory/stars16da2uus9zrsy83h23ur42v3lglg5rmyrpqnju4/mGAZE',
      coinDecimals: 6,
      coinGeckoId: '',
    },
    {
      coinDenom: 'BRNCH',
      coinMinimalDenom: 'factory/stars16da2uus9zrsy83h23ur42v3lglg5rmyrpqnju4/uBRNCH',
      coinDecimals: 6,
      coinGeckoId: '',
    },
    {
      coinDenom: 'OHH',
      coinMinimalDenom: 'factory/stars16da2uus9zrsy83h23ur42v3lglg5rmyrpqnju4/uOHH',
      coinDecimals: 6,
      coinGeckoId: '',
    },
    {
      coinDenom: 'sneaky',
      coinMinimalDenom: 'factory/stars1xx5976njvxpl9n4v8huvff6cudhx7yuu8e7rt4/usneaky',
      coinDecimals: 6,
      coinGeckoId: '',
    },
    {
      coinDenom: 'LAB',
      coinMinimalDenom: 'ibc/93B1AE0AD5E88242745B245064A2A51DDA1319C18176A966D5F8F9E02ED5373E',
      coinDecimals: 6,
    },
    {
      coinDenom: 'CDT',
      coinMinimalDenom: 'ibc/B0263C28B6F44651F4596413B41FDB749EA010BD1220816DAC0ABF9947C1E806',
      coinDecimals: 6,
    },
    {
      coinDenom: 'MBRN',
      coinMinimalDenom: 'ibc/E94BB144B818CB8061F43E202BEA1E9273B87D6326C8C6F4E6AE71C62FD37854',
      coinDecimals: 6,
    },
  ],
  rest: 'https://rest.stargaze-apis.com/',
  rpc: 'https://rpc.stargaze-apis.com/',
  bech32Config: {
    bech32PrefixAccAddr: 'stars',
    bech32PrefixAccPub: 'starspub',
    bech32PrefixValAddr: 'starsvaloper',
    bech32PrefixValPub: 'starsvaloperpub',
    bech32PrefixConsAddr: 'starsvalcons',
    bech32PrefixConsPub: 'starsvalconspub',
  },
  chainName: 'stargaze',
  feeCurrencies: [
    {
      coinDenom: 'stars',
      coinMinimalDenom: 'ustars',
      coinDecimals: 6,
      coinGeckoId: 'stargaze',
      gasPriceStep: {
        low: 1,
        average: 1.1,
        high: 1.2,
      },
    },
  ],
  stakeCurrency: {
    coinDenom: 'stars',
    coinMinimalDenom: 'ustars',
    coinDecimals: 6,
    coinGeckoId: 'stargaze',
  },
  bip44: {
    coinType: 118,
  },
});
