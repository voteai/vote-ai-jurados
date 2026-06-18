import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <div className="text-white font-bold">Vote Aí Jurados</div>
            </Link>
            <p className="text-sm text-slate-400">
              Plataforma web para organizar concursos, festivais e eventos com jurados de forma segura e profissional.
            </p>
            <p className="text-xs text-slate-500">
              Desenvolvido pela <strong>AIVA SOLUTION</strong>
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-white">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#funcionalidades" className="hover:text-white transition">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#beneficios" className="hover:text-white transition">
                  Benefícios
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-white transition">
                  Como funciona
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-white">Acesso</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/login" className="hover:text-white transition">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition">
                  Criar júri
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Suporte
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-white">Empresa</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition">
                  Sobre
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Contato
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Termos de uso
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>&copy; 2026 Vote Aí Jurados. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition">
              Política de Privacidade
            </a>
            <a href="#" className="hover:text-white transition">
              Termos de Serviço
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
