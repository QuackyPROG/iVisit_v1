// src/utils/idParsers.ts

export interface ExtractedInfo {
  fullName: string;
  dob: string;
  idNumber: string;
  idType: string;
  confidence?: {
    fullName: number;
    dob: number;
    idNumber: number;
  };
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

// Centralized parser function (note, might replace this in the future with a modular method?)
export function parseTextByIdType(text: string, idType: string): ExtractedInfo {
  switch (idType) {
    case "National ID":
      return parseNationalId(text);
    case "PhilHealth ID":
      return parsePhilHealthId(text);
    case "UMID":
      return parseUMID(text);
    default:
      return parseGeneric(text);
  }
}
