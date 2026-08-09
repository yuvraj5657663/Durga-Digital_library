import { Lightbulb } from 'lucide-react';

const QUOTES = [
  {
    text: "Your future is watching what you do today. Be present, stay consistent, and make yourself proud.",
    author: "Daily Reminder"
  },
  {
    text: "One day of discipline can change a week. A year of discipline can change your life.",
    author: "Aspirant's Mantra"
  },
  {
    text: "Small efforts repeated every day create extraordinary results. Show up today, and let success find you tomorrow.",
    author: "Consistency Code"
  },
  {
    text: "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.",
    author: "Dwayne Johnson"
  },
  {
    text: "Push yourself, because no one else is going to do it for you.",
    author: "Self-Belief"
  },
  {
    text: "The secret of getting ahead is getting started. Start now, not tomorrow.",
    author: "Mark Twain"
  },
  {
    text: "Dream big. Start small. Act now. Repeat every single day until your dreams become your reality.",
    author: "Aspirant's Path"
  },
];

/**
 * Rotates quotes daily using the current date as the seed.
 * Changes automatically at midnight without any state or timers.
 */
export default function AspirantQuoteCard() {
  const today = new Date();
  // Use day-of-year so the quote changes every calendar day
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / 86400000
  );
  const quote = QUOTES[dayOfYear % QUOTES.length];

  return (
    <div className="relative overflow-hidden rounded-xl p-5 sm:p-6
      bg-gradient-to-br from-library-blue via-blue-700 to-blue-800
      shadow-lg text-white">

      {/* Decorative blobs */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-8 -left-4 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative z-10 flex items-start gap-4">
        {/* Icon */}
        <div className="mt-0.5 p-2.5 rounded-xl bg-white/15 flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-yellow-300" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-300 mb-2">
            💡 Daily Aspirant Motivation
          </p>
          <blockquote className="text-sm sm:text-base font-medium leading-relaxed text-white/95">
            "{quote.text}"
          </blockquote>
          <p className="mt-3 text-xs text-white/50 font-medium">
            — {quote.author}
          </p>
        </div>
      </div>

      {/* Day indicator */}
      <div className="relative z-10 mt-4 pt-3 border-t border-white/10
        flex items-center justify-between text-xs text-white/40">
        <span>
          {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <span className="flex items-center gap-1">
          {Array.from({ length: QUOTES.length }).map((_, i) => (
            <span
              key={i}
              className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
                i === dayOfYear % QUOTES.length ? 'bg-yellow-300' : 'bg-white/20'
              }`}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
