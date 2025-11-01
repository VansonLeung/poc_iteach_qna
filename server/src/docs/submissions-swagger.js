/**
 * @swagger
 * /api/submissions:
 *   post:
 *     summary: Create a new submission for an activity
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activityId
 *             properties:
 *               activityId:
 *                 type: string
 *                 format: uuid
 *                 description: Activity ID to create submission for
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       201:
 *         description: Submission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 submission:
 *                   $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 *       409:
 *         description: Submission already exists for this user and activity
 *   get:
 *     summary: Get all submissions with filters
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activityId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by activity ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID (admin/teacher can view all)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in-progress, submitted, archived]
 *         description: Filter by status
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
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Submissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Submission'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/submissions/{id}:
 *   get:
 *     summary: Get submission by ID with answers
 *     tags: [Submissions]
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
 *         description: Submission retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submission:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Submission'
 *                     - type: object
 *                       properties:
 *                         answers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               question_id:
 *                                 type: string
 *                               element_uuid:
 *                                 type: string
 *                               answer_data:
 *                                 type: object
 *                               status:
 *                                 type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only view own submissions
 *       404:
 *         description: Submission not found
 *   put:
 *     summary: Update submission status
 *     tags: [Submissions]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [in-progress, submitted, archived]
 *                 description: New submission status
 *                 example: "submitted"
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 submission:
 *                   $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only update own submissions
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/submissions/{id}/archive:
 *   delete:
 *     summary: Archive a submission (soft delete)
 *     tags: [Submissions]
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
 *         description: Submission archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Submission archived successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/submissions/{id}/versions:
 *   get:
 *     summary: Get submission version history
 *     tags: [Submissions]
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
 *         description: Version history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 versions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       submission_id:
 *                         type: string
 *                       version:
 *                         type: integer
 *                       user_id:
 *                         type: string
 *                       activity_id:
 *                         type: string
 *                       status:
 *                         type: string
 *                       submitted_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       created_by:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/submissions/{id}/scores:
 *   get:
 *     summary: Get submission score summary
 *     description: Retrieves detailed scoring information for a submission including all question scores
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
 *     summary: Trigger auto-grading for submission
 *     description: Automatically grades all questions in a submission based on expected answers. Only works on submitted submissions. Admin/teacher only.
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
 *         description: Auto-grading completed successfully
 *       400:
 *         description: Invalid status - only submitted submissions can be auto-graded
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin/teacher only
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/submissions/{id}/calculate-score:
 *   post:
 *     summary: Recalculate submission total score
 *     description: Recalculates the total score from existing question scores. Useful after manual grading changes. Admin/teacher only.
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin/teacher only
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/submissions/{id}/grading:
 *   get:
 *     summary: Get submission for grading interface
 *     description: Retrieves complete submission details formatted for the grading interface. Includes questions, answers, rubrics, and scoring configuration. Admin/teacher only.
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
 *         description: Grading data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin/teacher only
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/submissions/{id}/answers/{answerId}/grade:
 *   post:
 *     summary: Manually grade a question answer
 *     description: Creates a manual grade for a specific question answer. Admin/teacher only.
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
 *       - in: path
 *         name: answerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Answer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *               - maxScore
 *             properties:
 *               score:
 *                 type: number
 *                 minimum: 0
 *               maxScore:
 *                 type: number
 *                 minimum: 0
 *               feedback:
 *                 type: string
 *               criteriaScores:
 *                 type: object
 *               rubricId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Question graded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin/teacher only
 *       404:
 *         description: Submission or answer not found
 *   put:
 *     summary: Update existing question grade
 *     description: Updates an existing grade for a question answer. Admin/teacher only.
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
 *       - in: path
 *         name: answerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Answer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               score:
 *                 type: number
 *                 minimum: 0
 *               maxScore:
 *                 type: number
 *                 minimum: 0
 *               feedback:
 *                 type: string
 *               criteriaScores:
 *                 type: object
 *     responses:
 *       200:
 *         description: Grade updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin/teacher only
 *       404:
 *         description: Submission, answer, or existing grade not found
 */

/**
 * @swagger
 * /api/submissions/{id}/grade-all:
 *   post:
 *     summary: Grade all questions in submission at once
 *     description: Bulk grade all questions in a submission. Useful for batch grading. Admin/teacher only.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grades
 *             properties:
 *               grades:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/QuestionGrade'
 *     responses:
 *       200:
 *         description: Grading completed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin/teacher only
 *       404:
 *         description: Submission not found
 */

/**
 * @swagger
 * /api/submissions/{id}/status:
 *   patch:
 *     summary: Change submission status
 *     description: Manually change submission status. Can set to 'graded' status. Admin/teacher only.
 *     tags: [Submissions]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ['in-progress', 'submitted', 'graded', 'archived']
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin/teacher only
 *       404:
 *         description: Submission not found
 */
