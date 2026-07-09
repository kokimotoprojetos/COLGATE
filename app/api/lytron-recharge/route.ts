import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { amount, name, email, cpf } = await request.json();

    const apiKey = process.env.LYTRON_API_KEY;
    const apiSecret = process.env.LYTRON_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LytronPay API keys are not configured in the backend' }, { status: 500 });
    }

    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';

    const payload = {
      amount: parseFloat(amount),
      description: "Recarga de saldo Colgate Invest",
      customer: {
        name: "angela maria cardoso vieira",
        email: email || "investidor@colgate.com",
        document: {
          type: "cpf",
          number: "43444695772"
        }
      }
    };

    const rawBody = JSON.stringify(payload);

    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(rawBody);
    const signature = hmac.digest('hex');

    const response = await fetch('https://api.lytronpay.com/api/v1/charges', {
      method: 'POST',
      headers: {
        'Api-Access-Key': apiKey,
        'Transaction-Hash': signature,
        'Content-Type': 'application/json'
      },
      body: rawBody
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LytronPay error details:', data);
      return NextResponse.json({ error: data.message || 'Erro ao gerar PIX' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error generating PIX charge:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
