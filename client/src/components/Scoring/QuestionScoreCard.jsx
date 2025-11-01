import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';
import RubricFeedback from './RubricFeedback';
import { format } from 'date-fns';

export default function QuestionScoreCard({ questionScore }) {
  const { question, score, maxScore, percentage, feedback, criteriaScores, rubric, gradedAt } = questionScore;

  const getScoreColor = (pct) => {
    if (pct >= 90) return 'text-green-600';
    if (pct >= 80) return 'text-blue-600';
    if (pct >= 70) return 'text-yellow-600';
    if (pct >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const scorePercentage = percentage !== null ? percentage : 0;
  const scoreColor = getScoreColor(scorePercentage);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <CheckCircle className={`h-5 w-5 ${scoreColor}`} />
              <span>{question?.title || 'Question'}</span>
            </CardTitle>
            {gradedAt && (
              <p className="text-sm text-muted-foreground mt-1">
                Graded on {format(new Date(gradedAt), 'MMM dd, yyyy')}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreColor}`}>
              {score !== null ? score.toFixed(1) : '--'}
              <span className="text-lg text-muted-foreground">
                {' / '}{maxScore || 0}
              </span>
            </div>
            <p className={`text-sm font-semibold ${scoreColor}`}>
              {percentage !== null ? `${percentage.toFixed(1)}%` : '--'}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* General Feedback */}
        {feedback && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-1">Instructor Feedback</p>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">{feedback}</p>
          </div>
        )}

        {/* Rubric Feedback */}
        {rubric && criteriaScores && (
          <RubricFeedback
            rubric={rubric}
            criteriaScores={criteriaScores}
          />
        )}

        {/* No Feedback */}
        {!feedback && !rubric && (
          <p className="text-sm text-muted-foreground italic">
            No additional feedback provided
          </p>
        )}
      </CardContent>
    </Card>
  );
}
