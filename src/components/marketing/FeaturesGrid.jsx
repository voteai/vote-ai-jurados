import React from "react";
import {
  Settings,
  Users,
  FileText,
  Zap,
  BarChart3,
  Download,
  Shield,
} from "lucide-react";

export default function FeaturesGrid() {
  const features = [
    {
      icon: Settings,
      title: "Concursos e categorias",
      description: "Crie eventos com múltiplas categorias e regras específicas.",
    },
    {
      icon: Users,
      title: "Cadastro de participantes",
      description: "Organize candidatos por categoria, código, foto e descrição.",
    },
    {
      icon: Users,
      title: "Gestão de jurados",
      description: "Convide jurados, atribua categorias e acompanhe avaliações.",
    },
    {
      icon: FileText,
      title: "Critérios com pesos",
      description: "Configure critérios técnicos, criativos e customizados com ponderação.",
    },
    {
      icon: Zap,
      title: "Modelos visuais",
      description: "Use nota numérica, barra, termômetro, velocímetro ou régua.",
    },
    {
      icon: FileText,
      title: "Rascunho e envio final",
      description: "Jurado salva rascunho e envia com bloqueio automático.",
    },
    {
      icon: BarChart3,
      title: "Apuração automática",
      description: "Sistema calcula médias ponderadas e consolida avaliações.",
    },
    {
      icon: Download,
      title: "Exportação de resultados",
      description: "Exporte rankings em CSV ou visualize em tempo real.",
    },
    {
      icon: Shield,
      title: "Auditoria e segurança",
      description: "Registre ações críticas, bloqueios, liberações e alterações.",
    },
  ];

  return (
    <section id="funcionalidades" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 transition-colors dark:bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 dark:text-white">
            Funcionalidades completas para sua gestão
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Tudo que você precisa para organizar, executar e apurar concursos com jurados de forma profissional.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition dark:bg-slate-950 dark:border-slate-800 dark:hover:border-teal-800"
              >
                <div className="mb-4">
                  <Icon className="w-10 h-10 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
