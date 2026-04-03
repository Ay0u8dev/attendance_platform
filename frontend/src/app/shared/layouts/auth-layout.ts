import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-background text-principalText">
      <div
        class="mx-auto flex min-h-screen max-w-6xl flex-col justify-center items-center gap-10 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:px-8 lg:py-10"
      >
        <section class="w-full max-w-xl lg:max-w-lg">
          <router-outlet></router-outlet>
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {}
