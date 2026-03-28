/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState, useRef } from 'react';
import { fetchOrders } from '../../../services/orderService';
import { fetchProducts } from '../../../services/productService';
import api from '../../../services/api';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from '../../../styles/AdminRelatorios.module.css';
import jsPDF from 'jspdf';

// Tipagem para jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

import autoTable from 'jspdf-autotable';

interface Order {
  id: number;
  data_pedido?: string;
  data_entrega?: string;
  total?: number;
  status?: string;
  nome_cliente?: string;
  carrinho?: string;
  observacao?: string;
  usuario?: { nome?: string };
}

interface Product {
  id: number;
  nome: string;
  preco: number;
  Categoria_id?: number;
  categoria?: { id: number; nome?: string } | null;
}

interface User {
  id: number;
  nome: string;
  email: string;
  data_cadastro?: string;
}

type PeriodType = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export default function RelatoriosDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  // Inicializar com as datas do mês atual
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return format(startOfMonth(now), 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    return format(endOfMonth(now), 'yyyy-MM-dd');
  });
  const chartRef = useRef<any>(null);
  const chartInstance = useRef<any>(null);
  const ordersChartRef = useRef<any>(null);
  const ordersChartInstance = useRef<any>(null);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  // Atualizar datas quando período muda
  useEffect(() => {
    updateDatesFromPeriod();
  }, [periodType]);

  // Atualizar gráficos quando dados ou período mudam
  useEffect(() => {
    if (orders.length > 0) {
      // Delay de 100ms para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        renderCharts();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        if (ordersChartInstance.current) {
          ordersChartInstance.current.destroy();
        }
      };
    }
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      if (ordersChartInstance.current) {
        ordersChartInstance.current.destroy();
      }
    };
  }, [orders, startDate, endDate]);

  async function loadData() {
    try {
      setLoading(true);
      const [ordersData, productsData] = await Promise.all([
        fetchOrders(),
        fetchProducts(),
      ]);
      
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      
      // Buscar usuários
      // NOTA: O endpoint /usuarios precisa ser criado no backend
      // Exemplo: GET /usuarios - retorna array de todos os usuários
      try {
        const res = await api.get('/usuarios');
        const usersData = Array.isArray(res.data) ? res.data : [];
        setUsers(usersData);
        console.log('[Relatórios] Total de usuários carregados:', usersData.length);
      } catch (e: any) {
        if (e?.response?.status === 404) {
          console.warn('[Relatórios] Endpoint /usuarios não existe no backend. Crie o endpoint para habilitar contagem de usuários.');
          console.warn('[Relatórios] Veja BACKEND_UPDATES_NEEDED.md para instruções.');
        } else {
          console.error('[Relatórios] Erro ao buscar usuários:', e);
        }
        setUsers([]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados', err);
    } finally {
      setLoading(false);
    }
  }

  function updateDatesFromPeriod() {
    const now = new Date();
    let start: Date, end: Date;

    switch (periodType) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'week':
        start = startOfWeek(now, { locale: ptBR });
        end = endOfWeek(now, { locale: ptBR });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'custom':
        return; // Não atualizar datas no modo custom
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  }

  function getOrderDate(order: Order): Date | null {
    const dateStr = order.data_pedido || order.data_entrega;
    if (!dateStr) return null;
    try {
      return parseISO(String(dateStr).slice(0, 10));
    } catch {
      return null;
    }
  }

  // Função para calcular o total de um pedido a partir do carrinho
  function calculateOrderTotal(order: Order): number {
    try {
      // Tentar pegar carrinho ou observacao
      const carrinhoStr = order.carrinho || order.observacao;
      if (!carrinhoStr) return 0;

      // Parse do JSON
      const carrinho = JSON.parse(carrinhoStr);
      
      // Pode vir como array direto ou como objeto com propriedade 'cart'
      const items = Array.isArray(carrinho) ? carrinho : (carrinho.cart || []);
      
      // Calcular total: soma de (quantidade * preco) de cada item
      return items.reduce((total: number, item: any) => {
        const qty = item.quantidade || item.quantity || 1;
        const price = item.preco || item.price || 0;
        return total + (qty * price);
      }, 0);
    } catch (e) {
      console.warn('Erro ao calcular total do pedido', order.id, e);
      return 0;
    }
  }

  function filterOrdersByPeriod(): Order[] {
    if (!startDate || !endDate) return orders;
    
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    return orders.filter(order => {
      const orderDate = getOrderDate(order);
      if (!orderDate) return false;
      return orderDate >= start && orderDate <= end;
    });
  }

  async function renderCharts() {
    // Carregar Chart.js do CDN
    if (!(window as any).Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.async = true;
      script.onload = () => renderChartsInternal();
      document.head.appendChild(script);
    } else {
      renderChartsInternal();
    }
  }

  function renderChartsInternal() {
    const Chart = (window as any).Chart;
    if (!Chart || !chartRef.current) return;

    // Destruir gráfico anterior
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const filtered = filterOrdersByPeriod();
    const salesByDay: { [key: string]: number } = {};

    filtered.forEach(order => {
      const orderDate = getOrderDate(order);
      if (!orderDate) return;
      const dateKey = format(orderDate, 'yyyy-MM-dd');
      salesByDay[dateKey] = (salesByDay[dateKey] || 0) + calculateOrderTotal(order);
    });

    const sortedDates = Object.keys(salesByDay).sort();
    const labels = sortedDates.map(date => format(parseISO(date), 'dd/MM', { locale: ptBR }));
    const data = sortedDates.map(date => salesByDay[date]);

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Vendas (R$)',
          data,
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                return `R$ ${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value: any) => `R$ ${value}`
            }
          }
        }
      }
    });

    // Gráfico de Evolução dos Pedidos
    if (ordersChartRef.current) {
      // Destruir gráfico anterior
      if (ordersChartInstance.current) {
        ordersChartInstance.current.destroy();
      }

      const ordersByDay: { [key: string]: number } = {};

      filtered.forEach(order => {
        const orderDate = getOrderDate(order);
        if (!orderDate) return;
        const dateKey = format(orderDate, 'yyyy-MM-dd');
        ordersByDay[dateKey] = (ordersByDay[dateKey] || 0) + 1;
      });

      const sortedOrderDates = Object.keys(ordersByDay).sort();
      const ordersLabels = sortedOrderDates.map(date => format(parseISO(date), 'dd/MM', { locale: ptBR }));
      const ordersData = sortedOrderDates.map(date => ordersByDay[date]);

      const ordersCtx = ordersChartRef.current.getContext('2d');
      ordersChartInstance.current = new Chart(ordersCtx, {
        type: 'line',
        data: {
          labels: ordersLabels,
          datasets: [{
            label: 'Pedidos',
            data: ordersData,
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            tension: 0.3,
            fill: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const value = context.parsed.y;
                  return `${value} ${value === 1 ? 'pedido' : 'pedidos'}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                callback: (value: any) => Math.floor(value)
              }
            }
          }
        }
      });
    }
  }

  // Filtrar usuários por período
  function filterUsersByPeriod(): User[] {
    if (!startDate || !endDate) {
      console.log('[Relatórios] Sem filtro de período, retornando todos os usuários:', users.length);
      return users;
    }
    
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    const filtered = users.filter(user => {
      if (!user.data_cadastro) {
        console.debug('[Relatórios] Usuário sem data_cadastro:', user.id, user.nome);
        return false;
      }
      try {
        const userDate = parseISO(String(user.data_cadastro).slice(0, 10));
        const isInPeriod = userDate >= start && userDate <= end;
        if (isInPeriod) {
          console.debug('[Relatórios] Usuário no período:', user.nome, user.data_cadastro);
        }
        return isInPeriod;
      } catch (e) {
        console.warn('[Relatórios] Erro ao processar data do usuário:', user.id, user.data_cadastro, e);
        return false;
      }
    });

    console.log(`[Relatórios] Usuários filtrados: ${filtered.length} de ${users.length} no período ${startDate} a ${endDate}`);
    return filtered;
  }

  // Calcular estatísticas
  const filtered = filterOrdersByPeriod();
  const filteredUsers = filterUsersByPeriod();
  const totalRevenue = filtered.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
  const totalOrders = filtered.length;
  const completedOrders = filtered.filter(o => String(o.status || '').toLowerCase() === 'entregue').length;
  const cancelledOrders = filtered.filter(o => String(o.status || '').toLowerCase().includes('cancelado')).length;
  const pendingOrders = filtered.filter(o => {
    const status = String(o.status || '').toLowerCase();
    return status !== 'entregue' && !status.includes('cancelado');
  }).length;

  // Produtos mais vendidos
  const productSales: { [key: number]: { name: string; quantity: number; revenue: number } } = {};
  
  filtered.forEach(order => {
    try {
      // Tentar pegar carrinho ou observacao
      const carrinhoStr = order.carrinho || order.observacao;
      if (!carrinhoStr) {
        console.debug('[Relatórios] Pedido sem carrinho:', order.id);
        return;
      }

      // Parse do JSON
      const carrinho = JSON.parse(carrinhoStr);
      
      // Pode vir como array direto ou como objeto com propriedade 'cart'
      const items = Array.isArray(carrinho) ? carrinho : (carrinho.cart || []);
      
      if (!Array.isArray(items) || items.length === 0) {
        console.debug('[Relatórios] Pedido sem itens no carrinho:', order.id);
        return;
      }
      
      items.forEach((item: any) => {
        const productId = item.id || item.product_id || item.productId;
        if (!productId) {
          console.debug('[Relatórios] Item sem ID no pedido:', order.id, item);
          return;
        }
        
        if (!productSales[productId]) {
          const product = products.find(p => p.id === productId);
          productSales[productId] = {
            name: product?.nome || item.name || item.nome || `Produto ${productId}`,
            quantity: 0,
            revenue: 0
          };
        }
        
        const qty = item.quantidade || item.quantity || 1;
        const price = item.preco || item.price || 0;
        productSales[productId].quantity += qty;
        productSales[productId].revenue += qty * price;
      });
    } catch (e) {
      console.warn('[Relatórios] Erro ao processar carrinho do pedido', order.id, e);
    }
  });

  // Log de debug para produtos encontrados
  if (Object.keys(productSales).length === 0) {
    console.warn('[Relatórios] Nenhum produto encontrado nos pedidos filtrados. Total de pedidos:', filtered.length);
  } else {
    console.log('[Relatórios] Produtos contabilizados:', Object.keys(productSales).length, productSales);
  }

  const topProducts = Object.entries(productSales)
    .map(([id, data]) => ({ id: Number(id), ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Clientes mais frequentes
  const customerFrequency: { [key: string]: number } = {};
  filtered.forEach(order => {
    const customer = order.nome_cliente || order.usuario?.nome || 'Cliente sem nome';
    customerFrequency[customer] = (customerFrequency[customer] || 0) + 1;
  });

  const topCustomers = Object.entries(customerFrequency)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Gerar PDF
  function generatePDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Vendas', pageWidth / 2, 20, { align: 'center' });
    
    // Período
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const periodo = periodType === 'custom' 
      ? `${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`
      : getPeriodLabel(periodType);
    doc.text(`Período: ${periodo}`, pageWidth / 2, 28, { align: 'center' });
    
    // Estatísticas gerais
    let yPos = 40;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de Pedidos: ${totalOrders}`, 14, yPos);
    yPos += 6;
    doc.text(`Faturamento Total: R$ ${totalRevenue.toFixed(2)}`, 14, yPos);
    yPos += 6;
    doc.text(`Pedidos Concluídos: ${completedOrders}`, 14, yPos);
    yPos += 6;
    doc.text(`Pedidos Pendentes: ${pendingOrders}`, 14, yPos);
    yPos += 6;
    doc.text(`Pedidos Cancelados: ${cancelledOrders}`, 14, yPos);
    yPos += 6;
    if (users.length > 0) {
      doc.text(`Novos Usuários no Período: ${filteredUsers.length}`, 14, yPos);
      yPos += 6;
      doc.text(`Total Geral de Usuários: ${users.length}`, 14, yPos);
      yPos += 6;
    } else {
      doc.text(`Usuários: Dados não disponíveis (endpoint /usuarios não configurado)`, 14, yPos);
      yPos += 6;
    }
    yPos += 6;

    // Produtos mais vendidos
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Produtos Mais Vendidos', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Produto', 'Quantidade', 'Receita']],
      body: topProducts.map(p => [
        p.name,
        p.quantity.toString(),
        `R$ ${p.revenue.toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [40, 167, 69] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // Clientes mais frequentes
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Clientes Mais Frequentes', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Cliente', 'Nº de Pedidos']],
      body: topCustomers.map(c => [c.name, c.count.toString()]),
      theme: 'striped',
      headStyles: { fillColor: [40, 167, 69] },
    });

    // Salvar PDF
    const fileName = `relatorio_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
    doc.save(fileName);
  }

  function getPeriodLabel(type: PeriodType): string {
    switch (type) {
      case 'today': return 'Hoje';
      case 'yesterday': return 'Ontem';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      case 'year': return 'Este Ano';
      case 'custom': return 'Personalizado';
      default: return 'Período';
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className={styles.reportsContainer}>
      {/* Header */}
      <div className={styles.reportsHeader}>
        <div>
          <h1 className={styles.reportsTitle}>Relatórios</h1>
          <p className={styles.reportsSubtitle}>Análise detalhada de vendas e desempenho</p>
        </div>
        <button onClick={generatePDF} className={styles.pdfButton}>
          <i className="bi bi-file-pdf"></i> Gerar PDF
        </button>
      </div>

      {/* Filtros de Período */}
      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <i className="bi bi-funnel"></i> Filtrar por Período
        </div>
        <div className={styles.filterBody}>
          <div className={styles.periodButtons}>
            <button
              className={`${styles.periodBtn} ${periodType === 'today' ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriodType('today')}
            >
              Hoje
            </button>
            <button
              className={`${styles.periodBtn} ${periodType === 'yesterday' ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriodType('yesterday')}
            >
              Ontem
            </button>
            <button
              className={`${styles.periodBtn} ${periodType === 'week' ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriodType('week')}
            >
              Esta Semana
            </button>
            <button
              className={`${styles.periodBtn} ${periodType === 'month' ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriodType('month')}
            >
              Este Mês
            </button>
            <button
              className={`${styles.periodBtn} ${periodType === 'year' ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriodType('year')}
            >
              Este Ano
            </button>
            <button
              className={`${styles.periodBtn} ${periodType === 'custom' ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriodType('custom')}
            >
              Personalizado
            </button>
          </div>

          {periodType === 'custom' && (
            <div className={styles.customDateInputs}>
              <div className={styles.dateGroup}>
                <label>Data Inicial:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.dateGroup}>
                <label>Data Final:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className={styles.dateInput}
                />
              </div>
            </div>
          )}

          <div className={styles.periodInfo}>
            Período selecionado: <strong>
              {startDate && endDate 
                ? `${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`
                : 'Selecione um período'}
            </strong>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#d1ecf1', color: '#0c5460' }}>
            <i className="bi bi-cart-check"></i>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Total de Pedidos</div>
            <div className={styles.statValue}>{totalOrders}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#d4edda', color: '#155724' }}>
            <i className="bi bi-currency-dollar"></i>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Faturamento Total</div>
            <div className={styles.statValue}>R$ {totalRevenue.toFixed(2)}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#cce5ff', color: '#004085' }}>
            <i className="bi bi-check-circle"></i>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Pedidos Concluídos</div>
            <div className={styles.statValue}>{completedOrders}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fff3cd', color: '#856404' }}>
            <i className="bi bi-clock"></i>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Pedidos Pendentes</div>
            <div className={styles.statValue}>{pendingOrders}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f8d7da', color: '#721c24' }}>
            <i className="bi bi-x-circle"></i>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Pedidos Cancelados</div>
            <div className={styles.statValue}>{cancelledOrders}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e2e3e5', color: '#383d41' }}>
            <i className="bi bi-people"></i>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Novos Usuários</div>
            {users.length > 0 ? (
              <>
                <div className={styles.statValue}>{filteredUsers.length}</div>
                {filteredUsers.length !== users.length && (
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '4px' }}>
                    Total geral: {users.length}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={styles.statValue}>—</div>
                <div style={{ fontSize: '0.75rem', color: '#dc3545', marginTop: '4px' }}>
                  Endpoint não disponível
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Vendas */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeaderGreen}>
          <i className="bi bi-graph-up"></i> Evolução de Vendas
        </div>
        <div className={styles.chartBody}>
          <canvas ref={chartRef} style={{ maxHeight: 300 }}></canvas>
        </div>
      </div>

      {/* Gráfico de Evolução dos Pedidos */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <i className="bi bi-bag-check"></i> Evolução dos Pedidos
        </div>
        <div className={styles.chartBody}>
          <canvas ref={ordersChartRef} style={{ maxHeight: 300 }}></canvas>
        </div>
      </div>

      {/* Tabelas de Relatórios */}
      <div className={styles.tablesGrid}>
        {/* Produtos Mais Vendidos */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <i className="bi bi-trophy"></i> Produtos Mais Vendidos
          </div>
          <div className={styles.tableBody}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className={styles.textCenter}>Quantidade</th>
                  <th className={styles.textRight}>Receita</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length > 0 ? (
                  topProducts.map((product, index) => (
                    <tr key={index}>
                      <td>{product.name}</td>
                      <td className={styles.textCenter}>{product.quantity}</td>
                      <td className={styles.textRight}>R$ {product.revenue.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className={styles.textCenter}>
                      Nenhum produto vendido no período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clientes Mais Frequentes */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <i className="bi bi-star"></i> Clientes Mais Frequentes
          </div>
          <div className={styles.tableBody}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className={styles.textCenter}>Nº de Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.length > 0 ? (
                  topCustomers.map((customer, index) => (
                    <tr key={index}>
                      <td>{customer.name}</td>
                      <td className={styles.textCenter}>{customer.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className={styles.textCenter}>
                      Nenhum cliente no período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pedidos Recentes */}
      <div className={styles.fullWidthCard}>
        <div className={styles.tableHeader}>
          <i className="bi bi-list-ul"></i> Pedidos do Período ({filtered.length})
        </div>
        <div className={styles.tableBody}>
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Data</th>
                <th className={styles.textRight}>Valor</th>
                <th className={styles.textCenter}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.slice(0, 20).map(order => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.nome_cliente || order.usuario?.nome || 'Cliente sem nome'}</td>
                    <td>{order.data_pedido ? format(parseISO(String(order.data_pedido).slice(0, 10)), 'dd/MM/yyyy') : '—'}</td>
                    <td className={styles.textRight}>R$ {calculateOrderTotal(order).toFixed(2)}</td>
                    <td className={styles.textCenter}>
                      <span className={`${styles.statusBadge} ${styles[`status${String(order.status || '').toLowerCase().replace(/\s+/g, '')}`]}`}>
                        {order.status || 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.textCenter}>
                    Nenhum pedido no período selecionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
