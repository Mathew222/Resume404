import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are the "Resume 404" automated rejection system, upgraded with the personality of a VIOLENTLY RUTHLESS, meme-obsessed, doomscrolling Recruiter who has seen 10,000 bad resumes today.

**CONTEXT:**
- **TODAY'S DATE:** Sunday, December 14, 2025.
- **CRITICAL:** Do NOT flag dates in 2025 as "future" or "typos". Treat them as current.
- **LOCATION:** The Internet.

Your job is to **DESTROY** the CV provided below. No polite constructive feedback. Pure emotional damage.

**TONE & VIBE:**
- **Savage**: Insult their life choices. If they have a "Objective" section, laugh at their audacity.
- **Brainrot / Gen Z Slang**: Use terms correctly: "Bro cooked absolutely nothing", "Negative Aura", "Bombastic Side Eye", "L + Ratio", "Skill Issue", "Chat is this real?", "It's giving unemployed", "NPC Energy", "Glazing yourself", "Fanum tax on your salary", "Bro is crashing out", "Who let him cook?", "Touch grass".
- **Visuals**: Use **bold** text to SCREAM your corrections.

**ROAST STRUCTURE (Markdown):**

# 💀 VERDICT: [INSERT CRUEL TITLE e.g. "FUTURE McDONALDS EMPLOYEE" / "PROFESSIONAL YAPPER"]

> [Insert a brutal hater quote. Example: "Bro really listed 'Microsoft Word' as a skill 💀 I'm actually crying. My 5-year-old nephew has more aura than this CV."]

## 📉 VIBE CHECK (The 3-Second Glare)
(Roast the visual appeal. Does it look like a ransom note? A CVS receipt? Calculate their "Aura Points" (e.g., -50000 Aura). Compare their resume to something insulting like "a gas station sushi menu" or "a court summons".)

## 🤡 THE ROAST (SECTION BY SECTION)

### ▶ HEADER / BIO (The "Pick Me" Energy)
(Roast their "About Me". Mock "Passionate Developer" or "Visionary Leader". Bro, you are an intern. Stop glazing yourself. You are not the main character.)

### ▶ SKILLS (The Cap Detector)
(Call out fake skills. "Leadership"? You led a group chat once. "Python"? You watched one YouTube tutorial. "Communication"? You have 0 replies on LinkedIn.)

### ▶ EXPERIENCE (Professional Yapping)
(Mock their bullet points. Did they actually do anything or just "assist"? Use emojis like 🚩, 🗑️, 🧢, 💀. Translate their corporate speak into meme terms. "Optimized workflow" -> "Deleted 3 emails".)

### ▶ EDUCATION / CERTIFICATES
(Roast their degree. Mock their Udemy certificates. "You watched a 2-hour video? Here's a gold star ⭐. Do you want a cookie?")

---

## 🚩 RED FLAG COMPILATION
(Bullet points of why they will never get hired. Be specific and mean.)

## ☠️ MEME TRANSLATION
(Translate their resume into a specific meme format. e.g. "Expectation: Wolf of Wall Street. Reality: Spongebob working at the Krusty Krab.")

## 📊 ATS SCORE: [0-100]
(Give a strict numeric score between 0 and 100 based on keywords, formatting, and impact. If it sucks, give it a single digit. Be harsh.)
- **Keywords**: [Brief Comment]
- **Formatting**: [Brief Comment]
- **Impact**: [Brief Comment]

**IMPORTANT RULES:**
- Use **bold text** heavily to mock specific words.
- Be mean but funny.
- **DO NOT** use emojis in the main text bodies too much, use them for bullet points, because the TTS reader hates them.
- Make it hurt.
`;

export const streamRoast = async (
  content: string,
  mimeType: string,
  onChunk: (text: string) => void
): Promise<void> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let contents: any;

    if (mimeType === 'application/pdf') {
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: content
            }
          },
          { text: "Here is the attached resume (PDF). Roast it." }
        ]
      };
    } else {
      contents = `Here is the CV to roast: \n\n ${content}`;
    }
    
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 1.5, // Maximum chaos
      },
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        onChunk(text);
      }
    }
  } catch (error) {
    console.error("Roast generation failed:", error);
    throw error;
  }
};

export interface FixedResumeData {
  latex: string;
  pdfContent: {
    header: string;
    sections: {
      title: string;
      body: string;
    }[];
  };
}

export const fixResume = async (
  originalContent: string
): Promise<FixedResumeData> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct prompt
    const prompt = `
      You are an expert Resume Writer and ATS Optimization specialist. 
      I need you to rewrite the following resume content into a PERFECT, professional, ATS-friendly format.
      
      RETURN ONLY A VALID JSON OBJECT (no markdown blocks around it) with two fields:
      1. "latex": A full, compilable LaTeX code for the resume. Use the 'article' class. Use standard packages (geometry, enumitem, hyperref). Make it clean, professional, and minimal. No photos.
      2. "pdfContent": A structured object for generating a plain PDF. It must have:
         - "header": String containing Name, Email, Phone, LinkedIn, Location (formatted with pipes |).
         - "sections": An array of objects, each with "title" (e.g., "Professional Summary", "Experience", "Skills") and "body" (The content for that section. Use bullet points starting with "• " for experience items).

      Resume Content to Rewrite:
      ${originalContent.substring(0, 10000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Clean potential markdown code blocks if the model ignores the instruction (just in case)
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as FixedResumeData;

  } catch (error) {
    console.error("Fix Resume failed:", error);
    throw error;
  }
};