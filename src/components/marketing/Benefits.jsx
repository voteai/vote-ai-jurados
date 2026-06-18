import React from "react";
import { TrendingUp, Smartphone, Lock, BarChart3 } from "lucide-react";

export default function Benefits() {
  const organizerBenefits = [
    "Menos trabalho manual",
    "Apuração mais rápida",
    "Ranking automático",
    "Mais controle sobre jurados",
    "Menos erros nos cálculos",
    "Histórico de avaliações",
    "Resultado profissional",
  ];

  const judgeBenefits = [
    "Avaliação pelo celular",
    "Interface simples e intuitiva",
    "Notas por critério",
    "Comentários opcionais",
    "Salvamento de rascunho",
    "Envio seguro",
    "Menos papel e confusão",
  ];

  return (
    <section id="beneficios" className="py-20 px-4 sm:px-6 lg:px-8 bg-white transition-colors dark:bg-slate-950">
      <div id="para-quem" className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 dark:text-white">
            Mais controle para o organizador. Mais praticidade para o jurado.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Para organizadores
              </h3>
            </div>
            <div className="space-y-4">
              {organizerBenefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400"></div>
                  <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 p-6 bg-teal-50 rounded-lg border border-teal-200 dark:bg-teal-950/20 dark:border-teal-900/50">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong>Resultado:</strong> você ganha tempo, confiabilidade nos resultados e profissionalismo na apresentação do concurso.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Smartphone className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Para jurados</h3>
            </div>
            <div className="space-y-4">
              {judgeBenefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400"></div>
                  <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 p-6 bg-teal-50 rounded-lg border border-teal-200 dark:bg-teal-950/20 dark:border-teal-900/50">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong>Resultado:</strong> o jurado avalia rapidamente pelo celular, com clareza sobre o que está sendo pedido.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-16 border-t border-slate-200 dark:border-slate-800">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2 dark:text-white">
              <Lock className="w-7 h-7 text-teal-600 dark:text-teal-400" />
              Avaliações protegidas e resultados mais confiáveis
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Lock,
                title: "Acesso por perfil",
                description:
                  "Jurado vê apenas suas avaliações e dados permitidos.",
              },
              {
                icon: BarChart3,
                title: "Bloqueio automático",
                description:
                  "Após envio, avaliação fica bloqueada e imutável.",
              },
              {
                icon: TrendingUp,
                title: "Logs de auditoria",
                description:
                  "Todas as ações críticas ficam registradas para segurança.",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="bg-slate-50 rounded-lg p-6 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <Icon className="w-8 h-8 text-teal-600 mb-3 dark:text-teal-400" />
                  <h4 className="font-semibold text-slate-900 mb-2 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-slate-600 text-sm dark:text-slate-300">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
