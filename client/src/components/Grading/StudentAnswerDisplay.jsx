/**
 * Student Answer Display Component
 *
 * Displays student answers with tabs:
 * - Student Answer (rendered fields)
 * - Correct Answer
 * - Raw JSON (debug)
 */

import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle } from 'lucide-react';

export default function StudentAnswerDisplay({ response, expectedAnswers, isUnanswered, questionBodyHtml }) {
  const [activeTab, setActiveTab] = useState('student');
  const questionBodyRef = useRef(null);

  // Parse response data
  const answerData = isUnanswered ? {} : (typeof response === 'string' ? JSON.parse(response) : response);
  const expectedData = expectedAnswers ? (typeof expectedAnswers === 'string' ? JSON.parse(expectedAnswers) : expectedAnswers) : null;

  // Get current data based on active tab
  const currentData = activeTab === 'student' ? answerData : expectedData;

  // Function to clear all fields in a container
  const clearQuestionFields = (containerRef) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const inputs = container.querySelectorAll('input[data-element-uuid], input[name], textarea[data-element-uuid], textarea[name], select[data-element-uuid], select[name]');

    inputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
  };

  // Function to populate question body fields with answer data
  const populateQuestionFields = (containerRef, data) => {
    if (!containerRef.current || !data) {
      console.log('[StudentAnswerDisplay] Cannot populate fields - containerRef or data missing', {
        hasRef: !!containerRef.current,
        hasData: !!data
      });
      return;
    }

    const container = containerRef.current;
    const inputs = container.querySelectorAll('input[data-element-uuid], input[name], textarea[data-element-uuid], textarea[name], select[data-element-uuid], select[name]');

    console.log('[StudentAnswerDisplay] Populating fields', {
      inputCount: inputs.length,
      dataKeys: Object.keys(data)
    });

    inputs.forEach(input => {
      const fieldIdentifier = input.getAttribute('name') || input.getAttribute('data-element-uuid');
      const savedValue = data[fieldIdentifier];

      if (fieldIdentifier) {
        if (input.type === 'checkbox') {
          // For checkboxes: value should be an array
          const shouldCheck = Array.isArray(savedValue) && savedValue.includes(input.value);
          input.checked = shouldCheck;
          console.log('[StudentAnswerDisplay] Checkbox:', fieldIdentifier, input.value, 'checked:', shouldCheck, 'savedValue:', savedValue);
        } else if (input.type === 'radio') {
          // For radio buttons: value should be a string
          const shouldCheck = savedValue !== undefined && input.value === savedValue;
          input.checked = shouldCheck;
          console.log('[StudentAnswerDisplay] Radio:', fieldIdentifier, input.value, 'checked:', shouldCheck, 'savedValue:', savedValue);
        } else if (savedValue !== undefined) {
          // For text inputs, textareas, selects
          input.value = savedValue;
          console.log('[StudentAnswerDisplay] Text field:', fieldIdentifier, 'value:', savedValue);
        }
      }
    });
  };

  // Effect to populate fields when tab changes or data changes
  useEffect(() => {
    console.log('[StudentAnswerDisplay] Tab/data effect triggered', {
      activeTab,
      hasRef: !!questionBodyRef.current,
      hasCurrentData: !!currentData,
      dataKeys: currentData ? Object.keys(currentData) : []
    });

    if (questionBodyRef.current && currentData) {
      // Use setTimeout to ensure DOM is ready after tab switch
      const timer = setTimeout(() => {
        console.log(`[StudentAnswerDisplay] Clearing and populating ${activeTab.toUpperCase()} fields`);
        clearQuestionFields(questionBodyRef);
        populateQuestionFields(questionBodyRef, currentData);
      }, 10); // Slightly longer delay to ensure tab content is mounted
      return () => clearTimeout(timer);
    }
  }, [activeTab, currentData]);

  if (isUnanswered) {
    return (
      <div className="p-4 border rounded-md bg-gray-50">
        <p className="text-sm text-gray-400 italic">Student did not answer this question</p>
      </div>
    );
  }

  // Render individual fields based on answer structure
  const renderAnswerFields = (data, isCorrectAnswer = false) => {
    if (!data || typeof data !== 'object') {
      return <p className="text-sm">{data || 'No data'}</p>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(data).map(([key, value]) => {
          // Handle comparison for different value types
          let isCorrect = false;
          if (!isCorrectAnswer && expectedData && expectedData[key] !== undefined) {
            if (Array.isArray(value) && Array.isArray(expectedData[key])) {
              // Compare arrays (for checkboxes) - order-independent
              const sortedValue = [...value].sort();
              const sortedExpected = [...expectedData[key]].sort();
              isCorrect = JSON.stringify(sortedValue) === JSON.stringify(sortedExpected);
            } else {
              // Direct comparison (works for strings, numbers, booleans)
              isCorrect = expectedData[key] === value;
            }
          }

          // Format value for display
          let displayValue;
          if (typeof value === 'boolean') {
            displayValue = value ? '✓ Selected' : '✗ Not selected';
          } else if (Array.isArray(value)) {
            displayValue = value.length > 0 ? value.join(', ') : '(none selected)';
          } else {
            displayValue = value || '';
          }

          return (
            <div key={key} className="space-y-2">
              <Label className="text-sm font-medium capitalize">
                {key.replace(/_/g, ' ').replace(/-/g, ' ')}
              </Label>
              <div className="relative">
                <Input
                  value={displayValue}
                  readOnly
                  className={`bg-white ${isCorrect ? 'border-green-500' : ''}`}
                />
                {!isCorrectAnswer && expectedData && expectedData[key] !== undefined && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCorrect ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="student">Student Answer</TabsTrigger>
          <TabsTrigger value="correct">Correct Answer</TabsTrigger>
          <TabsTrigger value="json">Raw JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {questionBodyHtml ? (
                <>
                  <div
                    key="student-body"
                    ref={questionBodyRef}
                    className="p-4 bg-blue-50 border border-blue-200 rounded-md"
                    dangerouslySetInnerHTML={{ __html: questionBodyHtml }}
                  />
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-medium text-muted-foreground">Answer Summary:</Label>
                    <div className="mt-2">
                      {renderAnswerFields(answerData, false)}
                    </div>
                  </div>
                </>
              ) : (
                renderAnswerFields(answerData, false)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correct" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {questionBodyHtml ? (
                <>
                  <div
                    key="correct-body"
                    ref={questionBodyRef}
                    className="p-4 bg-green-50 border border-green-200 rounded-md"
                    dangerouslySetInnerHTML={{ __html: questionBodyHtml }}
                  />
                  {expectedData ? (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-sm font-medium text-muted-foreground">Answer Summary:</Label>
                      <div className="mt-2">
                        {renderAnswerFields(expectedData, true)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-700 italic">No expected answer configured for this question</p>
                    </div>
                  )}
                </>
              ) : expectedData ? (
                renderAnswerFields(expectedData, true)
              ) : (
                <p className="text-sm text-gray-500 italic">No expected answer configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Student Response (JSON)</Label>
                  <pre className="mt-2 p-4 bg-gray-50 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(answerData, null, 2)}
                  </pre>
                </div>
                {expectedData && (
                  <div>
                    <Label className="text-sm font-medium">Expected Answer (JSON)</Label>
                    <pre className="mt-2 p-4 bg-gray-50 rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(expectedData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
