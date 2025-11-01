import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionAPI, rubricAPI, questionScoringAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Save, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function QuestionBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    bodyHtml: '',
    parentQuestionId: null,
    tags: [],
  });
  const [scoringData, setScoringData] = useState({
    rubricId: '',
    scoringType: 'manual',
    weight: 1,
    maxScore: 10,
    expectedAnswers: {},
    autoGradeConfig: {
      caseSensitive: false,
      partialMatch: false,
    },
    fieldScores: {}, // { uuid: { points: 5, wrongPenalty: -1 } }
  });
  const [interactiveElements, setInteractiveElements] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scoringExists, setScoringExists] = useState(false);

  const isEditMode = !!id;

  useEffect(() => {
    fetchRubrics();
    if (isEditMode) {
      fetchQuestion();
      fetchQuestionScoring();
    }
  }, [id]);

  const fetchRubrics = async () => {
    try {
      const response = await rubricAPI.getAll({ status: 'active', limit: 100 });
      setRubrics(response.data.rubrics || []);
    } catch (error) {
      console.error('Error fetching rubrics:', error);
    }
  };

  const fetchQuestion = async () => {
    try {
      const response = await questionAPI.getById(id);
      const question = response.data.question;
      setFormData({
        title: question.title,
        bodyHtml: question.body_html,
        parentQuestionId: question.parent_question_id || null,
        tags: question.tags || [],
      });
    } catch (error) {
      console.error('Error fetching question:', error);
      setError('Failed to load question');
    }
  };

  const fetchQuestionScoring = async () => {
    try {
      const response = await questionScoringAPI.get(id);
      if (response.data.scoring) {
        const scoring = response.data.scoring;
        setScoringExists(true);
        setScoringData({
          rubricId: scoring.rubric_id || '',
          scoringType: scoring.scoring_type || 'manual',
          weight: scoring.weight || 1,
          maxScore: scoring.max_score || 10,
          expectedAnswers: scoring.expected_answers || {},
          autoGradeConfig: scoring.auto_grade_config || {
            caseSensitive: false,
            partialMatch: false,
          },
          fieldScores: scoring.field_scores || {},
        });
      }
    } catch (error) {
      // It's OK if no scoring exists yet
      setScoringExists(false);
      console.log('No scoring config found for this question');
    }
  };

  // Parse interactive elements from HTML
  const parseInteractiveElements = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements = [];

    // Find all elements with data-element-uuid
    const interactiveNodes = doc.querySelectorAll('[data-element-uuid]');
    
    interactiveNodes.forEach((node) => {
      const uuid = node.getAttribute('data-element-uuid');
      const type = node.getAttribute('data-element-type');
      const label = node.getAttribute('data-element-label') || 
                   node.closest('.form-group')?.querySelector('label')?.textContent?.trim() ||
                   'Unlabeled element';
      
      // Check if this UUID already exists
      if (!elements.find(el => el.uuid === uuid)) {
        const element = {
          uuid,
          type: type || node.tagName.toLowerCase(),
          label,
          inputType: node.type || 'text',
        };

        // For radio and checkbox, extract the value and create option info
        if (type === 'radio' || type === 'checkbox') {
          element.value = node.value || node.getAttribute('value') || '';
          element.optionLabel = label;

          // Get the group name (from 'name' attribute)
          element.groupName = node.name || node.getAttribute('name') || '';
        }

        elements.push(element);
      }
    });

    // Group radio buttons and checkboxes by name
    const groupedElements = [];
    const radioGroups = {};
    const checkboxGroups = {};
    const processedUuids = new Set();

    elements.forEach((el) => {
      if (processedUuids.has(el.uuid)) return;

      if (el.type === 'radio' && el.groupName) {
        if (!radioGroups[el.groupName]) {
          radioGroups[el.groupName] = {
            uuid: `${el.groupName}`,
            type: 'radio-group',
            label: el.label.replace(/Option \d+/i, '').trim() || 'Radio Group',
            groupName: el.groupName,
            options: []
          };
        }
        radioGroups[el.groupName].options.push({
          uuid: el.uuid,
          value: el.value,
          label: el.optionLabel
        });
        processedUuids.add(el.uuid);
      } else if (el.type === 'checkbox' && el.groupName) {
        // Group checkboxes by their 'name' attribute
        if (!checkboxGroups[el.groupName]) {
          checkboxGroups[el.groupName] = {
            uuid: `${el.groupName}`,
            type: 'checkbox-group',
            label: el.label.replace(/Option \d+/i, '').trim() || 'Checkbox Group',
            groupName: el.groupName,
            options: []
          };
        }
        checkboxGroups[el.groupName].options.push({
          uuid: el.uuid,
          value: el.value,
          label: el.optionLabel
        });
        processedUuids.add(el.uuid);
      } else {
        // Individual element (text, textarea, or checkbox/radio without name)
        groupedElements.push(el);
      }
    });

    // Add radio and checkbox groups
    Object.values(radioGroups).forEach(group => {
      groupedElements.push(group);
    });
    Object.values(checkboxGroups).forEach(group => {
      groupedElements.push(group);
    });

    return groupedElements;
  };

  // Update interactive elements when bodyHtml changes
  useEffect(() => {
    if (formData.bodyHtml) {
      const elements = parseInteractiveElements(formData.bodyHtml);
      setInteractiveElements(elements);
    } else {
      setInteractiveElements([]);
    }
  }, [formData.bodyHtml]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let questionId = id;
      
      if (isEditMode) {
        await questionAPI.update(id, formData);
        toast({
          title: "Question updated",
          description: "Question has been updated successfully.",
        });
      } else {
        const response = await questionAPI.create(formData);
        questionId = response.data.question.id;
        toast({
          title: "Question created",
          description: "Question has been created successfully.",
        });
      }

      // Save or update scoring configuration if rubric is selected or answers configured
      if (scoringData.rubricId || scoringData.scoringType !== 'manual' || Object.keys(scoringData.expectedAnswers).length > 0) {
        // Get all valid field identifiers from the current question HTML
        const validFieldIds = new Set();
        const parser = new DOMParser();
        const doc = parser.parseFromString(formData.bodyHtml, 'text/html');

        // Collect all field identifiers (name or data-element-uuid)
        const inputs = doc.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
          const fieldId = input.getAttribute('name') || input.getAttribute('data-element-uuid');
          if (fieldId) {
            validFieldIds.add(fieldId);
          }
        });

        // Clean expectedAnswers - remove entries with empty values AND orphaned keys
        const cleanedExpectedAnswers = Object.entries(scoringData.expectedAnswers || {}).reduce((acc, [key, value]) => {
          // Keep only if: 1) value is not empty, AND 2) field still exists in HTML
          if (value !== '' && value !== null && value !== undefined && validFieldIds.has(key)) {
            acc[key] = value;
          }
          return acc;
        }, {});

        // Clean fieldScores - remove entries with invalid values AND orphaned keys
        const cleanedFieldScores = Object.entries(scoringData.fieldScores || {}).reduce((acc, [key, value]) => {
          const points = parseFloat(value?.points);
          const wrongPenalty = parseFloat(value?.wrongPenalty);

          // Only include if: 1) points is valid, AND 2) field still exists in HTML
          if (!isNaN(points) && points !== 0 && validFieldIds.has(key)) {
            acc[key] = {
              points,
              wrongPenalty: !isNaN(wrongPenalty) ? wrongPenalty : 0
            };
          }
          return acc;
        }, {});

        const scoringPayload = {
          questionId,
          rubricId: scoringData.rubricId || null,
          scoringType: scoringData.scoringType,
          weight: parseFloat(scoringData.weight),
          maxScore: parseFloat(scoringData.maxScore),
          expectedAnswers: Object.keys(cleanedExpectedAnswers).length > 0 ? cleanedExpectedAnswers : undefined,
          autoGradeConfig: scoringData.autoGradeConfig,
          fieldScores: Object.keys(cleanedFieldScores).length > 0 ? cleanedFieldScores : undefined,
        };

        try {
          if (scoringExists) {
            await questionScoringAPI.update(questionId, scoringPayload);
          } else {
            await questionScoringAPI.create(scoringPayload);
            setScoringExists(true); // Mark as existing after successful creation
          }
        } catch (scoringError) {
          console.error('Error saving scoring config:', scoringError);
          toast({
            variant: "destructive",
            title: "Warning",
            description: "Question saved but scoring configuration failed.",
          });
        }
      }

      navigate('/admin/questions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save question');
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.error || 'Failed to save question',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const insertInteractiveElement = (type) => {
    const uuid = crypto.randomUUID();
    let template = '';

    switch (type) {
      case 'text_input':
        template = `<div class="form-group my-4">
  <label data-element-label="Your answer">Your answer:</label>
  <input type="text" data-element-uuid="${uuid}" data-element-type="text_input" placeholder="Type your answer..." class="w-full p-2 border rounded" />
</div>`;
        break;
      case 'textarea':
        template = `<div class="form-group my-4">
  <label data-element-label="Your answer">Your answer:</label>
  <textarea data-element-uuid="${uuid}" data-element-type="textarea" rows="4" placeholder="Type your answer..." class="w-full p-2 border rounded"></textarea>
</div>`;
        break;
      case 'radio':
        // Each radio button has unique UUID, but shares 'name' attribute for grouping
        const radioGroupName = `radio-${uuid}`;
        template = `<div class="form-group my-4">
  <label>Choose one option:</label>
  <div>
    <label><input type="radio" name="${radioGroupName}" data-element-uuid="${crypto.randomUUID()}" data-element-type="radio" data-element-label="Option 1" value="option1" /> Option 1</label>
  </div>
  <div>
    <label><input type="radio" name="${radioGroupName}" data-element-uuid="${crypto.randomUUID()}" data-element-type="radio" data-element-label="Option 2" value="option2" /> Option 2</label>
  </div>
</div>`;
        break;
      case 'checkbox':
        // All checkboxes in a group share the same 'name' for grouping
        const checkboxGroupName = `checkbox-${uuid}`;
        template = `<div class="form-group my-4">
  <label>Select all that apply:</label>
  <div>
    <label><input type="checkbox" name="${checkboxGroupName}" data-element-uuid="${crypto.randomUUID()}" data-element-type="checkbox" data-element-label="Option 1" value="option1" /> Option 1</label>
  </div>
  <div>
    <label><input type="checkbox" name="${checkboxGroupName}" data-element-uuid="${crypto.randomUUID()}" data-element-type="checkbox" data-element-label="Option 2" value="option2" /> Option 2</label>
  </div>
</div>`;
        break;
    }

    setFormData({
      ...formData,
      bodyHtml: formData.bodyHtml + '\n' + template,
    });
  };

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/admin/questions')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Questions
        </Button>
      </div>

      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditMode ? 'Edit Question' : 'Create New Question'}
            </CardTitle>
            <CardDescription>
              Build interactive questions with various input types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Question Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="e.g., What is JavaScript?"
                />
              </div>

              {/* Split screen layout: Editor on left, Preview on right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left side: Editor */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bodyHtml">Question Body (HTML) *</Label>
                    <div className="mb-2 flex gap-2 flex-wrap">
                      <Button type="button" size="sm" variant="outline" onClick={() => insertInteractiveElement('text_input')}>
                        + Text Input
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertInteractiveElement('textarea')}>
                        + Textarea
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertInteractiveElement('radio')}>
                        + Radio Buttons
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertInteractiveElement('checkbox')}>
                        + Checkboxes
                      </Button>
                    </div>
                    <textarea
                      id="bodyHtml"
                      name="bodyHtml"
                      value={formData.bodyHtml}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      placeholder="Enter HTML for question body..."
                      className="flex min-h-[500px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use the buttons above to insert interactive elements with UUIDs
                    </p>
                  </div>
                </div>

                {/* Right side: Live Preview */}
                <div className="space-y-2">
                  <Label>Live Preview</Label>
                  <div className="sticky top-6">
                    <div className="p-4 border rounded-md bg-muted/30 min-h-[500px] max-h-[600px] overflow-y-auto">
                      {formData.bodyHtml ? (
                        <div
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: formData.bodyHtml }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Preview will appear here as you type...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                    disabled={loading}
                  />
                  <Button type="button" variant="outline" onClick={addTag} disabled={loading}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm bg-secondary rounded-full flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Scoring & Rubric Configuration */}
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Scoring Configuration</CardTitle>
                  </div>
                  <CardDescription>
                    Assign a rubric and configure scoring settings for this question
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rubric">Rubric (Optional)</Label>
                      <Select
                        value={scoringData.rubricId || "none"}
                        onValueChange={(value) => setScoringData({ ...scoringData, rubricId: value === "none" ? "" : value })}
                        disabled={loading}
                      >
                        <SelectTrigger id="rubric">
                          <SelectValue placeholder="Select a rubric..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {rubrics.map((rubric) => (
                            <SelectItem key={rubric.id} value={rubric.id}>
                              {rubric.title} ({rubric.rubric_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {rubrics.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No rubrics available. <a href="/admin/rubrics/new" className="text-primary hover:underline">Create one</a>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scoringType">Scoring Type</Label>
                      <Select
                        value={scoringData.scoringType}
                        onValueChange={(value) => setScoringData({ ...scoringData, scoringType: value })}
                        disabled={loading}
                      >
                        <SelectTrigger id="scoringType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual Grading</SelectItem>
                          <SelectItem value="auto">Auto Grading</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Auto + Manual)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxScore">Max Score</Label>
                      <Input
                        id="maxScore"
                        type="number"
                        step="0.1"
                        min="0"
                        value={scoringData.maxScore}
                        onChange={(e) => setScoringData({ ...scoringData, maxScore: e.target.value })}
                        disabled={loading}
                        placeholder="10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        min="0"
                        value={scoringData.weight}
                        onChange={(e) => setScoringData({ ...scoringData, weight: e.target.value })}
                        disabled={loading}
                        placeholder="1.0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used for weighted scoring in activities
                      </p>
                    </div>
                  </div>

                  {/* Correct Answers Configuration */}
                  {(scoringData.scoringType === 'auto' || scoringData.scoringType === 'hybrid') && (
                    <div className="space-y-4 pt-4 border-t">
                      <div>
                        <Label className="text-base font-semibold">Correct Answers</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Define expected answers for auto-grading
                        </p>
                      </div>

                      {/* Auto-grading options */}
                      <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-md">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="caseSensitive"
                            checked={scoringData.autoGradeConfig.caseSensitive}
                            onChange={(e) => setScoringData({
                              ...scoringData,
                              autoGradeConfig: {
                                ...scoringData.autoGradeConfig,
                                caseSensitive: e.target.checked
                              }
                            })}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="caseSensitive" className="text-sm cursor-pointer">
                            Case-sensitive matching
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="partialMatch"
                            checked={scoringData.autoGradeConfig.partialMatch}
                            onChange={(e) => setScoringData({
                              ...scoringData,
                              autoGradeConfig: {
                                ...scoringData.autoGradeConfig,
                                partialMatch: e.target.checked
                              }
                            })}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="partialMatch" className="text-sm cursor-pointer">
                            Allow partial matches
                          </Label>
                        </div>
                      </div>

                      {/* Interactive elements answers */}
                      {interactiveElements.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-md">
                          No interactive elements detected in question body. Add text inputs, radio buttons, or checkboxes to configure correct answers.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {interactiveElements.map((element) => (
                            <div key={element.uuid} className="p-3 border rounded-md space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="font-medium">{element.label}</Label>
                                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                                  {element.type}
                                </span>
                              </div>
                              
                              {element.type === 'radio-group' ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">Select the correct option:</p>
                                  {element.options.map((option) => (
                                    <div key={option.uuid} className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        id={`answer-${option.uuid}`}
                                        name={`answer-${element.uuid}`}
                                        value={option.value}
                                        checked={scoringData.expectedAnswers[element.uuid] === option.value}
                                        onChange={(e) => setScoringData({
                                          ...scoringData,
                                          expectedAnswers: {
                                            ...scoringData.expectedAnswers,
                                            [element.uuid]: e.target.value
                                          }
                                        })}
                                        className="h-4 w-4"
                                      />
                                      <Label htmlFor={`answer-${option.uuid}`} className="text-sm cursor-pointer">
                                        {option.label} <span className="text-muted-foreground">({option.value})</span>
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              ) : element.type === 'checkbox-group' ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">Select all correct options:</p>
                                  {element.options.map((option) => {
                                    const currentAnswers = Array.isArray(scoringData.expectedAnswers[element.uuid])
                                      ? scoringData.expectedAnswers[element.uuid]
                                      : [];
                                    const isChecked = currentAnswers.includes(option.value);

                                    return (
                                      <div key={option.uuid} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`answer-${option.uuid}`}
                                          checked={isChecked}
                                          onChange={(e) => {
                                            let newAnswers;
                                            if (e.target.checked) {
                                              newAnswers = [...currentAnswers, option.value];
                                            } else {
                                              newAnswers = currentAnswers.filter(v => v !== option.value);
                                            }
                                            setScoringData({
                                              ...scoringData,
                                              expectedAnswers: {
                                                ...scoringData.expectedAnswers,
                                                [element.uuid]: newAnswers
                                              }
                                            });
                                          }}
                                          className="h-4 w-4"
                                        />
                                        <Label htmlFor={`answer-${option.uuid}`} className="text-sm cursor-pointer">
                                          {option.label} <span className="text-muted-foreground">({option.value})</span>
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : element.type === 'checkbox' ? (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`answer-${element.uuid}`}
                                      checked={scoringData.expectedAnswers[element.uuid] === element.value}
                                      onChange={(e) => setScoringData({
                                        ...scoringData,
                                        expectedAnswers: {
                                          ...scoringData.expectedAnswers,
                                          [element.uuid]: e.target.checked ? element.value : ''
                                        }
                                      })}
                                      className="h-4 w-4"
                                    />
                                    <Label htmlFor={`answer-${element.uuid}`} className="text-sm cursor-pointer">
                                      This should be checked <span className="text-muted-foreground">(value: {element.value})</span>
                                    </Label>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    The checkbox will be marked correct if checked with value: {element.value}
                                  </p>
                                </div>
                              ) : element.inputType === 'number' ? (
                                <Input
                                  type="number"
                                  value={scoringData.expectedAnswers[element.uuid] || ''}
                                  onChange={(e) => setScoringData({
                                    ...scoringData,
                                    expectedAnswers: {
                                      ...scoringData.expectedAnswers,
                                      [element.uuid]: e.target.value
                                    }
                                  })}
                                  placeholder="Enter the correct number"
                                  className="text-sm"
                                />
                              ) : (
                                <Input
                                  value={scoringData.expectedAnswers[element.uuid] || ''}
                                  onChange={(e) => setScoringData({
                                    ...scoringData,
                                    expectedAnswers: {
                                      ...scoringData.expectedAnswers,
                                      [element.uuid]: e.target.value
                                    }
                                  })}
                                  placeholder="Enter the correct answer"
                                  className="text-sm"
                                />
                              )}
                              
                              {/* Field Scoring Configuration */}
                              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                <div className="space-y-1">
                                  <Label htmlFor={`points-${element.uuid}`} className="text-xs">
                                    Points (correct)
                                  </Label>
                                  <Input
                                    id={`points-${element.uuid}`}
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={scoringData.fieldScores[element.uuid]?.points || ''}
                                    onChange={(e) => setScoringData({
                                      ...scoringData,
                                      fieldScores: {
                                        ...scoringData.fieldScores,
                                        [element.uuid]: {
                                          ...scoringData.fieldScores[element.uuid],
                                          points: parseFloat(e.target.value) || 0
                                        }
                                      }
                                    })}
                                    placeholder="e.g., 5"
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`penalty-${element.uuid}`} className="text-xs">
                                    Wrong Penalty
                                  </Label>
                                  <Input
                                    id={`penalty-${element.uuid}`}
                                    type="number"
                                    max="0"
                                    step="0.5"
                                    value={scoringData.fieldScores[element.uuid]?.wrongPenalty || ''}
                                    onChange={(e) => setScoringData({
                                      ...scoringData,
                                      fieldScores: {
                                        ...scoringData.fieldScores,
                                        [element.uuid]: {
                                          ...scoringData.fieldScores[element.uuid],
                                          wrongPenalty: parseFloat(e.target.value) || 0
                                        }
                                      }
                                    })}
                                    placeholder="e.g., -1"
                                    className="text-sm h-8"
                                  />
                                </div>
                              </div>
                              
                              <p className="text-xs text-muted-foreground">
                                UUID: {element.uuid}
                              </p>
                            </div>
                          ))}
                          
                          {/* Total Score Display */}
                          <div className="p-3 bg-primary/5 border-2 border-primary/20 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">Calculated Total:</span>
                              <span className="text-lg font-bold text-primary">
                                {Object.values(scoringData.fieldScores).reduce((sum, field) => sum + (field?.points || 0), 0).toFixed(1)} points
                              </span>
                            </div>
                            {scoringData.maxScore && Math.abs(Object.values(scoringData.fieldScores).reduce((sum, field) => sum + (field?.points || 0), 0) - scoringData.maxScore) > 0.01 && (
                              <p className="text-xs text-amber-600 mt-1">
                                ⚠️ Field scores ({Object.values(scoringData.fieldScores).reduce((sum, field) => sum + (field?.points || 0), 0).toFixed(1)}) 
                                don't match max score ({scoringData.maxScore})
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {scoringData.rubricId && rubrics.find(r => r.id === scoringData.rubricId) && (
                    <div className="p-3 bg-muted/50 rounded-md border">
                      <p className="text-sm font-medium mb-1">Selected Rubric:</p>
                      <p className="text-sm text-muted-foreground">
                        {rubrics.find(r => r.id === scoringData.rubricId)?.title}
                      </p>
                      {rubrics.find(r => r.id === scoringData.rubricId)?.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {rubrics.find(r => r.id === scoringData.rubricId)?.description}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/questions')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Saving...' : isEditMode ? 'Update Question' : 'Create Question'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
