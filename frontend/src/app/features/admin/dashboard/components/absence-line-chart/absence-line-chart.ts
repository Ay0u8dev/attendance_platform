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
  readonly y: number;
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

  readonly plotTop = 28;
  readonly plotBottom = computed(() => (this.expanded() ? 312 : 252));
  readonly xTickStart = computed(() => this.plotBottom() + 6);
  readonly xTickEnd = computed(() => this.plotBottom() + 12);
  readonly xLabelY = computed(() => this.plotBottom() + 32);
  private readonly plotLeft = 58;
  private readonly plotRight = 30;
  private readonly pointSpacing = 76;

  readonly hasData = computed(() => this.points().some((point) => point.absent > 0));
  readonly width = computed(() =>
    Math.max(this.expanded() ? 1120 : 900, this.plotLeft + this.plotRight + (this.points().length - 1) * this.pointSpacing),
  );
  readonly height = computed(() => (this.expanded() ? 390 : 340));
  readonly yMax = computed(() => this.niceMaximum(Math.max(0, ...this.points().map((point) => point.absent))));
  readonly chartPoints = computed<readonly ChartPoint[]>(() => {
    const maximum = this.yMax();
    const peak = Math.max(0, ...this.points().map((point) => point.absent));

    return this.points().map((point, index) => ({
      ...point,
      index,
      x: this.plotLeft + index * this.pointSpacing,
      y: this.plotBottom() - (point.absent / maximum) * (this.plotBottom() - this.plotTop),
      isPeak: point.absent === peak && peak > 0,
    }));
  });
  readonly linePath = computed(() => this.buildLinePath(this.chartPoints()));
  readonly areaPath = computed(() => {
    const points = this.chartPoints();
    if (!points.length) {
      return '';
    }
    return `${this.linePath()} L ${points.at(-1)?.x ?? this.plotLeft} ${this.plotBottom()} L ${points[0].x} ${this.plotBottom()} Z`;
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
    return Math.min(Math.max(point.x - 105, this.plotLeft), this.width() - 230);
  });
  readonly tooltipY = computed(() => {
    const point = this.activePoint();
    return point ? Math.max(8, point.y - 92) : 0;
  });
  readonly labelStep = computed(() => Math.max(1, Math.ceil(this.points().length / (this.expanded() ? 18 : 12))));
  readonly accessibleSummary = computed(() => {
    const total = this.points().reduce((sum, point) => sum + point.absent, 0);
    const peak = this.chartPoints().find((point) => point.isPeak);
    return peak
      ? `${total} absences in this period. Highest point: ${peak.absent} on ${peak.detail}.`
      : 'No absences recorded in this period.';
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

  private buildLinePath(points: readonly ChartPoint[]): string {
    if (!points.length) {
      return '';
    }
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    return points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }

      const previous = points[index - 1];
      const controlOffset = (point.x - previous.x) * 0.42;
      return `${path} C ${previous.x + controlOffset} ${previous.y}, ${point.x - controlOffset} ${point.y}, ${point.x} ${point.y}`;
    }, '');
  }

  private niceMaximum(value: number): number {
    if (value <= 4) {
      return 4;
    }
    const magnitude = 10 ** Math.floor(Math.log10(value));
    return Math.ceil(value / magnitude) * magnitude;
  }
}
