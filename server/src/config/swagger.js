import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'iTeach Q&A Platform API',
      version: '1.0.0',
      description: 'Interactive Question-Answer Learning/Online Training Platform API Documentation',
      contact: {
        name: 'API Support',
        email: 'support@iteach-qna.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.iteach-qna.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: { type: 'string' },
                  param: { type: 'string' },
                  location: { type: 'string' }
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['admin', 'teacher', 'student'],
              description: 'User role'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'User account status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        Activity: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Activity ID'
            },
            title: {
              type: 'string',
              description: 'Activity title'
            },
            description: {
              type: 'string',
              description: 'Activity description'
            },
            status: {
              type: 'string',
              enum: ['active', 'archived'],
              description: 'Activity status'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Activity tags'
            },
            version: {
              type: 'integer',
              description: 'Current version number'
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who created the activity'
            },
            updated_by: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who last updated the activity'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Question: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Question ID'
            },
            title: {
              type: 'string',
              description: 'Question title'
            },
            body_html: {
              type: 'string',
              description: 'Question HTML content with interactive elements'
            },
            parent_question_id: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Parent question ID for inheritance'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Question tags'
            },
            version: {
              type: 'integer',
              description: 'Current version number'
            },
            status: {
              type: 'string',
              enum: ['active', 'archived'],
              description: 'Question status'
            },
            created_by: {
              type: 'string',
              format: 'uuid'
            },
            updated_by: {
              type: 'string',
              format: 'uuid'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ActivityElement: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            activity_id: {
              type: 'string',
              format: 'uuid'
            },
            parent_element_id: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            element_type: {
              type: 'string',
              enum: ['section', 'question']
            },
            question_id: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            title: {
              type: 'string',
              nullable: true
            },
            description: {
              type: 'string',
              nullable: true
            },
            order_index: {
              type: 'integer',
              description: 'Order within parent element'
            },
            status: {
              type: 'string',
              enum: ['active', 'archived']
            },
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            version: {
              type: 'integer'
            }
          }
        },
        Submission: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            user_id: {
              type: 'string',
              format: 'uuid'
            },
            activity_id: {
              type: 'string',
              format: 'uuid'
            },
            status: {
              type: 'string',
              enum: ['in-progress', 'submitted', 'graded', 'archived']
            },
            version: {
              type: 'integer'
            },
            submitted_at: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            submitted_by: {
              type: 'string',
              format: 'uuid'
            },
            updated_by: {
              type: 'string',
              format: 'uuid'
            },
            total_score: {
              type: 'number',
              nullable: true
            },
            max_possible_score: {
              type: 'number',
              nullable: true
            },
            percentage: {
              type: 'number',
              nullable: true
            },
            graded_at: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            graded_by: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            },
            activity_title: {
              type: 'string',
              nullable: true
            },
            user_email: {
              type: 'string',
              nullable: true
            },
            first_name: {
              type: 'string',
              nullable: true
            },
            last_name: {
              type: 'string',
              nullable: true
            }
          }
        },
        SubmissionAnswer: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            submission_id: {
              type: 'string',
              format: 'uuid'
            },
            question_id: {
              type: 'string',
              format: 'uuid'
            },
            element_uuid: {
              type: 'string',
              nullable: true
            },
            answer_data: {
              type: 'object',
              description: 'JSON object containing answer field values'
            },
            status: {
              type: 'string',
              enum: ['in-progress', 'submitted', 'archived']
            },
            version: {
              type: 'integer'
            },
            submitted_at: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            submitted_by: {
              type: 'string',
              format: 'uuid'
            },
            updated_by: {
              type: 'string',
              format: 'uuid'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            },
            question_title: {
              type: 'string',
              nullable: true
            }
          }
        },
        QuestionGrade: {
          type: 'object',
          properties: {
            answerId: {
              type: 'string',
              format: 'uuid'
            },
            score: {
              type: 'number',
              minimum: 0
            },
            maxScore: {
              type: 'number',
              minimum: 0
            },
            feedback: {
              type: 'string',
              nullable: true
            },
            criteriaScores: {
              type: 'object',
              nullable: true,
              description: 'Object mapping criterion IDs to scores'
            },
            rubricId: {
              type: 'string',
              format: 'uuid',
              nullable: true
            }
          },
          required: ['answerId', 'score', 'maxScore']
        },
        Rubric: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            title: {
              type: 'string'
            },
            description: {
              type: 'string',
              nullable: true
            },
            rubric_type: {
              type: 'string',
              enum: ['points', 'criteria', 'pass_fail', 'percentage', 'custom']
            },
            max_score: {
              type: 'number',
              nullable: true
            },
            status: {
              type: 'string',
              enum: ['active', 'archived']
            },
            created_by: {
              type: 'string',
              format: 'uuid'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Items per page'
            },
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Activities',
        description: 'Activity management endpoints'
      },
      {
        name: 'Activity Elements',
        description: 'Activity element (sections and questions) management'
      },
      {
        name: 'Questions',
        description: 'Question library management'
      },
      {
        name: 'Submissions',
        description: 'User activity submission management'
      },
      {
        name: 'Submission Answers',
        description: 'Individual question answer management'
      },
      {
        name: 'Rubrics',
        description: 'Grading rubric management'
      },
      {
        name: 'Question Scoring',
        description: 'Question scoring configuration'
      },
      {
        name: 'Scoring',
        description: 'Auto-grading, score calculation, and activity reports'
      }
    ]
  },
  apis: [
    './src/routes/*.js',  // Path to the API routes
    './src/docs/*.js'     // Path to additional documentation
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
