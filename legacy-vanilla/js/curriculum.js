/**
 * Curriculum Module for Callan AI Tutor
 * Houses the default Stage 1-3 Q&A syllabus,
 * and handles Revision vs New Work question partitioning.
 */

const CurriculumManager = {
  // Default syllabus data
  syllabus: {
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
            },
            {
              id: "s1-l1-q2",
              question: "Is this a table? Is this a table?",
              hint: "No / Chair",
              expectedAnswer: "No, it isn't a table, but it's a chair."
            },
            {
              id: "s1-l1-q3",
              question: "Is the pen long? Is the pen long?",
              hint: "Yes",
              expectedAnswer: "Yes, the pen's long."
            },
            {
              id: "s1-l1-q4",
              question: "Is this book black? Is this book black?",
              hint: "No / White",
              expectedAnswer: "No, this book isn't black, but it's white."
            },
            {
              id: "s1-l1-q5",
              question: "Is the box small? Is the box small?",
              hint: "Yes",
              expectedAnswer: "Yes, the box's small."
            }
          ]
        },
        2: {
          name: "Lesson 2: Locations & Prepositions",
          questions: [
            {
              id: "s1-l2-q1",
              question: "Is the pen on the book? Is the pen on the book?",
              hint: "Yes",
              expectedAnswer: "Yes, the pen's on the book."
            },
            {
              id: "s1-l2-q2",
              question: "Is the pencil in the box? Is the pencil in the box?",
              hint: "No / Under the box",
              expectedAnswer: "No, the pencil isn't in the box, but it's under the box."
            },
            {
              id: "s1-l2-q3",
              question: "Are you sitting on a chair? Are you sitting on a chair?",
              hint: "Yes",
              expectedAnswer: "Yes, I'm sitting on a chair."
            },
            {
              id: "s1-l2-q4",
              question: "Is the teacher standing in front of the window? Is the teacher standing in front of the window?",
              hint: "No / Behind the table",
              expectedAnswer: "No, the teacher isn't standing in front of the window, but he's standing behind the table."
            }
          ]
        },
        3: {
          name: "Lesson 3: Plurals & Pronouns",
          questions: [
            {
              id: "s1-l3-q1",
              question: "Are these pens? Are these pens?",
              hint: "Yes",
              expectedAnswer: "Yes, these are pens."
            },
            {
              id: "s1-l3-q2",
              question: "Are those books? Are those books?",
              hint: "No / Notebooks",
              expectedAnswer: "No, those aren't books, but they're notebooks."
            },
            {
              id: "s1-l3-q3",
              question: "Are the boxes open? Are the boxes open?",
              hint: "Yes",
              expectedAnswer: "Yes, the boxes are open."
            },
            {
              id: "s1-l3-q4",
              question: "Are the windows shut? Are the windows shut?",
              hint: "No / Open",
              expectedAnswer: "No, the windows aren't shut, but they're open."
            }
          ]
        }
      }
    },
    2: {
      name: "Stage 2: Elementary",
      description: "現在進行形（Doing）、所有代名詞（Mine, Yours）、一般動詞の基本と否定・疑問文",
      lessons: {
        1: {
          name: "Lesson 1: Present Continuous Actions",
          questions: [
            {
              id: "s2-l1-q1",
              question: "What's the teacher doing? What's the teacher doing?",
              hint: "Standing",
              expectedAnswer: "The teacher's standing."
            },
            {
              id: "s2-l1-q2",
              question: "Are you speaking English? Are you speaking English?",
              hint: "Yes",
              expectedAnswer: "Yes, I'm speaking English."
            },
            {
              id: "s2-l1-q3",
              question: "Is the student writing in a book? Is the student writing in a book?",
              hint: "No / Listening to the teacher",
              expectedAnswer: "No, the student isn't writing in a book, but he's listening to the teacher."
            },
            {
              id: "s2-l1-q4",
              question: "What's the student doing? What's the student doing?",
              hint: "Answering a question",
              expectedAnswer: "The student's answering a question."
            }
          ]
        },
        2: {
          name: "Lesson 2: Possessive Pronouns",
          questions: [
            {
              id: "s2-l2-q1",
              question: "Is this book yours? Is this book yours?",
              hint: "No / Mine",
              expectedAnswer: "No, this book isn't yours, but it's mine."
            },
            {
              id: "s2-l2-q2",
              question: "Is that coat mine? Is that coat mine?",
              hint: "No / Hers",
              expectedAnswer: "No, that coat isn't yours, but it's hers."
            },
            {
              id: "s2-l2-q3",
              question: "Are these pencils theirs? Are these pencils theirs?",
              hint: "Yes",
              expectedAnswer: "Yes, these pencils are theirs."
            },
            {
              id: "s2-l2-q4",
              question: "Is this classroom ours? Is this classroom ours?",
              hint: "Yes",
              expectedAnswer: "Yes, this classroom's ours."
            }
          ]
        },
        3: {
          name: "Lesson 3: Present Simple & General Actions (一般動詞・時間)",
          questions: [
            {
              id: "s2-l3-q1",
              question: "Do you live in London? Do you live in London?",
              hint: "No / Tokyo",
              expectedAnswer: "No, I don't live in London, but I live in Tokyo."
            },
            {
              id: "s2-l3-q2",
              question: "Does he speak Japanese? Does he speak Japanese?",
              hint: "Yes",
              expectedAnswer: "Yes, he speaks Japanese."
            },
            {
              id: "s2-l3-q3",
              question: "What's the difference between a watch and a clock? What's the difference between a watch and a clock?",
              hint: "Watch: wrist / Clock: wall",
              expectedAnswer: "The difference between a watch and a clock is that we wear a watch on our wrist, whilst we hang a clock on the wall."
            },
            {
              id: "s2-l3-q4",
              question: "How many minutes are there in an hour? How many minutes are there in an hour?",
              hint: "60",
              expectedAnswer: "There are sixty minutes in an hour."
            },
            {
              id: "s2-l3-q5",
              question: "Do you come to school by train or by bus? Do you come to school by train or by bus?",
              hint: "By train",
              expectedAnswer: "I come to school by train."
            }
          ]
        }
      }
    },
    3: {
      name: "Stage 3: Pre-Intermediate",
      description: "比較級（Bigger than）、最上級・頻度の副詞、命令形・数量詞",
      lessons: {
        1: {
          name: "Lesson 1: Comparatives (比較級)",
          questions: [
            {
              id: "s3-l1-q1",
              question: "Is London bigger than this city? Is London bigger than this city?",
              hint: "Yes",
              expectedAnswer: "Yes, London's bigger than this city."
            },
            {
              id: "s3-l1-q2",
              question: "Is the door wider than the window? Is the door wider than the window?",
              hint: "Yes",
              expectedAnswer: "Yes, the door's wider than the window."
            },
            {
              id: "s3-l1-q3",
              question: "Is a fly larger than a dog? Is a fly larger than a dog?",
              hint: "No / Smaller",
              expectedAnswer: "No, a fly isn't larger than a dog, but it's smaller than a dog."
            },
            {
              id: "s3-l1-q4",
              question: "Is the table longer than the room? Is the table longer than the room?",
              hint: "No / Shorter",
              expectedAnswer: "No, the table isn't longer than the room, but it's shorter than the room."
            }
          ]
        },
        2: {
          name: "Lesson 2: Superlatives & Frequency Adverbs (最上級・頻度)",
          questions: [
            {
              id: "s3-l2-q1",
              question: "Which is the biggest city in Japan? Which is the biggest city in Japan?",
              hint: "Tokyo",
              expectedAnswer: "Tokyo's the biggest city in Japan."
            },
            {
              id: "s3-l2-q2",
              question: "Is your watch more expensive than your shoes? Is your watch more expensive than your shoes?",
              hint: "Yes",
              expectedAnswer: "Yes, my watch's more expensive than my shoes."
            },
            {
              id: "s3-l2-q3",
              question: "Do you always speak English at home? Do you always speak English at home?",
              hint: "No / Sometimes",
              expectedAnswer: "No, I don't always speak English at home, but I sometimes speak it."
            },
            {
              id: "s3-l2-q4",
              question: "Do you ever eat sugar? Do you ever eat sugar?",
              hint: "Yes",
              expectedAnswer: "Yes, I sometimes eat sugar."
            }
          ]
        },
        3: {
          name: "Lesson 3: Imperatives & Quantity (命令形・数量詞)",
          questions: [
            {
              id: "s3-l3-q1",
              question: "What's the teacher telling the student to do? What's the teacher telling the student to do?",
              hint: "Sit down",
              expectedAnswer: "The teacher's telling the student to sit down."
            },
            {
              id: "s3-l3-q2",
              question: "Do we use 'much' for things we can count or cannot count? Do we use 'much' for things we can count or cannot count?",
              hint: "Cannot count",
              expectedAnswer: "We use 'much' for things we cannot count."
            },
            {
              id: "s3-l3-q3",
              question: "Do you read a lot of books? Do you read a lot of books?",
              hint: "Yes",
              expectedAnswer: "Yes, I read a lot of books."
            },
            {
              id: "s3-l3-q4",
              question: "Are there few cars in a big city? Are there few cars in a big city?",
              hint: "No / Many",
              expectedAnswer: "No, there aren't few cars in a big city, but there are many cars."
            }
          ]
        }
      }
    },
    4: {
      name: "Stage 4: Intermediate-Intro",
      description: "過去形・不規則動詞、現在完了形、条件文（if）",
      lessons: {
        1: {
          name: "Lesson 1: Past Simple & Irregular Verbs (過去形・不規則動詞)",
          questions: [
            {
              id: "s4-l1-q1",
              question: "Did you watch TV last night? Did you watch TV last night?",
              hint: "Yes",
              expectedAnswer: "Yes, I watched TV last night."
            },
            {
              id: "s4-l1-q2",
              question: "What's the past tense of 'drink'? What's the past tense of 'drink'?",
              hint: "Drank",
              expectedAnswer: "The past tense of 'drink' is 'drank'."
            },
            {
              id: "s4-l1-q3",
              question: "Did you come to school by bus yesterday? Did you come to school by bus yesterday?",
              hint: "No / By train",
              expectedAnswer: "No, I didn't come to school by bus yesterday, but I came by train."
            },
            {
              id: "s4-l1-q4",
              question: "What did you see on the table this morning? What did you see on the table this morning?",
              hint: "A book",
              expectedAnswer: "I saw a book on the table this morning."
            }
          ]
        },
        2: {
          name: "Lesson 2: Present Perfect (現在完了形)",
          questions: [
            {
              id: "s4-l2-q1",
              question: "Have you ever been to London? Have you ever been to London?",
              hint: "No / Never",
              expectedAnswer: "No, I've never been to London."
            },
            {
              id: "s4-l2-q2",
              question: "Have you lived in this city for many years? Have you lived in this city for many years?",
              hint: "Yes",
              expectedAnswer: "Yes, I've lived in this city for many years."
            },
            {
              id: "s4-l2-q3",
              question: "Have you eaten anything today? Have you eaten anything today?",
              hint: "Yes",
              expectedAnswer: "Yes, I've eaten something today."
            },
            {
              id: "s4-l2-q4",
              question: "Has the teacher finished the lesson? Has the teacher finished the lesson?",
              hint: "No",
              expectedAnswer: "No, the teacher hasn't finished the lesson."
            }
          ]
        },
        3: {
          name: "Lesson 3: Conditionals (条件文)",
          questions: [
            {
              id: "s4-l3-q1",
              question: "If it rains tomorrow, will you stay at home? If it rains tomorrow, will you stay at home?",
              hint: "Yes",
              expectedAnswer: "Yes, if it rains tomorrow, I'll stay at home."
            },
            {
              id: "s4-l3-q2",
              question: "If you had a lot of money, what would you buy? If you had a lot of money, what would you buy?",
              hint: "A big house",
              expectedAnswer: "If I had a lot of money, I'd buy a big house."
            },
            {
              id: "s4-l3-q3",
              question: "If you speak English well, will you travel more? If you speak English well, will you travel more?",
              hint: "Yes",
              expectedAnswer: "Yes, if I speak English well, I'll travel more."
            },
            {
              id: "s4-l3-q4",
              question: "If you were a bird, would you fly? If you were a bird, would you fly?",
              hint: "Yes",
              expectedAnswer: "Yes, if I were a bird, I'd fly."
            }
          ]
        }
      }
    }
  },

  // Get a single lesson's details
  getLesson(stage, lesson) {
    const s = this.syllabus[stage];
    if (!s) return null;
    const l = s.lessons[lesson];
    if (!l) return null;
    return l;
  },

  // Check if a stage exists
  stageExists(stage) {
    return !!this.syllabus[stage];
  },

  // Check if a lesson exists in a stage
  lessonExists(stage, lesson) {
    return !!(this.syllabus[stage] && this.syllabus[stage].lessons[lesson]);
  },

  // Callan session question compiler
  // A Callan lesson always consists of:
  // 1. Revision Phase: 3-5 questions from preceding lessons
  // 2. New Work Phase: All questions from the current active lesson
  compileSessionQuestions(stage, lesson) {
    const activeLesson = this.getLesson(stage, lesson);
    if (!activeLesson) return [];

    const compiled = [];

    // 1. Compile Revision Questions (from previous lesson in the curriculum)
    let revQuestions = [];
    let prevStage = parseInt(stage);
    let prevLesson = parseInt(lesson) - 1;

    // Check if we need to wrap to previous stage
    if (prevLesson < 1) {
      prevStage -= 1;
      if (prevStage >= 1) {
        // Get the last lesson of the previous stage
        const stageLessons = this.syllabus[prevStage].lessons;
        const lessonKeys = Object.keys(stageLessons).map(Number);
        prevLesson = Math.max(...lessonKeys);
      }
    }

    if (prevStage >= 1 && prevLesson >= 1) {
      const prevLessonData = this.getLesson(prevStage, prevLesson);
      if (prevLessonData && prevLessonData.questions) {
        // Take up to 3 random questions from the previous lesson
        const shuffled = [...prevLessonData.questions].sort(() => 0.5 - Math.random());
        revQuestions = shuffled.slice(0, 3).map(q => ({
          ...q,
          phase: 'Revision'
        }));
      }
    }

    // Add revision items
    compiled.push(...revQuestions);

    // 2. Add New Work Questions (current lesson questions)
    const newWork = activeLesson.questions.map(q => ({
      ...q,
      phase: 'New Work'
    }));
    compiled.push(...newWork);

    return compiled;
  }
};
window.CurriculumManager = CurriculumManager;
