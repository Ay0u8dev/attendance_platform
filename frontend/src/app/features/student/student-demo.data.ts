export type StudentModuleSummary = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly attendanceRate: number;
  readonly missedSessions: number;
  readonly footerNote: string;
  readonly variant: 'default' | 'warning' | 'success';
  readonly icon: string;
};

export type StudentProfile = {
  readonly program: string;
  readonly group: string;
  readonly lastLogin: string;
};

export type StudentSessionRow = {
  readonly id: string;
  readonly date: string;
  readonly time: string;
  readonly module: string;
  readonly teacher: string;
  readonly attendanceStatus: 'Présent' | 'Absent' | 'Retard';
  readonly attendanceVariant: 'success' | 'error' | 'warning';
  readonly justificationStatus: 'Aucune' | 'En attente' | 'Acceptée' | 'Refusée';
  readonly justificationVariant: 'neutral' | 'warning' | 'success' | 'error';
  readonly campus: string;
  readonly sessionType: string;
  readonly markedAt: string;
  readonly attendanceNote: string;
  readonly room: string;
};

export type StudentJustificationRow = {
  readonly id: string;
  readonly submittedAt: string;
  readonly module: string;
  readonly sessionSlot: string;
  readonly status: 'En attente' | 'Acceptée' | 'Refusée';
  readonly statusVariant: 'warning' | 'success' | 'error';
  readonly attachmentName: string;
  readonly reason: string;
};

export type StudentJustificationDetail = {
  readonly id: string;
  readonly status: 'En attente' | 'Acceptée' | 'Refusée';
  readonly statusVariant: 'warning' | 'success' | 'error';
  readonly studentName: string;
  readonly studentEmail: string;
  readonly studentProgram: string;
  readonly sessionModule: string;
  readonly sessionDate: string;
  readonly sessionSlot: string;
  readonly teacher: string;
  readonly reason: string;
  readonly attachmentName: string;
  readonly adminComment: string;
  readonly history: readonly {
    title: string;
    description: string;
    meta: string;
    state: 'done' | 'current' | 'upcoming';
  }[];
};

export const STUDENT_MODULES: readonly StudentModuleSummary[] = [
  {
    id: 'algo',
    title: 'Algorithmique',
    subtitle: 'Semestre 3',
    attendanceRate: 74,
    missedSessions: 5,
    footerNote: 'Priorité de suivi',
    variant: 'warning',
    icon: 'fa-solid fa-triangle-exclamation',
  },
  {
    id: 'analyse',
    title: 'Analyse',
    subtitle: 'Semestre 3',
    attendanceRate: 93,
    missedSessions: 1,
    footerNote: 'Situation stable',
    variant: 'success',
    icon: 'fa-solid fa-chart-line',
  },
  {
    id: 'physique',
    title: 'Physique',
    subtitle: 'Semestre 3',
    attendanceRate: 88,
    missedSessions: 2,
    footerNote: 'Restez régulier',
    variant: 'default',
    icon: 'fa-solid fa-atom',
  },
  {
    id: 'anglais',
    title: 'Anglais',
    subtitle: 'Semestre 3',
    attendanceRate: 96,
    missedSessions: 0,
    footerNote: 'Excellente assiduité',
    variant: 'success',
    icon: 'fa-solid fa-language',
  },
];

export const STUDENT_PROFILE: StudentProfile = {
  program: 'GI',
  group: 'A',
  lastLogin: "Aujourd'hui, 08:45",
};

export const STUDENT_SESSIONS: readonly StudentSessionRow[] = [
  {
    id: 'session-001',
    date: '12 Oct. 2023',
    time: '14:00 - 16:00',
    module: 'Algorithmique',
    teacher: 'Pr. Benali',
    attendanceStatus: 'Absent',
    attendanceVariant: 'error',
    justificationStatus: 'En attente',
    justificationVariant: 'warning',
    campus: 'Bloc A',
    sessionType: 'Cours magistral',
    markedAt: '12 Oct. 2023 • 16:04',
    attendanceNote: 'Absence confirmée après clôture de l’appel.',
    room: 'Amphi A2',
  },
  {
    id: 'session-002',
    date: '10 Oct. 2023',
    time: '08:00 - 10:00',
    module: 'Analyse',
    teacher: 'Pr. El Mansouri',
    attendanceStatus: 'Présent',
    attendanceVariant: 'success',
    justificationStatus: 'Aucune',
    justificationVariant: 'neutral',
    campus: 'Bloc B',
    sessionType: 'Travaux dirigés',
    markedAt: '10 Oct. 2023 • 10:02',
    attendanceNote: 'Présence validée sans anomalie.',
    room: 'Salle B14',
  },
  {
    id: 'session-003',
    date: '05 Oct. 2023',
    time: '10:00 - 12:00',
    module: 'Physique',
    teacher: 'Pr. Tazi',
    attendanceStatus: 'Retard',
    attendanceVariant: 'warning',
    justificationStatus: 'Aucune',
    justificationVariant: 'neutral',
    campus: 'Laboratoire 2',
    sessionType: 'Travaux pratiques',
    markedAt: '05 Oct. 2023 • 12:01',
    attendanceNote: 'Pointage tardif enregistré par l’enseignant.',
    room: 'Laboratoire 2',
  },
  {
    id: 'session-004',
    date: '03 Oct. 2023',
    time: '13:00 - 15:00',
    module: 'Anglais',
    teacher: 'Mme Rahimi',
    attendanceStatus: 'Absent',
    attendanceVariant: 'error',
    justificationStatus: 'Acceptée',
    justificationVariant: 'success',
    campus: 'Salle 18',
    sessionType: 'Cours magistral',
    markedAt: '03 Oct. 2023 • 15:08',
    attendanceNote: 'Absence régularisée après validation du justificatif.',
    room: 'Salle 18',
  },
  {
    id: 'session-005',
    date: '29 Sep. 2023',
    time: '09:00 - 11:00',
    module: 'Algorithmique',
    teacher: 'Pr. Benali',
    attendanceStatus: 'Présent',
    attendanceVariant: 'success',
    justificationStatus: 'Aucune',
    justificationVariant: 'neutral',
    campus: 'Bloc A',
    sessionType: 'Cours magistral',
    markedAt: '29 Sep. 2023 • 11:03',
    attendanceNote: 'Présence enregistrée en début de séance.',
    room: 'Amphi A2',
  },
  {
    id: 'session-006',
    date: '26 Sep. 2023',
    time: '15:00 - 17:00',
    module: 'Réseaux',
    teacher: 'Pr. Amrani',
    attendanceStatus: 'Absent',
    attendanceVariant: 'error',
    justificationStatus: 'Refusée',
    justificationVariant: 'error',
    campus: 'Salle 09',
    sessionType: 'Travaux dirigés',
    markedAt: '26 Sep. 2023 • 17:06',
    attendanceNote: 'Justificatif rejeté, absence maintenue.',
    room: 'Salle 09',
  },
];

export const STUDENT_JUSTIFICATIONS: readonly StudentJustificationRow[] = [
  {
    id: 'just-001',
    submittedAt: '13 Oct. 2023',
    module: 'Algorithmique',
    sessionSlot: '12 Oct. 2023 • 14:00 - 16:00',
    status: 'En attente',
    statusVariant: 'warning',
    attachmentName: 'certificat-medical.pdf',
    reason: 'Consultation médicale urgente',
  },
  {
    id: 'just-002',
    submittedAt: '04 Oct. 2023',
    module: 'Anglais',
    sessionSlot: '03 Oct. 2023 • 13:00 - 15:00',
    status: 'Acceptée',
    statusVariant: 'success',
    attachmentName: 'convocation.pdf',
    reason: 'Convocation administrative',
  },
  {
    id: 'just-003',
    submittedAt: '27 Sep. 2023',
    module: 'Réseaux',
    sessionSlot: '26 Sep. 2023 • 15:00 - 17:00',
    status: 'Refusée',
    statusVariant: 'error',
    attachmentName: 'capture-ecran.jpg',
    reason: 'Justificatif insuffisant',
  },
];

export const STUDENT_JUSTIFICATION_DETAILS: readonly StudentJustificationDetail[] = [
  {
    id: 'just-001',
    status: 'En attente',
    statusVariant: 'warning',
    studentName: 'Mariam Fahim',
    studentEmail: 'mariam.fahim@ump.ac.ma',
    studentProgram: 'Génie logiciel - Groupe 02',
    sessionModule: 'Algorithmique',
    sessionDate: '12 Oct. 2023',
    sessionSlot: '14:00 - 16:00',
    teacher: 'Pr. Benali',
    reason: 'Consultation médicale urgente suite à un malaise le matin de la séance.',
    attachmentName: 'certificat-medical.pdf',
    adminComment: 'Votre dossier est en cours de vérification par la scolarité.',
    history: [
      {
        title: 'Justification soumise',
        description: 'Votre demande a bien été enregistrée avec la pièce jointe.',
        meta: '13 Oct. 2023 • 08:42',
        state: 'done',
      },
      {
        title: 'Analyse par l’administration',
        description: 'Le justificatif est en cours de revue.',
        meta: 'Statut actuel',
        state: 'current',
      },
      {
        title: 'Décision finale',
        description: 'La décision sera notifiée après validation.',
        meta: 'À venir',
        state: 'upcoming',
      },
    ],
  },
  {
    id: 'just-002',
    status: 'Acceptée',
    statusVariant: 'success',
    studentName: 'Mariam Fahim',
    studentEmail: 'mariam.fahim@ump.ac.ma',
    studentProgram: 'Génie logiciel - Groupe 02',
    sessionModule: 'Anglais',
    sessionDate: '03 Oct. 2023',
    sessionSlot: '13:00 - 15:00',
    teacher: 'Mme Rahimi',
    reason: 'Absence liée à une convocation administrative universitaire.',
    attachmentName: 'convocation.pdf',
    adminComment: 'Justificatif validé. L’absence a été régularisée.',
    history: [
      {
        title: 'Justification soumise',
        description: 'La demande a été transmise avec le document demandé.',
        meta: '04 Oct. 2023 • 09:15',
        state: 'done',
      },
      {
        title: 'Analyse terminée',
        description: 'Le service administratif a vérifié la cohérence des éléments.',
        meta: '05 Oct. 2023 • 11:20',
        state: 'done',
      },
      {
        title: 'Justification acceptée',
        description: 'L’absence ne sera pas comptabilisée contre vous.',
        meta: 'Décision finale',
        state: 'current',
      },
    ],
  },
  {
    id: 'just-003',
    status: 'Refusée',
    statusVariant: 'error',
    studentName: 'Mariam Fahim',
    studentEmail: 'mariam.fahim@ump.ac.ma',
    studentProgram: 'Génie logiciel - Groupe 02',
    sessionModule: 'Réseaux',
    sessionDate: '26 Sep. 2023',
    sessionSlot: '15:00 - 17:00',
    teacher: 'Pr. Amrani',
    reason: 'Absence signalée sans document officiel recevable.',
    attachmentName: 'capture-ecran.jpg',
    adminComment: 'Le document fourni ne permet pas de justifier l’absence.',
    history: [
      {
        title: 'Justification soumise',
        description: 'Votre demande a été déposée avec une pièce jointe.',
        meta: '27 Sep. 2023 • 18:03',
        state: 'done',
      },
      {
        title: 'Analyse par l’administration',
        description: 'Le service a constaté l’insuffisance du justificatif.',
        meta: '28 Sep. 2023 • 09:40',
        state: 'done',
      },
      {
        title: 'Justification refusée',
        description: 'Vous pouvez déposer un dossier plus complet si nécessaire.',
        meta: 'Décision finale',
        state: 'current',
      },
    ],
  },
];

export function getStudentJustificationDetail(
  id: string,
): StudentJustificationDetail | undefined {
  return STUDENT_JUSTIFICATION_DETAILS.find((item) => item.id === id);
}
