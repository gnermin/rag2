import { Link } from 'react-router-dom'
import AppLayout from '../ui/AppLayout'

export default function Home() {
  return (
    <AppLayout>
      <div className="px-4 py-12">
        {/* HERO */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                          bg-gradient-to-r from-blue-100 to-purple-100 text-blue-900
                          dark:from-slate-800 dark:to-slate-800 dark:text-slate-200 border
                          border-blue-200/70 dark:border-slate-700/70 mb-4">
            <span data-emoji>✨</span>
            <span>Multi-Agent RAG System v1.0</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4
                         bg-clip-text text-transparent
                         bg-gradient-to-r from-slate-900 to-slate-700
                         dark:from-white dark:to-slate-300">
            Multi-Agentni RAG Sistem
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Obrađujte dokumente sa AI agentima, uvozite SQL podatke i razgovarajte sa svojom bazom znanja koristeći naprednu multi-agentnu RAG arhitekturu.
          </p>
        </div>

        {/* PRIMARY ACTIONS */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          <Link
            to="/documents"
            className="group relative overflow-hidden bg-white/80 dark:bg-slate-900/70
                       backdrop-blur rounded-2xl p-8 border
                       border-slate-200 dark:border-slate-800 shadow-sm
                       hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl
                            bg-blue-500/10 group-hover:bg-blue-500/20 transition" />
            <div className="w-14 h-14 rounded-xl grid place-items-center mb-4
                            bg-gradient-to-br from-blue-100 to-blue-200
                            dark:from-slate-800 dark:to-slate-700">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Učitaj Dokumente</h3>
            <p className="text-slate-600 dark:text-slate-300">
              Učitajte PDF, DOCX, Excel, CSV i slike. Posmatrajte kako ih multi-agentni pipeline obrađuje (OCR, segmentacija, embedding).
            </p>
          </Link>

          <Link
            to="/chat"
            className="group relative overflow-hidden rounded-2xl p-8 shadow-sm
                       bg-gradient-to-br from-blue-600 to-purple-600
                       border border-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full blur-2xl bg-white/20" />
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl grid place-items-center mb-4
                            group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Multi-Agent RAG Chat</h3>
            <p className="text-blue-100">
              Postavite pitanja i dobijte AI odgovore sa citatima, evaluacijom kvaliteta i iterativnim poboljšanjima.
            </p>
          </Link>
        </div>

        {/* FEATURES */}
        <div className="bg-white/85 dark:bg-slate-900/70 backdrop-blur
                        rounded-2xl shadow-sm p-8 max-w-5xl mx-auto
                        border border-slate-200 dark:border-slate-800 mb-8">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-slate-900 dark:text-white">
            <span data-emoji>🛠️</span>
            Napredne Mogućnosti
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100
                            border-blue-200 dark:from-slate-800 dark:to-slate-800 dark:border-slate-700">
              <div className="mb-3"><span data-emoji>🎯</span></div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Multi-Agent Query Pipeline</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Planner, Rewriter, Generation, Judge i Summarizer rade zajedno da osiguraju optimalne rezultate.
              </p>
            </div>

            <div className="p-5 rounded-xl border bg-gradient-to-br from-purple-50 to-purple-100
                            border-purple-200 dark:from-slate-800 dark:to-slate-800 dark:border-slate-700">
              <div className="mb-3"><span data-emoji>🔍</span></div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">RRF Hibridna Pretraga</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Reciprocal Rank Fusion kombinuje BM25 i pgvector similarity za vrhunske rezultate pretrage.
              </p>
            </div>

            <div className="p-5 rounded-xl border bg-gradient-to-br from-green-50 to-green-100
                            border-green-200 dark:from-slate-800 dark:to-slate-800 dark:border-slate-700">
              <div className="mb-3"><span data-emoji>⚖️</span></div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Quality Judge & Iteration</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Judge agent vrednuje odgovor i automatski obogaćuje kontekst pri detekciji nedostataka.
              </p>
            </div>
          </div>
        </div>

        {/* EXTRAS */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900
                        rounded-2xl shadow-sm p-8 max-w-5xl mx-auto
                        border border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
            <span data-emoji>⚡</span>
            Dodatne Funkcionalnosti
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <span data-emoji>📊</span>
                SQL Uvoz Podataka
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Povežite se sa vanjskim bazama i uvezite podatke putem SELECT upita za RAG pretragu i analitiku.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <span data-emoji>🔐</span>
                Sigurnost i Skalabilnost
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                JWT autentikacija, bcrypt hashing, PostgreSQL + pgvector — spremno za autoscale deployment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
