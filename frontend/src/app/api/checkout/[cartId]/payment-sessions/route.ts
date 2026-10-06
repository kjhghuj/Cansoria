import { NextRequest } from 'next/server';
import { backendFetch, privateJson, safeBackendFailure } from '@/lib/server-medusa';
import { isSameOriginWrite, readBoundedJson } from '@/lib/store-proxy-policy';

interface PaymentSession {
  id?: string;
  status?: string;
  provider_id?: string;
  data?: { client_secret?: string };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ cartId: string }> }) {
  if (!isSameOriginWrite(request)) return privateJson({ message: 'Access denied.' }, 403);
  const { cartId } = await params;
  if (!/^cart_[A-Za-z0-9_-]{1,128}$/.test(cartId)) return privateJson({ message: 'Invalid cart.' }, 400);
  let body: Record<string, unknown>;
  try { body = await readBoundedJson(request, 4096); }
  catch (error) { return privateJson({ message: 'Invalid request.' }, error instanceof Error && error.message === 'Request too large' ? 413 : 400); }
  try {
    if (body.provider_id && body.provider_id !== 'pp_stripe_stripe') return privateJson({ message: 'Invalid payment provider.' }, 400);
    const cartResponse = await backendFetch(`store/carts/${cartId}`, {}, undefined, request);
    if (!cartResponse.ok) return safeBackendFailure(cartResponse);
    const { cart } = await cartResponse.json();
    let collectionId: string | undefined = cart.payment_collection?.id;
    if (!collectionId) {
      const collection = await backendFetch('store/payment-collections', { method: 'POST', body: JSON.stringify({ cart_id: cartId }) }, undefined, request);
      if (!collection.ok) return safeBackendFailure(collection);
      collectionId = (await collection.json()).payment_collection?.id;
    }
    if (!collectionId || !/^[A-Za-z0-9_-]{1,128}$/.test(collectionId)) throw new Error('Payment unavailable');
    const sessionResponse = await backendFetch(`store/payment-collections/${collectionId}/payment-sessions`, {
      method: 'POST', body: JSON.stringify({ provider_id: 'pp_stripe_stripe' }),
    }, undefined, request);
    if (!sessionResponse.ok) return safeBackendFailure(sessionResponse);
    const data = await sessionResponse.json();
    const session = (data.payment_collection?.payment_sessions as PaymentSession[] | undefined)?.find((item) => item.provider_id === 'pp_stripe_stripe');
    const clientSecret = session?.data?.client_secret;
    if (!session || !clientSecret) throw new Error('Payment unavailable');
    return privateJson({
      cart,
      payment_session: { id: session.id, status: session.status, provider_id: session.provider_id, data: { client_secret: clientSecret } },
      client_secret: clientSecret,
    });
  } catch (error) {
    return privateJson({ message: 'Payment could not be initialized.' }, error instanceof Error && error.message === 'Request too large' ? 413 : 503);
  }
}
