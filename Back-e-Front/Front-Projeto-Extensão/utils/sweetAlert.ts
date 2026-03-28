import Swal from 'sweetalert2';

// Cores customizadas do projeto
const colors = {
  primary: '#2e7d32',
  success: '#4caf50',
  error: '#e53935',
  warning: '#ff9800',
  info: '#2196f3',
};

// Alerta de sucesso
export const showSuccess = (message: string, title = 'Sucesso!') => {
  return Swal.fire({
    icon: 'success',
    title,
    text: message,
    confirmButtonColor: colors.success,
    confirmButtonText: 'OK',
    timer: 2000,
    timerProgressBar: true,
  });
};

// Alerta de erro
export const showError = (message: string, title = 'Erro!') => {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: colors.error,
    confirmButtonText: 'OK',
  });
};

// Alerta de aviso
export const showWarning = (message: string, title = 'Atenção!') => {
  return Swal.fire({
    icon: 'warning',
    title,
    text: message,
    confirmButtonColor: colors.warning,
    confirmButtonText: 'OK',
  });
};

// Alerta de informação
export const showInfo = (message: string, title = 'Informação') => {
  return Swal.fire({
    icon: 'info',
    title,
    text: message,
    confirmButtonColor: colors.info,
    confirmButtonText: 'OK',
  });
};

// Confirmação (substitui window.confirm)
export const showConfirm = async (
  message: string,
  title = 'Confirmar ação',
  confirmText = 'Sim',
  cancelText = 'Cancelar'
): Promise<boolean> => {
  const result = await Swal.fire({
    icon: 'question',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonColor: colors.primary,
    cancelButtonColor: '#757575',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
  });

  return result.isConfirmed;
};

// Confirmação de exclusão
export const showDeleteConfirm = async (
  itemName: string,
  message?: string
): Promise<boolean> => {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Confirmar exclusão',
    html: message || `Tem certeza que deseja excluir <strong>${itemName}</strong>?<br>Esta ação não pode ser desfeita.`,
    showCancelButton: true,
    confirmButtonColor: colors.error,
    cancelButtonColor: '#757575',
    confirmButtonText: 'Sim, excluir',
    cancelButtonText: 'Cancelar',
  });

  return result.isConfirmed;
};

// Toast (notificação leve no canto)
export const showToast = (message: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

  return Toast.fire({
    icon,
    title: message,
  });
};

// Loading (para operações assíncronas)
export const showLoading = (message = 'Processando...', title = 'Aguarde') => {
  return Swal.fire({
    title,
    text: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

// Fechar loading
export const closeLoading = () => {
  Swal.close();
};

// Alerta customizado para validação de campos
export const showValidationError = (message: string) => {
  return Swal.fire({
    icon: 'error',
    title: 'Campos obrigatórios',
    text: message,
    confirmButtonColor: colors.error,
    confirmButtonText: 'OK',
  });
};

// Alerta para redirecionar para login
export const showLoginRequired = async (): Promise<boolean> => {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Login necessário',
    text: 'Você precisa estar logado para continuar.',
    showCancelButton: true,
    confirmButtonColor: colors.primary,
    cancelButtonColor: '#757575',
    confirmButtonText: 'Ir para login',
    cancelButtonText: 'Cancelar',
  });

  return result.isConfirmed;
};

// Confirmação de cancelamento de pedido
export const showCancelConfirm = async (
  title = 'Deseja cancelar este pedido?',
  message = 'Esta ação não poderá ser desfeita.'
): Promise<boolean> => {
  const result = await Swal.fire({
    icon: 'warning',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonColor: colors.error,
    cancelButtonColor: '#757575',
    confirmButtonText: 'Sim, cancelar pedido',
    cancelButtonText: 'Não cancelar',
  });

  return result.isConfirmed;
};
