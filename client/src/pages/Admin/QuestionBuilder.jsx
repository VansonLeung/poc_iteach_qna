import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, Save } from 'lucide-react';

export default function QuestionBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    bodyHtml: '',
    parentQuestionId: null,
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!id;

  useEffect(() => {
    if (isEditMode) {
      fetchQuestion();
    }
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const response = await questionAPI.getById(id);
      const question = response.data.question;
      setFormData({
        title: question.title,
        bodyHtml: question.body_html,
        parentQuestionId: question.parent_question_id || null,
        tags: question.tags || [],
      });
    } catch (error) {
      console.error('Error fetching question:', error);
      setError('Failed to load question');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditMode) {
        await questionAPI.update(id, formData);
      } else {
        await questionAPI.create(formData);
      }
      navigate('/admin/questions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const insertInteractiveElement = (type) => {
    const uuid = crypto.randomUUID();
    let template = '';

    switch (type) {
      case 'text_input':
        template = `<div class="form-group my-4">
  <label data-element-label="Your answer">Your answer:</label>
  <input type="text" data-element-uuid="${uuid}" data-element-type="text_input" placeholder="Type your answer..." class="w-full p-2 border rounded" />
</div>`;
        break;
      case 'textarea':
        template = `<div class="form-group my-4">
  <label data-element-label="Your answer">Your answer:</label>
  <textarea data-element-uuid="${uuid}" data-element-type="textarea" rows="4" placeholder="Type your answer..." class="w-full p-2 border rounded"></textarea>
</div>`;
        break;
      case 'radio':
        template = `<div class="form-group my-4">
  <label>Choose one option:</label>
  <div>
    <label><input type="radio" name="radio-${uuid}" data-element-uuid="${crypto.randomUUID()}" data-element-type="radio" data-element-label="Option 1" value="option1" /> Option 1</label>
  </div>
  <div>
    <label><input type="radio" name="radio-${uuid}" data-element-uuid="${crypto.randomUUID()}" data-element-type="radio" data-element-label="Option 2" value="option2" /> Option 2</label>
  </div>
</div>`;
        break;
      case 'checkbox':
        template = `<div class="form-group my-4">
  <label>Select all that apply:</label>
  <div>
    <label><input type="checkbox" data-element-uuid="${crypto.randomUUID()}" data-element-type="checkbox" data-element-label="Option 1" value="option1" /> Option 1</label>
  </div>
  <div>
    <label><input type="checkbox" data-element-uuid="${crypto.randomUUID()}" data-element-type="checkbox" data-element-label="Option 2" value="option2" /> Option 2</label>
  </div>
</div>`;
        break;
    }

    setFormData({
      ...formData,
      bodyHtml: formData.bodyHtml + '\n' + template,
    });
  };

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/admin/questions')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Questions
        </Button>
      </div>

      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditMode ? 'Edit Question' : 'Create New Question'}
            </CardTitle>
            <CardDescription>
              Build interactive questions with various input types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Question Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="e.g., What is JavaScript?"
                />
              </div>

              {/* Split screen layout: Editor on left, Preview on right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left side: Editor */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bodyHtml">Question Body (HTML) *</Label>
                    <div className="mb-2 flex gap-2 flex-wrap">
                      <Button type="button" size="sm" variant="outline" onClick={() => insertInteractiveElement('text_input')}>
                        + Text Input
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertInteractiveElement('textarea')}>
                        + Textarea
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertInteractiveElement('radio')}>
                        + Radio Buttons
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertInteractiveElement('checkbox')}>
                        + Checkboxes
                      </Button>
                    </div>
                    <textarea
                      id="bodyHtml"
                      name="bodyHtml"
                      value={formData.bodyHtml}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      placeholder="Enter HTML for question body..."
                      className="flex min-h-[500px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use the buttons above to insert interactive elements with UUIDs
                    </p>
                  </div>
                </div>

                {/* Right side: Live Preview */}
                <div className="space-y-2">
                  <Label>Live Preview</Label>
                  <div className="sticky top-6">
                    <div className="p-4 border rounded-md bg-muted/30 min-h-[500px] max-h-[600px] overflow-y-auto">
                      {formData.bodyHtml ? (
                        <div
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: formData.bodyHtml }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Preview will appear here as you type...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                    disabled={loading}
                  />
                  <Button type="button" variant="outline" onClick={addTag} disabled={loading}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm bg-secondary rounded-full flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/questions')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Saving...' : isEditMode ? 'Update Question' : 'Create Question'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
