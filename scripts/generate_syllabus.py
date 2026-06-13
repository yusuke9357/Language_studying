#!/usr/bin/env python3
import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.error

# Stage Definitions with specific topics and keywords
STAGE_DEFINITIONS = {
    1: {
        "name": "Stage 1: Beginner",
        "description": "基本の文型、身の回りの名詞、位置関係（in, on, under 等）",
        "lessons": {
            1: {
                "name": "Lesson 1: Basic Objects & Colors",
                "focus": "Identifying everyday objects, sizes, and colors. Keywords: pen, pencil, book, table, chair, box, long/short, black/white/red/green/blue, small/large."
            },
            2: {
                "name": "Lesson 2: Locations & Prepositions",
                "focus": "Describing positions of objects. Keywords: on, under, in, behind, in front of, standing/sitting, teacher/student, window/table."
            },
            3: {
                "name": "Lesson 3: Plurals & Pronouns",
                "focus": "Plural forms and demonstrative pronouns. Keywords: these, those, books, notebooks, boxes, open/shut, windows, doors."
            }
        }
    },
    2: {
        "name": "Stage 2: Elementary",
        "description": "現在進行形（Doing）、所有代名詞（Mine, Yours）、一般動詞の基本と否定・疑問文",
        "lessons": {
            1: {
                "name": "Lesson 1: Present Continuous Actions",
                "focus": "Actions happening right now. Keywords: doing, standing, sitting, writing, speaking English, listening to the teacher, answering a question."
            },
            2: {
                "name": "Lesson 2: Possessive Pronouns",
                "focus": "Possessive adjectives and pronouns. Keywords: yours, mine, hers, his, ours, theirs, coat, pencils, classroom."
            },
            3: {
                "name": "Lesson 3: Present Simple & General Actions (一般動詞・時間)",
                "focus": "General truths, habits, and telling time. Keywords: live, speak, like, come, go, train, bus, watch vs clock (wear vs carry), hours/minutes/seconds."
            }
        }
    },
    3: {
        "name": "Stage 3: Pre-Intermediate",
        "description": "比較級（Bigger than）、最上級・頻度の副詞、命令形・数量詞",
        "lessons": {
            1: {
                "name": "Lesson 1: Comparatives (比較級)",
                "focus": "Comparing sizes, widths, and properties. Keywords: bigger than, wider than, smaller than, longer than, fly/dog, London/city, door/window."
            },
            2: {
                "name": "Lesson 2: Superlatives & Frequency Adverbs (最上級・頻度)",
                "focus": "Expressing extremes and frequency of habits. Keywords: biggest city, most expensive, always, sometimes, never, rarely, eat sugar."
            },
            3: {
                "name": "Lesson 3: Imperatives & Quantity (命令形・数量詞)",
                "focus": "Giving instructions, countable vs uncountable quantity. Keywords: tell to sit down/stand up, much, many, a lot of, few, count, cannot count."
            }
        }
    },
    4: {
        "name": "Stage 4: Intermediate-Intro",
        "description": "過去形・不規則動詞、現在完了形、条件文（if）",
        "lessons": {
            1: {
                "name": "Lesson 1: Past Simple & Irregular Verbs (過去形・不規則動詞)",
                "focus": "Past simple tense regular and irregular verbs. Keywords: yesterday, last night, watch TV, past of drink (drank), come (came), see (saw), table/morning."
            },
            2: {
                "name": "Lesson 2: Present Perfect (現在完了形)",
                "focus": "Experiences and ongoing states. Keywords: have ever been to London, lived in this city, eaten anything today, finished the lesson, for/since."
            },
            3: {
                "name": "Lesson 3: Conditionals (条件文)",
                "focus": "Hypothetical situations and future possibilities. Keywords: if it rains tomorrow, will stay at home, if you had a lot of money, would buy a big house, if you speak English well, if you were a bird (I'd fly)."
            }
        }
    }
}

PROMPT_TEMPLATE = """You are an expert Callan Method English Curriculum Designer.
Generate exactly {count} unique, natural, and high-quality Callan Method style questions and expected answers for:
Stage: {stage_name}
Lesson: {lesson_name}
Grammar & Vocabulary Focus: {focus}

Strict Rules for Callan Method Q&A Design:
1. Double Question Format: Every question must repeat the main question twice (e.g. "Is this a pen? Is this a pen?", "Did you watch TV last night? Did you watch TV last night?").
2. Full Sentence Contractions: The expected answer must be a COMPLETE, full sentence and MUST use verb contractions (e.g., "it's", "isn't", "aren't", "I'm", "I'll", "I'd", "we're", "they're", "don't", "doesn't", "didn't").
   - E.g. Correct: "No, it isn't a pen, but it's a pencil." / Incorrect: "No, it is not a pen."
   - E.g. Correct: "Yes, I'm sitting on a chair." / Incorrect: "Yes, I am sitting." (missing contraction, not a full sentence)
3. Negative-First Contrast: For negative answers, the format MUST start with the negative contraction first, followed by the positive correction.
   - Format: "No, [Subject] [Negative Verb], but [Subject] [Positive Verb]." (e.g. "No, it isn't a table, but it's a chair.")
4. Mix Q&A Types: Mix negative-first answers (about 60%) and positive-only answers (about 40%).
5. Unique Q&A IDs: Assign question IDs starting from "s{stage_num}-l{lesson_num}-q{start_index}" sequentially.
6. Visual Cue: For each question, provide a short 1-line Japanese description of a simple line-drawing illustration that matches the question context (e.g. "机の上のペン", "椅子に座っている男性"). Keep it under 15 Japanese characters.

Return the result strictly as a JSON object inside a markdown json code block with the following structure. Do not include any explanation outside the JSON:
{{
  "questions": [
    {{
      "id": "s{stage_num}-l{lesson_num}-q{index}",
      "question": "Double question format string",
      "hint": "Short prompt like 'No / Pencil' or 'Yes'",
      "expectedAnswer": "Strict Callan format answer using contractions",
      "visualCue": "Japanese visual cue description"
    }}
  ]
}}"""

def call_gemini(prompt, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                data = json.loads(res.read().decode("utf-8"))
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
        except urllib.error.HTTPError as e:
            print(f"  Gemini API error (attempt {attempt + 1}): {e.code} - {e.reason}. Retrying in 5s...")
            time.sleep(5)
        except Exception as e:
            print(f"  Network/JSON error (attempt {attempt + 1}): {e}. Retrying in 5s...")
            time.sleep(5)
            
    raise Exception("Failed to call Gemini API after 5 attempts.")

def main():
    parser = argparse.ArgumentParser(description="Callan Method Curriculum Q&A Pre-Generator")
    parser.add_argument("--api-key", help="Google Gemini API Key (or set GEMINI_API_KEY env var)")
    parser.add_argument("--questions-per-lesson", type=int, default=20, help="Number of questions to generate per lesson (default: 20)")
    parser.add_argument("--output", default="data/curriculum.json", help="Path to output JSON file")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: Gemini API Key is required. Set GEMINI_API_KEY env var or pass via --api-key.")
        sys.exit(1)

    print(f"Starting syllabus generation...")
    print(f"Targeting Stages 1 to 4 (12 lessons total).")
    print(f"Generating {args.questions_per-lesson} questions per lesson.")
    print(f"Total questions to generate: {12 * args.questions_per_lesson}\n")

    syllabus = {}

    for stage_num, stage_data in STAGE_DEFINITIONS.items():
        print(f"--- Generating Stage {stage_num}: {stage_data['name']} ---")
        stage_entry = {
            "name": stage_data["name"],
            "description": stage_data["description"],
            "lessons": {}
        }

        for lesson_num, lesson_data in stage_data["lessons"].items():
            print(f"  Generating Lesson {lesson_num}: {lesson_data['name']}...")
            
            # For large counts, we generate in chunks of 10 to guarantee higher quality & model constraints
            questions = []
            chunk_size = 10
            q_to_generate = args.questions_per_lesson
            
            while q_to_generate > 0:
                current_chunk = min(chunk_size, q_to_generate)
                start_idx = len(questions) + 1
                
                prompt = PROMPT_TEMPLATE.format(
                    count=current_chunk,
                    stage_name=stage_data["name"],
                    lesson_name=lesson_data["name"],
                    focus=lesson_data["focus"],
                    stage_num=stage_num,
                    lesson_num=lesson_num,
                    start_index=start_idx,
                    index=start_idx
                )
                
                try:
                    result = call_gemini(prompt, api_key)
                    chunk_questions = result.get("questions", [])
                    
                    # Ensure sequential unique IDs just in case the AI generated them weirdly
                    for i, q in enumerate(chunk_questions):
                        q["id"] = f"s{stage_num}-l{lesson_num}-q{start_idx + i}"
                        
                    questions.extend(chunk_questions)
                    print(f"    Generated chunk: {len(chunk_questions)} questions (Total: {len(questions)}/{args.questions_per_lesson})")
                except Exception as e:
                    print(f"    Failed to generate chunk starting at {start_idx}: {e}")
                    sys.exit(1)
                
                q_to_generate -= current_chunk
                if q_to_generate > 0:
                    time.sleep(1) # Small rate-limit protection

            stage_entry["lessons"][str(lesson_num)] = {
                "name": lesson_data["name"],
                "questions": questions
            }

        syllabus[str(stage_num)] = stage_entry
        print(f"Stage {stage_num} complete.\n")

    # Ensure output directory exists
    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Write to file
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(syllabus, f, ensure_ascii=False, indent=2)

    print(f"Syllabus generation complete!")
    print(f"Saved to: {args.output}")

if __name__ == "__main__":
    main()
