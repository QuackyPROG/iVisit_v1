// src/utils/idParsers.ts

export interface ExtractedInfo {
  fullName: string;
  dob: string;
  idNumber: string;
  idType: string;
  address?: string;
  confidence?: {
    fullName: number;
    dob: number;
    idNumber: number;
    address?: number;
  };
}

export interface DetectedIdType {
  idType: string;
  confidence: number;
  matchedPatterns: string[];
}

/**
 * Auto-detect ID type based on patterns in OCR text
 */
export function detectIdType(text: string): DetectedIdType {
  if (!text) {
    return { idType: "Other", confidence: 0, matchedPatterns: [] };
  }

  const upper = text.toUpperCase();
  const matchedPatterns: string[] = [];

  // ========== NATIONAL ID (highest priority - has unique 4x4 ID format) ==========
  const hasNationalIdNumber = /\d{4}-\d{4}-\d{4}-\d{4}/.test(text);
  const hasPhilSys = /PHILSYS/i.test(text) || /PHILIPPINE\s*NATIONAL\s*ID/i.test(text);

  if (hasNationalIdNumber) {
    matchedPatterns.push("ID: XXXX-XXXX-XXXX-XXXX");
    if (hasPhilSys || /REPUBLIKA\s*NG\s*PILIPINAS/i.test(text)) {
      matchedPatterns.push("PhilSys / National ID");
    }
    return { idType: "National ID", confidence: 0.95, matchedPatterns };
  }

  // ========== UMID (check BEFORE SSS - has CRN or Multi-Purpose text) ==========
  // Use looser patterns that work with noisy OCR
  const hasCRN = /CRN[:\s\-]*\d{4}[\-\s]?\d{7}[\-\s]?\d/i.test(text);
  const hasUMIDExact = /\bUMID\b/i.test(text);

  // Looser patterns for noisy OCR - look for key phrases even when fragmented
  const hasRepublicPhilippines = /REPUBLIC\s*OF\s*THE\s*PHILIPPINES/i.test(text) ||
    upper.includes("REPUBLIC") && upper.includes("PHILIPPINES");
  const hasMultiPurpose = /MULTI[-\s]?PURPOSE/i.test(text) ||
    (upper.includes("MULTI") && upper.includes("PURPOSE"));
  const hasUnified = /UNIFIED/i.test(text);

  // If we see "REPUBLIC OF THE PHILIPPINES" + "MULTI-PURPOSE" or "UNIFIED", it's UMID
  if (hasCRN || hasUMIDExact || (hasRepublicPhilippines && (hasMultiPurpose || hasUnified))) {
    if (hasCRN) matchedPatterns.push("CRN-XXXX-XXXXXXX-X");
    if (hasUMIDExact) matchedPatterns.push("UMID text found");
    if (hasRepublicPhilippines) matchedPatterns.push("Republic of the Philippines");
    if (hasMultiPurpose || hasUnified) matchedPatterns.push("Multi-Purpose ID text");
    return { idType: "UMID", confidence: 0.95, matchedPatterns };
  }

  // ========== DRIVER'S LICENSE ==========
  const hasLTOText = /LAND\s*TRANSPORTATION\s*OFFICE/i.test(text) ||
    /\bLTO\b/.test(upper) ||
    /DRIVER['']?S?\s*LICENSE/i.test(text) ||
    /LICENSE\s*NO/i.test(text);
  const hasLicenseNumber = /[A-Z]?\d{2,3}-\d{2}-\d{6}/.test(text);

  if (hasLTOText || hasLicenseNumber) {
    if (hasLTOText) matchedPatterns.push("LTO / Driver's License");
    if (hasLicenseNumber) matchedPatterns.push("ID: N##-##-######");
    return { idType: "Driver's License", confidence: 0.9, matchedPatterns };
  }

  // ========== PHILHEALTH ==========
  const hasPhilHealth = /PHILHEALTH/i.test(text) ||
    /PHILIPPINE\s*HEALTH\s*INSURANCE/i.test(text);
  const hasPhilHealthNumber = /\d{2}-\d{9}-\d/.test(text);

  if (hasPhilHealth || hasPhilHealthNumber) {
    if (hasPhilHealth) matchedPatterns.push("PhilHealth");
    if (hasPhilHealthNumber) matchedPatterns.push("ID: ##-#########-#");
    return { idType: "PhilHealth ID", confidence: 0.9, matchedPatterns };
  }

  // ========== SSS (check AFTER UMID and PhilHealth) ==========
  const hasSSSText = /SOCIAL\s*SECURITY\s*SYSTEM/i.test(text);
  // Only match standalone SSS, not as part of other words
  const hasSSSAbbrev = /\bSSS\b/.test(upper) && !/PHILSYS|UMID|MULTI.?PURPOSE/i.test(text);
  const hasSSSNumber = /\d{2}-\d{7}-\d/.test(text);

  if (hasSSSText || (hasSSSAbbrev && hasSSSNumber)) {
    if (hasSSSText) matchedPatterns.push("Social Security System");
    if (hasSSSNumber) matchedPatterns.push("ID: ##-#######-#");
    return { idType: "SSS ID", confidence: 0.85, matchedPatterns };
  }

  // ========== CITY ID / BARANGAY ID ==========
  if (/QUEZON\s*CITY/i.test(text) ||
    /CITY\s*OF\s*MANILA/i.test(text) ||
    /CITY\s*ID/i.test(text) ||
    /BARANGAY\s*ID/i.test(text)) {
    matchedPatterns.push("City/Barangay ID");
    return { idType: "City ID", confidence: 0.8, matchedPatterns };
  }

  // ========== SCHOOL ID ==========
  if (/UNIVERSITY/i.test(text) ||
    /COLLEGE/i.test(text) ||
    /STUDENT\s*ID/i.test(text) ||
    /SCHOOL\s*ID/i.test(text)) {
    matchedPatterns.push("School/University");
    return { idType: "School ID", confidence: 0.7, matchedPatterns };
  }

  // Default
  // Default
  return { idType: "Other", confidence: 0.3, matchedPatterns: ["No patterns matched"] };
}


export function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";

  // Try parsing formats like "January 3, 1999" or "JAN 3 1999"
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  const cleaned = dateStr.trim().replace(/[,]/g, "").toLowerCase();

  // e.g. "january 3 1999"
  for (let i = 0; i < monthNames.length; i++) {
    if (cleaned.includes(monthNames[i])) {
      const regex = new RegExp(`${monthNames[i]}\\s+(\\d{1,2})\\s+(\\d{4})`);
      const match = cleaned.match(regex);
      if (match) {
        const month = (i + 1).toString().padStart(2, "0");
        const day = match[1].padStart(2, "0");
        const year = match[2];
        return `${year}-${month}-${day}`;
      }
    }
  }

  // Try numeric format like 03/01/1999 or 3-1-1999
  const numeric = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (numeric) {
    let [_, m, d, y] = numeric;
    if (y.length === 2) y = `20${y}`; // handle short year
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return "";
}

export function parseNationalId(text: string): ExtractedInfo {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const joined = text.replace(/\s+/g, " ");

  // 1. ID Number — format like "XXXX-XXXX-XXXX-XXXX"
  const idMatch = joined.match(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/);
  const idNumber = idMatch ? idMatch[0] : "";

  // 2. Helper to find line below a label)
  const getLineBelow = (keywordRegex: RegExp): string => {
    const idx = lines.findIndex(l => keywordRegex.test(l));
    if (idx !== -1 && idx + 1 < lines.length) {
      const nextLine = lines[idx + 1].trim();
      // Avoid cases where the next line is another label
      if (!/Apelyido|Given|Petsa|Date|Kapanganakan|Birth|ID|Numero/i.test(nextLine)) {
        return nextLine;
      }
    }
    return "";
  };

  // 3. Extract name components
  const lastName =
    getLineBelow(/Apelyido|Last\s*Name/i) ||
    lines.find(l => /^[A-Z\s]{3,}$/.test(l)) || "";

  const givenNames = getLineBelow(/Mga\s*Pangalan|Given\s*Names/i) || "";
  const middleName = getLineBelow(/Gitnang\s*Apelyido|Middle\s*Name/i) || "";

  // 4. Extract DOB — format "MONTH DD, YYYY"
  const dobMatch = joined.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*\d{4}\b/i
  );
  const dobRaw = dobMatch ? dobMatch[0] : "";
  const dob = normalizeDate(dobRaw);

  // Stitch together full name for DB
  const fullName = [givenNames, middleName, lastName].filter(Boolean).join(" ").trim();

  return {
    fullName,
    dob,
    idNumber,
    idType: "National ID",
    confidence: {
      fullName: fullName ? 0.95 : 0.4,
      dob: dob ? 0.9 : 0.4,
      idNumber: idNumber ? 1.0 : 0.3,
    },
  };
}

// Note for any other IDs, I have not tested these yet.
export function parsePhilHealthId(text: string): ExtractedInfo {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const joined = text.replace(/\s+/g, " ").trim();

  // 1) ID Number: XX-XXXXXXXXX-X
  const idMatch = joined.match(/\b\d{2}-\d{9}-\d\b/);
  const idNumber = idMatch ? idMatch[0] : "";

  // 2) Name: LASTNAME, Given Name M.
  let fullName = "";
  const nameLine = lines.find((l) =>
    /^[A-Z][A-Za-z'\-]+,\s*[A-Za-z]/.test(l)
  );

  if (nameLine) {
    const [lastPart, givenPartRaw] = nameLine.split(",", 2);
    const lastName = lastPart.trim();
    const givenPart = (givenPartRaw || "").trim(); // "JUAN PABLO M." etc.

    if (lastName && givenPart) {
      // Convert to "Given Part LastName"
      fullName = `${givenPart} ${lastName}`.replace(/\s+/g, " ").trim();
    } else {
      fullName = nameLine;
    }
  }

  // 3) DOB: Mon. DD, YYYY
  // e.g., "Jan. 03, 1999" or "JAN 3, 1999"
  let dob = "";
  const dobMatch = joined.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),\s*(\d{4})\b/i
  );

  if (dobMatch) {
    const monthAbbr = dobMatch[1].toLowerCase();
    const day = dobMatch[2].padStart(2, "0");
    const year = dobMatch[3];

    const monthMap: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };

    const month = monthMap[monthAbbr] || "";
    if (month) {
      dob = `${year}-${month}-${day}`;
    }
  }

  return {
    fullName,
    dob,
    idNumber,
    idType: "PhilHealth ID",
    confidence: {
      fullName: fullName ? 0.85 : 0.3,
      dob: dob ? 0.85 : 0.3,
      idNumber: idNumber ? 0.98 : 0.4,
    },
  };
}

export function parseUMID(text: string): ExtractedInfo {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const joined = text.replace(/\s+/g, " ").trim();

  // 1) ID Number: CRN-XXXX-XXXXXXX-X
  let idNumber = "";
  const crnMatch = joined.match(
    /CRN-?\s*(\d{4})-?\s*(\d{7})-?\s*(\d)/i
  );
  if (crnMatch) {
    const part1 = crnMatch[1];
    const part2 = crnMatch[2];
    const part3 = crnMatch[3];
    idNumber = `CRN-${part1}-${part2}-${part3}`;
  }

  // 2) Name: labels + stacked values
  let lastName = "";
  let givenNames = "";
  let middleName = "";

  const surnameIdx = lines.findIndex((l) => /surname/i.test(l));
  const givenIdx = lines.findIndex((l) => /given\s+name/i.test(l));
  const middleIdx = lines.findIndex((l) => /middle\s+name/i.test(l));

  if (surnameIdx !== -1 && surnameIdx + 1 < lines.length) {
    lastName = lines[surnameIdx + 1].trim();
  }

  if (givenIdx !== -1) {
    const start = givenIdx + 1;
    const end = middleIdx !== -1 ? middleIdx : lines.length;
    const givenLines = lines
      .slice(start, end)
      .map((l) => l.trim())
      .filter((l) => l && !/middle\s+name/i.test(l));
    givenNames = givenLines.join(" ").replace(/\s+/g, " ").trim();
  }

  if (middleIdx !== -1 && middleIdx + 1 < lines.length) {
    middleName = lines[middleIdx + 1].trim();
  }

  const fullName = [givenNames, middleName, lastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  // 3) DOB: label + YYYY/MM/DD
  let dob = "";
  const dobLabelIdx = lines.findIndex((l) =>
    /date\s+of\s+birth/i.test(l)
  );
  if (dobLabelIdx !== -1 && dobLabelIdx + 1 < lines.length) {
    const dobRaw = lines[dobLabelIdx + 1].trim(); // "YYYY/MM/DD"
    const m = dobRaw.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
    if (m) {
      const year = m[1];
      const month = m[2];
      const day = m[3];
      dob = `${year}-${month}-${day}`;
    }
  }

  return {
    fullName,
    dob,
    idNumber,
    idType: "UMID",
    confidence: {
      fullName: fullName ? 0.8 : 0.3,
      dob: dob ? 0.85 : 0.3,
      idNumber: idNumber ? 0.95 : 0.4,
    },
  };
}

function isLikelyNameLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 5) return false;

  // Must have at least two tokens (first + last)
  const words = trimmed.split(/\s+/);
  if (words.length < 2) return false;

  // Mostly letters and spaces
  const letters = trimmed.replace(/[^A-Za-z\s]/g, "").length;
  if (letters / Math.max(trimmed.length, 1) < 0.6) return false;

  // Avoid obvious labels
  if (/name\b|surname\b|given\b|middle\b|birth\b|date\b|sex\b|gender\b/i.test(trimmed)) {
    return false;
  }

  return true;
}

function pickBestNameLine(lines: string[]): string {
  const candidates = lines.filter(isLikelyNameLine);
  if (candidates.length === 0) return "";

  // Heuristic: longest candidate wins
  return candidates.sort((a, b) => b.length - a.length)[0].trim();
}

function pickBestDob(text: string): string {
  const joined = text.replace(/\s+/g, " ").trim();

  // numeric styles: 12/31/1999, 31-12-1999, etc.
  const numericMatch = joined.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
  if (numericMatch) {
    const norm = normalizeDate(numericMatch[0]);
    if (norm) return norm;
  }

  // month name styles: January 3, 1999 / Jan. 3, 1999
  const textMatch = joined.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b/i
  );
  if (textMatch) {
    const norm = normalizeDate(textMatch[0]);
    if (norm) return norm;
  }

  return "";
}

function pickBestIdToken(text: string): string {
  const tokens = text.split(/\s+/);

  // Candidate: at least 6 chars, contains a digit, mostly [A-Z0-9\-]
  const candidates = tokens.filter((t) => {
    if (t.length < 6) return false;
    if (!/\d/.test(t)) return false;

    const cleaned = t.replace(/[^A-Za-z0-9\-]/g, "");
    if (cleaned.length / t.length < 0.7) return false;

    return true;
  });

  if (candidates.length === 0) return "";

  // Pick the longest candidate
  let best = candidates.sort((a, b) => b.length - a.length)[0];

  // Light cleanup: drop trailing commas / periods
  best = best.replace(/[.,]+$/, "");

  return best;
}

export function parseGeneric(text: string): ExtractedInfo {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const joined = text.replace(/\s+/g, " ").trim();

  // 1) Full name – best looking name line
  const fullName = pickBestNameLine(lines);

  // 2) DOB – any plausible date we can normalize
  const dob = pickBestDob(joined);

  // 3) ID number – any long alphanumeric-ish token
  const idNumber = pickBestIdToken(joined);

  return {
    fullName,
    dob,
    idNumber,
    idType: "Unknown",
    confidence: {
      fullName: fullName ? 0.7 : 0.3,
      dob: dob ? 0.6 : 0.2,
      idNumber: idNumber ? 0.6 : 0.2,
    },
  };
}

// ========== ADDRESS EXTRACTION HELPER ==========

function extractAddress(text: string): string {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Look for "ADDRESS" label
  const addrIdx = lines.findIndex(l => /^address/i.test(l) || /\baddress\s*:/i.test(l));

  if (addrIdx !== -1) {
    // Take next 2-3 lines as address (skip the label line itself)
    const addrLines = lines.slice(addrIdx + 1, addrIdx + 4)
      .filter(l => !/(name|birth|sex|date|id|number|license|expiry)/i.test(l));

    if (addrLines.length > 0) {
      return addrLines.join(', ').replace(/\s+/g, ' ').trim();
    }
  }

  // Fallback: look for common address patterns (Brgy, Street, City)
  const addrPattern = lines.find(l =>
    /(brgy|barangay|street|st\.|ave|avenue|city|metro|manila|quezon)/i.test(l)
  );

  return addrPattern || '';
}

// ========== DRIVER'S LICENSE PARSER ==========

export function parseDriversLicense(text: string): ExtractedInfo {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const joined = text.replace(/\s+/g, ' ').trim();

  // ID Number formats: N##-##-###### (standard LTO format)
  let idNumber = '';
  const idMatch = joined.match(/N?\d{2,3}[-\s]?\d{2}[-\s]?\d{5,6}/);
  if (idMatch) {
    // Normalize format - add dashes
    const digits = idMatch[0].replace(/\D/g, '');
    if (digits.length >= 10) {
      idNumber = `N${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
    }
  }

  // Name: Look for "LASTNAME, FIRSTNAME" format (can have multi-word lastname like "DELA CRUZ, JUAN")
  let fullName = '';

  // Try matching multi-word lastname format: "DELA CRUZ, JUAN PEDRO GARCIA"
  const nameMatch = joined.match(/([A-Z]{2,}(?:\s+[A-Z]{2,})*),\s*([A-Z]{2,}(?:\s+[A-Z]{2,})*)/);
  if (nameMatch) {
    const lastName = nameMatch[1].trim();
    const firstName = nameMatch[2].trim();
    // Exclude common labels
    if (!/REPUBLIC|PHILIPPINES|TRANSPORTATION|LICENSE|PROFESSIONAL/i.test(lastName)) {
      fullName = `${firstName} ${lastName}`;
    }
  }

  // Second try: Look for ALL CAPS name with 3-5 words (Filipino names often have 4 parts)
  if (!fullName) {
    // Match pattern like "DELA CRUZ JUAN PEDRO GARCIA"
    const allCapsLines = joined.match(/\b([A-Z]{3,}(?:\s+[A-Z]{3,}){2,4})\b/g) || [];
    for (const candidate of allCapsLines) {
      // Skip common header phrases
      if (/REPUBLIC|PHILIPPINES|TRANSPORTATION|LICENSE|DRIVER|PROFESSIONAL|DEPARTMENT|OFFICE|NON-PROFESSIONAL/i.test(candidate)) {
        continue;
      }
      // Found a good name candidate
      fullName = candidate;
      break;
    }
  }

  // Third try: Search more aggressively for names near specific labels
  if (!fullName) {
    // Look for text after "Last Name First Name Middle Name" pattern
    const afterLabels = joined.match(/(?:Last|First|Middle)\s*(?:Name|Nome)[^A-Z]*([A-Z]{3,}(?:\s+[A-Z]{3,}){2,4})/i);
    if (afterLabels) {
      fullName = afterLabels[1];
    }
  }

  // Clean up any leading single chars (OCR noise like "f ")
  if (fullName) {
    fullName = fullName.replace(/^[a-z]\s+/i, '').trim();
  }

  // DOB - handle YYYY/MMDD format (no space between MM and DD)
  let dob = '';
  // Standard format: YYYY/MM/DD or YYYY-MM-DD
  const dobMatch1 = joined.match(/\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b/);
  if (dobMatch1) {
    dob = `${dobMatch1[1]}-${dobMatch1[2]}-${dobMatch1[3]}`;
  }
  // OCR error format: YYYY/MMDD (missing separator between MM and DD)
  if (!dob) {
    const dobMatch2 = joined.match(/\b(\d{4})[\/\-](\d{4})\b/);
    if (dobMatch2) {
      const mmdd = dobMatch2[2];
      dob = `${dobMatch2[1]}-${mmdd.slice(0, 2)}-${mmdd.slice(2)}`;
    }
  }
  // Fallback
  if (!dob) {
    dob = pickBestDob(joined);
  }

  // Address
  const address = extractAddress(text);

  return {
    fullName: fullName.replace(/\s+/g, ' ').trim(),
    dob,
    idNumber,
    idType: "Driver's License",
    address,
    confidence: {
      fullName: fullName ? 0.85 : 0.3,
      dob: dob ? 0.8 : 0.3,
      idNumber: idNumber ? 0.95 : 0.3,
      address: address ? 0.7 : 0.2,
    },
  };
}


// ========== SSS ID PARSER ==========

export function parseSSSId(text: string): ExtractedInfo {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const joined = text.replace(/\s+/g, ' ').trim();

  // ID Number: ##-#######-# (standard format)
  let idNumber = '';
  const idMatch = joined.match(/\d{2}-\d{7}-\d/);
  if (idMatch) {
    idNumber = idMatch[0];
  } else {
    // Fallback: 9-10 digit number without dashes (OCR sometimes drops dashes)
    const digitMatch = joined.match(/\b(\d{9,10})\b/);
    if (digitMatch) {
      const digits = digitMatch[1];
      // Format as ##-#######-#
      if (digits.length === 10) {
        idNumber = `${digits.slice(0, 2)}-${digits.slice(2, 9)}-${digits.slice(9)}`;
      } else if (digits.length === 9) {
        // Missing leading zero, assume format 0#-#######-#
        idNumber = `0${digits.slice(0, 1)}-${digits.slice(1, 8)}-${digits.slice(8)}`;
      }
    }
  }

  // Name extraction for SSS cards
  // Look for ALL CAPS name pattern like "HAMELTON RODRIGUEZ"
  let fullName = '';

  // First try: LASTNAME, FIRSTNAME format
  const commaMatch = joined.match(/([A-Z][A-Z']+),\s*([A-Z][A-Z'\s.]+)/);
  if (commaMatch) {
    fullName = `${commaMatch[2].trim()} ${commaMatch[1].trim()}`;
  }

  // Second try: Find ALL CAPS name pattern directly in text (handles fragmented OCR)
  if (!fullName) {
    // Look for 2-3 consecutive ALL CAPS words (min 3 chars each)
    const namePattern = joined.match(/\b([A-Z]{3,})\s+([A-Z]{3,})(?:\s+([A-Z]{3,}))?\b/);
    if (namePattern) {
      const candidate = namePattern[0];
      // Make sure it's not a common label phrase
      if (!/REPUBLIC|PHILIPPINES|SOCIAL|SECURITY|SYSTEM|PROUD|FILIPINO|PRESIDENT/i.test(candidate)) {
        fullName = candidate;
      }
    }
  }

  // Third try: Find ALL CAPS name lines (2-4 words, not common labels)
  if (!fullName) {
    const excludePatterns = [
      /REPUBLIC/i, /PHILIPPINES/i, /SOCIAL/i, /SECURITY/i, /SYSTEM/i,
      /PRESIDENT/i, /PROUD/i, /FILIPINO/i, /SSS/i, /CORAZON/i, /DE LA PAZ/i
    ];

    for (const line of lines) {
      // Clean words - remove trailing noise like '-y'
      const cleanedWords = line.split(/\s+/)
        .map(w => w.replace(/[^A-Z]/gi, ''))
        .filter(w => w.length >= 3 && /^[A-Z]+$/i.test(w));

      if (cleanedWords.length >= 2 && cleanedWords.length <= 4) {
        const isAllCaps = cleanedWords.every(w => w === w.toUpperCase());
        const candidateLine = cleanedWords.join(' ');
        // Make sure it's not a common label
        const isLabel = excludePatterns.some(p => p.test(candidateLine));
        if (isAllCaps && !isLabel) {
          fullName = candidateLine;
          break;
        }
      }
    }
  }

  // Third try: Look for name near the ID number in raw text
  if (!fullName && idMatch) {
    // Get text before the ID number, might contain name
    const beforeId = joined.substring(0, joined.indexOf(idMatch[0]));
    const nameCandidate = beforeId.match(/([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)\s*$/);
    if (nameCandidate) {
      fullName = nameCandidate[1];
    }
  }

  // Clean up OCR noise - remove short words at start/end (like "ON", "I", "A", "l")
  if (fullName) {
    const words = fullName.split(/\s+/);
    // Remove short leading words (1-2 chars that look like noise)
    while (words.length > 2 && words[0].length <= 2) {
      words.shift();
    }
    // Remove short trailing words
    while (words.length > 2 && words[words.length - 1].length <= 2) {
      words.pop();
    }
    fullName = words.join(' ');
  }

  // DOB
  const dob = pickBestDob(joined);

  return {
    fullName: fullName.replace(/\s+/g, ' ').trim(),
    dob,
    idNumber,
    idType: "SSS ID",
    confidence: {
      fullName: fullName ? 0.85 : 0.3,
      dob: dob ? 0.8 : 0.3,
      idNumber: idNumber ? 0.95 : 0.3,
    },
  };
}

// ========== CITY ID / QC ID PARSER ==========

export function parseCityId(text: string): ExtractedInfo {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const joined = text.replace(/\s+/g, ' ').trim();

  // ID Number: Look for various patterns
  // QC ID: QC-XXXXXXXXX or long digit sequences
  let idNumber = '';

  const qcMatch = joined.match(/QC-?\s*\d{6,}/i);
  if (qcMatch) {
    idNumber = qcMatch[0].replace(/\s/g, '');
  } else {
    // Generic: 8+ digit number
    const digitMatch = joined.match(/\b\d{8,}\b/);
    if (digitMatch) {
      idNumber = digitMatch[0];
    }
  }

  // Name
  let fullName = '';
  const nameMatch = joined.match(/([A-Z][A-Z']+),\s*([A-Z][A-Z'\s.]+)/);
  if (nameMatch) {
    fullName = `${nameMatch[2].trim()} ${nameMatch[1].trim()}`;
  } else {
    fullName = pickBestNameLine(lines);
  }

  // DOB
  const dob = pickBestDob(joined);

  // Address - city IDs usually have address
  const address = extractAddress(text);

  return {
    fullName: fullName.replace(/\s+/g, ' ').trim(),
    dob,
    idNumber,
    idType: "City ID",
    address,
    confidence: {
      fullName: fullName ? 0.75 : 0.3,
      dob: dob ? 0.7 : 0.3,
      idNumber: idNumber ? 0.8 : 0.3,
      address: address ? 0.7 : 0.2,
    },
  };
}

// Centralized parser function
export function parseTextByIdType(text: string, idType: string): ExtractedInfo {
  switch (idType) {
    case "National ID":
      return parseNationalId(text);
    case "PhilHealth ID":
      return parsePhilHealthId(text);
    case "UMID":
      return parseUMID(text);
    case "Driver's License":
      return parseDriversLicense(text);
    case "SSS ID":
      return parseSSSId(text);
    case "City ID":
    case "QC ID":
    case "Other":
      return parseCityId(text);
    default:
      return parseGeneric(text);
  }
}

