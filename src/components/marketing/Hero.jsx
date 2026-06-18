import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function Hero() {
  return (
    <section id="hero" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50 transition-colors dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight dark:text-white">
            Sistema de jurados para concursos, festivais e eventos profissionais
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Organize avaliações, cadastre jurados, configure critérios com pesos, receba notas em tempo real e gere rankings automáticos por categoria sem planilhas, sem papel e sem apuração manual.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link to="/register" className="px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-lg hover:shadow-lg transition flex items-center justify-center gap-2">
              Criar júri
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-slate-400 hover:bg-slate-50 transition flex items-center justify-center dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-900"
            >
              Acessar sistema
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 text-sm text-slate-600 pt-6 border-t border-slate-200 dark:border-slate-800 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Acesso seguro por perfil</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Apuração automática</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:shadow-teal-950/20">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 h-2"></div>
            <div className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Ranking - Categoria: Música</h3>
              <div className="space-y-3">
                {[
                  { pos: "1º", name: "Candidato A", score: 92.5 },
                  { pos: "2º", name: "Candidato B", score: 88.0 },
                  { pos: "3º", name: "Candidato C", score: 85.3 },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-teal-600 dark:text-teal-400 w-6">{item.pos}</span>
                      <span className="text-slate-700 font-medium dark:text-slate-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-teal-600"
                          style={{ width: `${item.score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 w-10 text-right dark:text-slate-100">
                        {item.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 dark:text-slate-400">
                Atualizado em tempo real • 3 avaliadores ativos
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Jurados ativos", value: "8" },
              { label: "Avaliações enviadas", value: "24" },
              { label: "Ranking atualizado", value: "✓" },
              { label: "Critérios", value: "5" },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg border border-slate-200 p-4 text-center dark:bg-slate-900 dark:border-slate-800"
              >
                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{stat.value}</div>
                <div className="text-xs text-slate-600 mt-1 dark:text-slate-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
