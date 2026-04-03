import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="relative min-h-screen overflow-hidden bg-background text-principalText">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-48 bg-linear-to-r from-primary-soft via-background to-secondary-soft opacity-90"></div>

      <div
        class="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:px-8 lg:py-10"
      >
        <section class="hidden flex-1 lg:flex">
          <div
            class="flex w-full max-w-xl flex-col justify-between rounded-[2rem] bg-linear-to-br from-primary to-primary-strong p-8 text-white shadow-shell"
          >
            <div class="space-y-4">
              <span
                class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.22em]"
              >
                ENIAD attendance
              </span>

              <div class="space-y-3">
                <h1 class="text-4xl font-semibold tracking-tight">
                  Une interface calme, claire et prete pour l'administration.
                </h1>
                <p class="max-w-lg text-sm leading-7 text-white/78">
                  Suivez les presences, traitez les justificatifs et gardez une vue propre sur les alertes sans surcharge visuelle.
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-white/12 bg-white/10 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-white/60">Navigation</p>
                <p class="mt-2 text-sm font-medium">Sidebar compacte, reperes nets.</p>
              </div>
              <div class="rounded-2xl border border-white/12 bg-white/10 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-white/60">Palette</p>
                <p class="mt-2 text-sm font-medium">Bleu institutionnel, teal de validation.</p>
              </div>
              <div class="rounded-2xl border border-white/12 bg-white/10 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-white/60">Usage</p>
                <p class="mt-2 text-sm font-medium">Lisible sur desktop et mobile.</p>
              </div>
            </div>
          </div>
        </section>

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
