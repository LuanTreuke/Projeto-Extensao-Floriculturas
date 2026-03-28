"use client"
import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './termos.module.css';
import Breadcrumb from '../../components/Breadcrumb';

export default function TermosDeServico() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <Breadcrumb items={[
        { label: 'Página Inicial', href: '/' },
        { label: 'Termos de Serviço' }
      ]} />

      <div className={styles.content}>
        <h1 className={styles.title}>Termos de Serviço</h1>
        <p className={styles.updateDate}>Última atualização: Novembro de 2025</p>

        <section className={styles.section}>
          <h2>1. Introdução</h2>
          <p>
            Bem-vindo à Floricultura. Ao utilizar nossos serviços, você concorda com os seguintes termos e condições. 
            Por favor, leia atentamente antes de realizar qualquer compra ou solicitar nossos serviços.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Produtos e Serviços</h2>
          <p>
            A Floricultura oferece produtos florais como buquês, arranjos, flores naturais, cestas e outros itens relacionados. 
            Todos os produtos são confeccionados com flores frescas e de qualidade, porém, devido à natureza orgânica dos produtos, 
            pequenas variações de cor, tamanho e disponibilidade podem ocorrer.
          </p>
          <p>
            Em caso de indisponibilidade de flores específicas, nos reservamos o direito de substituir por flores semelhantes 
            de igual ou superior valor, mantendo o estilo e a qualidade do arranjo original.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Pedidos e Pagamento</h2>
          <p>
            Os pedidos podem ser realizados através de nosso site ou por outros canais de comunicação disponibilizados. 
            O pagamento deve ser efetuado no momento da compra através dos métodos aceitos pela nossa plataforma.
          </p>
          <p>
            Todos os preços estão em Reais (R$) e podem estar sujeitos a alterações sem aviso prévio. 
            O valor final do pedido incluirá o custo do produto e, quando aplicável, taxa de entrega.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Entrega</h2>
          <p>
            Realizamos entregas na região de União da Vitória, Porto União e arredores. Os prazos de entrega são estimados 
            e podem variar de acordo com a disponibilidade, condições climáticas e demanda.
          </p>
          <p>
            É de responsabilidade do cliente fornecer informações corretas e completas sobre o endereço de entrega. 
            Não nos responsabilizamos por atrasos ou impossibilidade de entrega causados por informações incorretas.
          </p>
          <p>
            Para entregas com destinatário ausente, tentaremos contato telefônico. Caso não seja possível completar a entrega, 
            o produto poderá ser retirado em nossa loja física mediante agendamento.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Política de Cancelamento e Devolução</h2>
          <p>
            Devido à natureza perecível dos nossos produtos, solicitações de cancelamento devem ser feitas com no mínimo 
            24 horas de antecedência da data de entrega prevista.
          </p>
          <p>
            Devoluções serão aceitas apenas em casos de produtos com defeito de fabricação, danos durante o transporte 
            ou erro no pedido. Nesses casos, entre em contato conosco em até 24 horas após o recebimento.
          </p>
          <p>
            Não aceitamos devoluções por arrependimento ou preferências pessoais, uma vez que trabalhamos com produtos frescos 
            e personalizados.
          </p>
        </section>


        <section className={styles.section}>
          <h2>6. Privacidade e Proteção de Dados</h2>
          <p>
            Respeitamos a privacidade de nossos clientes e nos comprometemos a proteger suas informações pessoais 
            de acordo com a Lei Geral de Proteção de Dados (LGPD).
          </p>
          <p>
            Os dados coletados serão utilizados exclusivamente para processar pedidos, realizar entregas e 
            melhorar nossos serviços. Não compartilhamos informações pessoais com terceiros sem autorização.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Responsabilidades do Cliente</h2>
          <p>
            O cliente é responsável por:
          </p>
          <ul>
            <li>Fornecer informações verdadeiras e atualizadas durante o processo de compra;</li>
            <li>Garantir que alguém esteja presente no endereço de entrega no horário combinado;</li>
            <li>Verificar o produto no momento da entrega;</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>8. Limitação de Responsabilidade</h2>
          <p>
            A Floricultura não se responsabiliza por:
          </p>
          <ul>
            <li>Danos causados por manuseio inadequado após a entrega;</li>
            <li>Deterioração natural das flores após o prazo de vida útil estimado;</li>
            <li>Atrasos de entrega causados por força maior, condições climáticas adversas ou informações incorretas;</li>
            <li>Alergias ou reações causadas pelo contato com flores.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>9. Modificações nos Termos</h2>
          <p>
            Reservamos o direito de modificar estes Termos de Serviço a qualquer momento. 
            Recomendamos que você revise periodicamente esta página.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Contato</h2>
          <p>
            Para dúvidas, sugestões ou reclamações, entre em contato conosco:
          </p>
          <p className={styles.contactInfo}>
            <strong>Floricultura</strong><br />
            Endereço: Avenida Paula Freitas 1006 – Nossa Senhora da Salete<br />
            Instagram: <a href="https://www.instagram.com/floricultura4estacoes_/" target="_blank" rel="noopener noreferrer">@floricultura4estacoes_</a>
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Aceitação dos Termos</h2>
          <p>
            Ao realizar um pedido ou utilizar nossos serviços, você declara ter lido, compreendido e 
            concordado com todos os termos e condições estabelecidos neste documento.
          </p>
        </section>

        <div className={styles.buttonContainer}>
          <button className={styles.backButton} onClick={() => router.push('/')}>
            Voltar para a Página Inicial
          </button>
        </div>
      </div>

      <footer className={styles.footerSection}>
        <div className={styles.footerContent}>
          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>Redes Sociais</span>
            <a href="https://www.instagram.com/floricultura4estacoes_/" target="_blank" rel="noopener noreferrer">Instagram</a>
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>Informações</span>
            <a href="/termos-de-servico">Termos de Serviço</a>
          </div>
        </div>
        <div className={styles.footerAddress}>
          Avenida Paula Freitas 1006 – Nossa senhora da Salete
        </div>
      </footer>
    </div>
  );
}
