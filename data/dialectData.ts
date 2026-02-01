import { DialectItem, DialectGroup } from '../types/dialect';

export const dialectGroups: DialectGroup[] = [
  {
    id: 'oriental',
    name: 'Bloc Oriental',
    description: 'Inclou: rossellonès, insular o baleàric, central, alguerès.',
    characteristics: [
      'Confusió a i e àtones en vocal neutra: casa = pare.',
      'Neutralització de o i u àtones en [u]: cosir (pronunciat \'cusí\'), surar (pronunciat \'surà\')',
      'La e tancada provinent del llatí vulgar es pronuncia amb e oberta: ceba.',
      'En el grup ix entre vocals no es pronuncia la i: caixa, coix.',
      'Verbs incoatius amb -eix- en el present d\'indicatiu, el present de subjuntiu i l\'imperatiu: serveix, serveixi…',
      'Desinència -u, -i, -ø a la 1a persona del present d\'indicatiu: canto (\'cantu\'), canti, cant.',
      'Els plurals d\'antics esdrúixols acabats amb -n perden la nasal: orfe > orfes.',
      'Formes reforçades dels pronoms personals febles: em, ens, et, us, en.',
      'Lèxic específic: mirall, noi, xai…'
    ]
  },
  {
    id: 'occidental',
    name: 'Bloc Occidental',
    description: 'Inclou: nord-occidental o lleidatà i meridional o valencià.',
    characteristics: [
      'Distinció a, e àtones: casa, pare…',
      'Distinció o, u àtones: cosir, surar…',
      'La e tancada provinent del llatí vulgar es pronuncia e tancada: ceba.',
      'Pronúncia de la i en el grup ix entre vocals.',
      'Verbs incoatius amb -ix- en el present d\'indicatiu, el present de subjuntiu i l\'imperatiu: servix, servisca, servixa.',
      'Desinència -o o -e a la 1a persona del present d\'indicatiu: canto, cante.',
      'Els plurals d\'antics esdrúixols acabats amb -n mantenen la nasal: orfe > òrfens.',
      'Formes plenes dels pronoms personals febles: me, mos, te, vos, se, ne.',
      'Lèxic específic: espill, xic, corder…'
    ]
  }
];

export const dialectItems: DialectItem[] = [
  {
    id: 'rossellones',
    name: 'Rossellonès',
    group: 'oriental',
    description: 'Parlat al Rosselló (Catalunya Nord)',
    characteristics: [
      'Vocalisme tònic de cinc fonemes: vi, bé, va, cor, curt.',
      'Supressió de la vocal neutra en la terminació -ia (com en el baleàric): prudenci (prudència), gabi (gàbia), famili (família), esbergini (albergínia)',
      'Inexistència de mots esdrúixols: musica, botanica, parabola…',
      'Tancament de o tònica en u: cançú (cançó), minyuna (minyona)…',
      'Caiguda de la -d a genre, tenre, venre, divenres…',
      'Desinència -i en la 1a persona del present d\'indicatiu: canti.',
      'Construcció d\'oracions negatives amb pas i sense l\'adverbi no: ho sap pas (= no ho sap (pas)).',
      'Ús de l\'auxiliar ser/ésser per a alguns verbs intransitius: s\'és tallat un dit (s\'ha tallat un dit), som vingut (he vingut)…',
      'Gal·licismes lèxics i sintàctics: roba (vestit), muleta (truita), presque (quasi), d\'abord (en primer lloc)…',
      'Lèxic propi: trefugir (neguitejar), oliu (olivera), pallago (noi), ca (gos), estela (estrella)…',
      'Plurals dels mots aguts sense -n-: mà > mas, camí > camís…'
    ],
    examples: [
      { dialectText: 'Jo canti una cançú', standardText: 'Jo canto una cançó', isPronunciation: true },
      { dialectText: 'La famili és a casa', standardText: 'La família és a casa', isPronunciation: true },
      { dialectText: 'Ho sap pas', standardText: 'No ho sap' },
      { dialectText: 'Som vingut del mercat', standardText: 'He vingut del mercat' }
    ]
  },
  {
    id: 'central',
    name: 'Central',
    group: 'oriental',
    description: 'Parlat a la regió central de Catalunya',
    characteristics: [
      'Iodització o ieisme en pronúncies com paia, ceia, ui, vui. Aquest fenomen no és compartit en algunes comarques (Barcelonès, Baix Llobregat, Anoia…), tot i que el mantenen en alguns mots: uial, ceia, vui, assoleiat…',
      'Alternança de l\'article el/en: el Joan / en Joan.',
      'Primera persona del present d\'indicatiu pronunciada amb u final: canto (\'cantu\'), penso (\'pensu\').',
      'Absència de -ns en plurals (excepte en tarragoní): homes, joves, orfes…',
      'Pèrdua del diftong (en algunes comarques) en pronúncies com aiga, dugues, llenga, paraiga…',
      'Lèxic específic: mandra, cargol (també caragol), cartró…'
    ],
    examples: [
      { dialectText: 'Tinc mandra d\'anar a buscar un cargol', standardText: 'Tinc peresa d\'anar a buscar un caragol' },
      { dialectText: 'En Joan ha vingut', standardText: 'El Joan ha vingut' },
      { dialectText: 'Jo cantu cada dia', standardText: 'Jo canto cada dia' }
    ]
  },
  {
    id: 'algueres',
    name: 'Alguerès',
    group: 'oriental',
    description: 'Parlat a l\'Alguer (Sardenya)',
    characteristics: [
      'Neutralització de a/e àtones en a.',
      'Substitució de r seguida d\'altres consonants per l: jalmana (germana), malç (març), talda (tarda)…',
      'Confusió de -d- i -l- entre vocals en -r-: farrí (fadrí), perra (pedra), jarara (gelada), ururar (olorar), Naral (Nadal), burell (budell)…',
      'Manca de palatalització final -ll, -ny: gal (gall), col (coll), janul (genoll), fil (fill), jun (juny), astan (estany)…',
      'Articles lo, la, amb diferències en alguns gèneres: la gel, la dolor, la sabor…',
      'Lèxic propi: calça (mitja), forqueta (forquilla), morro (llavi)…'
    ],
    examples: [
      { dialectText: 'Lo gal canta al matí', standardText: 'El gall canta al matí' },
      { dialectText: 'La jalmana té una perra', standardText: 'La germana té una pedra' },
      { dialectText: 'Era un bon farrí', standardText: 'Era un bon fadrí' }
    ]
  },
  {
    id: 'baleari',
    name: 'Baleàric',
    group: 'oriental',
    description: 'Parlat a les Illes Balears',
    characteristics: [
      'Realització de vocal neutra tònica: abéia, cadéna…',
      'Conversió dels diftongs gua i qua a go i co: llengo, aigo, pasco…',
      'Desaparició de la -a del grup -ia: famili, histori, graci…',
      'Tonicitat dels pronoms àtons: dur-hó.',
      'Iodització: veia (vella), fuia (fulla)…',
      'Manca de desinència en la primera persona del present d\'indicatiu: cant, pens…',
      'Formes com: jo cantàs (cantés), noltros cantam, voltros cantau…',
      'Article salat: sa casa, s\'al·lot…',
      'Formes plenes dels pronoms: me, mos…',
      'Lèxic propi: al·lot, capell (barret), granera (escombra), torcar (fregar), calces (mitges), ver (veritat)…'
    ],
    examples: [
      { dialectText: 'S\'al·lot beu aigo', standardText: 'El noi beu aigua', isPronunciation: true },
      { dialectText: 'Noltros cantam a sa casa', standardText: 'Nosaltres cantem a la casa' },
      { dialectText: 'Jo pens que sa histori és vera', standardText: 'Jo penso que la història és veritat', isPronunciation: true }
    ]
  },
  {
    id: 'valencia',
    name: 'Valencià',
    group: 'occidental',
    description: 'Parlat al País Valencià',
    characteristics: [
      'Articulació de la e àtona inicial com a a: antendre, ancendre…',
      'Caiguda de la -d- intervocàlica: aixà (aixada), mocaor, teulà…',
      'Possessius femenins amb u en comptes de v: meua, meues; teua, teues; seua, seues.',
      'Tres localitzacions per als demostratius: este, eixe, aquell.',
      'Forma única del numeral dos per al masculí i per al femení.',
      'Formes verbals: jo cante (canto), poguera, jo aní (vaig anar), diguí, nàixer…',
      'Combinacions pronominals específiques: li la donaré (la hi donaré), li\'l portaré (l\'hi portaré)…',
      'Sensibilització de la -r i la -t finals: pensar, eixir, cent, sant…',
      'Lèxic propi: prompte (aviat), xic (noi), bou (toro), llevar (treure alguna cosa), orellals (arracades), escurar (rentar els plats)…'
    ],
    examples: [
      { dialectText: 'El xic porta un mocaor', standardText: 'El noi porta un mocador' },
      { dialectText: 'La meua casa és esta', standardText: 'La meva casa és aquesta' },
      { dialectText: 'Jo cante i tu balles', standardText: 'Jo canto i tu balles' }
    ]
  },
  {
    id: 'nordoccidental',
    name: 'Nord-occidental',
    group: 'occidental',
    description: 'Parlat a Lleida i comarques properes',
    characteristics: [
      'Tancament de la e en i: ginoll, siroll; articulació de la e àtona inicial com a a: antendre, ancendre…',
      'Diftongació de la o- àtona inicial: auliva (oliva), aufegar (ofegar)…',
      'Ús d\'articles determinats masculins lo i los: lo pare, lo Joan, los regals…',
      'Forma única del numeral dos per al masculí i per al femení.',
      'Formes verbals: (que) jo canto, (que) tu cantos (subjuntiu), creguessa, cantaia…',
      'Sufix -eiar: barreiar (barrejar), me\'n vai a festeiar (me\'n vaig a festejar).',
      'Conversió de -ig en -i: roi (roig), pui (puig)…',
      'Ús de la forma les per al masculí plural: les cavalls.',
      'Demostratius: aguet, aguest (el tortosí fa este, esta, estos, estes).',
      'Lèxic propi: bajoca (mongeta), despús-demà (demà passat), mançana (poma), panís (blat de moro), padrí i padrina (avi i àvia)…'
    ],
    examples: [
      { dialectText: 'Lo padrí menja bajoques', standardText: 'L\'avi menja mongetes', isPronunciation: true },
      { dialectText: 'Me\'n vai a festeiar despús-demà', standardText: 'Me\'n vaig a festejar demà passat' },
      { dialectText: 'Aguet panís és de les cavalls', standardText: 'Aquest blat de moro és dels cavalls' }
    ]
  }
];

export function getDialectsForGroup(groupId: string): DialectItem[] {
  return dialectItems.filter(item => item.group === groupId);
}

export function getAllDialects(): DialectItem[] {
  return dialectItems;
}

export function getDialectById(id: string): DialectItem | undefined {
  return dialectItems.find(item => item.id === id);
}

export function getDialectGroupById(id: string): DialectGroup | undefined {
  return dialectGroups.find(group => group.id === id);
}

export function getRandomDialectItems(count: number): DialectItem[] {
  // Create a copy to avoid modifying the original array
  const shuffled = [...dialectItems];
  
  // Shuffle the array
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return the first 'count' items or all if count > shuffled.length
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
