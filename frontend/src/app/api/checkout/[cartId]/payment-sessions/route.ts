import { NextRequest, NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9030';
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

interface PaymentSessionRequestBody {
    provider_id?: string;
}

interface PaymentSession {
    provider_id?: string;
    data?: {
        client_secret?: string;
    };
}

async function readJsonSafely(response: Response): Promise<Record<string, unknown>> {
    try {
        return (await response.json()) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Internal server error';
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ cartId: string }> }
) {
    try {
        const { cartId } = await params;
        const body = (await request.json()) as PaymentSessionRequestBody;
        const { provider_id } = body;

        console.log('[API Route] Creating payment session for cart:', cartId, 'provider:', provider_id);

        // Step 1: Get the cart to check if payment_collection exists
        const cartResponse = await fetch(
            `${MEDUSA_BACKEND_URL}/store/carts/${cartId}?fields=+payment_collection.payment_sessions`,
            {
                headers: {
                    'x-publishable-api-key': PUBLISHABLE_API_KEY,
                },
            }
        );

        if (!cartResponse.ok) {
            const errorData = await readJsonSafely(cartResponse);
            console.error('[API Route] Failed to get cart:', errorData);
            return NextResponse.json(
                {
                    ...errorData,
                    message: cartResponse.status === 404
                        ? 'Cart not found'
                        : 'Unable to load cart for payment.',
                },
                { status: cartResponse.status }
            );
        }

        const cartData = await cartResponse.json();
        let paymentCollectionId = cartData.cart?.payment_collection?.id;

        console.log('[API Route] Cart payment_collection_id:', paymentCollectionId);

        // Step 2: Create payment collection if it doesn't exist
        if (!paymentCollectionId) {
            console.log('[API Route] Creating payment collection...');
            const createCollectionResponse = await fetch(
                `${MEDUSA_BACKEND_URL}/store/payment-collections`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-publishable-api-key': PUBLISHABLE_API_KEY,
                    },
                    body: JSON.stringify({
                        cart_id: cartId,
                    }),
                }
            );

            if (!createCollectionResponse.ok) {
                const errorData = await readJsonSafely(createCollectionResponse);
                console.error('[API Route] Failed to create payment collection:', errorData);
                return NextResponse.json(
                    { ...errorData, message: 'Payment could not be initialized.' },
                    { status: createCollectionResponse.status }
                );
            }

            const collectionData = await createCollectionResponse.json();
            paymentCollectionId = collectionData.payment_collection?.id;
            console.log('[API Route] Created payment collection:', paymentCollectionId);
        }

        // Step 3: Initialize payment session
        console.log('[API Route] Initializing payment session...');
        const sessionResponse = await fetch(
            `${MEDUSA_BACKEND_URL}/store/payment-collections/${paymentCollectionId}/payment-sessions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-publishable-api-key': PUBLISHABLE_API_KEY,
                },
                body: JSON.stringify({
                    provider_id: provider_id || 'pp_stripe_stripe',
                }),
            }
        );

        if (!sessionResponse.ok) {
            const errorData = await readJsonSafely(sessionResponse);
            console.error('[API Route] Failed to create payment session:', errorData);
            return NextResponse.json(
                { ...errorData, message: 'Payment failed' },
                { status: sessionResponse.status }
            );
        }

        const sessionData = await sessionResponse.json();
        console.log('[API Route] Payment session created:', sessionData);

        // Get client secret from the response (which returns payment_collection)
        // Medusa v2 returns { payment_collection: { ... } }
        const sessions = sessionData.payment_collection?.payment_sessions as
            | PaymentSession[]
            | undefined;
        const targetProvider = provider_id || 'pp_stripe_stripe';

        const session = sessions?.find(
            (paymentSession) => paymentSession.provider_id === targetProvider
        ) || sessions?.[0]; // Fallback to first if not found (should be there)

        const clientSecret = session?.data?.client_secret;
        console.log('[API Route] Client secret extracted:', !!clientSecret);

        return NextResponse.json({
            cart: cartData.cart,
            payment_session: session,
            client_secret: clientSecret,
        });

    } catch (error: unknown) {
        console.error('[API Route] Payment sessions error:', error);
        return NextResponse.json(
            { error: getErrorMessage(error), message: 'Payment failed' },
            { status: 500 }
        );
    }
}
