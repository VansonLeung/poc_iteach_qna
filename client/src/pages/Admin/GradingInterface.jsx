/**
 * Instructor Grading Interface
 *
 * Allows instructors to view and grade student submissions
 * Supports both manual grading and reviewing auto-graded responses
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Save, Award, User, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function GradingInterface() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [scores, setScores] = useState({});
  const [rubrics, setRubrics] = useState({});
  const [feedbackForm, setFeedbackForm] = useState({});

  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activityId) {
      fetchActivityAndSubmissions();
    }
  }, [activityId]);

  const fetchActivityAndSubmissions = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // const activityResponse = await activityAPI.getById(activityId);
      // const submissionsResponse = await submissionAPI.getByActivity(activityId);

      // Mock data for demonstration
      setActivity({
        id: activityId,
        title: 'Introduction to JavaScript',
        description: 'Sample activity for grading'
      });

      setSubmissions([
        {
          id: '1',
          user: { id: 'u1', firstName: 'John', lastName: 'Student', email: 'john@example.com' },
          status: 'submitted',
          submittedAt: '2025-10-30T10:00:00Z',
          totalScore: null,
          maxPossibleScore: 100
        },
        {
          id: '2',
          user: { id: 'u2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
          status: 'graded',
          submittedAt: '2025-10-29T15:30:00Z',
          totalScore: 85,
          maxPossibleScore: 100
        }
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load grading data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubmission = async (submission) => {
    setSelectedSubmission(submission);
    setLoading(true);

    try {
      // TODO: Replace with actual API calls
      // const responsesData = await responseAPI.getBySubmission(submission.id);
      // const scoresData = await scoresAPI.getBySubmission(submission.id);
      // const questionsData = await activityAPI.getQuestions(activityId);

      // Mock data
      setQuestions([
        {
          id: 'q1',
          title: 'What is JavaScript?',
          bodyHtml: '<p>Explain JavaScript in your own words.</p>',
          scoring: {
            rubricId: 'r1',
            maxScore: 40,
            scoringType: 'manual'
          }
        },
        {
          id: 'q2',
          title: 'JavaScript Data Types',
          bodyHtml: '<p>Select all valid JavaScript data types.</p>',
          scoring: {
            rubricId: 'r2',
            maxScore: 10,
            scoringType: 'auto'
          }
        }
      ]);

      setResponses({
        q1: { answer: 'JavaScript is a programming language for web development...' },
        q2: { selected: ['string', 'number', 'boolean'] }
      });

      setScores({
        q2: {
          score: 10,
          maxScore: 10,
          feedback: 'All correct!',
          isAutoGraded: true
        }
      });

      setFeedbackForm({});
    } catch (error) {
      console.error('Error loading submission:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load submission details'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (questionId, field, value) => {
    setScores(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
  };

  const handleCriteriaScoreChange = (questionId, criterionId, score) => {
    setScores(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        criteriaScores: {
          ...(prev[questionId]?.criteriaScores || {}),
          [criterionId]: parseFloat(score)
        }
      }
    }));
  };

  const handleSaveGrades = async () => {
    setSaving(true);
    try {
      // TODO: Implement actual API call
      // await scoresAPI.saveGrades(selectedSubmission.id, scores);

      toast({
        variant: 'success',
        title: 'Grades Saved',
        description: 'Student grades have been saved successfully'
      });

      // Refresh submissions list
      await fetchActivityAndSubmissions();
    } catch (error) {
      console.error('Error saving grades:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save grades'
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'graded':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'draft':
        return <FileText className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (filterStatus === 'all') return true;
    return sub.status === filterStatus;
  });

  if (loading && !activity) {
    return (
      <div className="container mx-auto py-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/activities')}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Activities
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{activity?.title}</h1>
            <p className="text-muted-foreground">Grade student submissions</p>
          </div>
          <Award className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              {filteredSubmissions.length} {filterStatus === 'all' ? 'total' : filterStatus}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label htmlFor="filter-status">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submissions</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredSubmissions.map(submission => (
                <div
                  key={submission.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                    selectedSubmission?.id === submission.id ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => handleSelectSubmission(submission)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        {submission.user.firstName} {submission.user.lastName}
                      </span>
                    </div>
                    {getStatusIcon(submission.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {submission.status === 'graded' && (
                      <span className="font-medium">
                        Score: {submission.totalScore}/{submission.maxPossibleScore}
                      </span>
                    )}
                    {submission.status === 'submitted' && (
                      <span>Awaiting grading</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grading Panel */}
        <div className="lg:col-span-2">
          {selectedSubmission ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Grading: {selectedSubmission.user.firstName} {selectedSubmission.user.lastName}
                </CardTitle>
                <CardDescription>
                  {selectedSubmission.user.email} • Submitted {new Date(selectedSubmission.submittedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Loading questions...</p>
                ) : (
                  <div className="space-y-6">
                    {questions.map((question, index) => {
                      const response = responses[question.id];
                      const score = scores[question.id] || {};
                      const isAutoGraded = score.isAutoGraded;

                      return (
                        <Card key={question.id} className="border-2">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              Question {index + 1}: {question.title}
                            </CardTitle>
                            {isAutoGraded && (
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Auto-graded
                              </div>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Question Content */}
                            <div
                              className="p-4 bg-muted rounded-md"
                              dangerouslySetInnerHTML={{ __html: question.bodyHtml }}
                            />

                            {/* Student Response */}
                            <div>
                              <Label className="text-base font-semibold">Student Response:</Label>
                              <div className="mt-2 p-4 border rounded-md bg-background">
                                {typeof response === 'object' ? (
                                  <pre className="whitespace-pre-wrap text-sm">
                                    {JSON.stringify(response, null, 2)}
                                  </pre>
                                ) : (
                                  <p className="text-sm">{response || 'No response provided'}</p>
                                )}
                              </div>
                            </div>

                            {/* Grading Controls */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`score-${question.id}`}>Score</Label>
                                <Input
                                  id={`score-${question.id}`}
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max={question.scoring.maxScore}
                                  value={score.score || ''}
                                  onChange={(e) => handleScoreChange(question.id, 'score', parseFloat(e.target.value))}
                                  disabled={isAutoGraded}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`max-score-${question.id}`}>Max Score</Label>
                                <Input
                                  id={`max-score-${question.id}`}
                                  type="number"
                                  value={question.scoring.maxScore}
                                  disabled
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor={`feedback-${question.id}`}>Feedback</Label>
                              <textarea
                                id={`feedback-${question.id}`}
                                value={score.feedback || ''}
                                onChange={(e) => handleScoreChange(question.id, 'feedback', e.target.value)}
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Provide feedback for the student..."
                                disabled={isAutoGraded}
                              />
                            </div>

                            {isAutoGraded && (
                              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                                <p className="text-sm text-green-800 dark:text-green-200">
                                  This question was automatically graded. Score: {score.score}/{score.maxScore}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Save Button */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSaveGrades}
                        disabled={saving}
                        className="flex-1"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Grades'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSubmission(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a submission from the list to begin grading</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
