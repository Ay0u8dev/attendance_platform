import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="relative min-h-screen overflow-hidden bg-background text-principalText">
      <div class="pointer-events-none absolute inset-0 bg- "></div>

      <div
        class="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:px-8 lg:py-10"
      >
        <section class="w-full max-w-xl lg:flex lg:flex-1 lg:items-center lg:justify-end">
          <div class="w-full lg:max-w-lg">
            <router-outlet></router-outlet>
          </div>
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {}
