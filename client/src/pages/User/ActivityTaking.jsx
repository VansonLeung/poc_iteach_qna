import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { activityAPI, activityElementAPI, submissionAPI, submissionAnswerAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CheckCircle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ActivityTaking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activity, setActivity] = useState(null);
  const [elements, setElements] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [savedAnswerIds, setSavedAnswerIds] = useState({});
  const [currentElementIndex, setCurrentElementIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const questionBodyRef = useRef(null);

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const fetchActivity = async () => {
    try {
      const activityRes = await activityAPI.getById(id);
      setActivity(activityRes.data.activity);

      // Get elements
      const elementsRes = await activityElementAPI.getAll({ activityId: id, status: 'active' });
      setElements(flattenElements(elementsRes.data.elements || []));

      // Get or create submission
      // First try to get in-progress submission
      let submissionsRes = await submissionAPI.getAll({ activityId: id, status: 'in-progress' });
      console.log('First query (in-progress):', submissionsRes.data);
      
      // If no in-progress submission, get the most recent submission (could be submitted)
      if (!submissionsRes.data.submissions?.length) {
        console.log('No in-progress submissions found, fetching any submission...');
        submissionsRes = await submissionAPI.getAll({ activityId: id, limit: 1 });
        console.log('Second query (any status):', submissionsRes.data);
      }
      
      if (submissionsRes.data.submissions?.length > 0) {
        const sub = submissionsRes.data.submissions[0];
        console.log('Loading submission:', sub.id, 'Status:', sub.status);
        setSubmission(sub);

        // Load existing answers
        const answersRes = await submissionAnswerAPI.getAll({ submissionId: sub.id });
        console.log('📥 Loading answers for submission:', sub.id);
        console.log('📥 Raw answers from API:', answersRes.data.answers);

        const answersMap = {};
        const answerIdsMap = {};
        answersRes.data.answers?.forEach(ans => {
          console.log('📄 Processing answer:', ans.id, 'element_uuid:', ans.element_uuid);
          console.log('📄 Raw answer_data:', ans.answer_data);

          // Parse the answer_data JSON
          let parsedAnswer;
          try {
            parsedAnswer = typeof ans.answer_data === 'string'
              ? JSON.parse(ans.answer_data)
              : ans.answer_data;

            console.log('📄 Parsed answer_data:', parsedAnswer);

            // Universal format: {"field-name-or-uuid": value, "field2": value2, ...}
            if (parsedAnswer && typeof parsedAnswer === 'object') {
              // Merge all field answers into the main answersMap
              Object.entries(parsedAnswer).forEach(([fieldIdentifier, value]) => {
                console.log('  ✓ Mapping field:', fieldIdentifier, '→', value);
                answersMap[fieldIdentifier] = value;
              });
            }
          } catch (e) {
            console.error('Error parsing answer_data:', e);
            answersMap[ans.element_uuid] = ans.answer_data;
          }
          // Track answer ID by element_uuid (question ID)
          answerIdsMap[ans.element_uuid] = ans.id;
        });

        console.log('📥 Final answersMap:', answersMap);
        console.log('📥 Final answerIdsMap:', answerIdsMap);

        setAnswers(answersMap);
        setSavedAnswerIds(answerIdsMap);
      } else {
        const newSub = await submissionAPI.create({ activityId: id });
        setSubmission(newSub.data.submission);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const flattenElements = (elements) => {
    const flattened = [];
    elements.forEach(elem => {
      if (elem.element_type === 'question') {
        flattened.push(elem);
      }
      if (elem.children && elem.children.length > 0) {
        flattened.push(...flattenElements(elem.children));
      }
    });
    return flattened;
  };

  // Attach event listeners to interactive elements after rendering
  useEffect(() => {
    if (!questionBodyRef.current || !submission) return;

    const container = questionBodyRef.current;
    // Look for elements with data-element-uuid instead of data-answer-field
    const inputs = container.querySelectorAll('[data-element-uuid]');
    const isSubmitted = submission.status === 'submitted';

    const handleInputChange = (e) => {
      // Don't allow changes if submitted
      if (isSubmitted) {
        e.preventDefault();
        return;
      }

      const element = e.target;

      // For text/textarea/select, prefer 'name' over 'data-element-uuid'
      // For radio/checkbox, use 'name' as the group identifier
      const fieldName = element.getAttribute('name') || element.getAttribute('data-element-uuid');

      if (!fieldName) return;

      let value;
      if (element.type === 'checkbox') {
        // Collect all checked values in the checkbox group as an array
        const allCheckboxes = container.querySelectorAll(`input[type="checkbox"][name="${fieldName}"]`);
        value = Array.from(allCheckboxes)
          .filter(cb => cb.checked)
          .map(cb => cb.value);
      } else if (element.type === 'radio') {
        // Store the selected radio value
        value = element.value;
      } else {
        // Text, textarea, select, etc.
        value = element.value;
      }

      setAnswers(prev => ({ ...prev, [fieldName]: value }));
    };

    inputs.forEach(input => {
      // Disable inputs if submitted
      if (isSubmitted) {
        input.disabled = true;
        input.style.cursor = 'not-allowed';
        input.style.opacity = '0.6';
      }
      
      input.addEventListener('change', handleInputChange);
      input.addEventListener('input', handleInputChange);
    });

    // Restore saved answers
    console.log('🔄 Restoring answers to inputs, total inputs:', inputs.length);
    console.log('🔄 Available answers:', answers);

    inputs.forEach(input => {
      // Use 'name' attribute as the field identifier (for grouping)
      const fieldName = input.getAttribute('name') || input.getAttribute('data-element-uuid');
      const savedValue = answers[fieldName];
      const elementType = input.getAttribute('data-element-type');

      console.log('🔄 Input:', {
        type: input.type,
        elementType,
        fieldName,
        savedValue,
        hasValue: savedValue !== undefined
      });

      if (fieldName && savedValue !== undefined) {
        if (elementType === 'checkbox' || input.type === 'checkbox') {
          // Array value for checkbox group - check if this input's value is in the array
          input.checked = Array.isArray(savedValue) && savedValue.includes(input.value);
          console.log('  ✓ Set checkbox to:', input.checked, '(value in array:', savedValue, ')');
        } else if (elementType === 'radio' || input.type === 'radio') {
          // String value for radio - check if this input's value matches
          input.checked = input.value === savedValue;
          console.log('  ✓ Set radio to:', input.checked, '(matches:', savedValue, ')');
        } else {
          // String value for text, textarea, select, etc.
          input.value = savedValue;
          console.log('  ✓ Set text value to:', savedValue);
        }
      } else {
        console.log('  ⚠️ No saved value found for field:', fieldName);
      }
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('change', handleInputChange);
        input.removeEventListener('input', handleInputChange);
      });
    };
  }, [currentElementIndex, elements, submission, answers]);

  const saveAnswers = async () => {
    if (!submission) return;

    setSaving(true);
    try {
      // Get the current question's HTML to find all field UUIDs
      const container = questionBodyRef.current;
      if (!container) {
        console.error('Question container not found');
        return;
      }

      const inputs = container.querySelectorAll('[data-element-uuid]');
      const currentQuestionId = currentElement?.question_id;
      const currentElementId = currentElement?.id;

      if (!currentQuestionId || !currentElementId) {
        console.error('Current element not found');
        return;
      }

      // Build answer data - collect all field values
      const answerData = {};
      const processedFields = new Set(); // Track which fields we've already processed

      inputs.forEach(input => {
        // Use 'name' attribute as field identifier
        const fieldIdentifier = input.getAttribute('name') || input.getAttribute('data-element-uuid');

        // Skip if we've already processed this field (avoid duplicates for checkbox/radio groups)
        if (processedFields.has(fieldIdentifier)) return;
        processedFields.add(fieldIdentifier);

        const fieldValue = answers[fieldIdentifier];

        if (fieldIdentifier && fieldValue !== undefined) {
          answerData[fieldIdentifier] = fieldValue;
        }
      });

      // Skip if no answers for this question
      if (Object.keys(answerData).length === 0) {
        toast({
          variant: "default",
          title: "No changes to save",
          description: "Please answer the question before saving.",
        });
        setSaving(false);
        return;
      }

      // Check if we have an existing answer for this question
      const existingAnswerId = savedAnswerIds[currentElementId];

      if (existingAnswerId) {
        // Update existing answer
        await submissionAnswerAPI.update(existingAnswerId, {
          answerData: JSON.stringify(answerData)
        });
      } else {
        // Create new answer
        const response = await submissionAnswerAPI.create({
          submissionId: submission.id,
          questionId: currentQuestionId,
          elementUuid: currentElementId,
          answerData: JSON.stringify(answerData)
        });
        // Track the new answer ID
        setSavedAnswerIds(prev => ({
          ...prev,
          [currentElementId]: response.data.answer.id
        }));
      }

      toast({
        variant: "success",
        title: "Progress saved",
        description: "Your answer has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving answers:', error);
      toast({
        variant: "destructive",
        title: "Error saving answers",
        description: "Failed to save your answers. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveCurrentQuestionAnswers = async () => {
    // Save the current question's answers silently (without toast notifications)
    if (!submission || !questionBodyRef.current) return;

    try {
      const container = questionBodyRef.current;
      const inputs = container.querySelectorAll('[data-element-uuid]');
      const currentQuestionId = currentElement?.question_id;
      const currentElementId = currentElement?.id;

      if (!currentQuestionId || !currentElementId) return;

      // Build answer data
      const answerData = {};
      inputs.forEach(input => {
        let fieldIdentifier;
        if (input.type === 'radio' || input.type === 'checkbox') {
          fieldIdentifier = input.getAttribute('data-element-uuid');
        } else {
          fieldIdentifier = input.getAttribute('name') || input.getAttribute('data-element-uuid');
        }

        const fieldValue = answers[fieldIdentifier];
        if (fieldIdentifier && fieldValue !== undefined) {
          answerData[fieldIdentifier] = fieldValue;
        }
      });

      // Skip if no answers
      if (Object.keys(answerData).length === 0) return;

      // Save or update
      const existingAnswerId = savedAnswerIds[currentElementId];
      if (existingAnswerId) {
        await submissionAnswerAPI.update(existingAnswerId, {
          answerData: JSON.stringify(answerData)
        });
      } else {
        const response = await submissionAnswerAPI.create({
          submissionId: submission.id,
          questionId: currentQuestionId,
          elementUuid: currentElementId,
          answerData: JSON.stringify(answerData)
        });
        setSavedAnswerIds(prev => ({
          ...prev,
          [currentElementId]: response.data.answer.id
        }));
      }

      console.log('💾 Auto-saved question:', currentElementId);
    } catch (error) {
      console.error('Error auto-saving:', error);
    }
  };

  const handleNavigate = async (direction) => {
    // Auto-save before navigating
    await saveCurrentQuestionAnswers();

    // Then navigate
    if (direction === 'next') {
      setCurrentElementIndex(prev => Math.min(elements.length - 1, prev + 1));
    } else {
      setCurrentElementIndex(prev => Math.max(0, prev - 1));
    }
  };

  const handleSubmit = async () => {
    if (!submission) return;

    try {
      // Save current question's answers before submitting
      await saveCurrentQuestionAnswers();

      // Then submit
      await submissionAPI.update(submission.id, { status: 'submitted' });

      toast({
        variant: "success",
        title: "Activity submitted",
        description: "Your activity has been submitted successfully.",
      });

      navigate('/submissions');
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        variant: "destructive",
        title: "Error submitting activity",
        description: "Failed to submit your activity. Please try again.",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading activity...</div>;
  }

  if (!activity) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-semibold text-destructive">Activity Not Found</p>
        <p className="text-muted-foreground mt-2">
          The activity you're looking for doesn't exist or you don't have permission to access it.
        </p>
        <Button className="mt-4" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-semibold text-amber-600">No Questions Available</p>
        <p className="text-muted-foreground mt-2">
          This activity exists but hasn't been configured with any questions yet.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Please contact your instructor or try again later.
        </p>
        <Button className="mt-4" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const currentElement = elements[currentElementIndex];
  const isLast = currentElementIndex === elements.length - 1;
  const isSubmitted = submission?.status === 'submitted';

  // Don't modify the body HTML - preserve original field UUIDs
  const processedBodyHtml = currentElement?.body_html || '';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mt-4">{activity.title}</h1>
        <p className="text-muted-foreground mt-2">{activity.description}</p>
        {isSubmitted && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              ✓ This activity has been submitted. Viewing in read-only mode.
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
        <span className="text-sm font-medium">
          Question {currentElementIndex + 1} of {elements.length}
        </span>
        <span className="text-sm text-muted-foreground">
          {(() => {
            // Count how many questions have been answered (based on savedAnswerIds)
            const answeredQuestions = Object.keys(savedAnswerIds).length;
            const completionPercentage = elements.length > 0
              ? Math.round((answeredQuestions / elements.length) * 100)
              : 0;
            return completionPercentage;
          })()}% Complete
        </span>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{currentElement.question_title}</CardTitle>
            {!isSubmitted && (
              <Button
                variant="outline"
                size="sm"
                onClick={saveAnswers}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Progress'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Render HTML body with interactive elements */}
          <div
            ref={questionBodyRef}
            className="prose max-w-none mb-6"
            dangerouslySetInnerHTML={{ __html: processedBodyHtml }}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => handleNavigate('prev')}
          disabled={currentElementIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {!isSubmitted && isLast ? (
          <Button onClick={handleSubmit}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Submit Activity
          </Button>
        ) : !isSubmitted ? (
          <Button onClick={() => handleNavigate('next')}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : isLast ? null : (
          <Button onClick={() => handleNavigate('next')}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
