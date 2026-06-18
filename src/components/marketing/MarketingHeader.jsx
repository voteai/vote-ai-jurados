import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import AppLogo from "@/components/AppLogo";

export default function MarketingHeader({ dark = false, onToggleDark }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Como funciona", href: "#como-funciona" },
    { label: "Funcionalidades", href: "#funcionalidades" },
    { label: "Benefícios", href: "#beneficios" },
    { label: "Para quem é", href: "#para-quem" },
  ];

  return (
    <header className="fixed top-0 w-full bg-white/95 border-b border-slate-200 z-50 backdrop-blur transition-colors dark:bg-slate-950/95 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <AppLogo size="sm" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-slate-600 hover:text-slate-900 transition dark:text-slate-300 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleDark}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            title={dark ? "Modo claro" : "Modo noturno"}
            aria-label={dark ? "Ativar modo claro" : "Ativar modo noturno"}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to="/login"
            className="text-sm text-slate-700 hover:text-slate-900 font-medium dark:text-slate-300 dark:hover:text-white"
          >
            Entrar
          </Link>
          <Link to="/register" className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white text-sm font-medium rounded-lg hover:shadow-lg transition">
            Criar júri
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleDark}
            className="p-2 text-slate-700 transition dark:text-slate-200"
            title={dark ? "Modo claro" : "Modo noturno"}
            aria-label={dark ? "Ativar modo claro" : "Ativar modo noturno"}
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-slate-700 dark:text-slate-200" />
            ) : (
              <Menu className="w-6 h-6 text-slate-700 dark:text-slate-200" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <nav className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-sm text-slate-600 hover:text-slate-900 py-2 dark:text-slate-300 dark:hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-200 space-y-2 dark:border-slate-800">
              <Link
                to="/login"
                className="block text-sm text-slate-700 hover:text-slate-900 font-medium py-2 dark:text-slate-300 dark:hover:text-white"
              >
                Entrar
              </Link>
              <Link to="/register" className="block w-full px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white text-sm font-medium rounded-lg text-center">
                Criar júri
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
