import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, Search, CheckCircle, AlertCircle } from 'lucide-react';

interface TaskInputProps {
  onTaskResult: (result: any) => void;
}

const TaskInput: React.FC<TaskInputProps> = ({ onTaskResult }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handlePerformTask = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('http://localhost:3001/api/tasks/perform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Task failed');
      setResult(data);
      onTaskResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-8">
      <div className="space-y-3">
        <Label htmlFor="task-input" className="text-sm font-medium text-gray-700 block">
          Task Instructions
        </Label>
        <Input
          id="task-input"
          placeholder="e.g. Download Grade 11 Math 2020 from DBE"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
          className="w-full h-10"
        />
      </div>
      
      <Button
        onClick={handlePerformTask}
        disabled={loading || !input.trim()}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white h-10"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Performing Task...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Perform Task
          </>
        )}
      </Button>
      
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}
      
      {result && result.success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-700">
            Task complete! {result.links?.length ? `Downloaded ${result.links.length} files.` : ''}
            {result.results?.length ? `Found ${result.results.length} results.` : ''}
          </span>
        </div>
      )}
      
      {result && !result.success && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <span className="text-sm text-yellow-700">{result.message || 'Task did not complete.'}</span>
        </div>
      )}
    </div>
  );
};

export default TaskInput; 