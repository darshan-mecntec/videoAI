import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const isAdmin = token.includes('admin');
    const user = {
      id: isAdmin ? 'usr-admin-01' : 'usr-user-02',
      name: isAdmin ? 'Alex Mercer (Super Admin)' : 'Sarah Connor',
      email: isAdmin ? 'admin@aether.ai' : 'user@aether.ai',
      role: isAdmin ? 'admin' : 'user',
      roleLabel: isAdmin ? 'Super Administrator' : 'Standard Creator',
      credits: isAdmin ? 5000 : 1250,
      token,
    };

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
