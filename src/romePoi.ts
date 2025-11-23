export type Poi = {
  id: string;
  name: string;
  category: string;
  neighborhood: string;
  themes: string[];
  mapQuery?: string;
};

export const romePoi: Poi[] = [
  { id:"piazza-venezia", name:"Piazza Venezia", category:"square", neighborhood:"Centro Storico", themes:["urban","landmark","central"] },
  { id:"via-del-corso", name:"Via del Corso", category:"street", neighborhood:"Centro Storico", themes:["shopping","central"] },
  { id:"trevi-fountain", name:"Trevi Fountain", category:"fountain", neighborhood:"Centro Storico", themes:["baroque","must-see"] },
  { id:"spanish-steps", name:"Spanish Steps", category:"monument", neighborhood:"Spagna", themes:["baroque","viewpoint"] },
  { id:"piazza-del-popolo", name:"Piazza del Popolo", category:"square", neighborhood:"Flaminio", themes:["neoclassical","landmark"] },
  { id:"pincio-terrace", name:"Pincio Terrace", category:"viewpoint", neighborhood:"Villa Borghese", themes:["viewpoint","park"] },
  { id:"villa-borghese", name:"Villa Borghese", category:"park", neighborhood:"Villa Borghese", themes:["park","relax"] },
  { id:"colosseum", name:"Colosseum", category:"ancient-site", neighborhood:"Colosseo", themes:["ancient","must-see"] },
  { id:"monti", name:"Monti District", category:"neighborhood", neighborhood:"Monti", themes:["hip","hidden-gem","food"] },
  { id:"via-dei-serpenti", name:"Via dei Serpenti", category:"street", neighborhood:"Monti", themes:["local","food"] },
  { id:"villa-aldobrandini", name:"Villa Aldobrandini", category:"garden", neighborhood:"Monti", themes:["park","relax"], mapQuery: "Villa Aldobrandini, Via Mazzarino 11, 00184 Roma RM, Italy", },
  { id:"santa-maria-maggiore", name:"Basilica di Santa Maria Maggiore", category:"church", neighborhood:"Esquilino", themes:["basilica","historic"] },
  { id:"piazza-navona", name:"Piazza Navona", category:"square", neighborhood:"Navona", themes:["baroque","landmark"] },
  { id:"chiostro-bramante", name:"Chiostro del Bramante", category:"museum", neighborhood:"Navona", themes:["renaissance","art"] },
  { id:"via-dei-coronari", name:"Via dei Coronari", category:"street", neighborhood:"Navona", themes:["antiques","hidden-gem"] },
  { id:"sant-ignazio", name:"Sant’Ignazio di Loyola", category:"church", neighborhood:"Centro Storico", themes:["baroque","ceiling"] },
  { id:"pantheon", name:"Pantheon", category:"ancient-site", neighborhood:"Centro Storico", themes:["ancient","architecture"] },
  { id:"castel-sant-angelo", name:"Castel Sant’Angelo", category:"fortress", neighborhood:"Vatican area", themes:["castle","viewpoint"] },
  { id:"st-peters", name:"St. Peter’s Basilica", category:"basilica", neighborhood:"Vatican", themes:["basilica","must-see"] },
  { id:"campo-de-fiori", name:"Campo de’ Fiori", category:"market", neighborhood:"Centro", themes:["market","food"] },
  { id:"jewish-ghetto", name:"Jewish Ghetto", category:"district", neighborhood:"Centro", themes:["historic","food"] },
  { id:"trastevere", name:"Trastevere", category:"district", neighborhood:"Trastevere", themes:["medieval","food","nightlife"] },
  { id:"capitoline-museums", name:"Capitoline Museums", category:"museum", neighborhood:"Campidoglio", themes:["museum","ancient"] },
  { id:"circus-maximus", name:"Circus Maximus", category:"ancient-site", neighborhood:"Aventino", themes:["ancient","walk"] }
];
