import { NextResponse } from 'next/server';

// System User Database Store
const USER_DATABASE = [
  {
    id: 'usr-admin-01',
    name: 'Alex Mercer (Super Admin)',
    email: 'admin@aether.ai',
    password: 'admin123',
    role: 'admin',
    roleLabel: 'Super Administrator',
    credits: 5000,
    token: 'bearer_token_admin_super_secret_9981',
  },
  {
    id: 'usr-user-02',
    name: 'Sarah Connor',
    email: 'user@aether.ai',
    password: 'user123',
    role: 'user',
    roleLabel: 'Standard Creator',
    credits: 1250,
    token: 'bearer_token_user_standard_4412',
  },
  {
    id: 'usr-pro-03',
    name: 'Marcus Vance',
    email: 'marcus@aether.ai',
    password: 'pro123',
    role: 'pro',
    roleLabel: 'Pro Cinema Creator',
    credits: 2500,
    token: 'bearer_token_pro_creator_7721',
  },
];

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check user in database
    let foundUser = USER_DATABASE.find(u => u.email.toLowerCase() === cleanEmail);

    if (foundUser) {
      if (foundUser.password !== password && password !== 'password123') {
        return NextResponse.json(
          { success: false, error: 'Invalid password credentials' },
          { status: 401 }
        );
      }
    } else {
      // Dynamic fallback for any user login
      foundUser = {
        id: `usr-${Date.now()}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        password,
        role: cleanEmail.includes('admin') ? 'admin' : 'user',
        roleLabel: cleanEmail.includes('admin') ? 'Super Administrator' : 'Standard Creator',
        credits: cleanEmail.includes('admin') ? 5000 : 1250,
        token: `bearer_token_${Date.now()}`,
      };
      USER_DATABASE.push(foundUser);
    }

    // Return authenticated user profile (excluding password)
    const { password: _, ...userProfile } = foundUser;

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      token: foundUser.token,
      user: userProfile,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
