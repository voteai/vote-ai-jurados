import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if demo users already exist
    const demoUsers = await base44.entities.User.list();
    const organizadorExists = demoUsers.some(u => u.email === 'organizador@demo.com');
    const juradoExists = demoUsers.some(u => u.email === 'jurado@demo.com');

    const results = [];

    // Create organizador@demo.com if not exists
    if (!organizadorExists) {
      try {
        await base44.users.inviteUser('organizador@demo.com', 'admin');
        results.push({ email: 'organizador@demo.com', role: 'admin', status: 'invited' });
      } catch (err) {
        results.push({ email: 'organizador@demo.com', status: 'error', message: err.message });
      }
    } else {
      results.push({ email: 'organizador@demo.com', status: 'already_exists' });
    }

    // Create jurado@demo.com if not exists
    if (!juradoExists) {
      try {
        await base44.users.inviteUser('jurado@demo.com', 'user');
        results.push({ email: 'jurado@demo.com', role: 'user', status: 'invited' });
      } catch (err) {
        results.push({ email: 'jurado@demo.com', status: 'error', message: err.message });
      }
    } else {
      results.push({ email: 'jurado@demo.com', status: 'already_exists' });
    }

    return Response.json({
      message: 'Demo users initialization completed',
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});