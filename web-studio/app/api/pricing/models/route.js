import { NextResponse } from 'next/server';

// ─── DYNAMIC MODEL PRICING REGISTRY (IN-MEMORY & STORED CONFIG) ──────────────
let DYNAMIC_MODEL_PRICING = [
  { id: 'veo-3-1', modelName: 'Google Veo 3.1', category: 'video', creditCost: 15, providerCostUsd: 0.12, marginPercent: 60, status: 'ACTIVE' },
  { id: 'wan-2-6', modelName: 'Wan 2.6 Native Audio', category: 'video', creditCost: 12, providerCostUsd: 0.09, marginPercent: 62, status: 'ACTIVE' },
  { id: 'kling3_0', modelName: 'Kling 3.0 1080p', category: 'video', creditCost: 10, providerCostUsd: 0.08, marginPercent: 58, status: 'ACTIVE' },
  { id: 'sora-2', modelName: 'OpenAI Sora 2', category: 'video', creditCost: 20, providerCostUsd: 0.18, marginPercent: 55, status: 'ACTIVE' },
  { id: 'seedance_2_5', modelName: 'Seedance 2.5 Action', category: 'video', creditCost: 10, providerCostUsd: 0.07, marginPercent: 65, status: 'ACTIVE' },
  { id: 'nano-banana-pro', modelName: 'Nano Banana Pro', category: 'image', creditCost: 5, providerCostUsd: 0.03, marginPercent: 70, status: 'ACTIVE' },
  { id: 'soul-v2', modelName: 'Soul 2.0 Identity', category: 'image', creditCost: 5, providerCostUsd: 0.03, marginPercent: 70, status: 'ACTIVE' },
  { id: 'elevenlabs', modelName: 'ElevenLabs Audio', category: 'audio', creditCost: 3, providerCostUsd: 0.015, marginPercent: 75, status: 'ACTIVE' },
];

/**
 * GET: Retrieve all active model pricing configurations
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    count: DYNAMIC_MODEL_PRICING.length,
    models: DYNAMIC_MODEL_PRICING,
    retrievedAt: new Date().toISOString(),
  });
}

/**
 * POST: Create a new dynamic model pricing configuration
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { id, modelName, category, creditCost, providerCostUsd, marginPercent } = body;

    if (!id || !modelName || creditCost === undefined || providerCostUsd === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, modelName, creditCost, providerCostUsd' },
        { status: 400 }
      );
    }

    const existingIdx = DYNAMIC_MODEL_PRICING.findIndex(m => m.id === id);
    const newEntry = {
      id,
      modelName,
      category: category || 'video',
      creditCost: Number(creditCost),
      providerCostUsd: Number(providerCostUsd),
      marginPercent: Number(marginPercent || 60),
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      DYNAMIC_MODEL_PRICING[existingIdx] = newEntry;
    } else {
      DYNAMIC_MODEL_PRICING.push(newEntry);
    }

    return NextResponse.json({
      success: true,
      message: 'Model pricing registered successfully',
      model: newEntry,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT: Update an existing model credit rate & provider cost
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, creditCost, providerCostUsd, status } = body;

    const target = DYNAMIC_MODEL_PRICING.find(m => m.id === id);
    if (!target) {
      return NextResponse.json({ success: false, error: `Model ID '${id}' not found` }, { status: 404 });
    }

    if (creditCost !== undefined) target.creditCost = Number(creditCost);
    if (providerCostUsd !== undefined) target.providerCostUsd = Number(providerCostUsd);
    if (status !== undefined) target.status = status;
    target.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: `Model pricing for '${id}' updated successfully`,
      model: target,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Remove a model pricing configuration
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Query param id is required' }, { status: 400 });
    }

    DYNAMIC_MODEL_PRICING = DYNAMIC_MODEL_PRICING.filter(m => m.id !== id);

    return NextResponse.json({
      success: true,
      message: `Model pricing '${id}' deleted successfully`,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
