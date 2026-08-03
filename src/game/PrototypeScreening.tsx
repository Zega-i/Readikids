/**
 * Kid Mode — LAPISAN PRESENTASI untuk mesin sesi useScreeningSession.
 *
 * Komponen ini HANYA merender & meneruskan interaksi; seluruh logika
 * (urutan trial, timing, telemetri, analisis) ada di useScreeningSession.
 * Bila desain berubah total, ganti/buang file ini — mesin & data aman.
 *
 * Tampilan saat ini mengikuti design/mockups/kidmode-trial-flow.html:
 * - TANPA skor/benar-salah/timer terlihat; selingan maskot netral.
 * - Ubin jawaban SERAGAM; progress bar tanpa angka; TTS via tombol 🔊.
 * - Tanpa animasi selama trial (validitas telemetri).
 */
import { useScreeningSession } from './useScreeningSession';
import { GAME_EMOJI, GAME_LABEL } from './trialBank';
import type { ChildProfile, RiskAssessment } from '../types/telemetry';

interface PrototypeScreeningProps {
  child: ChildProfile;
  cooldownOverrideReason: string | null;
  onComplete: (assessment: RiskAssessment | null) => void;
  onAbort: () => void;
}

export default function PrototypeScreening(props: PrototypeScreeningProps) {
  const s = useScreeningSession(props);
  const { trial, phase } = s;

  return (
    <div
      className="fixed inset-0 bg-kid-bg font-kid text-kid-ink flex flex-col select-none overflow-hidden"
      onClick={s.markMisclick}
    >
      {/* Top bar: maskot + progress TANPA angka + tombol suara */}
      <div className="flex items-center gap-4 px-5 pt-4 pb-2">
        <span className="text-4xl drop-shadow" aria-hidden>
          🦊
        </span>
        <div className="flex-1 h-5 bg-kid-sun-soft rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-kid-sun to-kid-coral transition-[width] duration-500"
            style={{ width: `${s.progressPct}%` }}
          />
        </div>
        <button
          className="flex-none w-14 h-14 min-h-touch rounded-full bg-kid-teal text-white text-2xl shadow-[0_4px_0_#23806E] active:translate-y-[3px] active:shadow-[0_1px_0_#23806E]"
          title="Dengar instruksi lagi"
          onClick={(e) => {
            e.stopPropagation();
            s.replayInstruction();
          }}
        >
          🔊
        </button>
      </div>

      {/* Panggung */}
      <div className="flex-1 flex flex-col items-center justify-center gap-7 px-5 pb-8 text-center">
        {phase.name === 'trial' && trial.kind === 'choice' && (
          <div
            className="flex flex-col items-center gap-7 w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-2xl sm:text-3xl font-bold">{trial.prompt}</p>

            {trial.gameId === 'visual' ? (
              <div className="w-32 h-32 bg-kid-surface rounded-kid shadow-kid-card border-4 border-kid-sun flex items-center justify-center text-7xl font-extrabold">
                {trial.target}
              </div>
            ) : (
              <button
                className="w-32 h-32 bg-kid-surface rounded-kid shadow-kid-card border-4 border-kid-sky flex items-center justify-center text-6xl active:translate-y-1"
                title="Putar bunyi lagi"
                onClick={s.replayInstruction}
              >
                🔊
              </button>
            )}

            <div
              className={`grid gap-4 sm:gap-5 w-full justify-center ${trial.options.length === 3 ? 'grid-cols-3 max-w-md' : 'grid-cols-2 sm:grid-cols-4 max-w-2xl'}`}
            >
              {trial.options.map((opt, i) => (
                <button
                  key={`${s.trialIndex}-${i}`}
                  className={`aspect-square min-h-touch rounded-kid text-5xl sm:text-6xl font-extrabold transition-transform ${
                    s.pickedOption === i
                      ? 'bg-kid-teal-soft translate-y-1 shadow-[0_1px_0_rgba(74,62,85,.14)]'
                      : 'bg-kid-surface shadow-[0_6px_0_rgba(74,62,85,.14)] hover:-translate-y-1'
                  }`}
                  onMouseEnter={() => s.markHoverStart(opt)}
                  onMouseLeave={s.markHoverEnd}
                  onClick={() => s.answerChoice(opt, i)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase.name === 'trial' && trial.kind === 'line' && (
          <div
            className="flex flex-col items-center gap-8 w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-2xl sm:text-3xl font-bold">
              {trial.prompt} <b className="text-kid-coral">{trial.target}</b>?
            </p>

            <div className="w-full bg-kid-surface rounded-kid shadow-kid-card px-8 pt-14 pb-12 relative">
              <div
                className="relative h-3 bg-kid-sky-soft rounded-full cursor-pointer"
                onMouseEnter={() => s.markHoverStart('line')}
                onMouseLeave={s.markHoverEnd}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  s.placeLine(((e.clientX - rect.left) / rect.width) * 100);
                }}
              >
                <span
                  className="absolute -top-12 text-4xl -translate-x-1/2 transition-[left] duration-200 pointer-events-none drop-shadow"
                  style={{ left: `${Math.min(98, Math.max(2, s.linePct ?? 4))}%` }}
                  aria-hidden
                >
                  🐸
                </span>
                {s.linePct !== null && (
                  <span
                    className="absolute -top-1.5 w-6 h-6 rounded-full bg-kid-coral border-4 border-white -translate-x-1/2 pointer-events-none shadow"
                    style={{ left: `${s.linePct}%` }}
                  />
                )}
                <span className="absolute -left-1 top-6 text-2xl font-extrabold">0</span>
                <span className="absolute -right-3 top-6 text-2xl font-extrabold">100</span>
              </div>
            </div>

            <button
              className={`min-h-touch px-11 py-4 rounded-kid text-2xl font-bold text-white bg-kid-coral shadow-[0_6px_0_#C24630] active:translate-y-1 active:shadow-[0_1px_0_#C24630] ${s.linePct === null ? 'opacity-45 pointer-events-none' : ''}`}
              onClick={s.confirmLine}
            >
              Sudah! ✔
            </button>
          </div>
        )}

        {phase.name === 'cheer' && (
          <div className="flex flex-col items-center gap-6">
            <span className="text-[110px] leading-none animate-bounce" aria-hidden>
              🦊
            </span>
            <p className="text-2xl sm:text-3xl font-bold text-kid-teal-pressed">{phase.text}</p>
          </div>
        )}

        {phase.name === 'break' && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-6xl tracking-[.3em]" aria-hidden>
              ⭐⭐⭐
            </p>
            <div>
              <p className="text-2xl sm:text-3xl font-bold">
                Hore, {GAME_LABEL[phase.finishedGame]} selesai!
              </p>
              <p className="text-sm font-semibold text-kid-muted mt-1">
                Bintang untuk semangatmu — bukan nilai 😊
              </p>
            </div>
            <button
              className="min-h-touch px-11 py-4 rounded-kid text-2xl font-bold text-white bg-kid-teal shadow-[0_6px_0_#23806E] active:translate-y-1 active:shadow-[0_1px_0_#23806E]"
              onClick={(e) => {
                e.stopPropagation();
                s.continueAfterBreak();
              }}
            >
              Lanjut: {GAME_LABEL[phase.nextGame]} {GAME_EMOJI[phase.nextGame]}
            </button>
          </div>
        )}

        {phase.name === 'end' && (
          <div className="flex flex-col items-center gap-6">
            <span className="text-8xl leading-none" aria-hidden>
              🦊🎉
            </span>
            <div>
              <p className="text-2xl sm:text-3xl font-bold">Kamu hebat sudah bermain!</p>
              <p className="text-sm font-semibold text-kid-muted mt-1 animate-pulse">
                Menyiapkan hasil untuk pendamping…
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Kontrol pendamping — kecil & tidak menarik perhatian anak */}
      {phase.name !== 'end' && (
        <button
          className="absolute bottom-2 right-3 text-xs font-semibold text-kid-muted/70 underline"
          onClick={(e) => {
            e.stopPropagation();
            s.abort();
          }}
        >
          pendamping: hentikan sesi
        </button>
      )}
    </div>
  );
}
