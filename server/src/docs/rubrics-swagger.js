/**
 * @swagger
 * /api/rubrics:
 *   post:
 *     summary: Create a new rubric
 *     tags: [Rubrics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - rubricType
 *             properties:
 *               title:
 *                 type: string
 *                 description: Rubric title
 *                 example: "Essay Grading Rubric"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Rubric description
 *                 example: "Comprehensive rubric for grading essays"
 *               rubricType:
 *                 type: string
 *                 enum: [points, criteria, pass_fail, percentage, custom]
 *                 description: Type of rubric
 *                 example: "criteria"
 *               maxScore:
 *                 type: number
 *                 nullable: true
 *                 description: Maximum score for the rubric
 *                 example: 100
 *               criteria:
 *                 type: array
 *                 description: Rubric criteria (for criteria-based rubrics)
 *                 items:
 *                   type: object
 *                   required:
 *                     - criterionName
 *                     - maxScore
 *                   properties:
 *                     criterionName:
 *                       type: string
 *                       example: "Grammar and Spelling"
 *                     description:
 *                       type: string
 *                       example: "Proper use of grammar and spelling"
 *                     maxScore:
 *                       type: number
 *                       example: 25
 *                     orderIndex:
 *                       type: integer
 *                       example: 0
 *                     levels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required:
 *                           - levelName
 *                           - scoreValue
 *                         properties:
 *                           levelName:
 *                             type: string
 *                             example: "Excellent"
 *                           description:
 *                             type: string
 *                             example: "Near perfect grammar and spelling"
 *                           scoreValue:
 *                             type: number
 *                             example: 25
 *                           orderIndex:
 *                             type: integer
 *                             example: 0
 *     responses:
 *       201:
 *         description: Rubric created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 rubric:
 *                   $ref: '#/components/schemas/Rubric'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin or teacher role
 *   get:
 *     summary: Get all rubrics with filters
 *     tags: [Rubrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rubricType
 *         schema:
 *           type: string
 *           enum: [points, criteria, pass_fail, percentage, custom]
 *         description: Filter by rubric type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived]
 *           default: active
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
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
 *         description: Rubrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rubrics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Rubric'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/rubrics/{id}:
 *   get:
 *     summary: Get rubric by ID with criteria and levels
 *     tags: [Rubrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rubric ID
 *     responses:
 *       200:
 *         description: Rubric retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rubric:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Rubric'
 *                     - type: object
 *                       properties:
 *                         criteria:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               criterion_name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               max_score:
 *                                 type: number
 *                               order_index:
 *                                 type: integer
 *                               levels:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                     level_name:
 *                                       type: string
 *                                     description:
 *                                       type: string
 *                                     score_value:
 *                                       type: number
 *                                     order_index:
 *                                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rubric not found
 *   put:
 *     summary: Update a rubric
 *     tags: [Rubrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rubric ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Update rubric title
 *               description:
 *                 type: string
 *                 description: Update rubric description
 *               maxScore:
 *                 type: number
 *                 description: Update maximum score
 *     responses:
 *       200:
 *         description: Rubric updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 rubric:
 *                   $ref: '#/components/schemas/Rubric'
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Rubric not found
 */

/**
 * @swagger
 * /api/rubrics/{id}/archive:
 *   delete:
 *     summary: Archive a rubric (soft delete)
 *     tags: [Rubrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rubric ID
 *     responses:
 *       200:
 *         description: Rubric archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Rubric archived successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Rubric not found
 */

/**
 * @swagger
 * /api/rubrics/{id}/criteria:
 *   post:
 *     summary: Add a criterion to a rubric
 *     tags: [Rubrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rubric ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - criterionName
 *               - maxScore
 *             properties:
 *               criterionName:
 *                 type: string
 *                 example: "Content Quality"
 *               description:
 *                 type: string
 *                 example: "Quality and relevance of content"
 *               maxScore:
 *                 type: number
 *                 example: 25
 *               orderIndex:
 *                 type: integer
 *                 example: 0
 *     responses:
 *       201:
 *         description: Criterion added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Rubric not found
 */

/**
 * @swagger
 * /api/rubrics/{id}/criteria/{criterionId}/levels:
 *   post:
 *     summary: Add a level to a rubric criterion
 *     tags: [Rubrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rubric ID
 *       - in: path
 *         name: criterionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Criterion ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - levelName
 *               - scoreValue
 *             properties:
 *               levelName:
 *                 type: string
 *                 example: "Good"
 *               description:
 *                 type: string
 *                 example: "Meets expectations with minor issues"
 *               scoreValue:
 *                 type: number
 *                 example: 20
 *               orderIndex:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Level added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Rubric or criterion not found
 */
