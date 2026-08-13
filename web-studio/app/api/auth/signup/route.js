import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const role = cleanEmail.includes('admin') ? 'admin' : 'user';

    const newUser = {
      id: `usr-${Date.now()}`,
      name: name || cleanEmail.split('@')[0],
      email: cleanEmail,
      role,
      roleLabel: role === 'admin' ? 'Super Administrator' : 'Pro Creator (Welcome Bonus)',
      credits: 2500,
      token: `bearer_token_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      token: newUser.token,
      user: newUser,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
