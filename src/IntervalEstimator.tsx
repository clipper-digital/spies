import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Unlock, PlusCircle, MinusCircle, RefreshCcw, RotateCcw } from 'lucide-react';

// Helper Components
const TotalDisplay = ({ total, onForceTotal }) => (
  <div className="mt-4 flex items-center justify-between gap-4">
    <div className={`p-2 rounded text-center font-medium flex-grow ${
      total > 100 
        ? 'bg-red-100 text-red-700 animate-[pulse_1s_ease-in-out_infinite]' 
        : 'bg-gray-100 text-gray-700'
    }`}>
      Total: {total.toFixed(1)}%
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={onForceTotal}
      className="whitespace-nowrap"
    >
      Force to 100%
    </Button>
  </div>
);

const ResultsList = ({ results, intervals, intervalUnit }) => (
  <div className="space-y-4">
    <Alert>
      <AlertTitle>Group Average Probabilities</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-1">
          {intervals.map(interval => (
            <p key={interval}>
              {interval} {intervalUnit}: {results.averages[interval]}%
            </p>
          ))}
        </div>
      </AlertDescription>
    </Alert>

    <Alert className="bg-blue-50">
      <AlertTitle>90% Probability Estimate</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          <p>Range: {results.confidenceInterval.intervals} {intervalUnit}</p>
          <p className="text-sm text-gray-600">
            Total probability covered: {results.confidenceInterval.totalProbability.toFixed(1)}%
          </p>
          <div className="text-sm text-gray-600">
            Intervals included:
            <ul className="list-disc pl-5 mt-1">
              {results.confidenceInterval.includedIntervals.map(([interval, prob]) => (
                <li key={interval}>
                  {interval} {intervalUnit}: {prob.toFixed(1)}%
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  </div>
);

// Main Component
export default function IntervalEstimator() {
  const [intervalUnit, setIntervalUnit] = useState('months');
  const [minInterval, setMinInterval] = useState(2);
  const [maxInterval, setMaxInterval] = useState(6);
  const [question, setQuestion] = useState('');
  const [estimates, setEstimates] = useState([]);
  const [intervals, setIntervals] = useState([2, 3, 4, 5, 6]);
  const [currentEstimate, setCurrentEstimate] = useState({});
  const [lockedIntervals, setLockedIntervals] = useState({});

  const currentTotal = Object.values(currentEstimate).reduce((sum, val) => 
    sum + (parseFloat(val) || 0), 0
  );

  useEffect(() => {
    const equalShare = (100 / intervals.length).toFixed(1);
    const initialEstimates = Object.fromEntries(
      intervals.map(i => [i, parseFloat(equalShare)])
    );
    const sum = Object.values(initialEstimates).reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      initialEstimates[intervals[0]] += parseFloat((100 - sum).toFixed(1));
    }
    
    setCurrentEstimate(initialEstimates);
    setLockedIntervals(Object.fromEntries(intervals.map(i => [i, false])));
  }, []);

  const handleSliderChange = (interval, newValue) => {
    const oldValue = currentEstimate[interval];
    const difference = parseFloat((newValue - oldValue).toFixed(1));
    
    const unlockedIntervals = intervals.filter(i => 
      !lockedIntervals[i] && i !== interval
    );
    
    if (unlockedIntervals.length === 0) return;

    const changePerInterval = parseFloat((-difference / unlockedIntervals.length).toFixed(1));
    
    const newEstimates = { ...currentEstimate };
    newEstimates[interval] = parseFloat(newValue.toFixed(1));
    
    unlockedIntervals.forEach(i => {
      newEstimates[i] = parseFloat(Math.max(0, Math.min(100, 
        (newEstimates[i] + changePerInterval).toFixed(1)
      )));
    });
    
    const total = Object.values(newEstimates).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 0.1) {
      const adjustment = parseFloat(((100 - total) / unlockedIntervals.length).toFixed(1));
      unlockedIntervals.forEach(i => {
        newEstimates[i] = parseFloat(Math.max(0, Math.min(100, 
          (newEstimates[i] + adjustment).toFixed(1)
        )));
      });
    }
    
    setCurrentEstimate(newEstimates);
  };

  const forceTotal = () => {
    const unlockedIntervals = intervals.filter(i => !lockedIntervals[i]);
    if (unlockedIntervals.length === 0) return;

    const newEstimates = { ...currentEstimate };
    const lockedTotal = intervals.reduce((sum, interval) => 
      sum + (lockedIntervals[interval] ? newEstimates[interval] : 0), 0
    );

    const remainingTotal = 100 - lockedTotal;
    const sharePerUnlocked = remainingTotal / unlockedIntervals.length;

    unlockedIntervals.forEach(interval => {
      newEstimates[interval] = parseFloat(sharePerUnlocked.toFixed(1));
    });

    const total = Object.values(newEstimates).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      const firstUnlocked = unlockedIntervals[0];
      newEstimates[firstUnlocked] += parseFloat((100 - total).toFixed(1));
    }

    setCurrentEstimate(newEstimates);
  };

  const toggleLock = (interval) => {
    setLockedIntervals(prev => ({
      ...prev,
      [interval]: !prev[interval]
    }));
  };

  const addEstimate = () => {
    setEstimates([...estimates, { ...currentEstimate }]);
  };

  const removeEstimate = (index) => {
    setEstimates(estimates.filter((_, i) => i !== index));
  };

  const reset = () => {
    setEstimates([]);
    const equalShare = (100 / intervals.length).toFixed(1);
    const initialEstimates = Object.fromEntries(
      intervals.map(i => [i, parseFloat(equalShare)])
    );
    const sum = Object.values(initialEstimates).reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      initialEstimates[intervals[0]] += parseFloat((100 - sum).toFixed(1));
    }
    
    setLockedIntervals(Object.fromEntries(intervals.map(i => [i, false])));
    setCurrentEstimate(initialEstimates);
  };

  const calculate90PercentInterval = (probabilities) => {
    const sortedProbs = Object.entries(probabilities)
      .map(([interval, prob]) => [parseInt(interval), parseFloat(prob)])
      .sort((a, b) => b[1] - a[1]);
    
    let sum = 0;
    let included = [];
    
    included.push(sortedProbs[0]);
    sum = sortedProbs[0][1];
    
    const usedIndices = new Set([0]);
    
    while (sum < 90 && usedIndices.size < sortedProbs.length) {
      let bestIdx = -1;
      let bestProb = -1;
      
      for (let i = 0; i < sortedProbs.length; i++) {
        if (!usedIndices.has(i) && sortedProbs[i][1] > bestProb) {
          bestIdx = i;
          bestProb = sortedProbs[i][1];
        }
      }
      
      if (bestIdx === -1) break;
      
      included.push(sortedProbs[bestIdx]);
      usedIndices.add(bestIdx);
      sum += bestProb;
    }
    
    included.sort((a, b) => a[0] - b[0]);
    
    return {
      includedIntervals: included,
      totalProbability: sum,
      intervals: `${included[0][0]}-${included[included.length-1][0]}`
    };
  };

  const calculateResults = () => {
    if (estimates.length === 0) return null;

    const averages = {};
    intervals.forEach(interval => {
      const values = estimates.map(est => parseFloat(est[interval]) || 0);
      averages[interval] = (values.reduce((a, b) => a + b, 0) / estimates.length).toFixed(1);
    });

    const confidenceInterval = calculate90PercentInterval(averages);

    return {
      averages,
      confidenceInterval
    };
  };

  const results = calculateResults();

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6 bg-white rounded-lg shadow">
      <div className="mb-6 space-y-4">
        <h2 className="text-xl font-bold">Interval-based Probability Estimator</h2>
        
        <h3 className="text-lg font-semibold">Instructions</h3>
        
        <div className="text-sm space-y-2 text-gray-600">
          <p>Use this tool to collaboratively estimate probabilities across different time intervals:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Set up your intervals by selecting the unit (days/weeks/months/years) and range</li>
            <li>Each group member assigns probabilities across intervals, ensuring they sum to 100%</li>
            <li>Use the lock toggle to fix values while adjusting others</li>
            <li>Click "Force to 100%" to automatically adjust unlocked values to sum correctly</li>
            <li>Click "Add Estimate" to save your distribution</li>
            <li>After all members have added their estimates, view the group's aggregated probabilities</li>
          </ol>
          <p className="mt-4">
            <span className="mr-1">For more</span>
            <a 
              href="https://www.cmu.edu/tepper/programs/phd/program/assets/dissertations/organizational-behavior-and-theory-haran-dissertation.pdf" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              details
            </a>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Setup Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Interval Unit</label>
            <Select value={intervalUnit} onValueChange={setIntervalUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="weeks">Weeks</SelectItem>
                <SelectItem value="months">Months</SelectItem>
                <SelectItem value="years">Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Interval</label>
            <Input
              type="number"
              value={minInterval}
              onChange={(e) => setMinInterval(e.target.value)}
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Interval</label>
            <Input
              type="number"
              value={maxInterval}
              onChange={(e) => setMaxInterval(e.target.value)}
              min={minInterval}
            />
          </div>
        </div>

        {/* Question Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Question or Statement</label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter the question or statement to estimate"
          />
        </div>

        {/* Sliders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Probability Distribution</label>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset Sliders
            </Button>
          </div>
          
          {intervals.map(interval => (
            <div key={interval} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">
                  {interval} {intervalUnit}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm w-12 text-right">
                    {currentEstimate[interval]?.toFixed(1)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLock(interval)}
                    className={lockedIntervals[interval] ? "text-red-500" : "text-gray-500"}
                  >
                    {lockedIntervals[interval] ? 
                      <Lock className="w-4 h-4" /> : 
                      <Unlock className="w-4 h-4" />
                    }
                  </Button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={currentEstimate[interval] || 0}
                onChange={(e) => !lockedIntervals[interval] && handleSliderChange(interval, parseFloat(e.target.value))}
                className="w-full"
                disabled={lockedIntervals[interval]}
              />
            </div>
          ))}
          
          <TotalDisplay 
            total={currentTotal} 
            onForceTotal={forceTotal}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={addEstimate}
            className="flex items-center gap-2"
            disabled={Math.abs(currentTotal - 100) > 0.1}
          >
            <PlusCircle className="w-4 h-4" /> Add Estimate
          </Button>
          <Button
            onClick={reset}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Start Over
          </Button>
        </div>

        {/* Results */}
        {estimates.length > 0 && results && (
          <ResultsList 
            results={results}
            intervals={intervals}
            intervalUnit={intervalUnit}
          />
        )}
      </div>
    </div>
  );
}
