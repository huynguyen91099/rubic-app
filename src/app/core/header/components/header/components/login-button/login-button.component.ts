import { ChangeDetectionStrategy, Component, Input, Injector, Inject } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { TuiAppearance } from '@taiga-ui/core';
import { ModalService } from '@app/core/modals/services/modal.service';

@Component({
  selector: 'app-login-button',
  templateUrl: './login-button.component.html',
  styleUrls: ['./login-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginButtonComponent {
  public currentUser$ = this.authService.currentUser$;

  @Input() appearance: TuiAppearance | string = 'primary';

  constructor(
    private readonly authService: AuthService,
    private readonly modalService: ModalService,
    @Inject(Injector) private readonly injector: Injector
  ) {}

  public showModal(): void {
    this.modalService.openWalletModal(this.injector).subscribe();
  }
}
