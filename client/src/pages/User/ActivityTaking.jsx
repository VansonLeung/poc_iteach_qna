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
      const submissionsRes = await submissionAPI.getAll({ activityId: id, status: 'in-progress' });
      if (submissionsRes.data.submissions?.length > 0) {
        const sub = submissionsRes.data.submissions[0];
        setSubmission(sub);

        // Load existing answers
        const answersRes = await submissionAnswerAPI.getAll({ submissionId: sub.id });
        const answersMap = {};
        const answerIdsMap = {};
        answersRes.data.answers?.forEach(ans => {
          answersMap[ans.element_uuid] = ans.answer_data;
          answerIdsMap[ans.element_uuid] = ans.id;
        });
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
    const inputs = container.querySelectorAll('[data-answer-field]');

    const handleInputChange = (e) => {
      const element = e.target;
      const fieldName = element.closest('[data-answer-field]')?.getAttribute('data-answer-field');

      if (!fieldName) return;

      let value;
      if (element.type === 'checkbox') {
        // For checkboxes, collect all checked values
        const container = element.closest('[data-answer-field]');
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        value = Array.from(checkboxes)
          .filter(cb => cb.checked)
          .map(cb => cb.value);
      } else if (element.type === 'radio') {
        value = element.value;
      } else {
        value = element.value;
      }

      setAnswers(prev => ({ ...prev, [fieldName]: value }));
    };

    inputs.forEach(input => {
      const innerInputs = input.querySelectorAll('input, textarea, select');
      innerInputs.forEach(innerInput => {
        innerInput.addEventListener('change', handleInputChange);
        innerInput.addEventListener('input', handleInputChange);
      });
    });

    // Restore saved answers
    inputs.forEach(input => {
      const fieldName = input.getAttribute('data-answer-field');
      if (fieldName && answers[fieldName] !== undefined) {
        const savedValue = answers[fieldName];
        const inputType = input.getAttribute('data-input-type');

        if (inputType === 'checkbox') {
          const checkboxes = input.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(cb => {
            cb.checked = Array.isArray(savedValue) && savedValue.includes(cb.value);
          });
        } else if (inputType === 'radio') {
          const radios = input.querySelectorAll('input[type="radio"]');
          radios.forEach(radio => {
            radio.checked = radio.value === savedValue;
          });
        } else {
          const innerInput = input.querySelector('input, textarea, select');
          if (innerInput) {
            innerInput.value = savedValue;
          }
        }
      }
    });

    return () => {
      inputs.forEach(input => {
        const innerInputs = input.querySelectorAll('input, textarea, select');
        innerInputs.forEach(innerInput => {
          innerInput.removeEventListener('change', handleInputChange);
          innerInput.removeEventListener('input', handleInputChange);
        });
      });
    };
  }, [currentElementIndex, elements, submission, answers]);

  const saveAnswers = async () => {
    if (!submission) return;

    setSaving(true);
    try {
      const currentElement = elements[currentElementIndex];

      // Save each answer
      for (const [elementUuid, answerValue] of Object.entries(answers)) {
        try {
          const answerData = { value: answerValue };
          const existingAnswerId = savedAnswerIds[elementUuid];

          if (existingAnswerId) {
            // Update existing answer
            await submissionAnswerAPI.update(existingAnswerId, {
              answerData: JSON.stringify(answerData)
            });
          } else {
            // Create new answer
            const response = await submissionAnswerAPI.create({
              submissionId: submission.id,
              questionId: currentElement.question_id,
              elementUuid,
              answerData: JSON.stringify(answerData)
            });
            // Track the new answer ID
            setSavedAnswerIds(prev => ({
              ...prev,
              [elementUuid]: response.data.answer.id
            }));
          }
        } catch (error) {
          console.error(`Error saving answer for ${elementUuid}:`, error);
        }
      }

      toast({
        variant: "success",
        title: "Progress saved",
        description: "Your answers have been saved successfully.",
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

  const handleSubmit = async () => {
    if (!submission) return;

    try {
      // Save answers first
      await saveAnswers();

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
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
        <span className="text-sm font-medium">
          Question {currentElementIndex + 1} of {elements.length}
        </span>
        <span className="text-sm text-muted-foreground">
          {Math.round(((currentElementIndex + 1) / elements.length) * 100)}% Complete
        </span>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{currentElement.question_title}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={saveAnswers}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Progress'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Render HTML body with interactive elements */}
          <div
            ref={questionBodyRef}
            className="prose max-w-none mb-6"
            dangerouslySetInnerHTML={{ __html: currentElement.body_html }}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentElementIndex(prev => Math.max(0, prev - 1))}
          disabled={currentElementIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {isLast ? (
          <Button onClick={handleSubmit}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Submit Activity
          </Button>
        ) : (
          <Button onClick={() => setCurrentElementIndex(prev => Math.min(elements.length - 1, prev + 1))}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
