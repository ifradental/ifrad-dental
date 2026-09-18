// Bangla Phonetic Converter (Avro-style mapping & Digit conversion)

export function convertEnglishToBanglaDigits(str: string): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit, 10)]);
}

export function convertBanglaToEnglishDigits(str: string): string {
  const enDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (digit) => enDigits[digit] || digit);
}

const phoneticMap: Record<string, string> = {
  'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ঙ',
  'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'n': 'ন',
  't': 'ট', 'th': 'ঠ', 'd': 'ড', 'dh': 'ঢ',
  'T': 'ত', 'Th': 'থ', 'D': 'দ', 'Dh': 'ধ',
  'p': 'প', 'f': 'ফ', 'ph': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
  'r': 'র', 'l': 'ল', 'sh': 'শ', 'S': 'ষ', 's': 'স', 'h': 'হ',
  'y': 'য়', 'w': 'ও', 'a': 'া', 'i': 'ি', 'I': 'ী', 'u': 'ু',
  'U': 'ূ', 'e': 'ে', 'o': 'ো', 'O': 'ৌ', 'ou': 'ৌ', 'oi': 'ৈ'
};

const commonPhrases: Record<string, string> = {
  'khabar por': 'খাবার পর',
  'khabar age': 'খাবার পূর্বে',
  'khabar purbe': 'খাবার পূর্বে',
  'bhorapeTe': 'ভরা পেটে',
  'khali peTe': 'খালি পেটে',
  'din': 'দিন',
  'mash': 'মাস',
  'shokal': 'সকাল',
  'dupur': 'দুপুর',
  'raat': 'রাত',
  'batha hole': 'ব্যথা হলে',
  'fola thakle': 'ফোলা থাকলে',
  'dath brash korben': 'দাঁত ব্রাশ করবেন',
  'gorom pani': 'কুসুম গরম পানি',
  'lobon': 'লবণ',
  'kulkucha': 'কুলকুচা করবেন'
};

export function convertPhoneticToBangla(text: string): string {
  if (!text) return '';

  let converted = text;

  // Replace digits
  converted = convertEnglishToBanglaDigits(converted);

  // Match common phrases
  for (const [key, val] of Object.entries(commonPhrases)) {
    const reg = new RegExp(`\\b${key}\\b`, 'gi');
    converted = converted.replace(reg, val);
  }

  return converted;
}

