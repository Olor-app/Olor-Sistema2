import React, { useState } from 'react';
import { ListasSelects } from '../types';
import { buscarPrecoUnitario, DEFAULT_MATRIZ_PRECOS } from '../services/api';
import { formatarMoeda } from '../utils/calculations';
import { Table, Search, DollarSign } from 'lucide-react';

interface PriceMatrixProps {
  listas: ListasSelects;
  dadosBrutos?: any[];
}

export const PriceMatrix: React.FC<PriceMatrixProps> = ({ listas, dadosBrutos }) => {
  const [buscaEmbalagem, setBuscaEmbalagem] = useState<string>('');

  const COLUNAS_PRECO_PERMITIDAS = ['Site', 'Tiktok', 'Venda Direta'];

  // Auxiliar para converter célula bruta para number
  const parseValorPreco = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Verifica se dadosBrutos é uma matriz 2D (array de arrays)
  const is2DArray = Array.isArray(dadosBrutos) && dadosBrutos.length > 0 && Array.isArray(dadosBrutos[0]);

  let indexEmbalagem = -1;
  let colunasExibicao: { nome: string; index: number }[] = [];
  let linhasDados: any[][] = [];

  if (is2DArray) {
    const cabecalho: string[] = dadosBrutos[0].map((c: any) => String(c || '').trim());

    // Localizar índice da coluna "EMBALAGEM"
    indexEmbalagem = cabecalho.findIndex((col) => {
      const norm = col.toUpperCase();
      return norm.includes('EMBALAGEM') || norm.includes('EMB');
    });

    if (indexEmbalagem === -1) {
      indexEmbalagem = 0;
    }

    // Filtrar para trazer estritamente apenas as colunas Site, Tiktok, Venda Direta
    COLUNAS_PRECO_PERMITIDAS.forEach((colDesejada) => {
      const normDesejada = colDesejada.toLowerCase().replace(/\s+/g, '');
      const foundIdx = cabecalho.findIndex((h) => {
        const normHeader = h.toLowerCase().replace(/\s+/g, '');
        return normHeader === normDesejada || normHeader.includes(normDesejada) || normDesejada.includes(normHeader);
      });

      if (foundIdx !== -1) {
        colunasExibicao.push({
          nome: cabecalho[foundIdx] || colDesejada,
          index: foundIdx
        });
      }
    });

    // Linhas a partir de dadosBrutos.slice(1) (pulando o cabeçalho)
    linhasDados = dadosBrutos.slice(1).filter((linha) => {
      if (!Array.isArray(linha) || linha.length === 0) return false;
      const emb = String(linha[indexEmbalagem] || '').trim();
      return emb !== '' && !emb.toUpperCase().includes('EMBALAGEM');
    });
  }

  // Filtragem pela busca de embalagem
  const linhasFiltradas = is2DArray
    ? linhasDados.filter((linha) => {
        const nomeEmbalagem = String(linha[indexEmbalagem] || '');
        return !buscaEmbalagem || nomeEmbalagem.toLowerCase().includes(buscaEmbalagem.toLowerCase());
      })
    : [];

  // Fallbacks para exibição caso não haja dados brutos 2D ainda
  const embalagensFallback = listas.embalagens.length > 0 ? listas.embalagens : Object.keys(DEFAULT_MATRIZ_PRECOS);
  const embalagensFallbackFiltradas = embalagensFallback.filter((e) =>
    !buscaEmbalagem || e.toLowerCase().includes(buscaEmbalagem.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 max-w-4xl mx-auto space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-amber-200 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-amber-400" />
            Matriz Tabela de Preços (Aba Listas)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Exibindo exclusivamente as tabelas de preço ativas: <strong>Site</strong>, <strong>Tiktok</strong> e <strong>Venda Direta</strong>.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={buscaEmbalagem}
            onChange={(e) => setBuscaEmbalagem(e.target.value)}
            placeholder="Filtrar embalagem..."
            className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Tabela Cruzada */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-mono font-semibold border-b border-slate-800 uppercase">
              <tr>
                <th className="px-5 py-3.5 bg-slate-900/90 text-amber-300">
                  Embalagem
                </th>

                {is2DArray && colunasExibicao.length > 0 ? (
                  colunasExibicao.map((col) => (
                    <th key={col.index} className="px-5 py-3.5 text-right text-slate-300">
                      {col.nome}
                    </th>
                  ))
                ) : (
                  COLUNAS_PRECO_PERMITIDAS.map((tab) => (
                    <th key={tab} className="px-5 py-3.5 text-right text-slate-300">
                      {tab}
                    </th>
                  ))
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {is2DArray ? (
                linhasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={(colunasExibicao.length || 3) + 1} className="px-5 py-8 text-center text-slate-500">
                      Nenhuma embalagem encontrada na matriz da aba Listas.
                    </td>
                  </tr>
                ) : (
                  linhasFiltradas.map((linhaAtual, idxLinha) => {
                    const nomeEmbalagem = String(linhaAtual[indexEmbalagem] || '-');

                    return (
                      <tr key={idxLinha} className="hover:bg-slate-900/50 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-200 bg-slate-900/30 whitespace-nowrap">
                          {nomeEmbalagem}
                        </td>

                        {colunasExibicao.length > 0 ? (
                          colunasExibicao.map((col) => {
                            const valorBrutoCell = linhaAtual[col.index];
                            const valorExactoNum = parseValorPreco(valorBrutoCell);

                            return (
                              <td
                                key={col.index}
                                className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap"
                              >
                                {formatarMoeda(valorExactoNum)}
                              </td>
                            );
                          })
                        ) : (
                          COLUNAS_PRECO_PERMITIDAS.map((colDesejada) => {
                            const val = buscarPrecoUnitario(nomeEmbalagem, colDesejada, dadosBrutos);
                            return (
                              <td key={colDesejada} className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                                {formatarMoeda(val)}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })
                )
              ) : (
                // Fallback Mock
                embalagensFallbackFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={COLUNAS_PRECO_PERMITIDAS.length + 1} className="px-5 py-8 text-center text-slate-500">
                      Nenhuma embalagem encontrada.
                    </td>
                  </tr>
                ) : (
                  embalagensFallbackFiltradas.map((emb) => (
                    <tr key={emb} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-200 bg-slate-900/30 whitespace-nowrap">
                        {emb}
                      </td>
                      {COLUNAS_PRECO_PERMITIDAS.map((tab) => {
                        const valor = buscarPrecoUnitario(emb, tab, dadosBrutos);
                        return (
                          <td key={tab} className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                            {formatarMoeda(valor)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dica informativa */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200/90 flex items-start gap-3">
        <Table className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-300 mb-1">Tabelas de Preço Ativas no Formulário</p>
          <p className="leading-relaxed">
            A matriz exibe estritamente as colunas <strong>Site</strong>, <strong>Tiktok</strong> e <strong>Venda Direta</strong>. No formulário de pedido, selecione uma destas tabelas para aplicar automaticamente o Preço Unitário correspondente à embalagem escolhida.
          </p>
        </div>
      </div>

    </div>
  );
};

