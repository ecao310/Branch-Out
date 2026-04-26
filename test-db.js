const pg = require('pg');
const client = new pg.Client('postgresql://postgres:+jcuaP2Ty54UZ_%40@db.cvxunuqsbhdzgsgijopd.supabase.co:5432/postgres?sslmode=require');

client.connect()
  .then(() => { 
    console.log('Connected!'); 
    return client.query('SELECT * FROM sightings LIMIT 1'); 
  })
  .then(res => { 
    console.log('Query worked:', JSON.stringify(res.rows, null, 2)); 
    process.exit(0); 
  })
  .catch(e => { 
    console.error('Error:', e.message); 
    console.error('Code:', e.code);
    process.exit(1); 
  });
