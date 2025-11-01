import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Archive, Search, ClipboardCheck } from 'lucide-react';

export default function ActivityList() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [search]);

  const fetchActivities = async () => {
    try {
      const response = await activityAPI.getAll({ search, limit: 50 });
      setActivities(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id) => {
    if (!confirm('Are you sure you want to archive this activity?')) return;

    try {
      await activityAPI.archive(id);
      fetchActivities();
    } catch (error) {
      console.error('Error archiving activity:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activities</h1>
          <p className="text-muted-foreground mt-2">
            Manage learning activities
          </p>
        </div>
        <Button onClick={() => navigate('/admin/activities/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Activity
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search activities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Activities List */}
      {loading ? (
        <div className="text-center py-12">Loading activities...</div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No activities found
            </p>
            <Button onClick={() => navigate('/admin/activities/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first activity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{activity.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activity.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {activity.tags?.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-secondary rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Version {activity.version} • Status: {activity.status}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/activities/${activity.id}/grade`)}
                    >
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Grade
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/activities/${activity.id}/edit`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchive(activity.id)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
