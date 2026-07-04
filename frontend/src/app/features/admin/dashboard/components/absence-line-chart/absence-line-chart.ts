import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

export interface AbsenceAnalyticsPoint {
  readonly label: string;
  readonly detail: string;
  readonly absent: number;
  readonly present: number;
  readonly open: number;
  readonly sessions: number;
  readonly rate: number;
}

interface ChartPoint extends AbsenceAnalyticsPoint {
  readonly index: number;
  readonly x: number;
  readonly labelX: number;
  readonly presentY: number;
  readonly absentY: number;
  readonly openY: number;
  readonly presentHeight: number;
  readonly absentHeight: number;
  readonly openHeight: number;
  readonly tooltipY: number;
  readonly isPeak: boolean;
}

interface AxisTick {
  readonly value: number;
  readonly y: number;
}

@Component({
  selector: 'app-absence-line-chart',
  templateUrl: './absence-line-chart.html',
  styleUrl: './absence-line-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbsenceLineChart {
  readonly points = input.required<readonly AbsenceAnalyticsPoint[]>();
  readonly expanded = input(false);
  readonly expandRequested = output<void>();

  readonly activePointIndex = signal<number | null>(null);

  readonly plotTop = 34;
  readonly plotBottom = computed(() => (this.expanded() ? 380 : 310));
  readonly xTickStart = computed(() => this.plotBottom() + 6);
  readonly xTickEnd = computed(() => this.plotBottom() + 14);
  readonly xLabelY = computed(() => this.plotBottom() + 40);
  readonly axisTitleX = 26;
  readonly axisTitleY = computed(() => this.plotTop + (this.plotBottom() - this.plotTop) / 2);
  readonly plotLeft = 126;
  readonly plotRight = 44;
  private readonly pointSpacing = 118;
  private readonly firstGroupOffset = 72;
  readonly barWidth = computed(() => (this.expanded() ? 24 : 21));
  readonly barGap = 6;

  readonly hasData = computed(() => this.points().some((point) => point.sessions > 0));
  readonly width = computed(() =>
    Math.max(
      this.expanded() ? 1240 : 1040,
      this.plotLeft + this.firstGroupOffset + this.plotRight + (this.points().length - 1) * this.pointSpacing + 96,
    ),
  );
  readonly height = computed(() => (this.expanded() ? 470 : 400));
  readonly yMax = computed(() =>
    this.niceMaximum(
      Math.max(
        0,
        ...this.points().flatMap((point) => [point.present, point.absent, point.open]),
      ),
    ),
  );
  readonly chartPoints = computed<readonly ChartPoint[]>(() => {
    const maximum = this.yMax();
    const peak = Math.max(0, ...this.points().map((point) => point.absent));
    const plotHeight = this.plotBottom() - this.plotTop;

    const barWidth = this.barWidth();
    return this.points().map((point, index) => ({
      ...point,
      index,
      x: this.plotLeft + this.firstGroupOffset + index * this.pointSpacing,
      labelX: this.plotLeft + this.firstGroupOffset + index * this.pointSpacing + barWidth / 2,
      presentY: this.plotBottom() - (point.present / maximum) * plotHeight,
      absentY: this.plotBottom() - (point.absent / maximum) * plotHeight,
      openY: this.plotBottom() - (point.open / maximum) * plotHeight,
      presentHeight: (point.present / maximum) * plotHeight,
      absentHeight: (point.absent / maximum) * plotHeight,
      openHeight: (point.open / maximum) * plotHeight,
      tooltipY: Math.min(
        this.plotBottom(),
        this.plotBottom() -
          (Math.max(point.present, point.absent, point.open) / maximum) * plotHeight,
      ),
      isPeak: point.absent === peak && peak > 0,
    }));
  });
  readonly yTicks = computed<readonly AxisTick[]>(() =>
    Array.from({ length: 5 }, (_, index) => {
      const value = (this.yMax() / 4) * index;
      return {
        value: Math.round(value),
        y: this.plotBottom() - (value / this.yMax()) * (this.plotBottom() - this.plotTop),
      };
    }).reverse(),
  );
  readonly activePoint = computed(() => {
    const index = this.activePointIndex();
    return index === null ? null : this.chartPoints()[index] ?? null;
  });
  readonly tooltipX = computed(() => {
    const point = this.activePoint();
    if (!point) {
      return 0;
    }
    return Math.min(Math.max(point.labelX - 110, this.plotLeft), this.width() - 230);
  });
  readonly tooltipY = computed(() => {
    const point = this.activePoint();
    return point ? Math.max(8, point.tooltipY - 96) : 0;
  });
  readonly labelStep = computed(() => Math.max(1, Math.ceil(this.points().length / (this.expanded() ? 18 : 12))));
  readonly accessibleSummary = computed(() => {
    const total = this.points().reduce((sum, point) => sum + point.absent, 0);
    const peak = this.chartPoints().find((point) => point.isPeak);
    return peak
      ? `${total} absence(s) sur cette période. Pic d’absences : ${peak.absent} le ${peak.detail}.`
      : 'Aucun pointage enregistré sur cette période.';
  });

  showPoint(index: number): void {
    this.activePointIndex.set(index);
  }

  hidePoint(index: number): void {
    if (this.activePointIndex() === index) {
      this.activePointIndex.set(null);
    }
  }

  shouldShowLabel(index: number): boolean {
    return index % this.labelStep() === 0 || index === this.points().length - 1;
  }

  requestExpand(): void {
    if (!this.expanded()) {
      this.expandRequested.emit();
    }
  }

  formatRate(rate: number): string {
    return `${Math.round(rate)}%`;
  }

  private niceMaximum(value: number): number {
    if (value <= 4) {
      return 4;
    }
    const magnitude = 10 ** Math.floor(Math.log10(value));
    return Math.ceil(value / magnitude) * magnitude;
  }
}
