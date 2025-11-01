/**
 * @swagger
 * /api/submissions/{id}/scores:
 *   get:
 *     summary: Get submission score summary with question-level scores
 *     description: Returns complete score breakdown for a submission including all question scores, rubric feedback, and pending questions. Students can view their own scores, teachers/admins can view any.
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Score summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submission:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [in-progress, submitted, graded, archived]
 *                     total_score:
 *                       type: number
 *                       example: 85.5
 *                     max_possible_score:
 *                       type: number
 *                       example: 100
 *                     percentage:
 *                       type: number
 *                       example: 85.5
 *                     submitted_at:
 *                       type: string
 *                       format: date-time
 *                     graded_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     activity:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                 scores:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     maxPossible:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                     gradedCount:
 *                       type: integer
 *                     pendingCount:
 *                       type: integer
 *                     totalQuestions:
 *                       type: integer
 *                 questionScores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       question:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                       score:
 *                         type: number
 *                       maxScore:
 *                         type: number
 *                       percentage:
 *                         type: number
 *                       feedback:
 *                         type: string
 *                         nullable: true
 *                       criteriaScores:
 *                         type: object
 *                         nullable: true
 *                       rubric:
 *                         type: object
 *                         nullable: true
 *                       gradedAt:
 *                         type: string
 *                         format: date-time
 *                 pendingQuestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       question:
 *                         type: object
 *                       status:
 *                         type: string
 *                         example: pending
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/submissions/{id}/auto-grade:
 *   post:
 *     summary: Trigger auto-grading for a submission
 *     description: Automatically grades all questions in a submission using configured scoring rules. Only works for submitted submissions. Admin/teacher only.
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Auto-grading completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Auto-grading completed
 *                 success:
 *                   type: boolean
 *                 autoGradedCount:
 *                   type: integer
 *                   description: Number of questions successfully auto-graded
 *                   example: 8
 *                 manualGradingRequired:
 *                   type: integer
 *                   description: Number of questions requiring manual grading
 *                   example: 2
 *                 totalQuestions:
 *                   type: integer
 *                   example: 10
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       responseId:
 *                         type: string
 *                       questionId:
 *                         type: string
 *                       success:
 *                         type: boolean
 *                       requiresManualGrading:
 *                         type: boolean
 *                       score:
 *                         type: object
 *                         nullable: true
 *                 finalScore:
 *                   type: object
 *                   properties:
 *                     totalScore:
 *                       type: number
 *                     maxPossibleScore:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                     gradedCount:
 *                       type: integer
 *                     pendingCount:
 *                       type: integer
 *       400:
 *         description: Invalid submission status (not submitted)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin or teacher role
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/submissions/{id}/calculate-score:
 *   post:
 *     summary: Recalculate submission total score
 *     description: Aggregates all existing question scores to update submission totals. Used after manual grading or score adjustments. Admin/teacher only.
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Score recalculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Score recalculated successfully
 *                 totalScore:
 *                   type: number
 *                   example: 85.5
 *                 maxPossibleScore:
 *                   type: number
 *                   example: 100
 *                 percentage:
 *                   type: number
 *                   example: 85.5
 *                 gradedCount:
 *                   type: integer
 *                   example: 10
 *                 pendingCount:
 *                   type: integer
 *                   example: 0
 *                 totalQuestions:
 *                   type: integer
 *                   example: 10
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin or teacher role
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/activities/{id}/report:
 *   get:
 *     summary: Get grading report for an activity
 *     description: Returns all student submissions for an activity with scores, statistics, and filters. Admin/teacher only.
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Activity ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in-progress, submitted, graded, archived]
 *         description: Filter by submission status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Activity report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                 submissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       submission:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           status:
 *                             type: string
 *                           submittedAt:
 *                             type: string
 *                             format: date-time
 *                           gradedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           first_name:
 *                             type: string
 *                           last_name:
 *                             type: string
 *                       scores:
 *                         type: object
 *                         properties:
 *                           total:
 *                             type: number
 *                           maxPossible:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                           gradedCount:
 *                             type: integer
 *                           pendingCount:
 *                             type: integer
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalSubmissions:
 *                       type: integer
 *                     gradedSubmissions:
 *                       type: integer
 *                     averageScore:
 *                       type: number
 *                     highestScore:
 *                       type: number
 *                     lowestScore:
 *                       type: number
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin or teacher role
 *       404:
 *         description: Activity not found
 */
