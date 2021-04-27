import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import BigNumber from 'bignumber.js';
import { environment } from '../../../../../environments/environment';
import { HttpService } from '../../http/http.service';
import { BLOCKCHAIN_NAME } from '../../../../shared/models/blockchain/BLOCKCHAIN_NAME';
import { BridgeTrade } from '../../../../features/bridge-page/models/BridgeTrade';
import {
  BridgeTableTrade,
  BridgeTableTradeApi
} from '../../../../features/bridge-page/models/BridgeTableTrade';
import { TRADE_STATUS } from './models/TRADE_STATUS';

@Injectable({
  providedIn: 'root'
})
export class BridgeApiService {
  private readonly tradeBlockchain = {
    ETH: BLOCKCHAIN_NAME.ETHEREUM,
    BSC: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
    POL: BLOCKCHAIN_NAME.POLYGON
  };

  private readonly tradeStatus = {
    'Deposit in progress': TRADE_STATUS.DEPOSIT_IN_PROGRESS,
    'Withdraw in progress': TRADE_STATUS.WITHDRAW_IN_PROGRESS,
    'Waiting for deposit': TRADE_STATUS.WAITING_FOR_DEPOSIT,
    Completed: TRADE_STATUS.COMPLETED,
    Cancelled: TRADE_STATUS.CANCELLED
  };

  constructor(private httpService: HttpService, private httpClient: HttpClient) {}

  public getTransactions(walletAddress: string): Promise<BridgeTableTrade[]> {
    return new Promise<BridgeTableTrade[]>((resolve, reject) => {
      this.httpService
        .get('bridge/transactions', { walletAddress: walletAddress.toLowerCase(), t: Date.now() })
        .subscribe(
          (tradesApi: BridgeTableTradeApi[]) => {
            resolve(tradesApi.map(trade => this.parseBridgeTableTrade(trade)));
          },
          error => {
            console.error(error);
            reject(error);
          }
        );
    });
  }

  private parseBridgeTableTrade(trade: BridgeTableTradeApi): BridgeTableTrade {
    const fromBlockchain = this.tradeBlockchain[trade.fromNetwork];
    const toBlockchain = this.tradeBlockchain[trade.toNetwork];

    return {
      status: this.tradeStatus[trade.status],
      statusCode: trade.code,
      fromBlockchain,
      toBlockchain,
      fromAmount: new BigNumber(trade.actualFromAmount).toFixed(),
      toAmount: new BigNumber(trade.actualToAmount).toFixed(),
      fromSymbol: trade.ethSymbol,
      toSymbol: trade.bscSymbol,
      updateTime: trade.updateTime,
      transactionHash: trade.transaction_id,
      tokenImage: trade.image_link
    };
  }

  public postPanamaTransaction(
    binanceTransactionId: string,
    ethSymbol: string,
    bscSymbol: string
  ): Promise<void> {
    const body = {
      type: 'panama',
      transaction_id: binanceTransactionId,
      ethSymbol,
      bscSymbol
    };

    return new Promise<void>((resolve, reject) => {
      this.httpService.post('bridge/transactions', body).subscribe(
        () => {
          resolve();
        },
        error => {
          console.error(error);
          reject(error);
        }
      );
    });
  }

  public postRubicTransaction(
    fromBlockchain: BLOCKCHAIN_NAME,
    transactionHash: string,
    fromAmount: string,
    walletFromAddress: string
  ): Promise<void> {
    const body = {
      type: 'swap_rbc',
      fromNetwork: fromBlockchain === BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN ? 1 : 2,
      transaction_id: transactionHash,
      fromAmount,
      walletFromAddress
    };

    return new Promise<void>((resolve, reject) => {
      this.httpService.post('bridge/transactions', body).subscribe(
        () => {
          resolve();
        },
        error => {
          console.error(error);
          reject(error);
        }
      );
    });
  }

  public postPolygonTransaction(
    bridgeTrade: BridgeTrade,
    status: TRADE_STATUS,
    transactionHash: string,
    userAddress: string
  ): Promise<void> {
    const body = {
      type: 'polygon',
      fromNetwork: bridgeTrade.fromBlockchain === BLOCKCHAIN_NAME.POLYGON ? 'POL' : 'ETH',
      toNetwork: bridgeTrade.toBlockchain === BLOCKCHAIN_NAME.POLYGON ? 'POL' : 'ETH',
      actualFromAmount: bridgeTrade.amount,
      actualToAmount: bridgeTrade.amount,
      ethSymbol: bridgeTrade.token.blockchainToken[bridgeTrade.fromBlockchain].address,
      bscSymbol: bridgeTrade.token.blockchainToken[bridgeTrade.toBlockchain].address,
      updateTime: new Date(),
      status,
      transaction_id: transactionHash,
      walletFromAddress: userAddress,
      walletToAddress: userAddress,
      walletDepositAddress: '0xBbD7cBFA79faee899Eaf900F13C9065bF03B1A74'
    };

    return new Promise<void>((resolve, reject) => {
      this.httpService.post('bridge/transactions', body).subscribe(
        () => {
          resolve();
        },
        error => {
          console.error(error);
          reject(error);
        }
      );
    });
  }

  public patchPolygonTransaction(
    burnTransactionHash: string,
    newTransactionHash: string,
    status: TRADE_STATUS
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.httpService
        .patch(
          'bridge/transactions',
          {
            second_transaction_id: newTransactionHash,
            status
          },
          {
            transaction_id: burnTransactionHash
          }
        )
        .subscribe(resolve, error => {
          console.error(error);
          reject(error);
        });
    });
  }

  public notifyBridgeBot(
    bridgeTrade: BridgeTrade,
    transactionHash: string,
    walletAddress: string
  ): Promise<void> {
    const body = {
      track: transactionHash,
      walletAddress,
      amount: bridgeTrade.amount,
      fromBlockchain: bridgeTrade.fromBlockchain,
      toBlockchain: bridgeTrade.toBlockchain,
      symbol: bridgeTrade.token.symbol,
      ethSymbol: bridgeTrade.token.blockchainToken[BLOCKCHAIN_NAME.ETHEREUM].symbol
    };

    return new Promise<void>((resolve, reject) => {
      this.httpClient.post(environment.bridgeBotUrl, body).subscribe(
        () => {
          resolve();
        },
        error => {
          console.error(error);
          reject(error);
        }
      );
    });
  }
}
