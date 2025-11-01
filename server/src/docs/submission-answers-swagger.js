/**
 * @swagger
 * /api/submission-answers:
 *   post:
 *     summary: Create a new submission answer
 *     tags: [Submission Answers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - submissionId
 *               - questionId
 *               - elementUuid
 *               - answerData
 *             properties:
 *               submissionId:
 *                 type: string
 *                 format: uuid
 *                 description: Parent submission ID
 *                 example: "s1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               questionId:
 *                 type: string
 *                 format: uuid
 *                 description: Question ID being answered
 *                 example: "q1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               elementUuid:
 *                 type: string
 *                 description: Interactive element UUID from question HTML
 *                 example: "elem-uuid-1234"
 *               answerData:
 *                 type: object
 *                 description: Answer data (structure depends on element type)
 *                 example: { "value": "My answer text" }
 *               status:
 *                 type: string
 *                 enum: [in-progress, submitted, archived]
 *                 description: Answer status (defaults to in-progress)
 *                 example: "in-progress"
 *     responses:
 *       201:
 *         description: Submission answer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 answer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     submission_id:
 *                       type: string
 *                     question_id:
 *                       type: string
 *                     element_uuid:
 *                       type: string
 *                     answer_data:
 *                       type: object
 *                     status:
 *                       type: string
 *                     version:
 *                       type: integer
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only add answers to own submissions
 *       404:
 *         description: Submission or question not found
 *       409:
 *         description: Answer already exists for this element
 *   get:
 *     summary: Get all submission answers with filters
 *     tags: [Submission Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: submissionId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by submission ID
 *       - in: query
 *         name: questionId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by question ID
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
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Submission answers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       submission_id:
 *                         type: string
 *                       question_id:
 *                         type: string
 *                       element_uuid:
 *                         type: string
 *                       answer_data:
 *                         type: object
 *                       status:
 *                         type: string
 *                       version:
 *                         type: integer
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/submission-answers/{id}:
 *   get:
 *     summary: Get submission answer by ID
 *     tags: [Submission Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission answer ID
 *     responses:
 *       200:
 *         description: Submission answer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     submission_id:
 *                       type: string
 *                     question_id:
 *                       type: string
 *                     element_uuid:
 *                       type: string
 *                     answer_data:
 *                       type: object
 *                     status:
 *                       type: string
 *                     version:
 *                       type: integer
 *                     submitted_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only view own submission answers
 *       404:
 *         description: Submission answer not found
 *   put:
 *     summary: Update a submission answer
 *     tags: [Submission Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission answer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answerData:
 *                 type: object
 *                 description: Updated answer data
 *                 example: { "value": "Updated answer text" }
 *               status:
 *                 type: string
 *                 enum: [in-progress, submitted, archived]
 *                 description: Updated status
 *     responses:
 *       200:
 *         description: Submission answer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 answer:
 *                   type: object
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only update own submission answers
 *       404:
 *         description: Submission answer not found
 */

/**
 * @swagger
 * /api/submission-answers/{id}/archive:
 *   delete:
 *     summary: Archive a submission answer (soft delete)
 *     tags: [Submission Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission answer ID
 *     responses:
 *       200:
 *         description: Submission answer archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Submission answer archived successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Submission answer not found
 */

/**
 * @swagger
 * /api/submission-answers/{id}/versions:
 *   get:
 *     summary: Get submission answer version history
 *     tags: [Submission Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission answer ID
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
 *                       answer_id:
 *                         type: string
 *                       version:
 *                         type: integer
 *                       submission_id:
 *                         type: string
 *                       question_id:
 *                         type: string
 *                       element_uuid:
 *                         type: string
 *                       answer_data:
 *                         type: object
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Submission answer not found
 */
