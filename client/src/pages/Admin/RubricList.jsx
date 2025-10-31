import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rubricAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Award, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RubricList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rubrics, setRubrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');

  useEffect(() => {
    fetchRubrics();
  }, [filterType, filterStatus]);

  const fetchRubrics = async () => {
    try {
      setLoading(true);
      const params = { status: filterStatus };
      if (filterType !== 'all') {
        params.rubric_type = filterType;
      }
      const response = await rubricAPI.getAll(params);
      setRubrics(response.data.rubrics || []);
    } catch (error) {
      console.error('Error fetching rubrics:', error);
      toast({
        variant: "destructive",
        title: "Error loading rubrics",
        description: "Failed to load rubrics. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to archive this rubric?')) return;

    try {
      await rubricAPI.archive(id);
      toast({
        variant: "success",
        title: "Rubric archived",
        description: "Rubric has been archived successfully.",
      });
      fetchRubrics();
    } catch (error) {
      console.error('Error archiving rubric:', error);
      toast({
        variant: "destructive",
        title: "Error archiving rubric",
        description: "Failed to archive rubric. Please try again.",
      });
    }
  };

  const getRubricTypeLabel = (type) => {
    const labels = {
      points: 'Points-Based',
      criteria: 'Criteria-Based',
      pass_fail: 'Pass/Fail',
      percentage: 'Percentage',
      custom: 'Custom'
    };
    return labels[type] || type;
  };

  const getRubricTypeIcon = (type) => {
    switch (type) {
      case 'criteria':
        return <Award className="h-5 w-5 text-blue-500" />;
      case 'points':
        return <span className="text-lg">🎯</span>;
      case 'pass_fail':
        return <span className="text-lg">✓</span>;
      case 'percentage':
        return <span className="text-lg">%</span>;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="p-6">Loading rubrics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rubrics</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage scoring rubrics for your activities
          </p>
        </div>
        <Button onClick={() => navigate('/admin/rubrics/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rubric
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Rubric Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="points">Points-Based</SelectItem>
                  <SelectItem value="criteria">Criteria-Based</SelectItem>
                  <SelectItem value="pass_fail">Pass/Fail</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rubrics Grid */}
      {rubrics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No rubrics found</p>
            <p className="text-muted-foreground mt-1">
              Create your first rubric to get started with grading
            </p>
            <Button className="mt-4" onClick={() => navigate('/admin/rubrics/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rubric
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rubrics.map((rubric) => (
            <Card key={rubric.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getRubricTypeIcon(rubric.rubric_type)}
                    <div>
                      <CardTitle className="text-lg">{rubric.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {getRubricTypeLabel(rubric.rubric_type)}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rubric.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {rubric.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {rubric.criteria?.length || 0} criteria
                    </span>
                    {rubric.max_score && (
                      <span className="font-semibold">
                        Max: {rubric.max_score} pts
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created by {rubric.creator?.email || 'Unknown'}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/admin/rubrics/${rubric.id}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(rubric.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
