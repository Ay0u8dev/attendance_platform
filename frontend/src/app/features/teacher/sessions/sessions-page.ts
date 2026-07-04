import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  AttendanceSessionResponse,
  AttendanceSessionSummary,
  AttendanceStudentStatus,
  AttendanceStudentView,
  TeacherAttendanceReportDto,
  TeacherAttendanceReportFiliereDto,
  TeacherAttendanceReportSessionDto,
  TeacherAttendanceReportStudentDto,
} from '../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../core/attendance/services/attendance.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { UserAvatar } from '../../../shared/components/user-avatar/user-avatar';

interface PendingChange {
  studentId: number;
  originalStatus: AttendanceStudentStatus;
  newStatus: 'PRESENT' | 'ABSENT';
}

interface XlsxCell {
  value: string;
  style?: number;
}

interface XlsxSheet {
  name: string;
  rows: XlsxCell[][];
}

interface ZipEntry {
  path: string;
  data: Uint8Array;
}

@Component({
  selector: 'app-teacher-sessions-page',
  standalone: true,
  imports: [DatePipe, PageHeader, RouterLink, StatusBadge, UserAvatar],
  templateUrl: './sessions-page.html',
  styleUrl: './sessions-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSessionsPage implements OnInit {
  private static readonly textEncoder = new TextEncoder();
  private static readonly crc32Table = TeacherSessionsPage.buildCrc32Table();

  private readonly attendanceService = inject(AttendanceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sessions = signal<AttendanceSessionSummary[]>([]);
  readonly loading = signal(false);
  readonly loadingDetails = signal(false);
  readonly updatingStudentId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly detailError = signal<string | null>(null);
  readonly totalElements = signal(0);
  readonly selectedSession = signal<AttendanceSessionResponse | null>(null);
  readonly originalSession = signal<AttendanceSessionResponse | null>(null);
  readonly pendingChanges = signal<PendingChange[]>([]);
  readonly isSaving = signal(false);
  readonly selectedSessionId = signal<number | null>(null); // Pour suivre la session sélectionnée
  readonly courseFilter = signal<string | null>(null);
  readonly exportLoading = signal(false);

  readonly filteredSessions = computed(() => {
    const filter = this.courseFilter();
    const allSessions = this.sessions();
    if (!filter) {
      return allSessions;
    }
    return allSessions.filter((session) => session.courseLabel === filter);
  });

  readonly finalizedCount = computed(
    () => this.sessions().filter((session) => session.status === 'FINALIZED').length,
  );

  readonly pendingChangesCount = computed(() => this.pendingChanges().length);

  readonly hasChanges = computed(() => this.pendingChanges().length > 0);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const filter = params['moduleName'] || null;
      this.courseFilter.set(filter);
    });
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading.set(true);
    this.error.set(null);

    this.attendanceService
      .getTeacherSessions({ page: 0, size: 20, sort: 'startedAt,desc' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.sessions.set(page.items);
          this.totalElements.set(page.totalElements);
        },
        error: () => this.error.set('Impossible de charger l historique des sessions.'),
      });
  }

  attendanceRate(session: AttendanceSessionSummary): number {
    const total = session.presentCount + session.absentCount + session.unknownCount;
    return total ? Math.round((session.presentCount / total) * 100) : 0;
  }

  sessionStatusLabel(session: AttendanceSessionSummary): string {
    return session.status === 'FINALIZED' ? 'Finalisee' : 'En cours';
  }

  sessionDateLabel(session: AttendanceSessionSummary): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(session.startedAt));
  }

  sessionTimeLabel(session: AttendanceSessionSummary): string {
    const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const start = timeFormatter.format(new Date(session.startedAt));
    if (!session.endedAt) {
      return start;
    }

    return `${start} - ${timeFormatter.format(new Date(session.endedAt))}`;
  }

  methodLabel(method: AttendanceSessionSummary['method']): string {
    switch (method) {
      case 'QR_CODE':
        return 'QR code';
      case 'FACE_ID':
        return 'Reconnaissance faciale';
      case 'MANUAL':
        return 'Manuel';
      default:
        return method;
    }
  }

  statusVariant(session: AttendanceSessionSummary): 'success' | 'warning' | 'info' {
    if (session.status === 'FINALIZED') return 'success';
    return 'warning';
  }

  resumeSessionRoute(session: AttendanceSessionResponse): string {

        return '/teacher/mark-attendance/start-session/qr-code-marking';

    
  }

  openDetails(session: AttendanceSessionSummary): void {
    this.loadingDetails.set(true);
    this.detailError.set(null);
    this.pendingChanges.set([]);
    this.originalSession.set(null);
    this.selectedSessionId.set(session.sessionId);

    this.attendanceService
      .getSession(session.sessionId)
      .pipe(finalize(() => this.loadingDetails.set(false)))
      .subscribe({
        next: (details) => {
          this.originalSession.set(JSON.parse(JSON.stringify(details)));
          this.selectedSession.set(details);
        },
        error: () => this.detailError.set('Impossible de charger les details de la session.'),
      });
  }

  closeDetails(): void {
    if (this.hasChanges()) {
      if (
        confirm('Des modifications sont en attente. Voulez-vous vraiment fermer sans sauvegarder ?')
      ) {
        this.resetModal();
      }
    } else {
      this.resetModal();
    }
  }

  clearFilter(): void {
    this.courseFilter.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { moduleName: null },
      queryParamsHandling: 'merge',
    });
  }

  private resetModal(): void {
    this.selectedSession.set(null);
    this.originalSession.set(null);
    this.pendingChanges.set([]);
    this.detailError.set(null);
    this.isSaving.set(false);
    this.selectedSessionId.set(null);
  }

  updateStudentStatus(student: AttendanceStudentView, status: 'PRESENT' | 'ABSENT'): void {
    const session = this.selectedSession();
    if (!session || student.status === status || this.isSaving()) {
      return;
    }

    // Mettre à jour localement
    const students = (session.students ?? []).map((entry) =>
      entry.studentId === student.studentId ? { ...entry, status } : entry,
    );

    this.selectedSession.set({
      ...session,
      students,
    });

    // Ajouter aux changements en attente
    const existingChangeIndex = this.pendingChanges().findIndex(
      (change) => change.studentId === student.studentId,
    );

    if (existingChangeIndex >= 0) {
      const changes = this.pendingChanges();
      changes[existingChangeIndex] = {
        ...changes[existingChangeIndex],
        newStatus: status,
      };
      this.pendingChanges.set([...changes]);
    } else {
      this.pendingChanges.set([
        ...this.pendingChanges(),
        {
          studentId: student.studentId,
          originalStatus: student.status,
          newStatus: status,
        },
      ]);
    }
  }

  cancelChanges(): void {
    const original = this.originalSession();
    if (original) {
      this.selectedSession.set(original);
      this.pendingChanges.set([]);
    }
    // Fermer la modale après annulation
    this.resetModal();
  }

  confirmChanges(): void {
    const session = this.selectedSession();
    const changes = this.pendingChanges();

    if (!session || changes.length === 0 || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.detailError.set(null);

    // Créer un tableau de promesses pour toutes les mises à jour
    const updatePromises = changes.map((change) => {
      return new Promise<void>((resolve, reject) => {
        this.attendanceService
          .updateAttendance(session.sessionId, {
            studentId: change.studentId,
            status: change.newStatus,
          })
          .subscribe({
            next: (response) => {
              // Mettre à jour la session avec la réponse
              const current = this.selectedSession();
              if (current) {
                const students = (current.students ?? []).map((entry) =>
                  entry.studentId === response.studentId
                    ? {
                        ...entry,
                        status: response.status,
                        markMethod: response.markMethod,
                        markedAt: response.markedAt,
                      }
                    : entry,
                );

                this.selectedSession.set({
                  ...current,
                  students,
                  presentCount: response.presentCount,
                  absentCount: response.absentCount,
                  unknownCount: response.unknownCount,
                });
              }
              resolve();
            },
            error: (error) => {
              reject(error);
            },
          });
      });
    });

    // Attendre que toutes les mises à jour soient terminées
    Promise.all(updatePromises)
      .then(() => {
        const updatedSession = this.selectedSession();
        if (updatedSession) {
          this.sessions.update((sessions) =>
            sessions.map((entry) =>
              entry.sessionId === updatedSession.sessionId
                ? {
                    ...entry,
                    presentCount: updatedSession.presentCount ?? 0,
                    absentCount: updatedSession.absentCount ?? 0,
                    unknownCount: updatedSession.unknownCount ?? 0,
                  }
                : entry,
            ),
          );
        }

        this.originalSession.set(JSON.parse(JSON.stringify(updatedSession)));
        this.pendingChanges.set([]);
        this.isSaving.set(false);

        // Fermer la modale après confirmation réussie
        this.resetModal();

        // Optionnel: afficher un message de succès
        // Vous pouvez ajouter un toast ou une notification ici
      })
      .catch((error) => {
        this.isSaving.set(false);
        this.detailError.set('Erreur lors de la sauvegarde des modifications. Veuillez réessayer.');
        console.error('Error saving changes:', error);
      });
  }

  studentStatusLabel(status: AttendanceStudentStatus): string {
    switch (status) {
      case 'PRESENT':
        return 'Present';
      case 'ABSENT':
        return 'Absent';
      case 'JUSTIFIED':
        return 'Justifie';
      default:
        return 'Inconnu';
    }
  }

  studentStatusVariant(
    status: AttendanceStudentStatus,
  ): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
    switch (status) {
      case 'PRESENT':
        return 'success';
      case 'ABSENT':
        return 'error';
      case 'JUSTIFIED':
        return 'info';
      default:
        return 'neutral';
    }
  }

  exportFullReport(): void {
    if (this.exportLoading()) {
      return;
    }

    this.exportLoading.set(true);
    this.error.set(null);

    this.attendanceService
      .getTeacherExportReport({ courseLabel: this.courseFilter() ?? undefined })
      .pipe(finalize(() => this.exportLoading.set(false)))
      .subscribe({
        next: (report) => {
          if (!report.filieres.length) {
            this.error.set('Aucune session finalisee a exporter.');
            return;
          }
          this.downloadReportWorkbook(report);
        },
        error: () => this.error.set('Impossible de generer le rapport de presence.'),
      });
  }

  private downloadReportWorkbook(report: TeacherAttendanceReportDto): void {
    const blob = this.buildXlsxBlob(report);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_presence_${this.fileDateLabel(report.generatedAt)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private buildXlsxBlob(report: TeacherAttendanceReportDto): Blob {
    const sheets = report.filieres.map((filiere) => this.toXlsxSheet(filiere));
    const entries = this.buildXlsxEntries(sheets);
    const zip = this.createZip(entries);
    const arrayBuffer = new ArrayBuffer(zip.byteLength);
    new Uint8Array(arrayBuffer).set(zip);
    return new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  private toXlsxSheet(filiere: TeacherAttendanceReportFiliereDto): XlsxSheet {
    const header = [
      'Code Apogée',
      'Nom',
      'Prénom',
      'Email',
      'Groupe',
      ...filiere.sessions.map((session) => this.sessionExportLabel(session)),
    ].map((value) => ({ value, style: 2 }));

    const rows: XlsxCell[][] = [
      [{ value: `Rapport de présence - ${filiere.filiere}`, style: 1 }],
      [{ value: `Généré le ${this.displayDateLabel(new Date())}` }],
      header,
      ...filiere.students.map((student) => this.toStudentReportRow(student, filiere.sessions)),
    ];

    return {
      name: this.sheetName(filiere.filiere),
      rows,
    };
  }

  private toStudentReportRow(
    student: TeacherAttendanceReportStudentDto,
    sessions: TeacherAttendanceReportSessionDto[],
  ): XlsxCell[] {
    const infoCells: XlsxCell[] = [
      { value: student.numApogee },
      { value: student.lastName },
      { value: student.firstName },
      { value: student.email },
      { value: student.groupeName || String(student.groupId || '') },
    ];

    const statusCells = sessions.map((session) => {
      const status = student.statusesBySessionId[String(session.sessionId)];
      return {
        value: this.reportStatusLabel(status),
        style: this.statusExportStyle(status),
      };
    });

    return [...infoCells, ...statusCells];
  }

  private sessionExportLabel(session: TeacherAttendanceReportSessionDto): string {
    return `${session.courseLabel} - ${this.displayDateLabel(new Date(session.startedAt))}`;
  }

  private reportStatusLabel(status: AttendanceStudentStatus | undefined): string {
    switch (status) {
      case 'PRESENT':
        return 'Présent';
      case 'ABSENT':
        return 'Absent';
      case 'JUSTIFIED':
        return 'Justifié';
      case 'UNKNOWN':
        return 'Inconnu';
      default:
        return '';
    }
  }

  private statusExportStyle(status: AttendanceStudentStatus | undefined): number | undefined {
    switch (status) {
      case 'PRESENT':
        return 3;
      case 'ABSENT':
        return 4;
      case 'JUSTIFIED':
        return 5;
      case 'UNKNOWN':
        return 6;
      default:
        return undefined;
    }
  }

  private buildXlsxEntries(sheets: XlsxSheet[]): ZipEntry[] {
    return [
      {
        path: '[Content_Types].xml',
        data: this.encodeXml(this.contentTypesXml(sheets.length)),
      },
      {
        path: '_rels/.rels',
        data: this.encodeXml(this.rootRelsXml()),
      },
      {
        path: 'xl/workbook.xml',
        data: this.encodeXml(this.workbookXml(sheets)),
      },
      {
        path: 'xl/_rels/workbook.xml.rels',
        data: this.encodeXml(this.workbookRelsXml(sheets.length)),
      },
      {
        path: 'xl/styles.xml',
        data: this.encodeXml(this.stylesXml()),
      },
      ...sheets.map((sheet, index) => ({
        path: `xl/worksheets/sheet${index + 1}.xml`,
        data: this.encodeXml(this.worksheetXml(sheet)),
      })),
    ];
  }

  private contentTypesXml(sheetCount: number): string {
    const sheetOverrides = Array.from({ length: sheetCount }, (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    ).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`;
  }

  private rootRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  }

  private workbookXml(sheets: XlsxSheet[]): string {
    const sheetEntries = sheets
      .map(
        (sheet, index) =>
          `<sheet name="${this.escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetEntries}</sheets>
</workbook>`;
  }

  private workbookRelsXml(sheetCount: number): string {
    const sheetRels = Array.from({ length: sheetCount }, (_, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    ).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  private stylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><color rgb="FF173B78"/><sz val="16"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF173B78"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="0" xfId="0" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  }

  private worksheetXml(sheet: XlsxSheet): string {
    const maxColumns = Math.max(...sheet.rows.map((row) => row.length), 1);
    const dimension = `A1:${this.columnName(maxColumns)}${Math.max(sheet.rows.length, 1)}`;
    const rows = sheet.rows
      .map((row, rowIndex) => {
        const rowNumber = rowIndex + 1;
        const cells = row
          .map((cell, columnIndex) => this.cellXml(cell, `${this.columnName(columnIndex + 1)}${rowNumber}`))
          .join('');
        return `<row r="${rowNumber}">${cells}</row>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>${rows}</sheetData>
</worksheet>`;
  }

  private cellXml(cell: XlsxCell, reference: string): string {
    const style = cell.style !== undefined ? ` s="${cell.style}"` : '';
    return `<c r="${reference}" t="inlineStr"${style}><is><t>${this.escapeXml(cell.value)}</t></is></c>`;
  }

  private createZip(entries: ZipEntry[]): Uint8Array {
    const centralDirectory: Uint8Array[] = [];
    const localParts: Uint8Array[] = [];
    let offset = 0;

    for (const entry of entries) {
      const fileName = TeacherSessionsPage.textEncoder.encode(entry.path);
      const crc = this.crc32(entry.data);
      const localHeader = this.localFileHeader(fileName, crc, entry.data.length);
      const centralHeader = this.centralDirectoryHeader(fileName, crc, entry.data.length, offset);

      localParts.push(localHeader, entry.data);
      centralDirectory.push(centralHeader);
      offset += localHeader.length + entry.data.length;
    }

    const centralDirectorySize = centralDirectory.reduce((sum, part) => sum + part.length, 0);
    const endRecord = this.endCentralDirectoryRecord(entries.length, centralDirectorySize, offset);

    return this.concatUint8Arrays([...localParts, ...centralDirectory, endRecord]);
  }

  private localFileHeader(fileName: Uint8Array, crc: number, size: number): Uint8Array {
    const header = new Uint8Array(30 + fileName.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, fileName.length, true);
    view.setUint16(28, 0, true);
    header.set(fileName, 30);
    return header;
  }

  private centralDirectoryHeader(
    fileName: Uint8Array,
    crc: number,
    size: number,
    localHeaderOffset: number,
  ): Uint8Array {
    const header = new Uint8Array(46 + fileName.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, fileName.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, localHeaderOffset, true);
    header.set(fileName, 46);
    return header;
  }

  private endCentralDirectoryRecord(
    entryCount: number,
    centralDirectorySize: number,
    centralDirectoryOffset: number,
  ): Uint8Array {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, entryCount, true);
    view.setUint16(10, entryCount, true);
    view.setUint32(12, centralDirectorySize, true);
    view.setUint32(16, centralDirectoryOffset, true);
    view.setUint16(20, 0, true);
    return record;
  }

  private crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc = (crc >>> 8) ^ TeacherSessionsPage.crc32Table[(crc ^ byte) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private static buildCrc32Table(): Uint32Array {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let crc = i;
      for (let j = 0; j < 8; j++) {
        crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
      }
      table[i] = crc >>> 0;
    }
    return table;
  }

  private concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      output.set(part, offset);
      offset += part.length;
    }
    return output;
  }

  private encodeXml(xml: string): Uint8Array {
    return TeacherSessionsPage.textEncoder.encode(xml);
  }

  private columnName(column: number): string {
    let value = '';
    let index = column;
    while (index > 0) {
      const remainder = (index - 1) % 26;
      value = String.fromCharCode(65 + remainder) + value;
      index = Math.floor((index - 1) / 26);
    }
    return value;
  }

  private displayDateLabel(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private fileDateLabel(value: string): string {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  }

  private sheetName(value: string): string {
    const cleaned = (value || 'Sans filiere').replace(/[:\\/?*\[\]]/g, ' ').trim();
    return (cleaned || 'Sans filiere').slice(0, 31);
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
