import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { submissionAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Award, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import QuestionScoreCard from '@/components/Scoring/QuestionScoreCard';
import RubricFeedback from '@/components/Scoring/RubricFeedback';

export default function SubmissionScores() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchScores();
  }, [id]);

  const fetchScores = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await submissionAPI.getScores(id);
      setScoreData(response.data);
    } catch (err) {
      console.error('Error fetching scores:', err);
      setError(err.response?.data?.error || 'Failed to load scores');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading scores...</div>;
  }

  if (error) {
    const backDestination = location.state?.from === 'dashboard' ? '/dashboard' : '/submissions';
    const backLabel = location.state?.from === 'dashboard' ? 'Back to Dashboard' : 'Back to My Submissions';

    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(backDestination)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchScores}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { submission, scores, questionScores, pendingQuestions } = scoreData;

  const getScoreColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadge = (percentage) => {
    if (percentage >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (percentage >= 80) return { label: 'Very Good', color: 'bg-blue-100 text-blue-800' };
    if (percentage >= 70) return { label: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    if (percentage >= 60) return { label: 'Satisfactory', color: 'bg-orange-100 text-orange-800' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  const badge = scores.percentage ? getScoreBadge(scores.percentage) : null;

  // Determine back navigation - default to /submissions since this is always a submission page
  const backDestination = location.state?.from === 'dashboard' ? '/dashboard' : '/submissions';
  const backLabel = location.state?.from === 'dashboard' ? 'Back to Dashboard' : 'Back to My Submissions';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(backDestination)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Submission Scores</h1>
            {submission.activity && (
              <p className="text-muted-foreground mt-1">
                {submission.activity.title}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Overall Score Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Overall Score</CardTitle>
              <CardDescription>
                {submission.submitted_at && (
                  <>Submitted on {format(new Date(submission.submitted_at), 'MMMM dd, yyyy')}</>
                )}
              </CardDescription>
            </div>
            {badge && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Score */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(scores.percentage || 0)}`}>
                {scores.total !== null ? scores.total.toFixed(1) : '--'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                out of {scores.maxPossible || 0}
              </p>
            </div>

            {/* Percentage */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(scores.percentage || 0)}`}>
                {scores.percentage !== null ? `${scores.percentage.toFixed(1)}%` : '--'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Percentage</p>
            </div>

            {/* Graded Questions */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div className="text-3xl font-bold">
                  {scores.gradedCount}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Questions Graded
              </p>
            </div>

            {/* Pending Questions */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-6 w-6 text-yellow-500" />
                <div className="text-3xl font-bold">
                  {scores.pendingCount}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Pending Review
              </p>
            </div>
          </div>

          {scores.pendingCount > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">
                    Some questions are still being graded
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your score will be updated once all questions have been reviewed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Scores */}
      {questionScores && questionScores.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Question Breakdown</h2>
          <div className="space-y-4">
            {questionScores.map((questionScore) => (
              <QuestionScoreCard
                key={questionScore.id}
                questionScore={questionScore}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Questions */}
      {pendingQuestions && pendingQuestions.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Awaiting Review</h2>
          <div className="space-y-3">
            {pendingQuestions.map((response) => (
              <Card key={response.id} className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-semibold">
                        {response.question?.title || 'Question'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This question is currently being reviewed by your instructor.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Scores Yet */}
      {(!questionScores || questionScores.length === 0) && (!pendingQuestions || pendingQuestions.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              No scores available yet
            </p>
            <p className="text-sm text-muted-foreground">
              Your submission is being processed. Check back soon!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
