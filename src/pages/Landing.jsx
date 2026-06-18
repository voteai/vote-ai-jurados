import React from "react";
import { Link } from "react-router-dom";
import { useDarkMode } from "@/hooks/useDarkMode";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import Hero from "@/components/marketing/Hero";
import ProblemSolution from "@/components/marketing/ProblemSolution";
import FeaturesGrid from "@/components/marketing/FeaturesGrid";
import Benefits from "@/components/marketing/Benefits";
import Footer from "@/components/marketing/Footer";

export default function Landing() {
  const [dark, setDark] = useDarkMode();

  return (
    <div className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <MarketingHeader dark={dark} onToggleDark={() => setDark(value => !value)} />
      <main className="pt-16">
        <Hero />
        <ProblemSolution />
        <FeaturesGrid />
        <Benefits />

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-teal-600 to-teal-700 dark:from-teal-700 dark:via-slate-900 dark:to-indigo-950">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Pronto para profissionalizar a avaliação do seu evento?
            </h2>
            <p className="text-lg text-teal-100">
              Use o Vote Aí Jurados para organizar seu concurso, simplificar a rotina dos jurados e gerar resultados com mais velocidade, segurança e transparência.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/register" className="px-8 py-3 bg-white text-teal-700 font-semibold rounded-lg hover:bg-teal-50 transition inline-block text-center">
                Criar júri
              </Link>
              <Link to="/demo" className="px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition inline-block text-center">
                Ver demo
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
