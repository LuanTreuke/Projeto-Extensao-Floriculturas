/**
 * Utilitário para construir URLs de imagens que funciona tanto localmente quanto com ngrok
 */

const getBackendURL = (): string => {
  // Prioridade: variável de ambiente > fallback localhost
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

export const buildImageURL = (imagePath: string): string => {
  if (!imagePath) return '';
  
  // Normaliza caminho: se vier como 'uploads/arquivo.jpg', vira '/uploads/arquivo.jpg'
  const normalized = imagePath.replace(/^\/?(uploads\/)/, '/$1');
  
  const result = (() => {
    // Se já for uma URL completa (http/https), usar diretamente
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      // Para ngrok, garantir parâmetro que pula o warning
      try {
        const urlObj = new URL(normalized);
        if (urlObj.hostname.includes('ngrok-free.app')) {
          if (!urlObj.searchParams.has('ngrok-skip-browser-warning')) {
            urlObj.searchParams.set('ngrok-skip-browser-warning', 'true');
          }
          return urlObj.toString();
        }
      } catch {}
      return normalized;
    }
    
    // Se for caminho local do sistema de upload
    if (normalized.startsWith('/uploads/')) {
      const backendURL = getBackendURL();
      const fullURL = `${backendURL}${normalized}`;
      
      // Se for ngrok, adicionar parâmetro especial para evitar página de warning
      if (backendURL.includes('ngrok-free.app')) {
        try {
          const url = new URL(fullURL);
          url.searchParams.set('ngrok-skip-browser-warning', 'true');
          return url.toString();
        } catch {
          return `${fullURL}${fullURL.includes('?') ? '&' : '?'}ngrok-skip-browser-warning=true`;
        }
      }
      
      return fullURL;
    }
    
    // Para outras imagens locais (assets do projeto)
    if (!normalized.startsWith('/')) {
      return `/${normalized}`;
    }
    
    return normalized;
  })();
  
  return result;
};

/**
 * Função para debug - mostra qual URL está sendo usada
 */
export const debugImageURL = (imagePath: string): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🖼️ Image Debug:', {
      input: imagePath,
      output: buildImageURL(imagePath),
      backendURL: getBackendURL()
    });
  }
};
