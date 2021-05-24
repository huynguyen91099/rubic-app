import { BLOCKCHAIN_NAME } from '../../../../shared/models/blockchain/BLOCKCHAIN_NAME';

export interface Blockchain {
  name: BLOCKCHAIN_NAME;
  code: number;
  label: string;
  image: string;
}

export const BLOCKCHAINS = [
  {
    name: BLOCKCHAIN_NAME.ETHEREUM,
    code: 22,
    label: 'Ethereum',
    image: 'assets/images/icons/coins/eth-contrast.svg'
  },
  {
    name: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
    code: 22,
    label: 'Binance Smart Chain',
    image: 'assets/images/icons/coins/bnb.svg'
  },
  {
    name: BLOCKCHAIN_NAME.POLYGON,
    code: 22,
    label: 'Polygon',
    image: 'assets/images/icons/coins/polygon-contrast.svg'
  }
] as Blockchain[];