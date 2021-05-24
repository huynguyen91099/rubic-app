import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { List } from 'immutable';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { BridgeToken } from 'src/app/features/cross-chain-swaps-page/bridge-page/models/BridgeToken';
import { BridgeTrade } from 'src/app/features/cross-chain-swaps-page/bridge-page/models/BridgeTrade';
import { EthereumBinancePanamaBridgeProviderService } from './panama-bridge-provider/ethereum-binance-panama-bridge-provider.service';
import { EthereumBinanceRubicBridgeProviderService } from './rubic-bridge-provider/ethereum-binance-rubic-bridge-provider.service';
import { BlockchainsBridgeProvider } from '../blockchains-bridge-provider';

@Injectable()
export class EthereumBinanceBridgeProviderService extends BlockchainsBridgeProvider {
  constructor(
    private panamaBridgeProvider: EthereumBinancePanamaBridgeProviderService,
    private rubicBridgeProvider: EthereumBinanceRubicBridgeProviderService
  ) {
    super();
  }

  public getTokensList(): Observable<List<BridgeToken>> {
    const panamaTokensObservable = this.panamaBridgeProvider.getTokensList();
    const rubicTokenObservable = this.rubicBridgeProvider.getTokensList();
    return forkJoin([rubicTokenObservable, panamaTokensObservable]).pipe(
      map(([rubicToken, panamaTokens]) => {
        return rubicToken.concat(panamaTokens);
      })
    );
  }

  public getFee(token: BridgeToken, toBlockchain: BLOCKCHAIN_NAME): Observable<number> {
    if (token.symbol === 'RBC') {
      return this.rubicBridgeProvider.getFee(token, toBlockchain);
    }
    return this.panamaBridgeProvider.getFee(token, toBlockchain);
  }

  public createTrade(
    bridgeTrade: BridgeTrade,
    updateTransactionsList: () => Promise<void>
  ): Observable<string> {
    if (bridgeTrade.token.symbol === 'RBC') {
      return this.rubicBridgeProvider.createTrade(bridgeTrade, updateTransactionsList);
    }
    return this.panamaBridgeProvider.createTrade(bridgeTrade, updateTransactionsList);
  }
}