import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { activityAPI, activityElementAPI, questionAPI, rubricAPI, questionScoringAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Save, Plus, Trash2, FolderOpen, FileQuestion, Edit, X, Award, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DraggableTree, findParentId, getSiblings } from '@/components/ui/draggable-tree';

export default function ActivityBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Activity form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Activity elements
  const [elements, setElements] = useState([]);
  const [loadingElements, setLoadingElements] = useState(false);

  // Element modal
  const [elementModalOpen, setElementModalOpen] = useState(false);
  const [elementFormData, setElementFormData] = useState({
    elementType: 'section',
    questionId: '',
    title: '',
    description: '',
    orderIndex: 0,
    parentElementId: null,
  });

  // Questions list
  const [questions, setQuestions] = useState([]);

  // Section editor
  const [sectionEditorOpen, setSectionEditorOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionFormData, setSectionFormData] = useState({
    title: '',
    description: '',
  });

  // Question editor (split screen)
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionFormData, setQuestionFormData] = useState({
    title: '',
    bodyHtml: '',
    tags: [],
  });
  const [questionEditorTab, setQuestionEditorTab] = useState('content');

  // Scoring configuration
  const [rubrics, setRubrics] = useState([]);
  const [scoringConfig, setScoringConfig] = useState({
    rubricId: '',
    scoringType: 'manual',
    weight: 1.0,
    maxScore: 10,
    expectedAnswers: {},
    autoGradeConfig: {
      caseSensitive: false,
      partialMatch: false,
    },
    fieldScores: {},
  });
  const [interactiveElements, setInteractiveElements] = useState([]);

  useEffect(() => {
    if (id) {
      fetchActivity();
      fetchElements();
    }
    fetchQuestions();
  }, [id]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await activityAPI.getById(id);
      const activity = response.data.activity;
      setFormData({
        title: activity.title,
        description: activity.description || '',
        tags: activity.tags || [],
      });
    } catch (err) {
      setError('Failed to load activity');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchElements = async () => {
    try {
      setLoadingElements(true);
      const response = await activityElementAPI.getAll({ activityId: id, status: 'active' });
      setElements(response.data.elements || []);
    } catch (error) {
      console.error('Error fetching elements:', error);
    } finally {
      setLoadingElements(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await questionAPI.getAll({ status: 'active', limit: 100 });
      setQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (id) {
        await activityAPI.update(id, formData);
        toast({
          variant: "success",
          title: "Activity updated",
          description: "Activity has been updated successfully.",
        });
      } else {
        const response = await activityAPI.create(formData);
        toast({
          variant: "success",
          title: "Activity created",
          description: "Activity has been created successfully.",
        });
        navigate(`/admin/activities/${response.data.activity.id}/edit`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save activity';
      setError(errorMsg);
      toast({
        variant: "destructive",
        title: "Error saving activity",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  // Add element (with support for parent sections)
  const handleAddElement = async () => {
    try {
      await activityElementAPI.create({
        activityId: id,
        elementType: elementFormData.elementType,
        questionId: elementFormData.elementType === 'question' ? elementFormData.questionId : null,
        title: elementFormData.title || null,
        description: elementFormData.description || null,
        orderIndex: parseInt(elementFormData.orderIndex) || 0,
        parentElementId: elementFormData.parentElementId,
        tags: []
      });

      await fetchElements();
      setElementModalOpen(false);
      resetElementForm();

      toast({
        variant: "success",
        title: "Element added",
        description: "Activity element has been added successfully.",
      });
    } catch (err) {
      console.error('Error adding element:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to add element';
      toast({
        variant: "destructive",
        title: "Error adding element",
        description: errorMsg,
      });
    }
  };

  const handleDeleteElement = async (elementId) => {
    if (!confirm('Are you sure you want to remove this element?')) return;

    try {
      await activityElementAPI.archive(elementId);
      await fetchElements();

      toast({
        variant: "success",
        title: "Element removed",
        description: "Activity element has been removed successfully.",
      });
    } catch (err) {
      console.error('Error deleting element:', err);
      toast({
        variant: "destructive",
        title: "Error removing element",
        description: "Failed to remove element. Please try again.",
      });
    }
  };

  const resetElementForm = () => {
    setElementFormData({
      elementType: 'section',
      questionId: '',
      title: '',
      description: '',
      orderIndex: 0,
      parentElementId: null,
    });
  };

  // Open add element modal with optional parent
  const handleOpenAddElement = (parentId = null) => {
    resetElementForm();

    // Calculate default order index based on the target location's children count
    let defaultOrderIndex = 0;
    if (parentId) {
      // Adding to a section - use the section's children count
      const parentSection = findElementById(elements, parentId);
      defaultOrderIndex = parentSection?.children?.length || 0;
    } else {
      // Adding to root - use the root elements count
      defaultOrderIndex = elements.length;
    }

    setElementFormData((prev) => ({
      ...prev,
      parentElementId: parentId,
      orderIndex: defaultOrderIndex
    }));
    setElementModalOpen(true);
  };

  // Handle reordering from DraggableTree
  const handleElementReorder = async (draggedElement, targetElement, position) => {
    try {
      // Case 1: Dropping INSIDE a section
      if (position === 'inside' && targetElement.element_type === 'section') {
        const newOrderIndex = targetElement.children?.length || 0;

        await activityElementAPI.update(draggedElement.id, {
          parentElementId: targetElement.id,
          orderIndex: newOrderIndex,
        });

        await fetchElements();

        toast({
          variant: "success",
          title: "Element moved",
          description: `Moved into "${targetElement.title}".`,
        });
        return;
      }

      // Case 2: Dropping BEFORE or AFTER
      if (position === 'before' || position === 'after') {
        const targetParentId = targetElement.parent_element_id;
        const draggedParentId = draggedElement.parent_element_id;

        // Get current siblings at target location (before any changes)
        const targetSiblings = targetParentId
          ? (elements.find(el => el.id === targetParentId)?.children || 
             findElementInTree(elements, targetParentId)?.children || [])
          : elements;

        const targetIndex = targetSiblings.findIndex(el => el.id === targetElement.id);
        if (targetIndex === -1) {
          console.error('Could not find target in siblings');
          return;
        }

        // Calculate new index based on position
        let newIndex;
        
        if (draggedParentId === targetParentId) {
          // Moving within same parent - need to account for removal
          const draggedIndex = targetSiblings.findIndex(el => el.id === draggedElement.id);
          
          if (position === 'before') {
            // Insert before target
            // If dragging from above target, after removal target shifts down by 1
            newIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
          } else {
            // Insert after target (position === 'after')
            // If dragging from above target, after removal target shifts down by 1
            newIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
          }
        } else {
          // Moving to different parent (no removal adjustment needed)
          if (position === 'before') {
            newIndex = targetIndex;
          } else {
            newIndex = targetIndex + 1;
          }
        }

        // Step 1: Update all siblings' order indices first to make room
        // Shift items to create a gap at the desired position
        const updates = [];
        
        if (draggedParentId === targetParentId) {
          // Same parent: shift items between old and new positions
          const draggedIndex = targetSiblings.findIndex(el => el.id === draggedElement.id);
          
          if (draggedIndex < newIndex) {
            // Moving down: shift items between [draggedIndex+1, newIndex] up by 1
            for (let i = draggedIndex + 1; i <= newIndex && i < targetSiblings.length; i++) {
              if (targetSiblings[i].id !== draggedElement.id) {
                updates.push(
                  activityElementAPI.update(targetSiblings[i].id, {
                    orderIndex: i - 1,
                  })
                );
              }
            }
          } else if (draggedIndex > newIndex) {
            // Moving up: shift items between [newIndex, draggedIndex-1] down by 1
            for (let i = newIndex; i < draggedIndex; i++) {
              if (targetSiblings[i].id !== draggedElement.id) {
                updates.push(
                  activityElementAPI.update(targetSiblings[i].id, {
                    orderIndex: i + 1,
                  })
                );
              }
            }
          }
        } else {
          // Different parent: shift items in target parent at and after newIndex down by 1
          for (let i = newIndex; i < targetSiblings.length; i++) {
            updates.push(
              activityElementAPI.update(targetSiblings[i].id, {
                orderIndex: i + 1,
              })
            );
          }
        }

        // Execute all updates in parallel
        await Promise.all(updates);

        // Step 2: Move the dragged element to new parent and position
        await activityElementAPI.update(draggedElement.id, {
          parentElementId: targetParentId,
          orderIndex: newIndex,
        });

        // Step 3: Fetch fresh data
        await fetchElements();

        await fetchElements();

        toast({
          variant: "success",
          title: "Element moved",
          description: "Element reordered successfully.",
        });
      }
    } catch (err) {
      console.error('Reorder error:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.error || 'Failed to move element',
      });
      await fetchElements();
    }
  };

  // Helper to find element in tree
  const findElementInTree = (items, targetId) => {
    for (const item of items) {
      if (item.id === targetId) return item;
      if (item.children) {
        const found = findElementInTree(item.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Render function for DraggableTree
  const renderElement = (element, { dragHandleProps, level }) => {
    return (
      <div className={`flex items-center gap-2 p-2 border rounded bg-card hover:bg-accent/30 transition-colors mb-1 ${
        element.element_type === 'section' ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/50' : ''
      }`}>
        <div {...dragHandleProps} />

        {element.element_type === 'section' ? (
          <FolderOpen className="h-4 w-4 text-blue-500" />
        ) : (
          <FileQuestion className="h-4 w-4 text-green-500" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {element.element_type === 'section' ? element.title : element.question_title}
          </p>
          {element.description && (
            <p className="text-xs text-muted-foreground truncate">{element.description}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">
              #{element.order_index} • {element.element_type}
              {element.parent_element_id && ' • nested'}
            </p>
            {element.element_type === 'question' && element.rubric_title && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full border border-primary/20">
                <Award className="h-3 w-3" />
                {element.rubric_title}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          {element.element_type === 'section' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditSection(element)}
                title="Edit section"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenAddElement(element.id)}
                title="Add element to this section"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
          {element.element_type === 'question' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditQuestion(element)}
              title="Edit question"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteElement(element.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Parse interactive elements from HTML
  const parseInteractiveElements = (html) => {
    if (!html) return [];
    
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
          
          // Try to find the group name for radio buttons
          if (type === 'radio') {
            element.groupName = node.name || node.getAttribute('name') || '';
          }
        }

        elements.push(element);
      }
    });

    // Group radio buttons by name
    const groupedElements = [];
    const radioGroups = {};
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
      } else {
        groupedElements.push(el);
      }
    });

    // Add radio groups
    Object.values(radioGroups).forEach(group => {
      groupedElements.push(group);
    });

    return groupedElements;
  };

  // Update interactive elements when question body changes
  useEffect(() => {
    if (questionFormData.bodyHtml) {
      const elements = parseInteractiveElements(questionFormData.bodyHtml);
      setInteractiveElements(elements);
    } else {
      setInteractiveElements([]);
    }
  }, [questionFormData.bodyHtml]);

  // Section editor functions
  const handleEditSection = (element) => {
    setEditingSection(element);
    setSectionFormData({
      title: element.title || '',
      description: element.description || '',
    });
    setSectionEditorOpen(true);
  };

  const handleSaveSection = async () => {
    if (!editingSection) return;

    try {
      await activityElementAPI.update(editingSection.id, {
        title: sectionFormData.title,
        description: sectionFormData.description,
      });

      await fetchElements();
      setSectionEditorOpen(false);

      toast({
        variant: "success",
        title: "Section updated",
        description: "Section has been updated successfully.",
      });
    } catch (err) {
      console.error('Error saving section:', err);
      const errorMsg = err.response?.data?.error || 'Failed to save section';
      toast({
        variant: "destructive",
        title: "Error saving section",
        description: errorMsg,
      });
    }
  };

  // Question editor functions
  const fetchRubrics = async () => {
    try {
      const response = await rubricAPI.getAll({ status: 'active' });
      setRubrics(response.data.rubrics || []);
    } catch (err) {
      console.error('Error fetching rubrics:', err);
    }
  };

  const fetchScoringConfig = async (questionId) => {
    try {
      const response = await questionScoringAPI.get(questionId);
      const scoring = response.data.scoring;
      setScoringConfig({
        rubricId: scoring.rubric_id || '',
        scoringType: scoring.scoring_type || 'manual',
        weight: scoring.weight || 1.0,
        maxScore: scoring.max_score || 10,
        expectedAnswers: scoring.expected_answers || {},
        autoGradeConfig: scoring.auto_grade_config || {
          caseSensitive: false,
          partialMatch: false,
        },
        fieldScores: scoring.field_scores || {},
      });
    } catch (err) {
      // No scoring config exists yet, use defaults
      setScoringConfig({
        rubricId: '',
        scoringType: 'manual',
        weight: 1.0,
        maxScore: 10,
        expectedAnswers: {},
        autoGradeConfig: {
          caseSensitive: false,
          partialMatch: false,
        },
        fieldScores: {},
      });
    }
  };

  const handleEditQuestion = async (element) => {
    if (!element.question_id) return;

    try {
      const response = await questionAPI.getById(element.question_id);
      const question = response.data.question;

      setEditingQuestion(question);
      setQuestionFormData({
        title: question.title || '',
        bodyHtml: question.body_html || '',
        tags: question.tags || [],
      });

      // Fetch rubrics and scoring config
      await fetchRubrics();
      await fetchScoringConfig(question.id);

      setQuestionEditorTab('content');
      setQuestionEditorOpen(true);
    } catch (err) {
      console.error('Error fetching question:', err);
      toast({
        variant: "destructive",
        title: "Error loading question",
        description: "Failed to load question details.",
      });
    }
  };

  const handleCreateNewQuestion = () => {
    setEditingQuestion(null);
    setQuestionFormData({
      title: '',
      bodyHtml: '',
      tags: [],
    });
    setScoringConfig({
      rubricId: '',
      scoringType: 'manual',
      weight: 1.0,
      expectedAnswers: {},
    });

    // Fetch rubrics for new question
    fetchRubrics();

    setQuestionEditorTab('content');
    setQuestionEditorOpen(true);
  };

  const handleSaveQuestion = async () => {
    try {
      let questionId = editingQuestion?.id || null;
      let scoringError = null;

      if (editingQuestion) {
        // Update existing question
        await questionAPI.update(editingQuestion.id, questionFormData);

        // Save scoring configuration for existing question
        if (scoringConfig.rubricId || scoringConfig.scoringType !== 'manual' || scoringConfig.weight !== 1.0 || Object.keys(scoringConfig.expectedAnswers).length > 0) {
          try {
            // Clean fieldScores - remove entries with invalid values
            const cleanedFieldScores = Object.entries(scoringConfig.fieldScores || {}).reduce((acc, [key, value]) => {
              const points = parseFloat(value?.points);
              const wrongPenalty = parseFloat(value?.wrongPenalty);
              
              // Only include if points is a valid number
              if (!isNaN(points) && points !== 0) {
                acc[key] = {
                  points,
                  wrongPenalty: !isNaN(wrongPenalty) ? wrongPenalty : 0
                };
              }
              return acc;
            }, {});

            const scoringPayload = {
              questionId: editingQuestion.id,
              rubricId: scoringConfig.rubricId || null,
              scoringType: scoringConfig.scoringType,
              weight: scoringConfig.weight,
              maxScore: scoringConfig.maxScore,
              expectedAnswers: Object.keys(scoringConfig.expectedAnswers).length > 0 ? scoringConfig.expectedAnswers : null,
              autoGradeConfig: scoringConfig.autoGradeConfig,
              fieldScores: Object.keys(cleanedFieldScores).length > 0 ? cleanedFieldScores : undefined,
            };

            await questionScoringAPI.create(scoringPayload);
          } catch (scoringErr) {
            console.error('Error saving scoring config:', scoringErr);
            scoringError = scoringErr;
          }
        }
      } else {
        // Create new question
        const response = await questionAPI.create(questionFormData);
        questionId = response.data.question.id;

        // Automatically add the new question to the activity elements at root level
        if (id && questionId) {
          try {
            await activityElementAPI.create({
              activityId: id,
              elementType: 'question',
              questionId: questionId,
              title: null,
              description: null,
              orderIndex: elements.length, // Append to the end
              parentElementId: null,
              tags: []
            });
          } catch (addErr) {
            console.error('Error adding question to activity:', addErr);
            // Don't fail the whole operation if adding to activity fails
          }
        }

        // Save scoring configuration for new question (after question is created)
        if (scoringConfig.rubricId || scoringConfig.scoringType !== 'manual' || scoringConfig.weight !== 1.0 || Object.keys(scoringConfig.expectedAnswers).length > 0) {
          try {
            // Clean fieldScores - remove entries with invalid values
            const cleanedFieldScores = Object.entries(scoringConfig.fieldScores || {}).reduce((acc, [key, value]) => {
              const points = parseFloat(value?.points);
              const wrongPenalty = parseFloat(value?.wrongPenalty);
              
              // Only include if points is a valid number
              if (!isNaN(points) && points !== 0) {
                acc[key] = {
                  points,
                  wrongPenalty: !isNaN(wrongPenalty) ? wrongPenalty : 0
                };
              }
              return acc;
            }, {});

            const scoringPayload = {
              questionId: questionId,
              rubricId: scoringConfig.rubricId || null,
              scoringType: scoringConfig.scoringType,
              weight: scoringConfig.weight,
              maxScore: scoringConfig.maxScore,
              expectedAnswers: Object.keys(scoringConfig.expectedAnswers).length > 0 ? scoringConfig.expectedAnswers : null,
              autoGradeConfig: scoringConfig.autoGradeConfig,
              fieldScores: Object.keys(cleanedFieldScores).length > 0 ? cleanedFieldScores : undefined,
            };

            await questionScoringAPI.create(scoringPayload);
          } catch (scoringErr) {
            console.error('Error saving scoring config:', scoringErr);
            scoringError = scoringErr;
          }
        }
      }

      // Show appropriate toast based on results
      if (scoringError) {
        toast({
          variant: "destructive",
          title: "Partial Success",
          description: "Question saved but scoring configuration failed to save. Please try updating the scoring settings separately.",
        });
      } else {
        toast({
          variant: "success",
          title: editingQuestion ? "Question updated" : "Question created",
          description: editingQuestion
            ? "Question has been updated successfully."
            : "Question has been created and added to the activity.",
        });
      }

      await fetchQuestions();
      await fetchElements(); // Refresh elements to show updated question title/body
      setQuestionEditorOpen(false);
    } catch (err) {
      console.error('Error saving question:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save question';
      toast({
        variant: "destructive",
        title: "Error saving question",
        description: errorMsg,
      });
    }
  };

  const insertInteractiveElement = (type) => {
    const templates = {
      'text-input': '<input type="text" data-answer-field="answer1" placeholder="Your answer..." />',
      'textarea': '<textarea data-answer-field="answer1" rows="4" placeholder="Your answer..."></textarea>',
      'number-input': '<input type="number" data-answer-field="answer1" placeholder="0" />',
      'radio-group': '<div data-answer-field="answer1" data-input-type="radio">\n  <label><input type="radio" name="answer1" value="option1" /> Option 1</label>\n  <label><input type="radio" name="answer1" value="option2" /> Option 2</label>\n  <label><input type="radio" name="answer1" value="option3" /> Option 3</label>\n</div>',
      'checkbox-group': '<div data-answer-field="answer1" data-input-type="checkbox">\n  <label><input type="checkbox" name="answer1" value="option1" /> Option 1</label>\n  <label><input type="checkbox" name="answer1" value="option2" /> Option 2</label>\n  <label><input type="checkbox" name="answer1" value="option3" /> Option 3</label>\n</div>',
      'select': '<select data-answer-field="answer1">\n  <option value="">Choose...</option>\n  <option value="option1">Option 1</option>\n  <option value="option2">Option 2</option>\n</select>',
    };

    const template = templates[type] || '';
    setQuestionFormData((prev) => ({
      ...prev,
      bodyHtml: prev.bodyHtml + '\n\n' + template,
    }));
  };

  if (loading && !id) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className={`p-6 ${questionEditorOpen ? 'grid grid-cols-2 gap-6' : ''}`}>
      {/* Left side: Activity Builder */}
      <div>
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/activities')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Activities
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{id ? 'Edit Activity' : 'Create New Activity'}</CardTitle>
            <CardDescription>
              {id ? 'Update activity details and manage elements' : 'Create a new learning activity'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Activity Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Introduction to Algorithms"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Brief description of the activity..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a tag..."
                  />
                  <Button type="button" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {id ? 'Update Activity' : 'Create Activity'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Activity Elements Section */}
        {id && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activity Elements</CardTitle>
                  <CardDescription>
                    Organize sections and questions. Drag to reorder.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateNewQuestion} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Question
                  </Button>
                  <Button onClick={() => handleOpenAddElement(null)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Element
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingElements && elements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading elements...</p>
              ) : elements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No elements yet. Click "Add Element" to get started.
                </p>
              ) : (
                <DraggableTree
                  items={elements}
                  onReorder={handleElementReorder}
                  renderItem={renderElement}
                  canHaveChildren={(item) => item.element_type === 'section'}
                  childrenKey="children"
                  getId={(item) => item.id}
                  className="space-y-1"
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right side: Question Editor (split screen) */}
      {questionEditorOpen && (
        <div className="sticky top-6 h-fit">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingQuestion ? 'Edit Question' : 'Create New Question'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuestionEditorOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={questionEditorTab} onValueChange={setQuestionEditorTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="scoring">
                    <Target className="h-4 w-4 mr-2" />
                    Scoring
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="question-title">Question Title *</Label>
                    <Input
                      id="question-title"
                      value={questionFormData.title}
                      onChange={(e) =>
                        setQuestionFormData({ ...questionFormData, title: e.target.value })
                      }
                      placeholder="Enter question title..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Interactive Elements</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertInteractiveElement('text-input')}
                      >
                        Text Input
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertInteractiveElement('textarea')}
                      >
                        Text Area
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertInteractiveElement('number-input')}
                      >
                        Number
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertInteractiveElement('radio-group')}
                      >
                        Radio Group
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertInteractiveElement('checkbox-group')}
                      >
                        Checkboxes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertInteractiveElement('select')}
                      >
                        Dropdown
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question-body">Question Body (HTML) *</Label>
                    <textarea
                      id="question-body"
                      value={questionFormData.bodyHtml}
                      onChange={(e) =>
                        setQuestionFormData({ ...questionFormData, bodyHtml: e.target.value })
                      }
                      className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      placeholder="Enter HTML content..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[400px] overflow-y-auto">
                      {questionFormData.bodyHtml ? (
                        <div
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: questionFormData.bodyHtml }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Preview will appear here...
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="scoring" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="rubric-select">Rubric (Optional)</Label>
                    <Select
                      value={scoringConfig.rubricId || "none"}
                      onValueChange={(value) =>
                        setScoringConfig({ ...scoringConfig, rubricId: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger id="rubric-select">
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
                    <p className="text-xs text-muted-foreground">
                      Select a rubric to use for grading this question
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scoring-type">Scoring Type</Label>
                    <Select
                      value={scoringConfig.scoringType}
                      onValueChange={(value) =>
                        setScoringConfig({ ...scoringConfig, scoringType: value })
                      }
                    >
                      <SelectTrigger id="scoring-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Grading</SelectItem>
                        <SelectItem value="auto">Auto Grading</SelectItem>
                        <SelectItem value="hybrid">Hybrid (Auto + Manual Review)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {scoringConfig.scoringType === 'manual' && 'Requires instructor to manually grade all submissions'}
                      {scoringConfig.scoringType === 'auto' && 'Automatically grades based on expected answers'}
                      {scoringConfig.scoringType === 'hybrid' && 'Auto-grades first, then allows manual adjustment'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      min="0"
                      value={scoringConfig.weight}
                      onChange={(e) =>
                        setScoringConfig({ ...scoringConfig, weight: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="1.0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Relative weight of this question (default: 1.0)
                    </p>
                  </div>

                  {(scoringConfig.scoringType === 'auto' || scoringConfig.scoringType === 'hybrid') && (
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
                            id="caseSensitive-activity"
                            checked={scoringConfig.autoGradeConfig?.caseSensitive || false}
                            onChange={(e) => setScoringConfig({
                              ...scoringConfig,
                              autoGradeConfig: {
                                ...scoringConfig.autoGradeConfig,
                                caseSensitive: e.target.checked
                              }
                            })}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="caseSensitive-activity" className="text-sm cursor-pointer">
                            Case-sensitive matching
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="partialMatch-activity"
                            checked={scoringConfig.autoGradeConfig?.partialMatch || false}
                            onChange={(e) => setScoringConfig({
                              ...scoringConfig,
                              autoGradeConfig: {
                                ...scoringConfig.autoGradeConfig,
                                partialMatch: e.target.checked
                              }
                            })}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="partialMatch-activity" className="text-sm cursor-pointer">
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
                                        id={`activity-answer-${option.uuid}`}
                                        name={`activity-answer-${element.uuid}`}
                                        value={option.value}
                                        checked={scoringConfig.expectedAnswers[element.uuid] === option.value}
                                        onChange={(e) => setScoringConfig({
                                          ...scoringConfig,
                                          expectedAnswers: {
                                            ...scoringConfig.expectedAnswers,
                                            [element.uuid]: e.target.value
                                          }
                                        })}
                                        className="h-4 w-4"
                                      />
                                      <Label htmlFor={`activity-answer-${option.uuid}`} className="text-sm cursor-pointer">
                                        {option.label} <span className="text-muted-foreground">({option.value})</span>
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              ) : element.type === 'checkbox' ? (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`activity-answer-${element.uuid}`}
                                      checked={scoringConfig.expectedAnswers[element.uuid] === element.value}
                                      onChange={(e) => setScoringConfig({
                                        ...scoringConfig,
                                        expectedAnswers: {
                                          ...scoringConfig.expectedAnswers,
                                          [element.uuid]: e.target.checked ? element.value : ''
                                        }
                                      })}
                                      className="h-4 w-4"
                                    />
                                    <Label htmlFor={`activity-answer-${element.uuid}`} className="text-sm cursor-pointer">
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
                                  value={scoringConfig.expectedAnswers[element.uuid] || ''}
                                  onChange={(e) => setScoringConfig({
                                    ...scoringConfig,
                                    expectedAnswers: {
                                      ...scoringConfig.expectedAnswers,
                                      [element.uuid]: e.target.value
                                    }
                                  })}
                                  placeholder="Enter the correct number"
                                  className="text-sm"
                                />
                              ) : (
                                <Input
                                  value={scoringConfig.expectedAnswers[element.uuid] || ''}
                                  onChange={(e) => setScoringConfig({
                                    ...scoringConfig,
                                    expectedAnswers: {
                                      ...scoringConfig.expectedAnswers,
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
                                  <Label htmlFor={`points-activity-${element.uuid}`} className="text-xs">
                                    Points (correct)
                                  </Label>
                                  <Input
                                    id={`points-activity-${element.uuid}`}
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={scoringConfig.fieldScores[element.uuid]?.points || ''}
                                    onChange={(e) => setScoringConfig({
                                      ...scoringConfig,
                                      fieldScores: {
                                        ...scoringConfig.fieldScores,
                                        [element.uuid]: {
                                          ...scoringConfig.fieldScores[element.uuid],
                                          points: parseFloat(e.target.value) || 0
                                        }
                                      }
                                    })}
                                    placeholder="e.g., 5"
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`penalty-activity-${element.uuid}`} className="text-xs">
                                    Wrong Penalty
                                  </Label>
                                  <Input
                                    id={`penalty-activity-${element.uuid}`}
                                    type="number"
                                    max="0"
                                    step="0.5"
                                    value={scoringConfig.fieldScores[element.uuid]?.wrongPenalty || ''}
                                    onChange={(e) => setScoringConfig({
                                      ...scoringConfig,
                                      fieldScores: {
                                        ...scoringConfig.fieldScores,
                                        [element.uuid]: {
                                          ...scoringConfig.fieldScores[element.uuid],
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
                                {Object.values(scoringConfig.fieldScores).reduce((sum, field) => sum + (field?.points || 0), 0).toFixed(1)} points
                              </span>
                            </div>
                            {scoringConfig.maxScore && Math.abs(Object.values(scoringConfig.fieldScores).reduce((sum, field) => sum + (field?.points || 0), 0) - scoringConfig.maxScore) > 0.01 && (
                              <p className="text-xs text-amber-600 mt-1">
                                ⚠️ Field scores ({Object.values(scoringConfig.fieldScores).reduce((sum, field) => sum + (field?.points || 0), 0).toFixed(1)}) 
                                don't match max score ({scoringConfig.maxScore})
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {scoringConfig.rubricId && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                      <div className="flex items-start gap-2">
                        <Award className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900 dark:text-blue-100">Rubric Selected</p>
                          <p className="text-blue-700 dark:text-blue-300">
                            {rubrics.find(r => r.id === scoringConfig.rubricId)?.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveQuestion} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingQuestion ? 'Update Question' : 'Create Question'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setQuestionEditorOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Element Dialog */}
      <Dialog open={elementModalOpen} onOpenChange={setElementModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Element {elementFormData.parentElementId && '(to Section)'}
            </DialogTitle>
            <DialogDescription>
              Add a section or question to your activity
              {elementFormData.parentElementId && ' inside the selected section'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Element Type</Label>
              <Select
                value={elementFormData.elementType}
                onValueChange={(value) =>
                  setElementFormData({ ...elementFormData, elementType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {elementFormData.elementType === 'section' ? (
              <>
                <div className="space-y-2">
                  <Label>Section Title *</Label>
                  <Input
                    value={elementFormData.title}
                    onChange={(e) =>
                      setElementFormData({ ...elementFormData, title: e.target.value })
                    }
                    placeholder="e.g., Introduction"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Section Description</Label>
                  <textarea
                    value={elementFormData.description}
                    onChange={(e) =>
                      setElementFormData({ ...elementFormData, description: e.target.value })
                    }
                    placeholder="Optional description..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Select Question *</Label>
                <Select
                  value={elementFormData.questionId}
                  onValueChange={(value) =>
                    setElementFormData({ ...elementFormData, questionId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a question..." />
                  </SelectTrigger>
                  <SelectContent>
                    {questions.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {questions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No questions available. Create questions first.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Order Index</Label>
              <Input
                type="number"
                value={elementFormData.orderIndex}
                onChange={(e) =>
                  setElementFormData({
                    ...elementFormData,
                    orderIndex: parseInt(e.target.value) || 0,
                  })
                }
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first (0 = first)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setElementModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddElement}
              disabled={
                elementFormData.elementType === 'section'
                  ? !elementFormData.title
                  : !elementFormData.questionId
              }
            >
              Add Element
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Editor Dialog */}
      <Dialog open={sectionEditorOpen} onOpenChange={setSectionEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>
              Update the section title and description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section-title">Section Title *</Label>
              <Input
                id="section-title"
                value={sectionFormData.title}
                onChange={(e) =>
                  setSectionFormData({ ...sectionFormData, title: e.target.value })
                }
                placeholder="e.g., Introduction"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-description">Section Description</Label>
              <textarea
                id="section-description"
                value={sectionFormData.description}
                onChange={(e) =>
                  setSectionFormData({ ...sectionFormData, description: e.target.value })
                }
                placeholder="Optional description..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSection}
              disabled={!sectionFormData.title}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
