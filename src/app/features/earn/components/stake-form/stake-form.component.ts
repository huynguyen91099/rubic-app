import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorsService } from '@app/core/errors/errors.service';
import { ERROR_TYPE } from '@app/core/errors/models/error-type';
import { RubicError } from '@app/core/errors/models/rubic-error';
import { WalletsModalService } from '@app/core/wallets/services/wallets-modal.service';
import { FormControl } from '@ngneat/reactive-forms';
import { watch } from '@taiga-ui/cdk';
import BigNumber from 'bignumber.js';
import {
  tap,
  zip,
  of,
  debounceTime,
  map,
  switchMap,
  startWith,
  from,
  catchError,
  withLatestFrom
} from 'rxjs';
import { StakingService } from '../../services/staking.service';
import { StakeError } from '../stake-button/stake-button.component';

const MONTH_MILLISECONDS = 2592000000;
// const MONTH_SECONDS = 2592000;

@Component({
  selector: 'app-stake-form',
  templateUrl: './stake-form.component.html',
  styleUrls: ['./stake-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StakeFormComponent implements OnInit {
  public readonly DURATIONS = [
    { value: 1, label: '1M' },
    { value: 6, label: '6M' },
    { value: 12, label: '12M' }
  ];

  public readonly rbcTokenBalance$ = this.stakingService.rbcTokenBalance$;

  public readonly durationSliderCtrl = new FormControl(6);

  public readonly rbcAmountCtrl = new FormControl(null);

  public readonly rbcAmount$ = this.rbcAmountCtrl.valueChanges.pipe(
    map(value => {
      if (value) {
        return new BigNumber(String(value).split(',').join(''));
      } else {
        return new BigNumber(NaN);
      }
    })
  );

  public readonly rbcAllowance$ = this.stakingService.rbcAllowance$;

  public readonly usdAmount$ = this.rbcAmount$.pipe(
    debounceTime(500),
    switchMap((amount: BigNumber) => this.stakingService.getRbcAmountPrice(amount)),
    map(amount => amount.toNumber())
  );

  public readonly needLogin$ = this.stakingService.needLogin$;

  public readonly needSwitchNetwork$ = this.stakingService.needSwitchNetwork$;

  public approveLoading = false;

  public stakeLoading = false;

  public unlockDate: number;

  public selectedDuration: number = 6;

  public needApprove$ = this.rbcAllowance$.pipe(
    tap(v => console.log(v, 'allowance')),
    map(allowance => {
      console.log(allowance?.lt(10000000));
      return allowance?.lt(10000000);
    })
  );

  public error: StakeError = StakeError.EMPTY_AMOUNT;

  constructor(
    private readonly stakingService: StakingService,
    private readonly router: Router,
    private readonly walletsModalService: WalletsModalService,
    private readonly errorsService: ErrorsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.durationSliderCtrl.valueChanges
      .pipe(
        startWith(this.durationSliderCtrl.value),
        switchMap(duration => {
          return zip(of(duration), this.stakingService.getCurrentTimeInSeconds());
        }),
        tap(([duration, timestamp]) => {
          this.selectedDuration = duration;
          this.unlockDate =
            ((timestamp * 1000 + duration * MONTH_MILLISECONDS) / MONTH_MILLISECONDS) *
            MONTH_MILLISECONDS;
        }),
        watch(this.cdr)
      )
      .subscribe();

    this.checkErr();
  }

  public setMaxAmount(amount: BigNumber): void {
    this.rbcAmountCtrl.patchValue(amount.toFixed(2));
  }

  public checkErr(): void {
    this.rbcAmount$
      .pipe(
        startWith(this.rbcAmountCtrl.value),
        withLatestFrom(this.rbcTokenBalance$),
        map(([rbcAmount, rbcTokenBalance]) => {
          return this.checkErrors(rbcAmount, rbcTokenBalance);
        })
      )
      .subscribe(error => {
        this.error = error;
      });
  }

  public setDuration(duration: number): void {
    this.durationSliderCtrl.patchValue(duration);
  }

  public login(): void {
    this.walletsModalService.open().subscribe();
  }

  public async switchNetwork(): Promise<void> {
    this.stakingService.switchNetwork();
  }

  private checkErrors(rbcAmount: BigNumber, rbcTokenBalance: BigNumber): StakeError {
    if (!rbcAmount || !rbcAmount.toNumber()) {
      return StakeError.EMPTY_AMOUNT;
    }

    if (rbcTokenBalance.lt(rbcAmount)) {
      return StakeError.INSUFFICIENT_BALANCE_RBC;
    }

    if (rbcAmount.lt(10)) {
      return StakeError.LESS_THEN_MINIMUM;
    }

    return StakeError.NULL;
  }

  public approve(): void {
    this.approveLoading = true;
    from(this.stakingService.approveRbc())
      .pipe(
        catchError((error: unknown) => {
          this.errorsService.catch(error as RubicError<ERROR_TYPE.TEXT>);
          return of(null);
        })
      )
      .subscribe(receipt => {
        this.approveLoading = false;

        if (receipt && receipt.status) {
          this.stakingService.showSuccessApproveNotification();
          this.stakingService.setAllowance('Infinity');
        }

        this.cdr.detectChanges();
      });
  }

  public stake(): void {
    this.stakeLoading = true;
    const duration = this.durationSliderCtrl.value;
    const amount = this.rbcAmountCtrl.value;

    from(this.stakingService.stake(amount, duration))
      .pipe(
        catchError((error: unknown) => {
          this.errorsService.catchAnyError(error as RubicError<ERROR_TYPE.TEXT>);
          return of(null);
        }),
        switchMap(() => {
          this.stakeLoading = false;
          return this.stakingService.getRbcTokenBalance();
        }),
        watch(this.cdr)
      )
      .subscribe(() => {
        this.stakeLoading = false;
      });
  }

  public back(): void {
    this.router.navigate(['/staking-lp']);
  }
}
