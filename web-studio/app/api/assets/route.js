import { NextResponse } from 'next/server';

const MOCK_ASSET_DATABASE = [
  {
    id: 'asset-1',
    type: 'video',
    title: 'Cyberpunk Drone Chase',
    model: 'Veo 3.1',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-flying-over-a-city-at-night-41584-large.mp4',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'asset-2',
    type: 'image',
    title: 'Gloria Editorial Fashion',
    model: 'Soul 2.0',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'asset-3',
    type: 'video',
    title: 'Hell Grind Open Source Scene',
    model: 'Kling 3.0',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({ assets: MOCK_ASSET_DATABASE });
}

export async function POST(request) {
  const body = await request.json();
  const created = {
    id: `asset-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
  };
  MOCK_ASSET_DATABASE.unshift(created);
  return NextResponse.json({ asset: created });
}
