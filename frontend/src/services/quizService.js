/**
 * Quiz Service - Generate MCQ questions using Gemini AI
 */

class QuizService {
  constructor() {
    this.apiKey = 'AIzaSyCObwM0GfZF8WU9_NC1ZsD3cchtykbq2fA';
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  /**
   * Generate quiz from a topic/subject name
   * @param {string} topic - Topic or subject name
   * @param {number} numQuestions - Number of questions to generate
   * @returns {Promise<Object>} Quiz object with questions
   */
  async generateQuizFromTopic(topic, numQuestions = 20) {
    const prompt = `Generate ${numQuestions} multiple-choice questions about: "${topic}"

Create comprehensive questions that test understanding of this topic. Cover different aspects and difficulty levels.

For each question:
1. Create a clear, specific question
2. Provide 4 answer options (A, B, C, D)
3. Mark the correct answer (use index 0-3)
4. Provide a brief explanation

Format your response as a JSON array with this EXACT structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer_index": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

IMPORTANT: Return ONLY the JSON array, no additional text or markdown formatting.

Generate the ${numQuestions} quiz questions now:`;

    try {
      const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }

      const generatedText = data.candidates[0].content.parts[0].text;

      // Parse the generated text into quiz format
      const quiz = this.parseQuizResponse(generatedText);

      return quiz;
    } catch (error) {
      console.error('Quiz generation error:', error);
      throw new Error(error.message || 'Failed to generate quiz. Please try again.');
    }
  }

  /**
   * Parse Gemini response into quiz format
   * @param {string} responseText - Raw response from Gemini
   * @returns {Object} Parsed quiz object
   */
  parseQuizResponse(responseText) {
    try {
      // Remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
      }

      // Extract JSON from response
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not parse quiz format - no JSON array found');
      }

      const questions = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid quiz format - expected non-empty array');
      }

      // Ensure each question has required fields with consistent naming
      const validatedQuestions = questions.map((q, index) => ({
        id: index + 1,
        question: q.question || q.question_text || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: typeof q.correct_answer_index === 'number' 
          ? q.correct_answer_index 
          : (typeof q.correctAnswer === 'number' ? q.correctAnswer : 0),
        explanation: q.explanation || ''
      }));

      return {
        questions: validatedQuestions,
        totalQuestions: validatedQuestions.length
      };
    } catch (error) {
      console.error('Parse error:', error);
      console.error('Response text:', responseText);
      throw new Error('Failed to parse quiz questions: ' + error.message);
    }
  }

  /**
   * Calculate quiz score
   * @param {Array} questions - Array of question objects
   * @param {Array} userAnswers - Array of selected answer indices
   * @returns {Object} Score results
   */
  calculateScore(questions, userAnswers) {
    let correct = 0;
    const results = questions.map((q, index) => {
      const isCorrect = userAnswers[index] === q.correctAnswer;
      if (isCorrect) correct++;

      return {
        questionId: q.id,
        question: q.question,
        userAnswer: userAnswers[index],
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation
      };
    });

    return {
      score: Math.round((correct / questions.length) * 100),
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
      results
    };
  }
}

// Export singleton instance
export default new QuizService();
