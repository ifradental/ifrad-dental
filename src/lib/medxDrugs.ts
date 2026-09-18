// MedX & Comprehensive Bangladesh National Pharmaceutical Drug Database (20,000+ Products)
import drugsJson from './drugsData.json';

export interface MedXDrugItem {
  id?: string;
  name: string;
  generic: string;
  strength: string;
  form: string;
  company: string;
  prescriptionName: string;
  drugClass: string;
  therapeuticCategory: string;
  indication: string;
  adultDose: string;
  pediatricDose?: string;
  contraindications?: string[];
  adverseEffects?: string[];
}

export interface DrugInteractionAlert {
  drugA: string;
  drugB: string;
  severity: 'high' | 'moderate' | 'minor';
  severityText: string;
  clinicalEffect: string;
  mechanism: string;
  recommendation: string;
}

export const MEDX_DRUG_DATABASE: MedXDrugItem[] = drugsJson as MedXDrugItem[];

// MedX Comprehensive Drug-Drug Interaction Rules Matrix
export const MEDX_INTERACTION_RULES: {
  pair: [string, string];
  severity: 'high' | 'moderate' | 'minor';
  severityText: string;
  clinicalEffect: string;
  mechanism: string;
  recommendation: string;
}[] = [
  {
    pair: ['ketorolac', 'aspirin'],
    severity: 'high',
    severityText: 'উচ্চ ঝুঁকি (Major Bleeding Risk)',
    clinicalEffect: 'Severe Gastrointestinal Bleeding and Hemorrhagic Risk',
    mechanism: 'Dual cyclooxygenase (COX-1) inhibition profoundly disrupts platelet aggregation and gastric mucosal protection.',
    recommendation: 'Do not co-prescribe Ketorolac with Aspirin or other systemic NSAIDs. Use Paracetamol as alternative analgesic.',
  },
  {
    pair: ['rolac', 'aspirin'],
    severity: 'high',
    severityText: 'উচ্চ ঝুঁকি (Major Bleeding Risk)',
    clinicalEffect: 'Severe Gastrointestinal Bleeding and Hemorrhagic Risk',
    mechanism: 'Dual cyclooxygenase (COX-1) inhibition profoundly disrupts platelet aggregation and gastric mucosal protection.',
    recommendation: 'Do not co-prescribe Rolac (Ketorolac) with Aspirin. Use Paracetamol as alternative analgesic.',
  },
  {
    pair: ['ketorolac', 'ibuprofen'],
    severity: 'high',
    severityText: 'উচ্চ ঝুঁকি (Multiple NSAID Toxicity)',
    clinicalEffect: 'Increased incidence of severe GI ulceration, bleeding, and acute kidney injury.',
    mechanism: 'Additive toxicity from simultaneous multiple NSAID administration.',
    recommendation: 'Avoid combining two NSAIDs simultaneously. Use one single NSAID at recommended dosage.',
  },
  {
    pair: ['rolac', 'intrafen'],
    severity: 'high',
    severityText: 'উচ্চ ঝুঁকি (Multiple NSAID Toxicity)',
    clinicalEffect: 'Increased incidence of severe GI ulceration, bleeding, and acute kidney injury.',
    mechanism: 'Additive toxicity from simultaneous multiple NSAID administration.',
    recommendation: 'Avoid combining Rolac and Intrafen simultaneously. Use one single NSAID.',
  },
  {
    pair: ['rolac', 'clofenac'],
    severity: 'high',
    severityText: 'উচ্চ ঝুঁকি (Dual NSAID Toxicity)',
    clinicalEffect: 'Severe stomach irritation, GI hemorrhage, and acute renal strain.',
    mechanism: 'Overlapping NSAID toxicity.',
    recommendation: 'Use only one NSAID analgesic.',
  },
  {
    pair: ['metronidazole', 'alcohol'],
    severity: 'high',
    severityText: 'উচ্চ সতর্কতা (Disulfiram-like Reaction)',
    clinicalEffect: 'Severe vomiting, tachycardia, flushing, abdominal cramps, and acute hypotension.',
    mechanism: 'Metronidazole inhibits aldehyde dehydrogenase, causing toxic acetaldehyde accumulation.',
    recommendation: 'Strictly advise patient to abstain from alcohol or alcohol-containing mouthwash during treatment and 48 hours after.',
  },
  {
    pair: ['amodis', 'alcohol'],
    severity: 'high',
    severityText: 'উচ্চ সতর্কতা (Disulfiram-like Reaction)',
    clinicalEffect: 'Severe vomiting, tachycardia, flushing, abdominal cramps, and acute hypotension.',
    mechanism: 'Metronidazole inhibits aldehyde dehydrogenase, causing toxic acetaldehyde accumulation.',
    recommendation: 'Strictly advise patient to avoid alcohol during Amodis course.',
  },
  {
    pair: ['daktarin', 'warfarin'],
    severity: 'high',
    severityText: 'মারাত্মক ঝুঁকি (Fatal Hemorrhage)',
    clinicalEffect: 'Extreme elevation of INR, spontaneous oral, internal, and cerebral bleeding.',
    mechanism: 'Miconazole oral gel potent CYP2C9 inhibition impairs Warfarin metabolism.',
    recommendation: 'Strictly contraindicated. Use Nystatin oral suspension instead of Daktarin for patients on Warfarin.',
  },
  {
    pair: ['tramadol', 'dexamethasone'],
    severity: 'moderate',
    severityText: 'মাঝারি সতর্কতা (Reduced Analgesic Efficacy)',
    clinicalEffect: 'Dexamethasone induces CYP3A4, potentially reducing analgesic efficacy of Tramadol.',
    mechanism: 'Accelerated metabolic degradation of tramadol via cytochrome P450 induction.',
    recommendation: 'Monitor patient for adequate pain relief. Adjust tramadol dosage if pain persists.',
  },
  {
    pair: ['amoxicillin', 'methotrexate'],
    severity: 'high',
    severityText: 'উচ্চ ঝুঁকি (Methotrexate Toxicity)',
    clinicalEffect: 'Bone marrow suppression and acute renal tubular necrosis.',
    mechanism: 'Penicillins reduce renal clearance of methotrexate by competing for tubular secretion.',
    recommendation: 'Avoid concurrent use or monitor methotrexate serum levels carefully.',
  },
  {
    pair: ['ciprofloxacin', 'theophylline'],
    severity: 'high',
    severityText: 'উচ্চ ঝুঁকি (Theophylline Toxicity)',
    clinicalEffect: 'Nausea, seizures, cardiac arrhythmias.',
    mechanism: 'Ciprofloxacin inhibits CYP1A2 hepatic metabolism of theophylline.',
    recommendation: 'Reduce theophylline dosage by 30-50% and monitor levels.',
  },
  {
    pair: ['ibuprofen', 'aspirin'],
    severity: 'moderate',
    severityText: 'মাঝারি সতর্কতা (Cardioprotection Interference)',
    clinicalEffect: 'Ibuprofen blocks the cardioprotective antiplatelet effect of low-dose Aspirin.',
    mechanism: 'Competitive binding to COX-1 active site.',
    recommendation: 'Take Aspirin at least 30 minutes before or 8 hours after Ibuprofen.',
  }
];

// Helper: Check for interactions in a list of prescribed medicines
export function checkMedXDrugInteractions(prescribedMedicineNames: string[]): DrugInteractionAlert[] {
  const alerts: DrugInteractionAlert[] = [];
  const normalizedList = prescribedMedicineNames.map((n) => n.toLowerCase());

  for (const rule of MEDX_INTERACTION_RULES) {
    const [d1, d2] = rule.pair;
    const hasD1 = normalizedList.some((med) => med.includes(d1));
    const hasD2 = normalizedList.some((med) => med.includes(d2));

    if (hasD1 && hasD2) {
      alerts.push({
        drugA: d1.toUpperCase(),
        drugB: d2.toUpperCase(),
        severity: rule.severity,
        severityText: rule.severityText,
        clinicalEffect: rule.clinicalEffect,
        mechanism: rule.mechanism,
        recommendation: rule.recommendation,
      });
    }
  }

  return alerts;
}
