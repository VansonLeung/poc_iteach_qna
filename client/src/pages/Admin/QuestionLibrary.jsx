import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Archive, Search } from 'lucide-react';

export default function QuestionLibrary() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, [search]);

  const fetchQuestions = async () => {
    try {
      const response = await questionAPI.getAll({ search, limit: 50 });
      setQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id) => {
    if (!confirm('Are you sure you want to archive this question?')) return;

    try {
      await questionAPI.archive(id);
      fetchQuestions();
    } catch (error) {
      console.error('Error archiving question:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Library</h1>
          <p className="text-muted-foreground mt-2">
            Manage reusable questions
          </p>
        </div>
        <Button onClick={() => navigate('/admin/questions/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Question
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="text-center py-12">Loading questions...</div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No questions found
            </p>
            <Button onClick={() => navigate('/admin/questions/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <Card key={question.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{question.title}</h3>
                    <div
                      className="text-sm text-muted-foreground mt-2 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: question.body_html }}
                    />
                    <div className="flex flex-wrap gap-1 mt-3">
                      {question.tags?.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-secondary rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Version {question.version} • Status: {question.status}
                      {question.parent_question_id && ' • Inherited'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/questions/${question.id}/edit`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchive(question.id)}
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
