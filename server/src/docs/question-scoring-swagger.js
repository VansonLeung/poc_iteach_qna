/**
 * @swagger
 * /api/question-scoring:
 *   post:
 *     summary: Configure scoring for a question
 *     tags: [Question Scoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionId
 *             properties:
 *               questionId:
 *                 type: string
 *                 format: uuid
 *                 description: Question ID to configure scoring for
 *                 example: "q1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               rubricId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Rubric ID to use for scoring
 *                 example: "r1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               scoringType:
 *                 type: string
 *                 enum: [auto, manual, hybrid]
 *                 default: manual
 *                 description: Type of scoring
 *                 example: "manual"
 *               weight:
 *                 type: number
 *                 default: 1.0
 *                 description: Weight of this question in overall scoring
 *                 example: 1.5
 *               expectedAnswers:
 *                 type: object
 *                 nullable: true
 *                 description: Expected answers for auto-grading (JSON)
 *                 example: { "correct_answer": "JavaScript is a programming language" }
 *               autoGradeConfig:
 *                 type: object
 *                 nullable: true
 *                 description: Auto-grading configuration (JSON)
 *                 example: { "case_sensitive": false, "partial_credit": true }
 *               fieldPoints:
 *                 type: object
 *                 nullable: true
 *                 description: Points allocation per field/element
 *                 example: { "field1": 10, "field2": 15 }
 *               fieldPenalty:
 *                 type: object
 *                 nullable: true
 *                 description: Penalty configuration per field
 *                 example: { "field1": -2, "field2": -3 }
 *     responses:
 *       201:
 *         description: Question scoring configured successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 scoring:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     question_id:
 *                       type: string
 *                     rubric_id:
 *                       type: string
 *                       nullable: true
 *                     scoring_type:
 *                       type: string
 *                     weight:
 *                       type: number
 *                     expected_answers:
 *                       type: object
 *                       nullable: true
 *                     auto_grade_config:
 *                       type: object
 *                       nullable: true
 *                     field_points:
 *                       type: object
 *                       nullable: true
 *                     field_penalty:
 *                       type: object
 *                       nullable: true
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin or teacher role
 *       404:
 *         description: Question or rubric not found
 *       409:
 *         description: Scoring configuration already exists for this question
 */

/**
 * @swagger
 * /api/question-scoring/{questionId}:
 *   get:
 *     summary: Get scoring configuration for a question
 *     tags: [Question Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Scoring configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scoring:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     question_id:
 *                       type: string
 *                     rubric_id:
 *                       type: string
 *                       nullable: true
 *                     scoring_type:
 *                       type: string
 *                     weight:
 *                       type: number
 *                     expected_answers:
 *                       type: object
 *                       nullable: true
 *                     auto_grade_config:
 *                       type: object
 *                       nullable: true
 *                     field_points:
 *                       type: object
 *                       nullable: true
 *                     field_penalty:
 *                       type: object
 *                       nullable: true
 *                     rubric:
 *                       $ref: '#/components/schemas/Rubric'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Question or scoring configuration not found
 *   put:
 *     summary: Update scoring configuration for a question
 *     tags: [Question Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Question ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rubricId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Update rubric ID
 *               scoringType:
 *                 type: string
 *                 enum: [auto, manual, hybrid]
 *                 description: Update scoring type
 *               weight:
 *                 type: number
 *                 description: Update weight
 *               expectedAnswers:
 *                 type: object
 *                 nullable: true
 *                 description: Update expected answers
 *               autoGradeConfig:
 *                 type: object
 *                 nullable: true
 *                 description: Update auto-grading configuration
 *               fieldPoints:
 *                 type: object
 *                 nullable: true
 *                 description: Update field points allocation
 *               fieldPenalty:
 *                 type: object
 *                 nullable: true
 *                 description: Update field penalty configuration
 *     responses:
 *       200:
 *         description: Scoring configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 scoring:
 *                   type: object
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Question or scoring configuration not found
 *   delete:
 *     summary: Delete scoring configuration for a question
 *     tags: [Question Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Scoring configuration deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Question scoring configuration deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Question or scoring configuration not found
 */

/**
 * @swagger
 * /api/question-scoring/{questionId}/calculate:
 *   post:
 *     summary: Calculate score for a question response
 *     description: Calculate the score for a given answer based on the question's scoring configuration
 *     tags: [Question Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Question ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answerData
 *             properties:
 *               answerData:
 *                 type: object
 *                 description: Student's answer data to score
 *                 example: { "field1": "JavaScript", "field2": "is a programming language" }
 *     responses:
 *       200:
 *         description: Score calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 score:
 *                   type: number
 *                   description: Calculated score
 *                   example: 85
 *                 maxScore:
 *                   type: number
 *                   description: Maximum possible score
 *                   example: 100
 *                 percentage:
 *                   type: number
 *                   description: Score as percentage
 *                   example: 85
 *                 breakdown:
 *                   type: object
 *                   description: Detailed score breakdown by field
 *                   example: { "field1": 10, "field2": 15 }
 *                 feedback:
 *                   type: string
 *                   description: Auto-generated feedback
 *                   example: "Good work! Minor improvements needed."
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Question or scoring configuration not found
 */
