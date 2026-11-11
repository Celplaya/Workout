// The training plan (calisthenics + cardio) as reference text, shown under
// Instellingen → Trainingsplan. The week schedule itself lives in program.ts.

export interface PlanSection {
  title: string;
  intro?: string;
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
  note?: string;
}

export const PLAN_TITLE = 'Calisthenics + cardiovasculaire fitness';

export const PLAN: PlanSection[] = [
  {
    title: 'Hoofddoelen',
    bullets: [
      'Calisthenics-kracht behouden en verder ontwikkelen.',
      'Cardiovasculaire gezondheid verbeteren.',
      'Aerobe capaciteit en VO2 max verhogen.',
      'Conditie opbouwen voor hardlopen en wandelen/hiken.',
      'HRV stabiel en gebalanceerd houden.',
      'Voldoende herstel tussen trainingen.',
    ],
    note: 'Op termijn: 4× calisthenics, 2× cardio en 1–2 rustdagen per week.',
  },
  {
    title: 'Weekplanning',
    table: {
      head: ['Dag', 'Training'],
      rows: [
        ['Maandag', 'Upper A + Zone 2'],
        ['Dinsdag', 'Lower A'],
        ['Woensdag', 'Rust (mobility optioneel)'],
        ['Donderdag', 'Upper B'],
        ['Vrijdag', 'Lower B'],
        ['Zaterdag', 'Rust / eventueel werk'],
        ['Zondag', 'Rust'],
      ],
    },
    note: 'De tweede cardiosessie komt later op donderdag, liefst een paar uur gescheiden van de krachttraining.',
  },
  {
    title: 'Calisthenics',
    bullets: [
      'Upper A, Upper B, Lower A en Lower B blijven zoals ze zijn.',
      'Skilltraining blijft: handstand, planche- en muscle-up-progressies.',
      'Niet elke sessie maximaal: houd meestal 1–2 herhalingen in reserve.',
      'Voorlopig geen extra beenvolume.',
      'Het supermarktwerk telt mee in je totale belasting.',
    ],
  },
  {
    title: 'Zone 2 op de loopband',
    intro: 'Garmin Forerunner 955, activiteit Indoor Walk / Walking, in je persoonlijke Garmin zone 2.',
    table: {
      head: ['Periode', 'Per week', 'Duur', 'Helling'],
      rows: [
        ['Week 1–2', '1×', '20 min', '3–5%'],
        ['Week 3–4', '2×', '20–25 + 15–20 min', '5–7%'],
        ['Week 5–6', '2×', '25–30 + 20–25 min', '6–8%'],
        ['Week 7–8', '2×', '30–40 + 20–25 min', '8–10%'],
      ],
    },
    bullets: [
      'Begin met 5 minuten rustig wandelen.',
      'Start op ± 4–5 km/u en pas snelheid en helling aan om in zone 2 te blijven.',
      'Houd de leuning niet vast.',
      'Sluit af met 3–5 minuten rustig wandelen; wandelpauzes mogen.',
    ],
    note: 'Richtwaarden, geen verplichte doelen: je hartslag is leidend. Verhoog niet tegelijk snelheid, helling en duur.',
  },
  {
    title: 'Garmin instellen',
    bullets: [
      'Controleer je persoonlijke hartslagzones en de grenzen van zone 2.',
      'Hartslagalert op de onder- en bovengrens van zone 2.',
      'Datascherm: hartslag, verstreken tijd, gemiddelde hartslag en hartslagzone.',
      'Noteer helling en snelheid eventueel zelf.',
    ],
  },
  {
    title: 'Intervallen (latere fase)',
    intro: 'Na ± 6–8 weken consistente Zone 2 kan één rustige sessie een Norwegian 4×4 worden.',
    bullets: [
      '10 minuten warming-up.',
      '4 minuten intensief, 3 minuten actief herstel; 4 keer.',
      '5 minuten cooling-down.',
      'Opbouwen richting 85–95% van je maximale hartslag. Niet sprinten.',
    ],
    note: '4×4 vervangt een Zone 2-sessie en komt er niet bovenop. Alleen als herstel, HRV en prestaties goed blijven, en niet met onherstelde benen.',
  },
  {
    title: 'Herstel en HRV',
    intro: 'Dagelijks in Garmin: HRV-status en 7-daagse trend, rusthartslag, slaap, Body Battery, vermoeidheid en spierpijn, en je calisthenics-prestaties.',
    bullets: [
      'HRV balanced en goed geslapen: normaal trainen.',
      'Eén dag unbalanced: in de gaten houden, geen paniek.',
      'Meerdere dagen unbalanced: belasting omlaag en herstel beoordelen.',
      'Hogere rusthartslag en aanhoudende vermoeidheid: intensiteit omlaag of rust.',
    ],
    note: 'HRV zegt iets over herstel, niet direct over je conditie.',
  },
  {
    title: 'Principes',
    bullets: [
      'Consistentie boven intensiteit.',
      'Zone 2 blijft de basis van de cardio.',
      'Calisthenics-kracht behouden en progressief ontwikkelen.',
      'Hardlopen en incline walking geleidelijk introduceren.',
      'Geen onnodige trainingsbelasting toevoegen.',
      'Supermarktwerk meetellen.',
      'Herstel en HRV monitoren.',
      'Het schema aanpassen als herstel structureel verslechtert.',
    ],
  },
];
