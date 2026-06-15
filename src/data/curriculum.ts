export interface Question {
  id: string;
  question: string;
  hint: string;
  expectedAnswer: string;
  phase?: 'Revision' | 'New Work';
}

export interface Lesson {
  name: string;
  questions: Question[];
}

export interface Stage {
  name: string;
  description: string;
  lessons: {
    [key: number]: Lesson;
  };
}

export interface Syllabus {
  [key: number]: Stage;
}

export let curriculumSyllabus: Syllabus = {};

export const CurriculumManager = {
  async load(): Promise<void> {
    try {
      const response = await fetch('/data/curriculum.json');
      if (!response.ok) {
        throw new Error(`Failed to load curriculum JSON: ${response.status}`);
      }
      curriculumSyllabus = await response.json();
      console.log('Curriculum syllabus loaded successfully.', curriculumSyllabus);
    } catch (err) {
      console.error('Error loading curriculum:', err);
      // Fallback
      curriculumSyllabus = {
        1: {
          name: "Stage 1: Beginner",
          description: "基本の文型、身の回りの名詞、位置関係（in, on, under 等）",
          lessons: {
            1: {
              name: "Lesson 1: Basic Objects & Colors",
              questions: [
                {
                  id: "s1-l1-q1",
                  question: "Is this a pen? Is this a pen?",
                  hint: "No / Pencil",
                  expectedAnswer: "No, it isn't a pen, but it's a pencil."
                }
              ]
            }
          }
        }
      };
    }
  },

  getLesson(stage: number, lesson: number): Lesson | null {
    const s = curriculumSyllabus[stage];
    if (!s) return null;
    return s.lessons[lesson] || null;
  },

  stageExists(stage: number): boolean {
    return !!curriculumSyllabus[stage];
  },

  lessonExists(stage: number, lesson: number): boolean {
    return !!(curriculumSyllabus[stage] && curriculumSyllabus[stage].lessons[lesson]);
  },

  compileSessionQuestions(stage: number, lesson: number): Question[] {
    const activeLesson = this.getLesson(stage, lesson);
    if (!activeLesson) return [];

    const compiled: Question[] = [];

    // Compile Revision Questions (from previous lesson in the curriculum)
    let revQuestions: Question[] = [];
    let prevStage = stage;
    let prevLesson = lesson - 1;

    if (prevLesson < 1) {
      prevStage -= 1;
      if (prevStage >= 1) {
        const stageLessons = curriculumSyllabus[prevStage].lessons;
        const lessonKeys = Object.keys(stageLessons).map(Number);
        prevLesson = Math.max(...lessonKeys);
      }
    }

    if (prevStage >= 1 && prevLesson >= 1) {
      const prevLessonData = this.getLesson(prevStage, prevLesson);
      if (prevLessonData && prevLessonData.questions) {
        const shuffled = [...prevLessonData.questions].sort(() => 0.5 - Math.random());
        revQuestions = shuffled.slice(0, 3).map(q => ({
          ...q,
          phase: 'Revision'
        }));
      }
    }

    compiled.push(...revQuestions);

    const newWork = activeLesson.questions.map(q => ({
      ...q,
      phase: 'New Work' as const
    }));
    compiled.push(...newWork);

    return compiled;
  }
};
