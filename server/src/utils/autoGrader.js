/**
 * Auto-Grading Engine
 *
 * Automatically grades student responses based on expected answers
 * and scoring configuration.
 */

/**
 * Normalize text for comparison
 */
const normalizeText = (text, options = {}) => {
  if (typeof text !== 'string') return '';

  let normalized = text.trim();

  if (!options.caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  if (options.removeWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ');
  }

  if (options.removePunctuation) {
    normalized = normalized.replace(/[^\w\s]/g, '');
  }

  return normalized;
};

/**
 * Calculate similarity between two strings (Levenshtein distance based)
 */
const calculateSimilarity = (str1, str2) => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
};

/**
 * Grade a text input response
 */
const gradeTextInput = (studentAnswer, expectedAnswer, config = {}) => {
  const {
    matchingStrategy = 'exact',
    caseSensitive = false,
    tolerance = 0.8,
    partialCredit = false,
  } = config;

  const studentText = normalizeText(studentAnswer, { caseSensitive });
  const expectedText = normalizeText(expectedAnswer, { caseSensitive });

  let score = 0;
  let maxScore = 1;
  let correct = false;

  if (matchingStrategy === 'exact') {
    correct = studentText === expectedText;
    score = correct ? maxScore : 0;
  } else if (matchingStrategy === 'fuzzy') {
    const similarity = calculateSimilarity(studentText, expectedText);
    correct = similarity >= tolerance;
    score = partialCredit ? similarity * maxScore : (correct ? maxScore : 0);
  } else if (matchingStrategy === 'contains') {
    correct = studentText.includes(expectedText) || expectedText.includes(studentText);
    score = correct ? maxScore : 0;
  }

  return {
    correct,
    score,
    maxScore,
    feedback: correct ? 'Correct answer' : `Expected: ${expectedAnswer}`,
    details: {
      studentAnswer,
      expectedAnswer,
      matchingStrategy,
      ...(matchingStrategy === 'fuzzy' && { similarity: calculateSimilarity(studentText, expectedText) })
    }
  };
};

/**
 * Grade a number input response
 */
const gradeNumberInput = (studentAnswer, expectedAnswer, config = {}) => {
  const {
    tolerance = 0,
    partialCredit = false,
  } = config;

  const studentNum = parseFloat(studentAnswer);
  const expectedNum = typeof expectedAnswer === 'object' ? expectedAnswer.value : parseFloat(expectedAnswer);
  const toleranceValue = typeof expectedAnswer === 'object' ? (expectedAnswer.tolerance || tolerance) : tolerance;

  if (isNaN(studentNum) || isNaN(expectedNum)) {
    return {
      correct: false,
      score: 0,
      maxScore: 1,
      feedback: 'Invalid number format',
      details: { studentAnswer, expectedAnswer }
    };
  }

  const difference = Math.abs(studentNum - expectedNum);
  const correct = difference <= toleranceValue;
  let score = 0;

  if (correct) {
    score = 1;
  } else if (partialCredit) {
    // Partial credit based on how close the answer is
    const percentError = difference / Math.abs(expectedNum);
    score = Math.max(0, 1 - percentError);
  }

  return {
    correct,
    score,
    maxScore: 1,
    feedback: correct ? 'Correct answer' : `Expected: ${expectedNum} ± ${toleranceValue}`,
    details: { studentAnswer: studentNum, expectedAnswer: expectedNum, difference, tolerance: toleranceValue }
  };
};

/**
 * Grade a multiple choice response (checkboxes or radio)
 */
const gradeMultipleChoice = (studentAnswer, expectedAnswer, config = {}) => {
  const {
    partialCredit = false,
    pointsPerCorrect = 1,
  } = config;

  // Normalize to arrays
  const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
  const expectedAnswers = Array.isArray(expectedAnswer) ? expectedAnswer : [expectedAnswer];

  const correctSelections = studentAnswers.filter(ans => expectedAnswers.includes(ans)).length;
  const incorrectSelections = studentAnswers.filter(ans => !expectedAnswers.includes(ans)).length;
  const missedSelections = expectedAnswers.filter(ans => !studentAnswers.includes(ans)).length;

  const allCorrect = correctSelections === expectedAnswers.length && incorrectSelections === 0;
  const maxScore = expectedAnswers.length * pointsPerCorrect;

  let score = 0;
  if (allCorrect) {
    score = maxScore;
  } else if (partialCredit) {
    // Give points for correct selections, deduct for incorrect ones
    score = Math.max(0, (correctSelections * pointsPerCorrect) - (incorrectSelections * pointsPerCorrect * 0.5));
  }

  return {
    correct: allCorrect,
    score,
    maxScore,
    feedback: allCorrect ? 'All correct' : `${correctSelections}/${expectedAnswers.length} correct selections`,
    details: {
      correctSelections,
      incorrectSelections,
      missedSelections,
      studentAnswers,
      expectedAnswers
    }
  };
};

/**
 * Grade an essay/text area response with keywords
 */
const gradeEssay = (studentAnswer, expectedCriteria, config = {}) => {
  const {
    keywords = [],
    minLength = 0,
    maxLength = Infinity,
    requiredPhrases = [],
  } = expectedCriteria;

  const studentText = normalizeText(studentAnswer, { caseSensitive: false });
  const wordCount = studentText.split(/\s+/).length;

  let score = 0;
  let maxScore = 0;
  const feedback = [];
  const details = {
    wordCount,
    lengthRequirement: { min: minLength, max: maxLength },
    keywordMatches: {},
    phraseMatches: {},
  };

  // Check length
  if (minLength > 0 || maxLength < Infinity) {
    maxScore += 1;
    if (wordCount >= minLength && wordCount <= maxLength) {
      score += 1;
      feedback.push(`Length: ${wordCount} words (within range)`);
    } else {
      feedback.push(`Length: ${wordCount} words (expected ${minLength}-${maxLength})`);
    }
    details.lengthCheck = wordCount >= minLength && wordCount <= maxLength;
  }

  // Check keywords
  if (keywords.length > 0) {
    maxScore += keywords.length;
    keywords.forEach(keyword => {
      const normalizedKeyword = normalizeText(keyword, { caseSensitive: false });
      const found = studentText.includes(normalizedKeyword);
      if (found) {
        score += 1;
        details.keywordMatches[keyword] = true;
      } else {
        details.keywordMatches[keyword] = false;
      }
    });
    const keywordScore = Object.values(details.keywordMatches).filter(Boolean).length;
    feedback.push(`Keywords: ${keywordScore}/${keywords.length} found`);
  }

  // Check required phrases
  if (requiredPhrases.length > 0) {
    maxScore += requiredPhrases.length;
    requiredPhrases.forEach(phrase => {
      const normalizedPhrase = normalizeText(phrase, { caseSensitive: false });
      const found = studentText.includes(normalizedPhrase);
      if (found) {
        score += 1;
        details.phraseMatches[phrase] = true;
      } else {
        details.phraseMatches[phrase] = false;
      }
    });
    const phraseScore = Object.values(details.phraseMatches).filter(Boolean).length;
    feedback.push(`Required phrases: ${phraseScore}/${requiredPhrases.length} found`);
  }

  const correct = maxScore > 0 && score === maxScore;

  return {
    correct,
    score,
    maxScore: maxScore || 1,
    feedback: feedback.join('; '),
    details
  };
};

/**
 * Main auto-grading function
 *
 * @param {Object} questionResponse - Student's response data
 * @param {Object} scoringConfig - Question scoring configuration
 * @returns {Object} Grading result with score, feedback, and details
 */
export const gradeResponse = (questionResponse, scoringConfig) => {
  const { expectedAnswers, autoGradeConfig = {}, fieldScores = {} } = scoringConfig;

  if (!expectedAnswers) {
    return {
      success: false,
      error: 'No expected answers configured for auto-grading'
    };
  }

  const results = {};
  let totalScore = 0;
  let totalMaxScore = 0;
  
  // Check if we're using per-field scoring
  const useFieldScoring = Object.keys(fieldScores).length > 0;

  // Grade each answer field
  for (const [fieldName, expectedAnswer] of Object.entries(expectedAnswers)) {
    const studentAnswer = questionResponse[fieldName];
    const fieldConfig = fieldScores[fieldName] || { points: 1, wrongPenalty: 0 };
    const fieldPoints = fieldConfig.points || 1;
    const wrongPenalty = fieldConfig.wrongPenalty || 0;

    // Check if answer is blank/missing
    const isBlank = studentAnswer === undefined || studentAnswer === null || studentAnswer === '';

    if (isBlank) {
      const penaltyScore = Math.max(0, wrongPenalty); // Apply blank penalty (same as wrong per spec)
      results[fieldName] = {
        correct: false,
        score: penaltyScore,
        maxScore: fieldPoints,
        feedback: 'No answer provided',
        details: { missing: true, penaltyApplied: wrongPenalty }
      };
      totalScore += penaltyScore;
      totalMaxScore += fieldPoints;
      continue;
    }

    let result;

    // Determine answer type and grade accordingly
    if (typeof expectedAnswer === 'boolean') {
      // Boolean answer (checkbox/radio field)
      const correct = studentAnswer === expectedAnswer;
      result = {
        correct,
        score: correct ? fieldPoints : 0,
        maxScore: fieldPoints,
        feedback: correct ? 'Correct selection' : `Expected: ${expectedAnswer ? 'selected' : 'not selected'}`,
        details: { studentAnswer, expectedAnswer }
      };
    } else if (typeof expectedAnswer === 'object' && expectedAnswer !== null) {
      if (expectedAnswer.keywords || expectedAnswer.minLength || expectedAnswer.requiredPhrases) {
        // Essay-type answer
        result = gradeEssay(studentAnswer, expectedAnswer, autoGradeConfig);
      } else if (expectedAnswer.value !== undefined) {
        // Number with tolerance
        result = gradeNumberInput(studentAnswer, expectedAnswer, autoGradeConfig);
      } else if (Array.isArray(expectedAnswer)) {
        // Multiple choice
        result = gradeMultipleChoice(studentAnswer, expectedAnswer, autoGradeConfig);
      } else {
        // Default to text
        result = gradeTextInput(studentAnswer, expectedAnswer, autoGradeConfig);
      }
    } else if (typeof expectedAnswer === 'number') {
      // Number answer
      result = gradeNumberInput(studentAnswer, expectedAnswer, autoGradeConfig);
    } else if (Array.isArray(expectedAnswer)) {
      // Multiple choice
      result = gradeMultipleChoice(studentAnswer, expectedAnswer, autoGradeConfig);
    } else {
      // Text answer
      result = gradeTextInput(studentAnswer, expectedAnswer, autoGradeConfig);
    }

    // Apply field-based scoring if configured
    if (useFieldScoring) {
      if (result.correct) {
        // Award field points for correct answer
        result.score = fieldPoints;
        result.maxScore = fieldPoints;
      } else {
        // Apply wrong penalty (negative points)
        result.score = Math.max(0, wrongPenalty); // Penalty is negative, so this gives 0 or positive small value
        result.maxScore = fieldPoints;
        result.details = {
          ...result.details,
          penaltyApplied: wrongPenalty,
          earnedPoints: wrongPenalty
        };
        result.feedback = `${result.feedback} (Penalty: ${wrongPenalty} points)`;
      }
    }

    results[fieldName] = result;
    totalScore += result.score;
    totalMaxScore += result.maxScore;
  }

  // Floor total score at 0 (cannot go negative)
  totalScore = Math.max(0, totalScore);

  const allCorrect = Object.values(results).every(r => r.correct);

  return {
    success: true,
    correct: allCorrect,
    score: totalScore,
    maxScore: totalMaxScore,
    percentage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0,
    fieldResults: results,
    feedback: allCorrect ? 'All answers correct!' : 'Some answers need review',
    gradedAt: new Date().toISOString(),
    scoringMethod: useFieldScoring ? 'field-based' : 'standard'
  };
};

export default {
  gradeResponse,
  gradeTextInput,
  gradeNumberInput,
  gradeMultipleChoice,
  gradeEssay
};
