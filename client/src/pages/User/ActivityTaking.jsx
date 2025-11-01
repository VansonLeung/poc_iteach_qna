import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { activityAPI, activityElementAPI, submissionAPI, submissionAnswerAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, CheckCircle, Save, Award, Eye, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ActivityTaking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Determine if we're viewing by submission ID or activity ID
  const isSubmissionView = location.pathname.includes('/submissions/');
  const [activity, setActivity] = useState(null);
  const [elements, setElements] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [savedAnswerIds, setSavedAnswerIds] = useState({});
  const [questionAnswers, setQuestionAnswers] = useState({}); // Map: element_uuid -> answer_data
  const [currentElementIndex, setCurrentElementIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'correct'
  const [questionScores, setQuestionScores] = useState({});
  const questionBodyRef = useRef(null);

  // Get current question's answer data only
  const getCurrentQuestionAnswers = () => {
    if (!currentElement?.id) return null;
    return questionAnswers[currentElement.id] || null;
  };

  // Render individual answer fields - similar to grading interface
  const renderAnswerFields = (data, expectedData = null) => {
    if (!data || typeof data !== 'object') {
      return <p className="text-sm text-muted-foreground">No answer data</p>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(data).map(([key, value]) => {
          // Handle comparison for different value types
          let isCorrect = false;
          if (expectedData && expectedData[key] !== undefined) {
            if (Array.isArray(value) && Array.isArray(expectedData[key])) {
              // Compare arrays (for checkboxes) - order-independent
              const sortedValue = [...value].sort();
              const sortedExpected = [...expectedData[key]].sort();
              isCorrect = JSON.stringify(sortedValue) === JSON.stringify(sortedExpected);
            } else {
              // Direct comparison (works for strings, numbers, booleans)
              isCorrect = expectedData[key] === value;
            }
          }

          // Format value for display
          let displayValue;
          if (typeof value === 'boolean') {
            displayValue = value ? '✓ Selected' : '✗ Not selected';
          } else if (Array.isArray(value)) {
            displayValue = value.length > 0 ? value.join(', ') : '(none selected)';
          } else {
            displayValue = value || '';
          }

          return (
            <div key={key} className="space-y-2">
              <Label className="text-sm font-medium capitalize">
                {key.replace(/_/g, ' ').replace(/-/g, ' ')}
              </Label>
              <div className="relative">
                <Input
                  value={displayValue}
                  readOnly
                  className={`bg-white ${isCorrect ? 'border-green-500' : ''}`}
                />
                {expectedData && expectedData[key] !== undefined && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCorrect ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const fetchActivity = async () => {
    try {
      let activityId = id;
      let sub = null;

      // If viewing by submission ID, fetch the submission first to get activity ID
      if (isSubmissionView) {
        console.log('📋 Viewing by submission ID:', id);
        const submissionRes = await submissionAPI.getById(id);
        sub = submissionRes.data.submission;
        activityId = sub.activity_id;
        console.log('📋 Loaded submission:', sub.id, 'Activity:', activityId, 'Status:', sub.status);
        setSubmission(sub);
      }

      // Fetch activity and elements
      const activityRes = await activityAPI.getById(activityId);
      setActivity(activityRes.data.activity);

      const elementsRes = await activityElementAPI.getAll({ activityId, status: 'active' });
      const flattenedElements = flattenElements(elementsRes.data.elements || []);

      // For graded/submitted submissions, fetch full grading data including expected answers
      if (sub && (sub.status === 'graded' || sub.status === 'submitted')) {
        try {
          const gradingResponse = await submissionAPI.getForGrading(sub.id);
          const { questions: questionData } = gradingResponse.data;

          console.log('📊 Grading response:', gradingResponse.data);

          // Create a map of question_id -> grading data for quick lookup
          const gradingDataMap = {};
          questionData.forEach(q => {
            gradingDataMap[q.questionId] = {
              scoring: {
                rubricId: q.question?.scoring?.rubric_id,
                maxScore: q.question?.scoring?.max_score || 10,
                scoringType: q.question?.scoring?.scoring_type || 'manual',
                expectedAnswers: q.question?.scoring?.expected_answers
              },
              bodyHtml: q.question?.body_html || ''
            };
          });

          // Merge grading data into elements
          flattenedElements.forEach(element => {
            if (element.question_id && gradingDataMap[element.question_id]) {
              const gradingData = gradingDataMap[element.question_id];
              element.scoring = gradingData.scoring;
              // Override body_html with the one from grading data to ensure consistency
              if (gradingData.bodyHtml) {
                element.body_html = gradingData.bodyHtml;
              }
              console.log('📊 Added scoring for question:', element.question_id, element.scoring);
            }
          });
        } catch (err) {
          console.error('Error fetching grading data:', err);
        }
      }

      setElements(flattenedElements);

      // If viewing by activity ID (not submission ID), get or create submission
      if (!isSubmissionView) {
        // First try to get in-progress submission
        let submissionsRes = await submissionAPI.getAll({ activityId, status: 'in-progress' });
        console.log('First query (in-progress):', submissionsRes.data);

        // If no in-progress submission, get the most recent submission (could be submitted)
        if (!submissionsRes.data.submissions?.length) {
          console.log('No in-progress submissions found, fetching any submission...');
          submissionsRes = await submissionAPI.getAll({ activityId, limit: 1 });
          console.log('Second query (any status):', submissionsRes.data);
        }

        if (submissionsRes.data.submissions?.length > 0) {
          sub = submissionsRes.data.submissions[0];
          console.log('Loading submission:', sub.id, 'Status:', sub.status);
          setSubmission(sub);
        } else {
          const newSub = await submissionAPI.create({ activityId });
          sub = newSub.data.submission;
          setSubmission(sub);
        }
      }

      // Load answers if we have a submission
      if (sub) {

        // Load existing answers
        const answersRes = await submissionAnswerAPI.getAll({ submissionId: sub.id });
        console.log('📥 Loading answers for submission:', sub.id);
        console.log('📥 Raw answers from API:', answersRes.data.answers);

        const answersMap = {};
        const answerIdsMap = {};
        const questionAnswersMap = {}; // Map: element_uuid -> answer_data

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
              // Store the full answer data for this question
              questionAnswersMap[ans.element_uuid] = parsedAnswer;

              // Merge all field answers into the main answersMap (for backward compatibility)
              Object.entries(parsedAnswer).forEach(([fieldIdentifier, value]) => {
                console.log('  ✓ Mapping field:', fieldIdentifier, '→', value);
                answersMap[fieldIdentifier] = value;
              });
            }
          } catch (e) {
            console.error('Error parsing answer_data:', e);
            answersMap[ans.element_uuid] = ans.answer_data;
            questionAnswersMap[ans.element_uuid] = ans.answer_data;
          }
          // Track answer ID by element_uuid (question ID)
          answerIdsMap[ans.element_uuid] = ans.id;
        });

        console.log('📥 Final answersMap:', answersMap);
        console.log('📥 Final answerIdsMap:', answerIdsMap);
        console.log('📥 Final questionAnswersMap:', questionAnswersMap);

        setAnswers(answersMap);
        setSavedAnswerIds(answerIdsMap);
        setQuestionAnswers(questionAnswersMap);

        // Fetch scores if submission is submitted or graded
        if (sub.status === 'submitted' || sub.status === 'graded') {
          await fetchScores(sub.id);
        }
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScores = async (submissionId) => {
    try {
      console.log('🎯 Fetching scores for submission:', submissionId);
      const response = await submissionAPI.getScores(submissionId);
      console.log('🎯 Scores response:', response.data);
      const { questionScores: scores } = response.data;

      // Create a map of question_id -> score data
      const scoresMap = {};
      if (scores && Array.isArray(scores)) {
        scores.forEach(score => {
          console.log('🎯 Processing score:', score);
          // The API returns score.question.id as the question ID
          const questionId = score.question?.id;
          if (questionId) {
            scoresMap[questionId] = {
              score: score.score,
              max_score: score.maxScore,
              percentage: score.percentage,
              feedback: score.feedback,
              criteria_scores: score.criteriaScores,
              rubric: score.rubric,
              graded_at: score.gradedAt
            };
            console.log('🎯 Mapped score for question:', questionId, scoresMap[questionId]);
          }
        });
      }
      console.log('🎯 Final scoresMap:', scoresMap);
      setQuestionScores(scoresMap);
    } catch (error) {
      console.error('Error fetching scores:', error);
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

  // Populate fields based on active tab and submission status
  useEffect(() => {
    // Add a small delay to ensure DOM is ready, especially for tab content
    const timer = setTimeout(() => {
      if (!questionBodyRef.current || !submission) return;

      const container = questionBodyRef.current;
      const inputs = container.querySelectorAll('[data-element-uuid]');
      const isReadOnly = submission.status === 'submitted' || submission.status === 'graded';
      const isGraded = submission.status === 'graded';

      console.log('🔄 useEffect triggered - Status:', submission.status, 'isReadOnly:', isReadOnly);

      // Determine which data to display
      let dataToDisplay = {};
      if (isGraded && activeTab === 'correct') {
        // Show correct answers for graded submissions
        const currentQuestion = elements[currentElementIndex];
        const scoring = currentQuestion?.scoring;
        if (scoring?.expectedAnswers) {
          dataToDisplay = scoring.expectedAnswers;
        }
      } else {
        // Show student answers (for all statuses and for 'student' tab)
        dataToDisplay = answers;
      }

    const handleInputChange = (e) => {
      // Don't allow changes if submitted or graded
      if (isReadOnly) {
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
      // Disable inputs if read-only (submitted or graded)
      if (isReadOnly) {
        input.disabled = true;
        input.style.cursor = 'not-allowed';
        input.style.opacity = '0.6';
      } else {
        input.disabled = false;
        input.style.cursor = '';
        input.style.opacity = '';
      }

      if (!isReadOnly) {
        input.addEventListener('change', handleInputChange);
        input.addEventListener('input', handleInputChange);
      }
    });

    // Populate fields with appropriate data
    console.log('🔄 Populating inputs, total inputs:', inputs.length);
    console.log('🔄 Data to display:', dataToDisplay);
    console.log('🔄 Active tab:', activeTab);

    inputs.forEach(input => {
      // Use 'name' attribute as the field identifier (for grouping)
      const fieldName = input.getAttribute('name') || input.getAttribute('data-element-uuid');
      const value = dataToDisplay[fieldName];
      const elementType = input.getAttribute('data-element-type');

      console.log('🔄 Input:', {
        type: input.type,
        elementType,
        fieldName,
        value,
        hasValue: value !== undefined
      });

      if (fieldName && value !== undefined) {
        if (elementType === 'checkbox' || input.type === 'checkbox') {
          // Array value for checkbox group - check if this input's value is in the array
          input.checked = Array.isArray(value) && value.includes(input.value);
          console.log('  ✓ Set checkbox to:', input.checked, '(value in array:', value, ')');
        } else if (elementType === 'radio' || input.type === 'radio') {
          // String value for radio - check if this input's value matches
          input.checked = input.value === value;
          console.log('  ✓ Set radio to:', input.checked, '(matches:', value, ')');
        } else {
          // String value for text, textarea, select, etc.
          input.value = value;
          console.log('  ✓ Set text value to:', value);
        }
      } else {
        // Clear the field if no value
        if (elementType === 'checkbox' || input.type === 'checkbox') {
          input.checked = false;
        } else if (elementType === 'radio' || input.type === 'radio') {
          input.checked = false;
        } else {
          input.value = '';
        }
        console.log('  ⚠️ No value found for field:', fieldName);
      }
    });

      return () => {
        inputs.forEach(input => {
          input.removeEventListener('change', handleInputChange);
          input.removeEventListener('input', handleInputChange);
        });
      };
    }, 10); // Small delay for DOM to be ready

    return () => clearTimeout(timer);
  }, [currentElementIndex, elements, submission, answers, activeTab]);

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
  const isGraded = submission?.status === 'graded';
  const isReadOnly = isSubmitted || isGraded;

  // Try to find score using question_id or element id
  const questionIdForScore = currentElement?.question_id || currentElement?.id;
  const currentQuestionScore = questionIdForScore ? questionScores[questionIdForScore] : null;

  console.log('🔍 Current element:', currentElement);
  console.log('🔍 Question ID for score:', questionIdForScore);
  console.log('🔍 Current question score:', currentQuestionScore);
  console.log('🔍 All question scores:', questionScores);

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
        {isGraded && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800">
              ✓ This activity has been graded. You can view your answers and compare them with correct answers.
            </p>
          </div>
        )}
        {isSubmitted && !isGraded && (
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
            <div className="flex items-center gap-2">
              {currentQuestionScore && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                  <Award className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">
                    {currentQuestionScore.score?.toFixed(1) || 0} / {currentQuestionScore.max_score?.toFixed(1) || 0}
                  </span>
                </div>
              )}
              {!isReadOnly && (
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
              {isReadOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/submissions/${submission.id}/scores`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All Scores
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isGraded ? (
            <>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="student">Student Answer</TabsTrigger>
                  <TabsTrigger value="correct">Correct Answer</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="student" key="student-tab">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
                    <p className="text-sm text-blue-800 font-medium">
                      Your submitted answers
                    </p>
                  </div>

                  {/* Question body HTML with populated fields */}
                  {processedBodyHtml && (
                    <div
                      key="student-body"
                      ref={questionBodyRef}
                      className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4"
                      dangerouslySetInnerHTML={{ __html: processedBodyHtml }}
                    />
                  )}

                  {/* Answer Summary - only show answer fields for this question */}
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-medium text-muted-foreground">Answer Summary:</Label>
                    <div className="mt-2">
                      {renderAnswerFields(getCurrentQuestionAnswers(), currentElement?.scoring?.expectedAnswers)}
                    </div>
                    {currentQuestionScore?.feedback && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-sm font-semibold text-amber-900 mb-1">Instructor Feedback:</p>
                        <p className="text-sm text-amber-800">{currentQuestionScore.feedback}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="correct" key="correct-tab">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4">
                    <p className="text-sm text-green-800 font-medium">
                      Expected correct answers
                    </p>
                  </div>

                  {/* Question body HTML with populated fields */}
                  {processedBodyHtml && (
                    <div
                      key="correct-body"
                      ref={questionBodyRef}
                      className="p-4 bg-green-50 border border-green-200 rounded-md mb-4"
                      dangerouslySetInnerHTML={{ __html: processedBodyHtml }}
                    />
                  )}

                  {/* Answer Summary - only show answer fields */}
                  {currentElement?.scoring?.expectedAnswers ? (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-sm font-medium text-muted-foreground">Answer Summary:</Label>
                      <div className="mt-2">
                        {renderAnswerFields(currentElement.scoring.expectedAnswers, null)}
                      </div>
                      {currentQuestionScore?.feedback && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-sm font-semibold text-amber-900 mb-1">Instructor Feedback:</p>
                          <p className="text-sm text-amber-800">{currentQuestionScore.feedback}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-700 italic">No expected answer configured for this question</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="raw" key="raw-tab">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-blue-800">Student Answer Data (This Question Only):</h4>
                      <pre className="bg-blue-50 p-4 rounded-md overflow-x-auto text-xs border border-blue-200">
                        {JSON.stringify(getCurrentQuestionAnswers(), null, 2)}
                      </pre>
                    </div>
                    {currentElement?.scoring?.expectedAnswers && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-green-800">Expected Answer Data:</h4>
                        <pre className="bg-green-50 p-4 rounded-md overflow-x-auto text-xs border border-green-200">
                          {JSON.stringify(currentElement.scoring.expectedAnswers, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <>
              {/* Render HTML body with interactive elements */}
              <div
                ref={questionBodyRef}
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: processedBodyHtml }}
              />

              {/* Answer Summary under question body for submitted (non-graded) */}
              {isSubmitted && answers && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-sm font-medium text-muted-foreground">Answer Summary:</Label>
                  <div className="mt-2">
                    {renderAnswerFields(answers, currentElement?.scoring?.expectedAnswers)}
                  </div>
                  {currentQuestionScore?.feedback && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm font-semibold text-amber-900 mb-1">Instructor Feedback:</p>
                      <p className="text-sm text-amber-800">{currentQuestionScore.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
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
