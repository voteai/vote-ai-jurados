import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function ProblemSolution() {
  const problems = [
    "Notas espalhadas em papéis ou planilhas",
    "Jurados sem padrão claro de avaliação",
    "Pesos calculados manualmente",
    "Dificuldade para saber quem ainda não avaliou",
    "Risco de alteração indevida após envio",
    "Ranking final demorado",
  ];

  const solutions = [
    "Notas centralizadas em uma única plataforma",
    "Critérios padronizados e controlados",
    "Cálculo automático com ponderação",
    "Acompanhamento visual em tempo real",
    "Bloqueio automático após envio",
    "Ranking publicado instantaneamente",
  ];

  return (
    <section id="como-funciona" className="py-20 px-4 sm:px-6 lg:px-8 bg-white transition-colors dark:bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 dark:text-white">
            A apuração do seu concurso não precisa ser manual, lenta ou confusa
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto dark:text-slate-300">
            Muitos eventos ainda usam papel, grupos de mensagens e planilhas, gerando erros, demora, falta de transparência e retrabalho.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 rounded-lg border border-red-100 bg-red-50/50 p-6 dark:border-red-900/40 dark:bg-red-950/20">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 dark:text-white">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Desafios típicos
            </h3>
            <div className="space-y-3">
              {problems.map((problem, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0"></div>
                  <span className="text-slate-700 dark:text-slate-300">{problem}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-teal-100 bg-teal-50/60 p-6 dark:border-teal-900/50 dark:bg-teal-950/20">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 dark:text-white">
              <CheckCircle2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              Nossas soluções
            </h3>
            <div className="space-y-3">
              {solutions.map((solution, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0 dark:text-teal-400" />
                  <span className="text-slate-700 dark:text-slate-300">{solution}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20 pt-20 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-2xl font-bold text-slate-900 text-center mb-12 dark:text-white">
            O Vote Aí Jurados centraliza todo o processo de avaliação
          </h3>
          <div className="grid md:grid-cols-6 gap-4">
            {[
              { step: 1, label: "Crie o evento" },
              { step: 2, label: "Configure categorias" },
              { step: 3, label: "Cadastre participantes" },
              { step: 4, label: "Convide jurados" },
              { step: 5, label: "Receba avaliações" },
              { step: 6, label: "Publique resultado" },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg p-4 text-center min-h-[120px] flex flex-col items-center justify-center shadow-sm">
                  <div className="text-3xl font-bold mb-2">{item.step}</div>
                  <div className="text-sm font-medium">{item.label}</div>
                </div>
                {idx < 5 && (
                  <div className="hidden md:block absolute -right-2 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 bg-teal-300 rounded-full border-2 border-white dark:border-slate-950"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
