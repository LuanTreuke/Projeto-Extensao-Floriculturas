"use client";

import { useEffect, useState } from 'react';
import { API_URL } from '@/services/api';
import api from '@/services/api';

export default function ApiTest() {
  const [testResult, setTestResult] = useState<string>('Testando...');

  useEffect(() => {
    console.log('🔍 Frontend API Test:', {
      API_URL,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: process.env.NODE_ENV,
      windowExists: typeof window !== 'undefined'
    });

    // Testar conexão com a API
    const testAPI = async () => {
      try {
        const response = await api.get('/produtos');
        console.log('✅ API Test Success:', response.data.length, 'produtos');
        setTestResult(`✅ API OK (${response.data.length} produtos)`);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('❌ API Test Error:', error);
        }
        setTestResult('❌ API Error');
      }
    };

    testAPI();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: '#f0f0f0',
      padding: 8,
      borderRadius: 4,
      fontSize: '12px',
      zIndex: 9999,
      border: '1px solid #ccc'
    }}>
      🌐 {API_URL.includes('ngrok') ? 'NGROK' : 'LOCAL'}: {testResult}
    </div>
  );
}
