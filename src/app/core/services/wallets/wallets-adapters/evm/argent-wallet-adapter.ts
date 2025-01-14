import { BehaviorSubject } from 'rxjs';
import { ErrorsService } from '@core/errors/errors.service';
import { WALLET_NAME } from '@core/wallets-modal/components/wallets-modal/models/wallet-name';
import { NgZone } from '@angular/core';
import { BlockchainName, BlockchainsInfo, EvmBlockchainName } from 'rubic-sdk';
import { RubicWindow } from '@shared/utils/rubic-window';
import { WalletConnectAbstractAdapter } from '@core/services/wallets/wallets-adapters/evm/common/wallet-connect-abstract';
import { WalletlinkError } from '@core/errors/models/provider/walletlink-error';

export class ArgentWalletAdapter extends WalletConnectAbstractAdapter {
  public readonly walletName = WALLET_NAME.ARGENT;

  constructor(
    onAddressChanges$: BehaviorSubject<string>,
    onNetworkChanges$: BehaviorSubject<BlockchainName | null>,
    errorsService: ErrorsService,
    zone: NgZone,
    window: RubicWindow
  ) {
    const providerConfig = {
      bridge: 'https://bridge.walletconnect.org',
      qrCode: true,
      qrcodeModalOptions: {
        desktopLinks: ['argent'],
        mobileLinks: ['argent']
      }
    };
    super(providerConfig, onAddressChanges$, onNetworkChanges$, errorsService, zone, window);
  }

  public async activate(): Promise<void> {
    this.setArgentStyle(10);
    this.setArgentStyle(300);
    this.setArgentStyle(1000);

    try {
      const result = await Promise.race([
        this.wallet.enable(),
        new Promise<void>(resolve => setTimeout(() => resolve(null), 10_000))
      ]);
      if (result !== null) {
        const [address] = await this.wallet.enable();

        this.isEnabled = true;
        this.selectedAddress = address;
        this.selectedChain =
          (BlockchainsInfo.getBlockchainNameById(this.wallet.chainId) as EvmBlockchainName) ?? null;
        this.onAddressChanges$.next(address);
        this.onNetworkChanges$.next(this.selectedChain);

        this.initSubscriptionsOnChanges();
      } else {
        this.window.location.reload();
      }
    } catch (error) {
      throw new WalletlinkError();
    }
  }

  private setArgentStyle(timeout: number): void {
    setTimeout(() => {
      try {
        const walletConnectorWrapper = this.window.document.querySelector('#walletconnect-wrapper');
        const header = walletConnectorWrapper.querySelector('.walletconnect-modal__header');

        const title = header.querySelector('p');
        if (title.innerHTML !== 'Connect the Argent Wallet') {
          title.innerHTML = 'Connect the Argent Wallet';
        } else {
          return;
        }

        const image = header.querySelector('img') as HTMLImageElement;
        image.src = `${this.window.origin}/assets/images/icons/wallets/argent.svg`;

        const description = walletConnectorWrapper.querySelector('#walletconnect-qrcode-text');
        description.innerHTML = 'Scan QR code with the Argent wallet';
      } catch {}
    }, timeout);
  }
}
