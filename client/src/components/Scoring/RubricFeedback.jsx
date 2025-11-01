import { Card } from '@/components/ui/card';
import { CheckCircle, Circle } from 'lucide-react';

export default function RubricFeedback({ rubric, criteriaScores }) {
  if (!rubric || !criteriaScores) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-muted-foreground">Rubric Assessment</p>

      {rubric.criteria && rubric.criteria.map((criterion) => {
        const criterionScore = criteriaScores[criterion.id];
        const selectedLevel = criterion.levels?.find(level => level.id === criterionScore?.levelId);

        return (
          <div key={criterion.id} className="border rounded-lg p-4 bg-gray-50">
            <div className="mb-3">
              <h4 className="font-semibold text-sm">{criterion.name}</h4>
              {criterion.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {criterion.description}
                </p>
              )}
            </div>

            {criterion.levels && criterion.levels.length > 0 && (
              <div className="space-y-2">
                {criterion.levels
                  .sort((a, b) => b.score - a.score)
                  .map((level) => {
                    const isSelected = selectedLevel?.id === level.id;

                    return (
                      <div
                        key={level.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isSelected ? (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-medium text-sm ${
                              isSelected ? 'text-blue-900' : 'text-gray-700'
                            }`}>
                              {level.name}
                            </span>
                            <span className={`text-sm font-semibold ${
                              isSelected ? 'text-blue-700' : 'text-gray-500'
                            }`}>
                              {level.score} pts
                            </span>
                          </div>
                          <p className={`text-sm ${
                            isSelected ? 'text-blue-800' : 'text-gray-600'
                          }`}>
                            {level.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Criterion Score Summary */}
            {criterionScore && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="text-sm font-medium">Score for this criterion:</span>
                <span className="text-sm font-bold text-blue-600">
                  {criterionScore.score} / {criterion.maxScore || selectedLevel?.score || 0} pts
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Total Rubric Score */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total Rubric Score:</span>
          <span className="font-bold text-lg text-blue-600">
            {Object.values(criteriaScores).reduce((sum, cs) => sum + (cs.score || 0), 0).toFixed(1)} pts
          </span>
        </div>
      </div>
    </div>
  );
}
