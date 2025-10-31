import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { activityAPI, activityElementAPI, questionAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, Save, Plus, Trash2, GripVertical, FolderOpen, FileQuestion, Edit, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Simple draggable element component
function DraggableElement({ element, onDelete, onAddChild, onEdit, onEditSection, index, parentId = null }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: element.id,
    data: {
      type: 'element',
      element: element,
      parentId: parentId,
      index: index,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className={`flex items-center gap-2 p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors ${
        element.element_type === 'section' ? 'border-blue-300 dark:border-blue-700' : ''
      }`}>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {element.element_type === 'section' ? (
          <FolderOpen className="h-4 w-4 text-blue-500" />
        ) : (
          <FileQuestion className="h-4 w-4 text-green-500" />
        )}

        <div className="flex-1">
          <p className="text-sm font-medium">
            {element.element_type === 'section' ? element.title : element.question_title}
          </p>
          {element.description && (
            <p className="text-xs text-muted-foreground">{element.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Order: {element.order_index} • {element.element_type}
            {element.parent_element_id && ' • nested'}
          </p>
        </div>

        <div className="flex gap-1">
          {element.element_type === 'section' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditSection(element)}
                title="Edit section"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddChild(element.id)}
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
              onClick={() => onEdit(element)}
              title="Edit question"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(element.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Render children for sections */}
      {element.element_type === 'section' && (
        <DroppableSection sectionId={element.id}>
          {element.children && element.children.length > 0 ? (
            element.children.map((child, idx) => (
              <DraggableElement
                key={child.id}
                element={child}
                index={idx}
                parentId={element.id}
                onDelete={onDelete}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onEditSection={onEditSection}
              />
            ))
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4">
              Drag elements here or click + to add
            </div>
          )}
        </DroppableSection>
      )}
    </div>
  );
}

// Droppable zone for sections
function DroppableSection({ sectionId, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${sectionId}`,
    data: {
      type: 'section',
      sectionId: sectionId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`ml-8 mt-2 min-h-[80px] rounded-md p-2 transition-all ${
        isOver
          ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 border-dashed'
          : 'bg-muted/30 border-2 border-dashed border-transparent'
      }`}
    >
      {children}
    </div>
  );
}

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

  // Helper function to flatten all element IDs (including nested ones)
  const getAllElementIds = (elements) => {
    const ids = [];
    const traverse = (items) => {
      items.forEach((item) => {
        ids.push(item.id);
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      });
    };
    traverse(elements);
    return ids;
  };

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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Drag and drop handler - completely revamped
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id;
    let overId = over.id;
    const activeParentId = active.data.current?.parentId;
    const overType = over.data.current?.type;
    let overParentId = over.data.current?.parentId;
    const overSectionId = over.data.current?.sectionId;

    // Check if we're dragging over a question element AND it's from a different parent
    // Only redirect if we're doing a cross-parent drag to prevent breaking reordering within the same parent
    const overElement = findElementById(elements, overId);
    if (overElement && overElement.element_type === 'question' && activeParentId !== overParentId) {
      // Redirect to parent section or root (only for cross-parent drags)
      if (overParentId) {
        // Treat as dragging into the parent section
        console.log('Detected cross-parent drag over question, redirecting to parent section:', overParentId);
        overId = overParentId;
        overParentId = findElementById(elements, overParentId)?.parent_element_id || null;
      } else {
        // Treat as dragging into root (reorder at root level)
        console.log('Detected cross-parent drag over question at root, treating as root-level reorder');
        overParentId = null;
      }
    }

    console.log('Drag event:', {
      activeId,
      overId,
      activeParentId,
      overType,
      overParentId,
      overSectionId,
    });

    try {
      // Case 1: Dropping into a section droppable zone
      if (overType === 'section') {
        const section = findElementById(elements, overSectionId);
        if (!section) {
          console.error('Section not found:', overSectionId);
          return;
        }

        // Prevent dropping section into itself
        if (active.data.current?.element?.element_type === 'section') {
          if (isDescendant(active.data.current.element, overSectionId)) {
            toast({
              variant: "destructive",
              title: "Cannot move",
              description: "Cannot move a section into itself.",
            });
            return;
          }
        }

        console.log('Moving element into section:', {
          elementId: activeId,
          sectionId: overSectionId,
          orderIndex: section.children?.length || 0,
        });

        await activityElementAPI.update(activeId, {
          parentElementId: overSectionId,
          orderIndex: section.children?.length || 0,
        });

        await fetchElements();

        toast({
          variant: "success",
          title: "Element moved",
          description: `Moved into section "${section.title}".`,
        });
        return;
      }

      // Case 2: Reordering within the same parent
      if (activeParentId === overParentId) {
        const siblings = activeParentId
          ? findElementById(elements, activeParentId)?.children || []
          : elements;

        const oldIndex = siblings.findIndex(el => el.id === activeId);
        const newIndex = siblings.findIndex(el => el.id === overId);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        console.log('Reordering elements:', { oldIndex, newIndex });

        const reordered = arrayMove(siblings, oldIndex, newIndex);

        // Update all order indices
        for (let i = 0; i < reordered.length; i++) {
          await activityElementAPI.update(reordered[i].id, {
            orderIndex: i,
          });
        }

        await fetchElements();

        toast({
          variant: "success",
          title: "Order updated",
          description: "Elements reordered successfully.",
        });
      } else {
        // Case 3: Moving between different parents (cross-parent drag)
        console.log('Moving between different parents:', { activeParentId, overParentId });

        // Prevent dropping section into itself or its descendants
        if (active.data.current?.element?.element_type === 'section') {
          if (isDescendant(active.data.current.element, overId) ||
              (overParentId && isDescendant(active.data.current.element, overParentId))) {
            toast({
              variant: "destructive",
              title: "Cannot move",
              description: "Cannot move a section into itself or its descendants.",
            });
            return;
          }
        }

        // Get the target siblings list to determine the new position
        const targetSiblings = overParentId
          ? findElementById(elements, overParentId)?.children || []
          : elements;

        const overIndex = targetSiblings.findIndex(el => el.id === overId);

        // Move the element to the new parent and position
        await activityElementAPI.update(activeId, {
          parentElementId: overParentId || null,
          orderIndex: overIndex,
        });

        // Update order indices for remaining items in target list
        for (let i = overIndex + 1; i < targetSiblings.length; i++) {
          if (targetSiblings[i].id !== activeId) {
            await activityElementAPI.update(targetSiblings[i].id, {
              orderIndex: i + 1,
            });
          }
        }

        await fetchElements();

        toast({
          variant: "success",
          title: "Element moved",
          description: `Moved to ${overParentId ? 'section' : 'root level'}.`,
        });
      }
    } catch (err) {
      console.error('Drag error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to move element';
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg,
      });
    }
  };

  // Helper to find element by ID
  const findElementById = (elements, id) => {
    for (const el of elements) {
      if (el.id === id) return el;
      if (el.children) {
        const found = findElementById(el.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to check if element is descendant
  const isDescendant = (parent, childId) => {
    if (parent.id === childId) return true;
    if (parent.children) {
      return parent.children.some(child => isDescendant(child, childId));
    }
    return false;
  };

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
    setQuestionEditorOpen(true);
  };

  const handleSaveQuestion = async () => {
    try {
      let newQuestionId = null;

      if (editingQuestion) {
        // Update existing question
        await questionAPI.update(editingQuestion.id, questionFormData);
        toast({
          variant: "success",
          title: "Question updated",
          description: "Question has been updated successfully.",
        });
      } else {
        // Create new question
        const response = await questionAPI.create(questionFormData);
        newQuestionId = response.data.question.id;

        // Automatically add the new question to the activity elements at root level
        if (id && newQuestionId) {
          try {
            await activityElementAPI.create({
              activityId: id,
              elementType: 'question',
              questionId: newQuestionId,
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

        toast({
          variant: "success",
          title: "Question created",
          description: "Question has been created and added to the activity.",
        });
      }

      await fetchQuestions();
      await fetchElements(); // Refresh elements to show updated question title/body
      setQuestionEditorOpen(false);
    } catch (err) {
      console.error('Error saving question:', err);
      const errorMsg = err.response?.data?.error || 'Failed to save question';
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={getAllElementIds(elements)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {elements.map((element, index) => (
                        <DraggableElement
                          key={element.id}
                          element={element}
                          index={index}
                          parentId={null}
                          onDelete={handleDeleteElement}
                          onAddChild={handleOpenAddElement}
                          onEdit={handleEditQuestion}
                          onEditSection={handleEditSection}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
            <CardContent className="space-y-4">
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
