import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PollCreatorProps {
  question: string;
  options: string[];
  onQuestionChange: (question: string) => void;
  onOptionsChange: (options: string[]) => void;
}

const PollCreator = ({ question, options, onQuestionChange, onOptionsChange }: PollCreatorProps) => {
  const addOption = () => {
    if (options.length < 6) {
      onOptionsChange([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      onOptionsChange(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onOptionsChange(newOptions);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="poll-question">Poll Question</Label>
        <Input
          id="poll-question"
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <Label>Options (min 2, max 6)</Label>
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
            />
            {options.length > 2 && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => removeOption(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {options.length < 6 && (
        <Button
          variant="outline"
          onClick={addOption}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Option
        </Button>
      )}
    </div>
  );
};

export default PollCreator;
