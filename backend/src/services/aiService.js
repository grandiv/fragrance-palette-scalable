import { prismaReplica as prisma } from "../utils/prisma.js";

const fragranceFamilyKeywords = {
  citrus: [
    "citrus",
    "lemon",
    "orange",
    "bergamot",
    "grapefruit",
    "lime",
    "fresh",
    "zesty",
  ],
  floral: [
    "floral",
    "flower",
    "rose",
    "jasmine",
    "lavender",
    "geranium",
    "ylang",
  ],
  woody: ["wood", "woody", "cedar", "sandalwood", "pine", "forest", "earthy"],
  oriental: ["oriental", "spice", "vanilla", "amber", "cinnamon", "warm"],
  fresh: ["fresh", "aqua", "water", "marine", "green", "mint", "cool"],
  gourmand: ["sweet", "vanilla", "chocolate", "honey", "caramel", "dessert"],
};

async function callTGI(prompt, parameters = {}) {
  const defaultParams = {
    max_new_tokens: 150,
    temperature: 0.7,
    top_p: 0.9,
    repetition_penalty: 1.2,
    do_sample: true,
    stop: ["\n\n"],
  };

  try {
    const response = await fetch(`${process.env.LLM_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { ...defaultParams, ...parameters },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `TGI API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.generated_text || "";
  } catch (error) {
    console.error("TGI API call failed:", error);
    throw new Error(`AI service unavailable: ${error.message}`);
  }
}

export async function callLLM(prompt) {
  try {
    console.log(`Processing fragrance request: "${prompt}"`);

    const family = await identifyFragranceFamily(prompt);
    console.log(`Identified family: ${family.name}`);

    const notes = await generateNotes(prompt, family);
    console.log(`Generated notes:`, notes);

    const mixingAndName = await generateMixingAndName(notes, family);
    console.log(`Generated name and mixing:`, mixingAndName);

    return {
      fragranceFamilyId: family.id,
      name: mixingAndName.name,
      description: `A ${family.name.toLowerCase()} fragrance with ${
        notes.topNote
      } top notes, ${notes.middleNote} middle notes, and ${
        notes.baseNote
      } base notes.`,
      topNote: notes.topNote,
      middleNote: notes.middleNote,
      baseNote: notes.baseNote,
      mixing: mixingAndName.mixing,
    };
  } catch (error) {
    console.error("Error in callLLM:", error);
    throw error;
  }
}

async function identifyFragranceFamily(prompt) {
  const familyCounts = Object.entries(fragranceFamilyKeywords).map(
    ([family, keywords]) => {
      const count = keywords.reduce(
        (acc, keyword) =>
          acc + (prompt.toLowerCase().includes(keyword) ? 1 : 0),
        0
      );
      return { family, count };
    }
  );

  const topFamily = familyCounts.sort((a, b) => b.count - a.count)[0];
  const familyName = topFamily.count > 0 ? topFamily.family : "fresh";
  const capitalizedName =
    familyName.charAt(0).toUpperCase() + familyName.slice(1);

  const family = await prisma.fragranceFamily.findFirst({
    where: { name: capitalizedName },
  });

  if (!family) {
    throw new Error(
      `Fragrance family ${capitalizedName} not found in database`
    );
  }

  return family;
}

async function generateNotes(prompt, family) {
  const notePrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a professional perfumer. Create specific perfume ingredients for each note level.

<|eot_id|><|start_header_id|>user<|end_header_id|>
For a ${family.name.toLowerCase()} fragrance described as "${prompt}", suggest exactly ONE specific ingredient for each note level:

Top note:
Middle note:
Base note:

<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

  const response = await callTGI(notePrompt, {
    temperature: 0.6,
    max_new_tokens: 100,
    stop: ["<|eot_id|>"],
  });

  const topNoteMatch = response.match(/Top note:?\s*([^\n]+)/i);
  const middleNoteMatch = response.match(/Middle note:?\s*([^\n]+)/i);
  const baseNoteMatch = response.match(/Base note:?\s*([^\n]+)/i);

  return {
    topNote: topNoteMatch
      ? topNoteMatch[1].trim()
      : family.ingredients[0] || "Bergamot",
    middleNote: middleNoteMatch
      ? middleNoteMatch[1].trim()
      : family.ingredients[1] || "Rose",
    baseNote: baseNoteMatch
      ? baseNoteMatch[1].trim()
      : family.ingredients[2] || "Sandalwood",
  };
}

async function generateMixingAndName(notes, family) {
  const namePrompt = `Create a creative perfume name for a ${family.name.toLowerCase()} fragrance with these notes:
- Top: ${notes.topNote}
- Middle: ${notes.middleNote}
- Base: ${notes.baseNote}

Name: `;

  const mixingPrompt = `Provide simple mixing instructions for a beginner perfumer making a ${family.name.toLowerCase()} fragrance with:
- Top note: ${notes.topNote}
- Middle note: ${notes.middleNote}
- Base note: ${notes.baseNote}

Instructions: `;

  try {
    const [nameResponse, mixingResponse] = await Promise.all([
      callTGI(namePrompt, { temperature: 0.8, max_new_tokens: 20 }),
      callTGI(mixingPrompt, { temperature: 0.5, max_new_tokens: 100 }),
    ]);

    const nameMatch = nameResponse.match(/Name:?\s*([^\n]+)/i);
    const mixingMatch = mixingResponse.match(/Instructions?:?\s*([^\n]+)/i);

    const name = nameMatch
      ? nameMatch[1].trim()
      : `${notes.topNote} ${family.name} Essence`;
    let mixing = mixingMatch
      ? mixingMatch[1].trim()
      : `Combine 3 drops of ${notes.topNote}, 2 drops of ${notes.middleNote}, and 1 drop of ${notes.baseNote}. Let mature for one week.`;

    if (mixing.length < 30) {
      mixing = `Combine 3 drops of ${notes.topNote}, 2 drops of ${notes.middleNote}, and 1 drop of ${notes.baseNote}. Mix gently and let mature for one week in a cool, dark place.`;
    }

    return { name, mixing };
  } catch (error) {
    console.error("Error generating name/mixing:", error);
    return {
      name: `${notes.topNote} ${family.name} Blend`,
      mixing: `Combine 3 drops of ${notes.topNote}, 2 drops of ${notes.middleNote}, and 1 drop of ${notes.baseNote}. Let mature for one week.`,
    };
  }
}
