import fs from 'fs'
import path from 'path'

export interface OcrResult {
  fullName:     string
  dateOfBirth:  string
  idNumber:     string
  nationality:  string
  address:      string
  expiryDate:   string
  documentType: string
  rawText:      string
}

const OCR_BASE_URL = process.env.OCR_BASE_URL ?? 'http://192.168.97.31:1234'
const OCR_MODEL    = process.env.OCR_MODEL    ?? 'mimo-v2.6-distill-qwen-9b'

const PROMPT = `You are an expert OCR extractor for Philippine government ID documents and forms.
The image may be a scanned paper document with a coloured (pink, yellow, green) background, faded ink, slight rotation, or handwritten entries mixed with printed text. Read carefully despite these imperfections.

Return ONLY a single valid JSON object — no markdown fences, no explanation, no extra text before or after the JSON.

JSON keys and how to fill them:
- "full_name"     : Full name of the person. For forms where the name is split across fields (e.g. LAST NAME / FIRST NAME / MIDDLE NAME), combine them in "LAST FIRST MIDDLE" order separated by a single space. For cards that show a single name line, use it as-is.
- "date_of_birth" : Date of birth exactly as printed (e.g. "05/24/1997" or "MAY 24, 1997"). For SSS E-1 look in the "DATE OF BIRTH" column of the PERSONAL DATA section.
- "id_number"     : The primary ID or reference number. Use the "SS NUMBER" field for SSS E-1/SSS ID (format XX-XXXXXXX-X), "NBI ID NO" for NBI Clearance, "Passport No." for passports, "PhilHealth No." for PhilHealth, "UMID No." for UMID, etc.
- "nationality"   : Citizenship or nationality. For SSS E-1 use the "CITIZENSHIP" field. Default to "Filipino" if clearly implied but not explicitly stated.
- "address"       : Full home/permanent address as printed. For SSS E-1 use the "HOME ADDRESS" section (fields: HOUSE NO. & STREET, BARANGAY/DISTRICT, CITY/MUNICIPALITY, PROVINCE). Concatenate all sub-fields into one string.
- "expiry_date"   : Expiry, validity, or "VALID UNTIL" date if present. Use empty string "" if the document type has no expiry (e.g. SSS E-1 has none).
- "document_type" : Short label for the document, e.g. "SSS E-1", "NBI Clearance", "PhilHealth MDR", "Passport", "UMID", "Birth Certificate", "PRC ID".

Rules:
- If a field is genuinely not visible or not applicable, use an empty string "".
- Never add fields not listed above.
- Output must be valid JSON parseable by JSON.parse() with no surrounding text.`

export async function runOcr(filePath: string): Promise<OcrResult> {
  const ext = path.extname(filePath).toLowerCase()
  // This OCR server only accepts jpeg/png/gif — map everything else to jpeg
  const supportedMimes: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png',  '.gif': 'image/gif',
    '.pdf': 'application/pdf',
  }
  const mimeType = supportedMimes[ext] ?? 'image/jpeg'
  const b64      = fs.readFileSync(filePath).toString('base64')
  const dataUrl  = `data:${mimeType};base64,${b64}`

  const body = {
    model: OCR_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text',      text: PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 4096,
  }

  // Reasoning models can take several minutes to generate on local hardware.
  // Node's built-in fetch uses undici internally; override the signal timeout
  // via AbortSignal.timeout() which applies to the full request lifecycle.
  const response = await fetch(`${OCR_BASE_URL}/v1/chat/completions`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(5 * 60 * 1000), // 5 minutes
  })

  if (!response.ok) {
    const errBody = await response.text()
    console.error('[ocr] HTTP error', response.status, errBody)
    throw new Error(`OCR server returned ${response.status}`)
  }

  const json             = await response.json() as any
  const message          = json?.choices?.[0]?.message ?? {}
  const finishReason     = json?.choices?.[0]?.finish_reason ?? ''
  // Reasoning models write the final answer to `content` and internal
  // chain-of-thought to `reasoning_content`. If content is empty (e.g. the
  // model was cut off mid-reason), fall back to extracting JSON from the
  // reasoning dump so we still get partial data.
  const rawText: string  = message.content || message.reasoning_content || ''

  console.log('[ocr] finish_reason:', finishReason)
  console.log('[ocr] raw model output:', rawText.slice(0, 500))

  let parsed: Record<string, string> = {}
  try {
    // extract JSON block from model output (may be wrapped in markdown code fences)
    const match = rawText.match(/\{[\s\S]*\}/)
    if (match) {
      parsed = JSON.parse(match[0])
    } else {
      console.warn('[ocr] no JSON object found in model output')
    }
  } catch (e) {
    console.error('[ocr] JSON parse failed:', e, '\nraw:', rawText)
  }

  return {
    fullName:     parsed.full_name     ?? '',
    dateOfBirth:  parsed.date_of_birth ?? '',
    idNumber:     parsed.id_number     ?? '',
    nationality:  parsed.nationality   ?? '',
    address:      parsed.address       ?? '',
    expiryDate:   parsed.expiry_date   ?? '',
    documentType: parsed.document_type ?? '',
    rawText,
  }
}
