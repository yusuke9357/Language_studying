/**
 * API Module for Callan AI Tutor
 * Handles requests to the Google Gemini API (gemini-2.5-flash) for evaluating
 * answers and generating dynamic questions.
 * Enhanced in Phase 2 to evaluate pronunciation/typo advice.
 */

const ApiClient = {
  // Call Gemini API to evaluate an answer
  async evaluateAnswer(question, expectedAnswer, userAnswer) {
    const apiKey = StorageManager.db.apiKey;
    if (!apiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `
You are a strict Callan Method English Tutor. Your job is to evaluate if the student's spoken/written answer matches the target Callan Method rules, AND check for common pronunciation/transcription mistakes.

Strict Callan Method Rules to enforce:
1. The answer must be a COMPLETE, FULL sentence. Absolutely no short answers (e.g., if question is "Is this a book?", answering "No" or "No, a pencil" is wrong. They must say "No, it isn't a book, but it's a pencil.").
2. Contractions MUST be used for verbs (e.g. "it's" instead of "it is", "isn't" instead of "is not", "aren't" instead of "are not", "I'm" instead of "I am", "you're" instead of "you are"). Failing to use contractions is a Callan failure.
3. For negative answers, the format MUST start with the negative contraction first, followed by the positive correction. For example: "No, it isn't a table, but it's a chair."
4. Grammatical errors must be corrected.
5. Slight minor differences in synonyms are okay as long as Callan structure (no short answers + contractions) is strictly kept, but the closer to the target the better.

Pronunciation & Transcription Analysis:
Since the user answered via Speech-to-Text (voice recognition), they might make pronunciation mistakes that lead to specific transcription typos.
Look closely at the differences. If you notice likely pronunciation problems:
- "L" vs "R" confusion (e.g., "lead" instead of "read", "grass" instead of "glass")
- "V" vs "B" confusion (e.g., "berry" instead of "very")
- "S" vs "TH" confusion (e.g., "sink" instead of "think")
- "F" vs "H" confusion (e.g., "hood" instead of "food")
- Dropping ending consonants (e.g., "pen" instead of "pens")
Provide a specific correction tip in Japanese detailing how to make the correct sound (mouth shape, tongue position).

Inputs:
- Question Asked: "${question}"
- Target/Expected Answer: "${expectedAnswer}"
- Student's Answer: "${userAnswer}"

Please evaluate this answer.
Return the result strictly in the following JSON format:
{
  "isCorrect": true, // true ONLY if they followed Callan rules (full sentence + contractions) AND meaning is correct. Set false if they missed contractions (e.g. said "it is not" instead of "it isn't" or "is not" instead of "isn't") or did not reply in a full sentence.
  "callanFeedback": "A short, encouraging comment in Japanese explaining if they followed the Callan rules (e.g. '短縮形 isn\\'t と it\\'s を使って完璧にフルセンテンスで答えられました！')",
  "grammarFeedback": "文法的な修正や解説 (Japanese, if any errors. Otherwise empty string)",
  "pronunciationFeedback": "発音や聞き取りミス（L vs R, V vs B, ending soundsなど）に関する日本語の具体的なアドバイス。特に問題がなければ空文字列にしてください。",
  "expectedCorrectFormat": "The target correct answer string in Callan style (e.g. 'No, it isn\\'t a pen, but it\\'s a pencil.')"
}
`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: Status ${response.status}`);
      }

      const data = await response.json();
      const textResult = data.candidates[0].content.parts[0].text;
      
      return JSON.parse(textResult);
    } catch (err) {
      console.error('Failed to communicate with Gemini API:', err);
      throw err;
    }
  },

  // Generate dynamic questions based on a topic (Advanced Custom Lessons)
  async generateCustomQuestions(topic, count = 5) {
    const apiKey = StorageManager.db.apiKey;
    if (!apiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `
Generate ${count} Callan Method style questions and expected answers based on the topic: "${topic}".

Callan Method Q&A Design Guidelines:
1. Each question must be in a double-question format (e.g. "Is this a pen? Is this a pen?").
2. The expected answer must be a COMPLETE sentence using contractions.
3. Mix negative-first answers and positive-only answers.
   - Example Negative-first: "No, it isn't a pen, but it's a pencil."
   - Example Positive-only: "Yes, I'm sitting on the chair."
4. Target grammar and words suitable for everyday conversational training.

Return the result strictly in the following JSON format:
{
  "questions": [
    {
      "question": "Is this a book? Is this a book? (negative target)",
      "expectedAnswer": "No, it isn't a book, but it's a notebook."
    },
    {
      "question": "Are you learning English? Are you learning English? (positive target)",
      "expectedAnswer": "Yes, I'm learning English."
    }
  ]
}
`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: Status ${response.status}`);
      }

      const data = await response.json();
      const textResult = data.candidates[0].content.parts[0].text;
      return JSON.parse(textResult);
    } catch (err) {
      console.error('Failed to generate custom questions:', err);
      throw err;
    }
  }
};
window.ApiClient = ApiClient;
