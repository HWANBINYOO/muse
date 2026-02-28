import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, SongRecommendation, SongConcept } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const is429 = error?.status === 429 || error?.code === 429 || error?.message?.includes('429');
      if (is429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 2000; // 2s, 4s, 8s
        console.warn(`Rate limited. Retrying in ${delay / 1000}s... (${i + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export const getMusicRecommendations = async (prefs: UserPreferences): Promise<SongRecommendation[]> => {
  const model = "gemini-2.0-flash";

  // Construct a prompt that enforces Korean output and numeric data
  const prompt = `
    당신은 세계적인 음악학자이자 초개인화된 AI DJ입니다.
    사용자의 다음 취향 정보를 바탕으로 6~8곡의 매우 구체적인 노래 추천 리스트를 작성해주세요.

    [사용자 프로필]
    - 현재 기분/분위기: ${prefs.moods.join(", ")}
    - 선호 장르: ${prefs.genres.join(", ")}
    - 현재 활동/상황: ${prefs.activity}
    - 선호하는 시대: ${prefs.era}
    - 좋아하는 아티스트: ${prefs.similarArtists}
    - 구체적인 요청/바이브: ${prefs.specificDetails}
    - Spotify 연동 여부: ${prefs.isSpotifyConnected ? "연동됨" : "연동 안 됨"}

    [응답 요구사항]
    1. "reasoning" 필드: 미사여구를 빼고, 왜 이 곡이 적합한지 핵심만 1-2문장으로 간결하게 한국어로 작성하세요.
    2. "musicalAnalysis" 필드: 사운드 특징을 전문 용어로 짧게 요약하세요.
    3. 수치 데이터 생성:
       - tempo: BPM (숫자)
       - energyLevel: 곡의 에너지/강렬함 (1~100 사이 숫자)
       - emotionDepth: 감정의 깊이/진지함 (1~100 사이 숫자)
    4. 반드시 유효한 JSON 형식으로만 응답하세요.
  `;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              artist: { type: Type.STRING },
              title: { type: Type.STRING },
              album: { type: Type.STRING },
              year: { type: Type.STRING },
              genre: { type: Type.STRING },
              reasoning: { type: Type.STRING, description: "Concise Korean explanation" },
              musicalAnalysis: { type: Type.STRING, description: "Short technical analysis" },
              moodTags: { type: Type.ARRAY, items: { type: Type.STRING } },
              tempo: { type: Type.INTEGER },
              energyLevel: { type: Type.INTEGER },
              emotionDepth: { type: Type.INTEGER },
            },
            required: ["artist", "title", "album", "year", "genre", "reasoning", "musicalAnalysis", "moodTags", "tempo", "energyLevel", "emotionDepth"],
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("AI로부터 데이터가 반환되지 않았습니다.");
    }

    return JSON.parse(jsonText) as SongRecommendation[];
  });
};

export const generateSongConcept = async (theme: string): Promise<SongConcept> => {
  const model = "gemini-2.0-flash";
  
  const prompt = `
    당신은 프로듀서이자 전문 사운드 엔지니어입니다. DAW(Digital Audio Workstation)를 위한 세부 트랙 정보를 생성해야 합니다.
    사용자가 요청한 테마: "${theme}"
    
    이 테마를 바탕으로 창의적인 신곡 데모의 기술 명세서를 작성해주세요.
    
    [응답 요구사항]
    1. title: 감각적인 제목 (한국어/영어)
    2. style: 정확한 서브 장르 (예: Liquid Drum & Bass, Neo-Soul with Lo-fi textures)
    3. tempo: BPM (예: 124 BPM)
    4. key: Key (예: F Minor)
    5. instruments: 사용할 악기 및 가상악기 프리셋 이름 4~6개 (예: "Roland Juno-106 Pad", "808 Kick", "Fender Jazz Bass")
    6. lyrics: 하이라이트 가사 4줄.
    7. compositionNotes: 전문적인 편곡 및 믹싱 노트. 주파수 대역, 이펙터 사용(Reverb, Delay 등), 다이나믹스 등을 포함하여 구체적으로(한국어).
    
    JSON 형식으로 응답하세요.
  `;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            style: { type: Type.STRING },
            tempo: { type: Type.STRING },
            key: { type: Type.STRING },
            instruments: { type: Type.ARRAY, items: { type: Type.STRING } },
            lyrics: { type: Type.STRING },
            compositionNotes: { type: Type.STRING },
          },
          required: ["title", "style", "tempo", "key", "instruments", "lyrics", "compositionNotes"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("데이터 생성 실패");

    return JSON.parse(jsonText) as SongConcept;
  });
}