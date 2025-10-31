import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { activityAPI, submissionAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [activitiesRes, submissionsRes] = await Promise.all([
        activityAPI.getAll({ status: 'active', limit: 10 }),
        submissionAPI.getAll({ userId: user?.id, limit: 5 }),
      ]);
      setActivities(activitiesRes.data.activities || []);
      setSubmissions(submissionsRes.data.submissions || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartActivity = async (activityId) => {
    try {
      // Create a new submission
      await submissionAPI.create({ activityId });
      navigate(`/activities/${activityId}`);
    } catch (error) {
      if (error.response?.status === 409) {
        // Already has in-progress submission
        navigate(`/activities/${activityId}`);
      } else {
        console.error('Error starting activity:', error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's what's available for you today
        </p>
      </div>

      {/* Available Activities */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Available Activities</h2>
        {activities.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No activities available at the moment
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <Card key={activity.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="mt-4">{activity.title}</CardTitle>
                  <CardDescription>{activity.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {activity.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-secondary rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleStartActivity(activity.id)}
                  >
                    Start Activity
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Submissions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Recent Submissions</h2>
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              You haven't made any submissions yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {submission.status === 'submitted' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <h3 className="font-medium">{submission.activity_title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Status: <span className="capitalize">{submission.status}</span>
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/activities/${submission.activity_id}`)}
                    >
                      {submission.status === 'submitted' ? 'View' : 'Continue'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
