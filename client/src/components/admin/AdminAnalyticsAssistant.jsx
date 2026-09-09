import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BarChart3, Loader2, Send } from 'lucide-react';
import { adminAnalyticsService } from '../../services/adminAnalyticsService';

const EXAMPLES = [
  'Who expires in 7 days?',
  "Who's been absent 3+ days?",
  "Today's cash collection"
];

function ResultRow({ result, type }) {
  if (type === 'cash_today') {
    return <tr><td className="px-3 py-2">{result.student?.name || '-'}</td><td className="px-3 py-2">{result.type || '-'}</td><td className="px-3 py-2">₹{Number(result.amount || 0).toLocaleString('en-IN')}</td><td className="px-3 py-2">{result.receiptNo || '-'}</td></tr>;
  }
  return <tr><td className="px-3 py-2">{result.name || '-'}</td><td className="px-3 py-2">{result.studentId || '-'}</td><td className="px-3 py-2">{result.mobile || '-'}</td><td className="px-3 py-2">{result.expiryDate || '-'}</td><td className="px-3 py-2">{result.seatCode || '-'}</td></tr>;
}

export default function AdminAnalyticsAssistant() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const mutation = useMutation({
    mutationFn: adminAnalyticsService.ask,
    onSuccess: setAnswer,
    onError: (error) => toast.error(error.response?.data?.message || 'Analytics query failed')
  });

  const submit = (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    mutation.mutate(question.trim());
  };

  return <section className="card" aria-labelledby="analytics-assistant-title">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div><h2 id="analytics-assistant-title" className="text-base font-semibold text-gray-900 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-library-blue" /> Admin analytics assistant</h2><p className="text-xs text-gray-500 mt-1">Local authorized analytics fallback. No student data is sent to an external AI provider.</p></div>
      {answer?.provider && <span className="text-xs text-gray-400">{answer.provider}</span>}
    </div>
    <div className="flex flex-wrap gap-2 mb-3">{EXAMPLES.map((example) => <button key={example} type="button" onClick={() => { setQuestion(example); mutation.mutate(example); }} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50">{example}</button>)}</div>
    <form onSubmit={submit} className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} className="input flex-1" placeholder="Ask about expiry, absence, or cash collection" aria-label="Analytics question" /><button className="btn btn-primary flex items-center gap-2" disabled={mutation.isPending || !question.trim()}>{mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Ask</button></form>
    {answer && <div className="mt-4" aria-live="polite"><p className="text-sm font-medium text-gray-900">{answer.answer}</p>{answer.results?.length > 0 && <div className="overflow-x-auto mt-3"><table className="min-w-full text-xs"><thead className="bg-gray-50"><tr>{(answer.intent.type === 'cash_today' ? ['Student', 'Type', 'Amount', 'Receipt'] : ['Name', 'Student ID', 'Mobile', 'Expiry', 'Seat']).map((heading) => <th key={heading} className="px-3 py-2 text-left font-semibold text-gray-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{answer.results.map((result, index) => <ResultRow key={`${result.studentId || result.receiptNo || 'result'}-${index}`} result={result} type={answer.intent.type} />)}</tbody></table></div>}</div>}
  </section>;
}
