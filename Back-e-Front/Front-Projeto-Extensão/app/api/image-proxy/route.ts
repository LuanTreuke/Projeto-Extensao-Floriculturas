import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route que funciona como proxy para imagens do backend
 * Resolve problemas de CORS com ngrok e outros servidores externos
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 });
  }

  try {
    // Fazer fetch da imagem com headers corretos para ngrok
    const response = await fetch(url, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Falha ao carregar imagem' },
        { status: response.status }
      );
    }

    // Pegar o blob da imagem
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    // Retornar a imagem com headers corretos
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Erro no proxy de imagem:', error);
    return NextResponse.json(
      { error: 'Erro ao processar imagem' },
      { status: 500 }
    );
  }
}

