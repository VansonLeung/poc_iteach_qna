import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { activityAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ArrowLeft, Download, Users, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

export default function ActivityReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [id, statusFilter]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await activityAPI.getReport(id, params);
      setReport(response.data);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!report || !report.submissions) return;

    const headers = ['Student Name', 'Email', 'Status', 'Submitted At', 'Total Score', 'Max Score', 'Percentage', 'Graded Questions', 'Pending Questions'];
    const rows = report.submissions.map((sub) => [
      `${sub.user.first_name || ''} ${sub.user.last_name || ''}`.trim() || 'N/A',
      sub.user.email,
      sub.submission.status,
      sub.submission.submittedAt ? new Date(sub.submission.submittedAt).toLocaleDateString() : 'Not submitted',
      sub.scores.total !== null ? sub.scores.total.toFixed(2) : 'N/A',
      sub.scores.maxPossible || 0,
      sub.scores.percentage !== null ? `${sub.scores.percentage.toFixed(2)}%` : 'N/A',
      sub.scores.gradedCount || 0,
      sub.scores.pendingCount || 0
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-report-${report.activity?.title || 'report'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return <div className="text-center py-12">Loading report...</div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchReport}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { activity, submissions, statistics } = report;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/admin/activities')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Activity Report</h1>
            {activity && (
              <p className="text-muted-foreground mt-1">{activity.title}</p>
            )}
          </div>
        </div>
        <Button onClick={handleExportCSV} disabled={!submissions || submissions.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Total Submissions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div className="text-2xl font-bold">{statistics.totalSubmissions}</div>
              </div>
            </CardContent>
          </Card>

          {/* Graded */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fully Graded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div className="text-2xl font-bold">{statistics.gradedSubmissions}</div>
              </div>
            </CardContent>
          </Card>

          {/* Average Score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(statistics.averageScore || 0)}`}>
                {statistics.averageScore !== null ? `${statistics.averageScore.toFixed(1)}%` : 'N/A'}
              </div>
            </CardContent>
          </Card>

          {/* Highest Score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Highest Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div className={`text-2xl font-bold ${getScoreColor(statistics.highestScore || 0)}`}>
                  {statistics.highestScore !== null ? `${statistics.highestScore.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lowest Score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lowest Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <div className={`text-2xl font-bold ${getScoreColor(statistics.lowestScore || 0)}`}>
                  {statistics.lowestScore !== null ? `${statistics.lowestScore.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
          <CardDescription>View and filter all student submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <label className="text-sm font-medium">Filter by status:</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="graded">Graded</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      {submissions && submissions.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-medium">Student</th>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Submitted</th>
                    <th className="text-right p-4 font-medium">Score</th>
                    <th className="text-right p-4 font-medium">Percentage</th>
                    <th className="text-center p-4 font-medium">Progress</th>
                    <th className="text-center p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.submission.id} className="border-t hover:bg-muted/50">
                      <td className="p-4">
                        {`${sub.user.first_name || ''} ${sub.user.last_name || ''}`.trim() || 'N/A'}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {sub.user.email}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          sub.submission.status === 'graded'
                            ? 'bg-green-100 text-green-800'
                            : sub.submission.status === 'submitted'
                            ? 'bg-blue-100 text-blue-800'
                            : sub.submission.status === 'in-progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sub.submission.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        {sub.submission.submittedAt
                          ? new Date(sub.submission.submittedAt).toLocaleDateString()
                          : 'Not submitted'}
                      </td>
                      <td className="p-4 text-right font-semibold">
                        {sub.scores.total !== null
                          ? `${sub.scores.total.toFixed(1)} / ${sub.scores.maxPossible || 0}`
                          : 'N/A'}
                      </td>
                      <td className="p-4 text-right">
                        {sub.scores.percentage !== null ? (
                          <span className={`font-bold ${getScoreColor(sub.scores.percentage)}`}>
                            {sub.scores.percentage.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-center text-sm">
                        <div className="flex items-center justify-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{sub.scores.gradedCount || 0}</span>
                          <Clock className="h-4 w-4 text-yellow-500 ml-2" />
                          <span>{sub.scores.pendingCount || 0}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/submissions/${sub.submission.id}/scores`)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No submissions found {statusFilter !== 'all' ? `with status "${statusFilter}"` : ''}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
