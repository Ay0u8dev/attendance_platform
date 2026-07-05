import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="relative min-h-dvh overflow-hidden bg-background text-principalText">
      <div class="pointer-events-none absolute inset-0"></div>

      <div class="relative mx-auto grid min-h-dvh w-full max-w-7xl place-items-center px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section class="w-full max-w-xl">
          <router-outlet></router-outlet>
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {}
