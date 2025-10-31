import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rubricAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Save, Plus, Trash2, GripVertical, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RubricBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rubric_type: 'criteria',
    max_score: '',
  });
  const [criteria, setCriteria] = useState([]);

  useEffect(() => {
    if (id) {
      fetchRubric();
    }
  }, [id]);

  const fetchRubric = async () => {
    try {
      setLoading(true);
      const response = await rubricAPI.getById(id);
      const rubric = response.data.rubric;

      setFormData({
        title: rubric.title,
        description: rubric.description || '',
        rubric_type: rubric.rubric_type,
        max_score: rubric.max_score || '',
      });

      // Load criteria with levels
      if (rubric.criteria) {
        setCriteria(rubric.criteria.map(c => ({
          id: c.id,
          criterion_name: c.criterion_name,
          description: c.description || '',
          max_score: c.max_score,
          levels: c.levels || []
        })));
      }
    } catch (error) {
      console.error('Error fetching rubric:', error);
      toast({
        variant: "destructive",
        title: "Error loading rubric",
        description: "Failed to load rubric details.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCriterion = () => {
    setCriteria(prev => [...prev, {
      tempId: Date.now(),
      criterion_name: '',
      description: '',
      max_score: 10,
      levels: [
        { tempId: Date.now() + 1, level_name: 'Excellent', score_value: 10, description: '' },
        { tempId: Date.now() + 2, level_name: 'Good', score_value: 7, description: '' },
        { tempId: Date.now() + 3, level_name: 'Fair', score_value: 5, description: '' },
        { tempId: Date.now() + 4, level_name: 'Poor', score_value: 2, description: '' },
      ]
    }]);
  };

  const handleRemoveCriterion = (index) => {
    setCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const handleCriterionChange = (index, field, value) => {
    setCriteria(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddLevel = (criterionIndex) => {
    setCriteria(prev => {
      const updated = [...prev];
      updated[criterionIndex].levels.push({
        tempId: Date.now(),
        level_name: '',
        score_value: 0,
        description: ''
      });
      return updated;
    });
  };

  const handleRemoveLevel = (criterionIndex, levelIndex) => {
    setCriteria(prev => {
      const updated = [...prev];
      updated[criterionIndex].levels = updated[criterionIndex].levels.filter((_, i) => i !== levelIndex);
      return updated;
    });
  };

  const handleLevelChange = (criterionIndex, levelIndex, field, value) => {
    setCriteria(prev => {
      const updated = [...prev];
      updated[criterionIndex].levels[levelIndex] = {
        ...updated[criterionIndex].levels[levelIndex],
        [field]: value
      };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        rubric_type: formData.rubric_type,
        criteria: criteria.map(c => ({
          criterion_name: c.criterion_name,
          description: c.description,
          max_score: parseFloat(c.max_score),
          levels: c.levels.map(l => ({
            level_name: l.level_name,
            description: l.description,
            score_value: parseFloat(l.score_value)
          }))
        }))
      };

      // Only include max_score if it has a value
      if (formData.max_score) {
        payload.max_score = parseFloat(formData.max_score);
      }

      if (id) {
        await rubricAPI.update(id, payload);
        toast({
          variant: "success",
          title: "Rubric updated",
          description: "Rubric has been updated successfully.",
        });
      } else {
        const response = await rubricAPI.create(payload);
        toast({
          variant: "success",
          title: "Rubric created",
          description: "Rubric has been created successfully.",
        });
        navigate(`/admin/rubrics/${response.data.rubric.id}/edit`);
      }
    } catch (error) {
      console.error('Error saving rubric:', error);
      
      // Extract detailed error message
      let errorMsg = 'Failed to save rubric';
      if (error.response?.data?.errors) {
        // Handle validation errors array
        const errors = error.response.data.errors;
        errorMsg = errors.map(e => `${e.path}: ${e.msg}`).join(', ');
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      
      toast({
        variant: "destructive",
        title: "Error saving rubric",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate('/admin/rubrics')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Rubrics
        </Button>
        <h1 className="text-3xl font-bold mt-4">
          {id ? 'Edit Rubric' : 'Create New Rubric'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Define scoring criteria and performance levels
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Rubric Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., Essay Grading Rubric"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Brief description of this rubric..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rubric_type">Rubric Type *</Label>
                <Select
                  value={formData.rubric_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, rubric_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="criteria">Criteria-Based</SelectItem>
                    <SelectItem value="points">Points-Based</SelectItem>
                    <SelectItem value="pass_fail">Pass/Fail</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_score">Max Score</Label>
                <Input
                  id="max_score"
                  name="max_score"
                  type="number"
                  step="0.1"
                  value={formData.max_score}
                  onChange={handleChange}
                  placeholder="e.g., 100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Criteria */}
        {formData.rubric_type === 'criteria' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Criteria & Levels</CardTitle>
                  <CardDescription>
                    Define the criteria and performance levels for evaluation
                  </CardDescription>
                </div>
                <Button type="button" onClick={handleAddCriterion} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Criterion
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {criteria.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No criteria yet. Click "Add Criterion" to get started.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {criteria.map((criterion, cIndex) => (
                    <div key={criterion.id || criterion.tempId} className="border rounded-lg p-4 space-y-4">
                      {/* Criterion Header */}
                      <div className="flex items-start gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <Label>Criterion Name *</Label>
                              <Input
                                value={criterion.criterion_name}
                                onChange={(e) => handleCriterionChange(cIndex, 'criterion_name', e.target.value)}
                                placeholder="e.g., Content Quality"
                                required
                              />
                            </div>
                            <div>
                              <Label>Max Score *</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={criterion.max_score}
                                onChange={(e) => handleCriterionChange(cIndex, 'max_score', e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Description</Label>
                            <Input
                              value={criterion.description}
                              onChange={(e) => handleCriterionChange(cIndex, 'description', e.target.value)}
                              placeholder="Describe what this criterion evaluates..."
                            />
                          </div>

                          {/* Levels */}
                          <div className="ml-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold">Performance Levels</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddLevel(cIndex)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Level
                              </Button>
                            </div>
                            {criterion.levels.map((level, lIndex) => (
                              <div key={level.id || level.tempId} className="flex items-center gap-2 bg-muted/30 p-2 rounded">
                                <Input
                                  value={level.level_name}
                                  onChange={(e) => handleLevelChange(cIndex, lIndex, 'level_name', e.target.value)}
                                  placeholder="Level name"
                                  className="flex-1"
                                />
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={level.score_value}
                                  onChange={(e) => handleLevelChange(cIndex, lIndex, 'score_value', e.target.value)}
                                  placeholder="Score"
                                  className="w-24"
                                />
                                <Input
                                  value={level.description}
                                  onChange={(e) => handleLevelChange(cIndex, lIndex, 'description', e.target.value)}
                                  placeholder="Description"
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveLevel(cIndex, lIndex)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCriterion(cIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/rubrics')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : id ? 'Update Rubric' : 'Create Rubric'}
          </Button>
        </div>
      </form>
    </div>
  );
}
