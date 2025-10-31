# Question Design Philosophy

## Simplified Approach - Maximum Flexibility

### Key Principle: HTML-First Design

Questions are **pure HTML with data attributes**. No separate database table for interactive elements. This provides maximum flexibility and simplicity.

## How It Works

### 1. Questions Store Only HTML
```javascript
const question = {
  id: uuidv4(),
  title: 'What is JavaScript?',
  body_html: `
    <div class="question-content">
      <h3>Explain JavaScript</h3>
      <textarea
        data-element-uuid="${uuidv4()}"
        data-element-type="textarea"
        data-element-label="Your Answer"
        placeholder="Type here..."
      ></textarea>
    </div>
  `,
  tags: ['javascript', 'basics']
}
```

### 2. Frontend Parses Interactive Elements at Runtime

```javascript
// Client-side parsing (React component)
const QuestionRenderer = ({ questionHtml }) => {
  // Render HTML as-is
  return <div dangerouslySetInnerHTML={{ __html: questionHtml }} />;

  // Or parse and replace with React components
  const parseInteractiveElements = (html) => {
    // Find all elements with data-element-uuid
    // Replace with controlled React inputs
    // Attach onChange handlers
  };
};
```

### 3. Answers Reference UUIDs Directly

```javascript
const answer = {
  submission_id: 'submission-uuid',
  question_id: 'question-uuid',
  element_uuid: 'element-uuid-from-html',
  answer_data: {
    value: 'User typed answer',
    timestamp: '2024-01-15T10:30:00Z'
  }
}
```

## Benefits

### ✅ Maximum Flexibility
- Teachers can design questions with **any HTML structure**
- Mix text, images, videos, custom layouts
- No constraints from database schema

### ✅ Simplicity
- No separate `question_interactive_elements` table
- No syncing between HTML and database
- Fewer moving parts = fewer bugs

### ✅ Frontend Freedom
- Parse HTML however you want
- Use any UI library (React, Vue, vanilla JS)
- Easy to add new input types without backend changes

### ✅ Versioning Works Naturally
- Question HTML is versioned
- Interactive elements are versioned with it
- No orphaned element records

### ✅ Easy Migration
- Questions from other platforms can be imported directly
- No need to extract and store elements separately

## Data Attributes

### Standard Attributes

#### `data-element-uuid` (Required)
Unique identifier for the interactive element. Used to store/retrieve answers.

```html
<input data-element-uuid="123e4567-e89b-12d3-a456-426614174000" />
```

#### `data-element-type` (Optional)
Helps frontend render appropriate component.

```html
<textarea data-element-type="textarea"></textarea>
<input data-element-type="text_input" />
<input data-element-type="radio" />
<input data-element-type="checkbox" />
<select data-element-type="select"></select>
```

#### `data-element-label` (Optional)
Human-readable label for reporting/analytics.

```html
<input
  data-element-uuid="uuid-here"
  data-element-type="text_input"
  data-element-label="Student Name"
/>
```

#### `data-element-config` (Optional)
JSON configuration for special behaviors.

```html
<input
  data-element-uuid="uuid-here"
  data-element-config='{"required":true,"maxLength":100}'
/>
```

## Example Questions

### Text Input
```html
<div class="question">
  <h3>What's your name?</h3>
  <input
    type="text"
    data-element-uuid="a1b2c3d4"
    data-element-type="text_input"
    data-element-label="Name"
    placeholder="Enter your name"
  />
</div>
```

### Multiple Choice (Radio)
```html
<div class="question">
  <h3>Choose your favorite color:</h3>
  <label>
    <input
      type="radio"
      name="color"
      value="red"
      data-element-uuid="e5f6g7h8"
      data-element-type="radio"
      data-element-label="Red"
    /> Red
  </label>
  <label>
    <input
      type="radio"
      name="color"
      value="blue"
      data-element-uuid="i9j0k1l2"
      data-element-type="radio"
      data-element-label="Blue"
    /> Blue
  </label>
</div>
```

### Select All (Checkboxes)
```html
<div class="question">
  <h3>Select valid data types:</h3>
  <label>
    <input
      type="checkbox"
      value="string"
      data-element-uuid="m3n4o5p6"
      data-element-type="checkbox"
      data-element-label="String"
    /> String
  </label>
  <label>
    <input
      type="checkbox"
      value="number"
      data-element-uuid="q7r8s9t0"
      data-element-type="checkbox"
      data-element-label="Number"
    /> Number
  </label>
</div>
```

### Rich Media Question
```html
<div class="question">
  <h3>Watch this video and answer:</h3>
  <video src="/videos/tutorial.mp4" controls></video>

  <p>What did you learn?</p>
  <textarea
    data-element-uuid="u1v2w3x4"
    data-element-type="textarea"
    rows="5"
    placeholder="Your thoughts..."
  ></textarea>
</div>
```

## Frontend Implementation Pattern

### Parse and Render (React Example)

```javascript
import { useState, useEffect } from 'react';

const InteractiveQuestion = ({ question, onAnswer }) => {
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    // Find all interactive elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(question.body_html, 'text/html');
    const interactiveElements = doc.querySelectorAll('[data-element-uuid]');

    // Attach event listeners
    interactiveElements.forEach(element => {
      const uuid = element.getAttribute('data-element-uuid');
      element.addEventListener('change', (e) => {
        handleChange(uuid, e.target.value);
      });
    });
  }, [question.body_html]);

  const handleChange = (uuid, value) => {
    const newAnswers = { ...answers, [uuid]: value };
    setAnswers(newAnswers);
    onAnswer(question.id, uuid, value);
  };

  return (
    <div
      className="question-container"
      dangerouslySetInnerHTML={{ __html: question.body_html }}
    />
  );
};
```

### Or Use a Library (TipTap, Quill, etc.)

The HTML can be edited with any WYSIWYG editor. Just ensure:
1. Interactive elements have `data-element-uuid`
2. UUIDs are generated when elements are added
3. UUIDs are preserved during editing

## Answer Storage

Answers are stored with the element UUID:

```javascript
// Creating an answer
POST /api/submission-answers
{
  "submissionId": "submission-uuid",
  "questionId": "question-uuid",
  "elementUuid": "element-uuid-from-html",
  "answerData": {
    "value": "User's answer",
    "selectedOptions": ["option1", "option2"],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Validation (Optional)

Frontend can implement validation based on:
- HTML5 attributes (`required`, `minlength`, etc.)
- `data-element-config` JSON
- Custom validation rules

No backend validation of answers needed - teachers review submissions.

## Migration from Old Approach

If you had a `question_interactive_elements` table:

1. **No migration needed!**
2. Elements are already in the HTML
3. Just remove the table
4. Frontend parses elements at runtime

## Summary

**Before (Complex):**
- Question HTML → Extract elements → Store in DB table → Sync on update → Query joins

**Now (Simple):**
- Question HTML → Done! Frontend parses as needed.

This is the philosophy: **Keep it simple. HTML is the source of truth.**
