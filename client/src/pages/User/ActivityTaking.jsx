import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { activityAPI, activityElementAPI, submissionAPI, submissionAnswerAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

export default function ActivityTaking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [elements, setElements] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentElementIndex, setCurrentElementIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
        answersRes.data.answers?.forEach(ans => {
          answersMap[ans.element_uuid] = ans.answer_data;
        });
        setAnswers(answersMap);
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

  const handleAnswerChange = async (elementUuid, value) => {
    setAnswers(prev => ({ ...prev, [elementUuid]: value }));

    // Auto-save answer
    if (submission) {
      try {
        const currentElement = elements[currentElementIndex];
        const existingAnswer = await submissionAnswerAPI.getAll({
          submissionId: submission.id,
          questionId: currentElement.question_id
        });

        if (existingAnswer.data.answers?.length > 0) {
          await submissionAnswerAPI.update(existingAnswer.data.answers[0].id, {
            answerData: { value }
          });
        } else {
          await submissionAnswerAPI.create({
            submissionId: submission.id,
            questionId: currentElement.question_id,
            elementUuid,
            answerData: { value }
          });
        }
      } catch (error) {
        console.error('Error saving answer:', error);
      }
    }
  };

  const handleSubmit = async () => {
    if (!submission) return;

    try {
      await submissionAPI.update(submission.id, { status: 'submitted' });
      navigate('/submissions');
    } catch (error) {
      console.error('Error submitting:', error);
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
          <CardTitle>{currentElement.question_title}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Render HTML body */}
          <div
            className="prose max-w-none mb-6"
            dangerouslySetInnerHTML={{ __html: currentElement.body_html }}
          />

          {/* Interactive elements would be rendered here */}
          {/* This is simplified - in production you'd parse the HTML and replace elements */}
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
