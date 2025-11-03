/**
 * Check for required environment variables on startup
 * This should be called when the server starts, not in the browser
 */
export function checkServerEnvironment(): void {
  // Only run on server-side (Node.js environment)
  if (typeof process === 'undefined' || !process.env) {
    return;
  }

  const required = ['BLOCKSTR_NSEC'];
  const missing: string[] = [];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables:');
    for (const envVar of missing) {
      console.error(`   - ${envVar}`);
    }
    console.error('');
    console.error('Please set the following environment variables:');
    console.error('');
    console.error('  BLOCKSTR_NSEC=nsec1... (or hex private key)');
    console.error('');
    console.error('Score signing will not work without this configuration.');
    console.error('');
    
    // Don't exit in production, just warn
    if (process.env.NODE_ENV === 'development') {
      console.error('Development mode: Continuing anyway...');
    }
  } else {
    console.log('✓ Environment variables configured correctly');
  }
}
