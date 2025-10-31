import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submissionAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function SubmissionHistory() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await submissionAPI.getAll({ limit: 50 });
      setSubmissions(response.data.submissions || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading submissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Submissions</h1>
        <p className="text-muted-foreground mt-2">
          View all your activity submissions
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven't made any submissions yet
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Browse Activities
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {submission.status === 'submitted' ? (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    ) : (
                      <Clock className="h-8 w-8 text-yellow-500" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {submission.activity_title}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <span className="capitalize">
                          Status: {submission.status.replace('-', ' ')}
                        </span>
                        {submission.submitted_at && (
                          <span>
                            Submitted: {format(new Date(submission.submitted_at), 'MMM dd, yyyy')}
                          </span>
                        )}
                        <span>
                          Version: {submission.version}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={submission.status === 'submitted' ? 'outline' : 'default'}
                    onClick={() => navigate(`/activities/${submission.activity_id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {submission.status === 'submitted' ? 'View' : 'Continue'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
