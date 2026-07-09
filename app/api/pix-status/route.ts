import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const txid = searchParams.get('txid');

    if (!txid) {
      return NextResponse.json({ error: 'Missing txid parameter' }, { status: 400 });
    }

    const apiKey = process.env.LYTRON_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key for payment gateway not configured in the backend' }, { status: 500 });
    }

    const response = await fetch(`https://api.lytronpay.com/api/v1/charges/${txid}`, {
      method: 'GET',
      headers: {
        'Api-Access-Key': apiKey
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Payment gateway query error details:', data);
      return NextResponse.json({ error: data.message || 'Erro ao consultar status do PIX' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error querying PIX status:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
